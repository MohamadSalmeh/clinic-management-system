import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude() // تجاهل أي حقول لم يتم تحديدها بـ @Expose
export class QueueResponseDto {
  @Expose() id!: number;
  @Expose() appointmentId!: number;
  @Expose() clinicId!: number;
  @Expose() doctorId!: number;
  @Expose() position!: number;
  @Expose() status!: string;
  @Expose() checkinTime!: Date;
  @Expose() startedTime!: Date;
  @Expose() finishedTime!: Date;
  @Expose() actualDurationMinutes!: number;
  @Expose() isPriority!: boolean;

  // عرض isNext بصيغة is_next لتتوافق مع الـ JSON للعميل
  @Expose({ name: 'is_next' })
  isNext!: boolean;

  // حل مشكلة تضارب حقول الوقت وإعادة تسميته
  @Expose({ name: 'waiting_time_minutes' })
  estimatedWaitMinutes!: number;

  // حساب التأخير الديناميكي (الفرق بالدقائق بين الموعد المحجوز ووقت الدخول الفعلي/المتوقع)
  @Expose()
  @Transform(({ obj }) => {
    if (!obj.appointment || !obj.appointment.requestedDate) return 0;
    
    const requestedDate = new Date(obj.appointment.requestedDate).getTime();
    
    // إذا بدأ الموعد فعلياً نحسب الفرق بناءً على وقت البدء
    if (obj.startedTime) {
        const diffMins = Math.round((new Date(obj.startedTime).getTime() - requestedDate) / 60000);
        return diffMins > 0 ? diffMins : 0;
    }
    
    // إذا لم يبدأ بعد، نجمع وقت الانتظار المتوقع على الوقت الحالي ونقارنه
    const waitTime = obj.estimatedWaitMinutes || 0;
    const expectedStartTime = new Date().getTime() + (waitTime * 60000);
    const diffMins = Math.round((expectedStartTime - requestedDate) / 60000);
    
    return diffMins > 0 ? diffMins : 0;
  })
  delay_from_appointment_minutes!: number;

  // إزالة العدادات الصفرية (doctors_count) من العيادة قبل الإرسال
  @Expose()
  @Transform(({ value }) => {
    if (value) {
      delete value.doctorsCount;
      delete value.doctors_count;
    }
    return value;
  })
  clinic: any;

  // إزالة العدادات الصفرية (clinics_count) من الطبيب قبل الإرسال
  @Expose()
  @Transform(({ value }) => {
    if (value) {
      delete value.clinicCount;
      delete value.clinics_count;
    }
    return value;
  })
  doctor: any;

  @Expose()
  appointment: any;
}