import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  Referral,
  ReferralType,
  ReferralStatus,
} from './entities/referral.entity';
import { PatientProfile } from '../patients/entities/patient-profile.entity';
import { DoctorProfile } from '../doctors/entities/doctor-profile.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  CreateReferralDto,
  ReferralQueryDto,
  PatientReferralQueryDto,
} from './dto';
import { ActiveUserData } from '../utils';
import { addDays } from '../common/utils/date-utils';
import { DoctorClinic } from '../doctor-clinics/entities/doctor-clinic.entity';
import { SystemSetting } from '../system-setting/entities/system-setting.entity';

// تعيين واجهة موحدة للردود المجزأة بناءً على نظام المشروع لديك
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,

    @InjectRepository(PatientProfile)
    private readonly patientRepository: Repository<PatientProfile>,

    @InjectRepository(DoctorProfile)
    private readonly doctorRepository: Repository<DoctorProfile>,

    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,

    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // 1. عمليات الأطباء (Doctor Operations)
  // ==========================================

  /**
   * إنشاء تحويل طبي جديد (سواء خارجي أو مراجعة لنفسه)
   */
async createReferral(
    currentUser: ActiveUserData,
    dto: CreateReferralDto,
  ): Promise<Referral> {
    
    // 1. التحقق من بروفايل الطبيب الحالي
    const doctor = await this.doctorRepository.findOne({
      where: { userId: currentUser.sub }
    });

    if (!doctor) {
      throw new NotFoundException('Active doctor profile not found for this user');
    }

    const fromDoctorId = doctor.id;

    // 2. التحقق من وجود المريض ونشاطه
    const patient = await this.patientRepository.findOne({
      where: { id: dto.patientId }
    });

    if (!patient) {
      throw new NotFoundException('Target patient profile not found or inactive');
    }

    // تجهيز متغيرات الوجهة الأساسية
    let toDoctorId = dto.toDoctorId ?? null;
    let toClinicId = dto.toClinicId ?? null;

    // 3. فحص اللوجيك بناءً على نوع التحويل
    if (dto.type === ReferralType.FOLLOW_UP) {
      if (dto.toDoctorId && dto.toDoctorId !== fromDoctorId) {
        throw new BadRequestException('In a follow-up referral, you cannot target another doctor. It must be yourself.');
      }
      toDoctorId = fromDoctorId;
    } else if (dto.type === ReferralType.EXTERNAL) {
      await this.validateReferralTargets(toClinicId, toDoctorId);
    }

    // 4. منع التكرار العشوائي (Anti-Spam Check)
    const existingPendingReferral = await this.referralRepository.findOne({
      where: {
        patient: { id: dto.patientId },
        type: dto.type,
        status: ReferralStatus.PENDING,
        fromDoctor: { id: fromDoctorId },
        ...(toDoctorId ? { toDoctor: { id: toDoctorId } } : {}),
        ...(toClinicId ? { toClinic: { id: toClinicId } } : {}),
      },
    });

    if (existingPendingReferral) {
      throw new ConflictException('An active pending referral with the same specifications already exists for this patient.');
    }

    // 5. حساب تاريخ انتهاء الصلاحية
    const expiresAt = await this.calculateExpirationDate(dto.type);

    // --- الحل الجذري لبناء الكائن وحفظه لمنع مشاكل الـ Overload والـ Array ---
    const referralData: Partial<Referral> = {
      patient: { id: dto.patientId } as PatientProfile,
      fromDoctor: { id: fromDoctorId } as DoctorProfile,
      toDoctor: toDoctorId ? ({ id: toDoctorId } as DoctorProfile) : null,
      toClinic: toClinicId ? ({ id: toClinicId } as Clinic) : null,
      type: dto.type,
      status: ReferralStatus.PENDING,
      expiresAt: expiresAt,
      reason: dto.reason, // التعديل الجذري: استخدام الحقل الصحيح الفعلي للـ Entity
    };

    const newReferral = this.referralRepository.create(referralData);
    const savedReferral = await this.referralRepository.save(newReferral);

    // 6. إعادة الكائن كاملاً مع علاقاته
    const result = await this.referralRepository.findOne({
      where: { id: savedReferral.id },
      relations: ['patient', 'fromDoctor', 'toDoctor', 'toClinic'],
    });

    if (!result) {
      throw new NotFoundException('Referral could not be retrieved after saving');
    }

    return result;
  }
  /**
   * جلب التحويلات الصادرة من هذا الطبيب (التي أرسلها هو للمرضى)
   */
  async getSentReferrals(
    currentUser: ActiveUserData,
    queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    /*
      • الهدف: عرض السجل الكامل للتحويلات الطبية التي قام الطبيب الحالي بإصدارها للمرضى لمتابعة حالاتهم.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. جلب معرف بروفايل الطبيب الحالي عبر الـ sub الخاص بالـ Token.
        2. بناء استعلام ديناميكي باستخدام CreateQueryBuilder على جدول الـ referrals.
        3. تصفية النتائج بشكل إجباري بحيث يكون: referrals.fromDoctorId = :currentDoctorId.
        4. تطبيق الفلاتر الاختيارية (Optional Filters) الممررة في queryDto مثل:
           - الحالة (status): PENDING, COMPLETED, EXPIRED.
           - النوع (type): EXTERNAL, FOLLOW_UP.
        5. عمل LeftJoinAndSelect للعلاقات الأساسية لضمان كفاءة العرض في الواجهات الأمامية:
           - بيانات المريض (patient -> user لاسم المريض).
           - بيانات الطبيب المستهدف (toDoctor) والعيادة المستهدفة (toClinic).
        6. معالجة الصفحات (Pagination Safely): استخراج الـ page والـ limit وتحويلهما لأرقام مع وضع قيم افتراضية (مثال: page=1, limit=10) لحماية الذاكرة من الاستعلامات الضخمة.
        
      • ما يجب تجنبه:
        - تجنب استدعاء getMany() بدون Pagination لمنع حدوث انهيار في الأداء عند نمو البيانات.
        - تجنب تسريب أي بيانات حساسة لمرضى لا يتبعون لهذا الطبيب.

      • المخرجات المتوقعة:
        - كائن ممتثل لمعايير المشروع يحتوي مصفوفة البيانات (data) ومعلومات التجزئة (meta: total, totalPages, page, limit).
    */
    throw new Error('Method not implemented.');
  }

  /**
   * جلب التحويلات الواردة إلى هذا الطبيب (التي أرسلها أطباء آخرون إليه بالاسم)
   */
  async getReceivedReferrals(
    currentUser: ActiveUserData,
    queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    /*
      • الهدف: تمكين الطبيب من رؤية المرضى المحولين إليه شخصياً بالاسم من قبل زملائه الأطباء في المركز لجدولة استقبالهم.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. التحقق من هوية الطبيب وجلب الـ doctorProfileId الخاص به.
        2. بناء استعلام (QueryBuilder) يستهدف التحويلات التي يكون فيها: referrals.toDoctorId = :currentDoctorId.
        3. افتراضياً، يتم عرض التحويلات بحالة [PENDING] أولاً لأنها تمثل العمل الحقيقي المطلوب، مع إمكانية تمرير فلاتر أخرى لرؤية التحويلات المكتملة لاحقاً عبر الـ queryDto.
        4. دمج العلاقات الضرورية (patient للتعرف على المريض، و fromDoctor لمعرفة الطبيب الذي قام بالتحويل لقراءة التاريخ الطبي عند الحاجة).
        5. تطبيق معايير الـ Pagination الصارمة والترتيب التنازلي (ORDER BY created_at DESC) ليعرض الأحدث دائماً.
        
      • ما يجب تجنبه:
        - عدم عرض التحويلات الموجهة لعيادات عامة هنا، فهذه الميثود مخصصة حصراً للتحويلات الموجهة للطبيب *بالاسم*.
        
      • المخرجات المتوقعة:
        - استجابة مجزأة (PaginatedResponse) تحتوي على طلبات التحويل الواردة بانتظار الحجز.
    */
    throw new Error('Method not implemented.');
  }

  // ==========================================
  // 2. عمليات المرضى (Patient Operations)
  // ==========================================

  /**
   * جلب سجل التحويلات الخاص بالمريض الحالي (النشطة والمنتهية)
   */
  async getMyReferrals(
    currentUser: ActiveUserData,
    queryDto: PatientReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    /*
      • الهدف: تمكين المريض من استعراض كافة التحويلات الطبية الصادرة له (سواء مراجعات أو تحويلات لعيادات أخرى) لمتابعة خطته العلاجية.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. البحث عن الـ patientProfileId المرتبط بحساب المستخدم الحالي (currentUser.sub)، وفي حال عدم وجود بروفايل مريض يتم رمي ForbiddenException.
        2. بناء استعلام يفلتر بناءً على: referrals.patientId = :currentPatientId.
        3. تطبيق الفلترة حسب الحالة (PENDING، COMPLETED، EXPIRED) إذا تم تمريرها لتسهيل تصفية "التحويلات الفعالة" عن "الأرشيف".
        4. ربط علاقات الأطباء والعيادات (fromDoctor, toDoctor, toClinic) ليتمكن المريض من معرفة اسم الطبيب المحوِّل والوجهة المقصودة بدقة.
        5. ترتيب النتائج تنازلياً وتطبيق الـ Pagination المعتمد في المنصة.
        
      • ما يجب تجنبه:
        - الحذر القاطع من تمرير معرف مريض آخر في الاستعلام؛ التصفية يجب أن تعتمد كلياً على معرف صاحب الـ Token المستخلص من السيرفر لحماية الخصوصية.

      • المخرجات المتوقعة:
        - كائن PaginatedResponse يحتوي على قائمة تحويلات المريض.
    */
    throw new Error('Method not implemented.');
  }

  /**
   * جلب التحويلات النشطة فقط والمتاحة للحجز الآن
   */
  async getMyActiveReferrals(currentUser: ActiveUserData): Promise<Referral[]> {
    /*
      • الهدف: توفير ميثود خفيفة وسريعة تُستدعى في شاشة حجز المواعيد للمريض، لتعرض له الـ "Tokens / البطاقات" النشطة التي يمتلكها ويمكنه استخدامها للحجز فوراً.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. جلب الـ patientProfileId الخاص بالمريض الحالي.
        2. الاستعلام عن التحويلات التي تحقق الشروط الصارمة التالية مجتمعة:
           أ- referrals.patientId = :currentPatientId
           ب- referrals.status = ReferralStatus.PENDING (لم تستهلك بعد).
           ج- (referrals.expiresAt IS NULL أو referrals.expiresAt > NOW()) (لم تنتهِ صلاحيتها زمنياً).
        3. عمل عمارة الجلب لتتضمن العيادة والأطباء المعنيين لتسهيل الاختيار في الواجهة.
        4. لا تحتاج هذه الميثود لـ Pagination لأن التحويلات النشطة للمريض الواحد تكون محدودة جداً عادةً، ويتم ترتيبها حسب الأقرب انتهاءً لـ Expiration لتنبيهه.
        
      • ما يجب تجنبه:
        - تجنب إرجاع أي تحويل منتهي الصلاحية حتى لو كانت حالته PENDING في قاعدة البيانات (في حال لم يقم الـ Cron Job بتحديثه بعد، يتم استثناؤه هنا برمجياً لحماية لوجيك الأعمال).

      • المخرجات المتوقعة:
        - مصفوفة مريحة من الـ Referrals الصالحة للاستخدام المباشر في عملية الحجز.
    */
    throw new Error('Method not implemented.');
  }

  // ==========================================
  // 3. عمليات مدير النظام (Admin Operations)
  // ==========================================

  /**
   * لوحة التحكم للأدمن: جلب وتحليل كافة التحويلات في النظام
   */
  async findAllReferralsForAdmin(
    queryDto: ReferralQueryDto,
  ): Promise<PaginatedResponse<Referral>> {
    /*
      • الهدف: منح الإدارة مراقبة كاملة وشاملة لحركة التحويلات داخل المركز الطبي لتحليل الإحصائيات (مثال: معرفة العيادات الأكثر تحويلاً للمرضى).
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. بناء استعلام شامل (Global Query) على جدول الـ referrals بدون قيود على الـ Roles الصادرة أو الواردة.
        2. تفعيل فلاتر بحث متقدمة وديناميكية (Dynamic Queries):
           - الفلترة بـ patientId معين، أو fromDoctorId، أو toClinicId.
           - الفلترة بالنوع والحالة وتاريخ الإنشاء.
        3. استخدام LeftJoinAndSelect لربط كافة الكيانات المرتبطة بما فيها الـ Appointment المولد (إن وجد) لتتبع أثر التحويل.
        4. تطبيق معايير الـ Pagination القياسية مع ضمان معالجة معاملات البحث بأمان ضد الـ SQL Injection.
        
      • ما يجب تجنبه:
        - تجنب عمل حظر أو تصفية بناءً على هوية المستخدم؛ الأدمن يمتلك صلاحية كشف كامل الجدول.

      • المخرجات المتوقعة:
        - استجابة مجزأة ضخمة ومفصلة تخدم لوحات تحكم الإدارة والإحصاء الرقمي.
    */
    throw new Error('Method not implemented.');
  }

  /**
   * جلب تفاصيل تحويل محدد مع كامل العلاقات (Patient, Doctors, Clinic)
   */
  async findOne(id: number): Promise<Referral> {
    /*
      • الهدف: عرض الشاشة التفصيلية لبطاقة التحويل عند الضغط عليها من أي طرف مصرح له.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. البحث عن التحويل باستخدام المعرف الفريد (id).
        2. دمج جميع العلاقات بشكل كامل وعميق (Eager-like loading via QueryBuilder or findOne options):
           - المريض وبروفايله.
           - الطبيب المصدر والطبيب المستهدف.
           - العيادة المحول إليها والموعد الناتج عنها.
        3. إذا لم يتواجد هذا المعرف في السستم، يتم فوراً رمي NotFoundException('Referral not found') لمنع معالجة كائنات فارغة.
        
      • ما يجب تجنبه:
        - تجنب إرجاع الكائن بجلب المعرفات الرقمية فقط (Foreign Keys) دون نصوص الأسماء والعلاقات، لأن هذه الميثود مخصصة للعرض الشامل.

      • المخرجات المتوقعة:
        - كيان Referral وحيد ومحمل بكافة التفاصيل والروابط الطبية.
    */
    throw new Error('Method not implemented.');
  }

  /**
   * إلغاء تحويل طبي قسراً من قبل الإدارة لسبب إداري
   */
  async cancelReferralByAdmin(id: number, reason: string): Promise<Referral> {
    /*
      • الهدف: تخويل مدير النظام بإبطال مفعول أي بطاقة تحويل طرأ عليها خطأ تنظيمي أو إداري.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. استدعاء ميثود findOne(id) للتأكد من وجود التحويل أولاً وصلاحيته.
        2. فحص الحالة الحالية للتحويل:
           - إذا كانت الحالة [COMPLETED] (تم استهلاكه وحجز موعد به فعلياً)، يمنع الإلغاء تماماً ويتم رمي BadRequestException('Cannot cancel an already completed referral').
           - إذا كانت الحالة [EXPIRED]، يتم إعلامه أنه ملغي مسبقاً.
        3. تعديل حالة التحويل لتصبح [ReferralStatus.EXPIRED].
        4. دمج أو توثيق نص سبب الإلغاء (reason) داخل حقل الملاحظات أو حقل الـ reason الخاص بالكيان كتوثيق إداري لحفظ الشفافية وسجلات التدقيق (Audit Trail).
        5. حفظ التغييرات في المستودع (Save) وإعادة الكائن المحدث.
        
      • ما يجب تجنبه:
        - تجنب السماح بتمرير قيمة فارغة للـ reason؛ الإلغاء الإداري يجب أن يكون مبرراً دائماً.

      • المخرجات المتوقعة:
        - كائن تحويل محدث الحالة إلى EXPIRED وموثق سبب إلغائه بنجاح.
    */
    throw new Error('Method not implemented.');
  }

  // ==========================================
  // 4. اللوجيك الخاص المتقدم (Special Business Logic)
  // ==========================================

  /**
   * التحقق من صلاحية التحويل قبل إتمام عملية حجز الموعد
   */
  async validateReferralForBooking(
    referralId: number,
    patientId: number,
    targetDoctorId: number,
    targetClinicId: number,
  ): Promise<Referral> {
    /*
      • الهدف: يمثل خط الدفاع البرمجي الأخطر والـ Gatekeeper الفعلي؛ يتم استدعاؤه من قبل AppointmentsService أثناء معالجة طلب الحجز للتأكد من أن المريض لا يتلاعب بالنظام ويستخدم بطاقة تحويل شرعية ومطابقة تماماً.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. البحث عن التحويل بواسطة referralId، وإذا لم يوجد يُرمى NotFoundException.
        2. [تحقق الملكية]: التأكد من أن referrals.patientId === patientId. إذا حاول مريض استهلاك تحويل مخصص لمريض آخر، يتم رمي ForbiddenException('Unauthorized referral usage') قاطعاً لحماية الأمان.
        3. [تحقق الحالة]: التأكد من أن الحالة هي [PENDING]. إذا كانت مكتملة أو منتهية يُرمى BadRequestException.
        4. [تحقق الصلاحية الزمنية]: إذا كان هناك تاريخ انتهاء (expiresAt) وكان أصغر من الوقت الحالي (Expired):
           - يتم تغيير حالته في قاعدة البيانات فوراً إلى EXPIRED وحفظه (Inline state correction) ثم رمي BadRequestException('This referral has expired').
        5. [تحقق مطابقة الهدف الطبي]:
           أ- إذا كان التحويل من نوع [FOLLOW_UP] (مراجعة): يجب أن يكون targetDoctorId الممرر للحجز مساوياً تماماً لـ fromDoctorId (طبيب المراجعة هو نفسه الطبيب الأصلي).
           ب- إذا كان التحويل من نوع [EXTERNAL]:
              - إذا كان التحويل يحدد طبيباً معيناً (toDoctorId ليس نل)، فيجب أن يتطابق targetDoctorId مع قيمته تماماً.
              - إذا كان التحويل يحدد عيادة عامة (toClinicId ليس نل)، فيجب أن يتطابق targetClinicId مع قيمة العيادة المحول إليها.
           - في حال عدم التطابق في أي شرط، يتم رمي BadRequestException('Booking details do not match referral constraints').
        
      • ما يجب تجنبه:
        - تجنب تمرير الحجز دون التدقيق الدقيق في الـ ClinicID؛ منعاً لحجز عيادة سنية بواسطة تحويل صادر لعيادة عينية.

      • المخرجات المتوقعة:
        - عند نجاح كافة الفحوصات المعقدة، يعيد التابع كيان الـ Referral كاملاً وصالحاً للـ AppointmentsService لتكمل عملها.
    */
    throw new Error('Method not implemented.');
  }

  /**
   * استهلاك التحويل وتحويل حالته إلى COMPLETED عند نجاح الحجز
   * ملحوظة: تقبل EntityManager لتعمل داخل الـ Transaction الخاص بالحجز
   */
  async consumeReferral(
    referralId: number,
    appointmentId: number,
    manager?: EntityManager,
  ): Promise<void> {
    /*
      • الهدف: إغلاق بطاقة التحويل وربطها بالموعد الفعلي المولد لمنع المريض من إمكانية استخدام نفس التحويل مرتين (Race Condition / Double Spending Pattern).
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. تحديد جهة التنفيذ: إذا تم تمرير `manager` (وهو السيناريو الطبيعي عند استدعائها من داخل Transaction الحجز)، يتم استخدام `manager.getRepository(Referral)` لإجراء العمليات. إذا لم يمرر، نستخدم الـ `referralRepository` الافتراضي.
        2. جلب التحويل مع تطبيق قفل مالي/برمجي (Pessimistic Write Lock) إن أمكن أو التحقق الفوري لضمان عدم حدوث معالجة متزامنة مضللة في نفس الأجزاء من الثانية.
        3. تحديث البيانات:
           - تعيين referrals.status = ReferralStatus.COMPLETED
           - تعيين referrals.appointmentId = appointmentId
        4. حفظ الكيان المحدث باستخدام الـ repo المحدد.
        
      • ما يجب تجنبه:
        - الحذر الشديد من تحديث الكيان خارج الـ Transaction؛ لأن فشل إنشاء الموعد لأي سبب (مثلاً فشل الدفع أو حجز السلوت) يجب أن يعمل Rollback تلقائي ويعيد التحويل لـ PENDING ليحافظ المريض على حقه. هذا السبب في إتاحة الـ manager كـ parameter.

      • المخرجات المتوقعة:
        - تحديث صامت وآمن لقاعدة البيانات يضمن استهلاك التوكن الطبي بنجاح وقفل العملية.
    */
    throw new Error('Method not implemented.');
  }

  // ==========================================
  // 5. المهام التلقائية (Automation / Cron Jobs)
  // ==========================================

  /**
   * مهمة دورية (تنفذ يومياً) لتحويل الحالات الزائدة عن وقتها إلى EXPIRED
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredReferrals(): Promise<void> {
    /*
      • الهدف: الحفاظ على سلامة ونظافة قاعدة البيانات (Data Hygiene) وإبطال التحويلات التي أهملها المرضى وتجاوزت السقف الزمني المسموح به.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. تنفيذ استعلام تحديث جماعي مباشر عالي الأداء (Bulk Update Query via QueryBuilder).
        2. المعايير: تحديث كل السطور التي تكون حالتها الحالية `PENDING` وبنفس الوقت تاريخ الـ `expiresAt` أصغر من الوقت الحالي (LessThan(new Date())).
        3. تعيين القيمة الجديدة: status = ReferralStatus.EXPIRED.
        
      • ما يجب تجنبه (High Performance Trick):
        - **تجنب قاطعاً** عمل .find() لجميع التحويلات المنتهية ثم الدخول في حلقة دوران (foreach) وعمل .save() لكل عنصر على حدة! هذا يدمر أداء السيرفر (O(N) DB Hits). الاستعلام يجب أن يكون ضربة واحدة مباشرة في الداتابيز (Single Execute Update SQL).

      • المخرجات المتوقعة:
        - تشغيل تلقائي منتصف كل ليلة لتحديث السجلات بدقة وصمت، مع طباعة لوجر (Logger) بسيط بعدد السطور المتأثرة.
    */
    throw new Error('Method not implemented.');
  }

  /**
   * مهمة دورية لتذكير المرضى الذين لديهم تحويلات قاربت على الانتهاء ولم يحجزوا بعد
   */
  @Cron('0 9 * * 1')
  async sendReferralReminders(): Promise<void> {
    /*
      • الهدف: تقديم رعاية تفاعلية تدفع المريض (Nudge) لعدم نسيان مراجعاته الطبية الهامة وحجز موعد قبل فوات الأوان.
      
      • خطوات اللوجيك والتحقق (Validation Rules):
        1. جلب التحويلات الممتثلة لشرط: الحالات الـ PENDING والتي قاربت على الانتهاء (مثلاً: تاريخ الانتهاء ينقضي خلال الـ 3 أيام القادمة).
        2. ربط علاقة الـ Patient لاستخراج وسائل التواصل (البريد الإلكتروني أو رقم الهاتف).
        3. الدخول في تكرار آمن (Safe Batching) وإطلاق أحداث نظام الإشعارات (Event Box) لكل مريض محدد: "عزيزي المريض، يرجى العلم أن تحويلك الطبي لعيادة الهضمية سينتهي قريباً، اضغط هنا لجدولة موعدك الآن".
        
      • ما يجب تجنبه:
        - تجنب تذكير المرضى الذين ألغيت تحويلاتهم أو اكتملت.
        - عزل الأخطاء (Try-Catch) داخل حلقة إرسال الإشعارات لضمان أن فشل إرسال إشعار لمريض واحد لا يتسبب في انهيار وظيفة الـ Cron بالكامل وحرمان بقية المرضى من التذكير.

      • المخرجات المتوقعة:
        - تشغيل دوري صباح كل إثنين يرفع من معدلات تفاعل المرضى وحجز المواعيد في المركز.
    */
    throw new Error('Method not implemented.');
  }

  // ==========================================
  // 6. الميثودز المساعدة (Helper Methods)
  // ==========================================

  /**
   * ميثود مساعدة لحساب تاريخ انتهاء التحويل بناءً على نوعه
   */
  /**
   * ميثود مساعدة لحساب تاريخ انتهاء التحويل بناءً على نوعه
   */
  /**
   * ميثود مساعدة لحساب تاريخ انتهاء التحويل بناءً على نوعه ديناميكياً من إعدادات النظام
   */
  private async calculateExpirationDate(type: ReferralType): Promise<Date> {
    const now = new Date();
    const settings = await this.dataSource
      .getRepository(SystemSetting)
      .findOne({
        where: { id: 1 },
      });
    const followUpDays = settings?.referralFollowUpExpirationDays ?? 14;
    const externalDays = settings?.referralExternalExpirationDays ?? 30;

    if (type === ReferralType.FOLLOW_UP) {
      return addDays(now, followUpDays);
    }

    if (type === ReferralType.EXTERNAL) {
      return addDays(now, externalDays);
    }

    return now;
  }

  private async validateReferralTargets(
    toClinicId: number | null,
    toDoctorId: number | null,
  ): Promise<void> {
    if (!toClinicId && !toDoctorId) {
      throw new BadRequestException(
        'A referral must target at least a clinic or a specific doctor',
      );
    }

    if (toClinicId) {
      const clinic = await this.dataSource.getRepository(Clinic).findOne({
        where: { id: toClinicId },
      });

      if (!clinic) {
        throw new NotFoundException('Target clinic not found');
      }
    }

    if (toDoctorId) {
      const doctor = await this.doctorRepository.findOne({
        where: { id: toDoctorId },
      });

      if (!doctor) {
        throw new NotFoundException('Target doctor not found');
      }
    }

    if (toClinicId && toDoctorId) {
      const isDoctorInClinic = await this.dataSource
        .getRepository(DoctorClinic)
        .findOne({
          where: {
            doctorId: toDoctorId,
            clinicId: toClinicId,
          },
        });

      if (!isDoctorInClinic) {
        throw new BadRequestException(
          'The selected doctor does not practice in the specified clinic',
        );
      }
    }
  }
}
