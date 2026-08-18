import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lookup } from './entities/lookup.entity';
import { LookupCategory } from './enums/lookup-category.enum';

@Injectable()
export class LookupsSeeder implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Lookup)
    private readonly lookupRepository: Repository<Lookup>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const specialtySeeds = [
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'CARDIOLOGY',
    labelEn: 'Cardiology',
    labelAr: 'أمراض القلب',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'DERMATOLOGY',
    labelEn: 'Dermatology',
    labelAr: 'الأمراض الجلدية',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'PEDIATRICS',
    labelEn: 'Pediatrics',
    labelAr: 'طب الأطفال',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'ORTHOPEDICS',
    labelEn: 'Orthopedics',
    labelAr: 'طب العظام',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'GENERAL_SURGERY',
    labelEn: 'General Surgery',
    labelAr: 'الجراحة العامة',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'INTERNAL_MEDICINE',
    labelEn: 'Internal Medicine',
    labelAr: 'الطب الباطني',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'NEUROLOGY',
    labelEn: 'Neurology',
    labelAr: 'طب الأعصاب',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'OBSTETRICS_GYNECOLOGY',
    labelEn: 'Obstetrics & Gynecology',
    labelAr: 'النسائية والتوليد',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'OPHTHALMOLOGY',
    labelEn: 'Ophthalmology',
    labelAr: 'طب العيون',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'ENT',
    labelEn: 'ENT',
    labelAr: 'الأنف والأذن والحنجرة',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'DENTISTRY',
    labelEn: 'Dentistry',
    labelAr: 'طب الأسنان',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'UROLOGY',
    labelEn: 'Urology',
    labelAr: 'المسالك البولية',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'PSYCHIATRY',
    labelEn: 'Psychiatry',
    labelAr: 'الطب النفسي',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'ENDOCRINOLOGY',
    labelEn: 'Endocrinology',
    labelAr: 'الغدد الصماء',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'GASTROENTEROLOGY',
    labelEn: 'Gastroenterology',
    labelAr: 'أمراض الجهاز الهضمي',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'PULMONOLOGY',
    labelEn: 'Pulmonology',
    labelAr: 'الأمراض الصدرية',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'NEPHROLOGY',
    labelEn: 'Nephrology',
    labelAr: 'أمراض الكلى',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'RHEUMATOLOGY',
    labelEn: 'Rheumatology',
    labelAr: 'أمراض الروماتيزم',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'ONCOLOGY',
    labelEn: 'Oncology',
    labelAr: 'طب الأورام',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'INFECTIOUS_DISEASES',
    labelEn: 'Infectious Diseases',
    labelAr: 'الأمراض المعدية',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'FAMILY_MEDICINE',
    labelEn: 'Family Medicine',
    labelAr: 'طب الأسرة',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'EMERGENCY_MEDICINE',
    labelEn: 'Emergency Medicine',
    labelAr: 'طب الطوارئ',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'ANESTHESIOLOGY',
    labelEn: 'Anesthesiology',
    labelAr: 'طب التخدير',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'PLASTIC_SURGERY',
    labelEn: 'Plastic Surgery',
    labelAr: 'جراحة التجميل',
    isActive: true,
  }),
  this.lookupRepository.create({
    category: LookupCategory.MEDICAL_SPECIALTY,
    value: 'PHYSICAL_MEDICINE_REHABILITATION',
    labelEn: 'Physical Medicine & Rehabilitation',
    labelAr: 'الطب الفيزيائي وإعادة التأهيل',
    isActive: true,
  }),
];

    const savedSpecialties = await this.ensureSeeds(specialtySeeds);

    const specialtyMap = new Map<string, number>();
    for (const specialty of savedSpecialties) {
      specialtyMap.set(specialty.value, specialty.id);
    }

    const conditionCategorySeeds = [
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION_CATEGORY,
        value: 'GASTROENTEROLOGY_DISEASES',
        labelEn: 'Gastroenterology Diseases',
        labelAr: 'أمراض الجهاز الهضمي',
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION_CATEGORY,
        value: 'RESPIRATORY_DISEASES',
        labelEn: 'Respiratory Diseases',
        labelAr: 'أمراض الجهاز التنفسي',
        isActive: true,
      }),
    ];

    const savedConditionCategories =
      await this.ensureSeeds(conditionCategorySeeds);

    const conditionCategoryMap = new Map<string, number>();
    for (const category of savedConditionCategories) {
      conditionCategoryMap.set(category.value, category.id);
    }

    const baselineSeeds: Lookup[] = [
      // ============================================================
      // Blood Types
      // ============================================================
      ...this.buildSimpleSeeds(LookupCategory.BLOOD_TYPE, [
        'A+',
        'A-',
        'B+',
        'B-',
        'O+',
        'O-',
        'AB+',
        'AB-',
      ]),

      // ============================================================
      // Allergies
      // ============================================================
      ...this.buildSimpleSeeds(LookupCategory.ALLERGY, [
        'Penicillin',
        'Peanut',
        'Dust',
        'Latex',
      ]),

      // ============================================================
      // Disability Types
      // ============================================================
      ...this.buildSimpleSeeds(LookupCategory.DISABILITY_TYPES, [
        'NONE',
        'PHYSICAL_DISABILITY',
        'VISUAL_IMPAIRMENT',
        'HEARING_IMPAIRMENT',
        'SPEECH_IMPAIRMENT',
        'INTELLECTUAL_DISABILITY',
        'OTHER',
      ]),

      // ============================================================
      // Common Surgeries
      // ============================================================
      ...this.buildSimpleSeeds(LookupCategory.COMMON_SURGERIES, [
        'APPENDECTOMY',
        'GALLBLADDER_REMOVAL',
        'HERNIA_REPAIR',
        'CESAREAN_SECTION',
        'KNEE_SURGERY',
        'HIP_REPLACEMENT',
        'HEART_SURGERY',
        'CATARACT_SURGERY',
        'OTHER',
      ]),

      // ============================================================
      // Lifestyle Habits
      // ============================================================
      ...this.buildSimpleSeeds(LookupCategory.LIFESTYLE_HABITS, [
        'SMOKING',
        'ALCOHOL',
        'REGULAR_EXERCISE',
        'SEDENTARY_LIFESTYLE',
        'HEALTHY_DIET',
        'UNHEALTHY_DIET',
        'IRREGULAR_SLEEP',
        'OTHER',
      ]),

      // ============================================================
      // Chronic Conditions
      // ============================================================
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'IRRITABLE_BOWEL_SYNDROME',
        labelEn: 'Irritable Bowel Syndrome',
        labelAr: 'القولون العصبي',
        parentId:
          conditionCategoryMap.get('GASTROENTEROLOGY_DISEASES') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'GASTRIC_ULCER',
        labelEn: 'Gastric Ulcer',
        labelAr: 'قرحة المعدة',
        parentId:
          conditionCategoryMap.get('GASTROENTEROLOGY_DISEASES') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'ASTHMA',
        labelEn: 'Asthma',
        labelAr: 'الربو',
        parentId:
          conditionCategoryMap.get('RESPIRATORY_DISEASES') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'CHRONIC_BRONCHITIS',
        labelEn: 'Chronic Bronchitis',
        labelAr: 'التهاب القصبات المزمن',
        parentId:
          conditionCategoryMap.get('RESPIRATORY_DISEASES') ?? null,
        isActive: true,
      }),

      // ============================================================
      // Medical Sub-Specialties
      // ============================================================
      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SUB_SPECIALTY,
        value: 'INTERVENTIONAL_CARDIOLOGY',
        labelEn: 'Interventional Cardiology',
        labelAr: 'قسطرة وتداخلية',
        parentId: specialtyMap.get('CARDIOLOGY') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SUB_SPECIALTY,
        value: 'PEDIATRIC_CARDIOLOGY',
        labelEn: 'Pediatric Cardiology',
        labelAr: 'قلبية أطفال',
        parentId: specialtyMap.get('CARDIOLOGY') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SUB_SPECIALTY,
        value: 'JOINT_REPLACEMENT',
        labelEn: 'Joint Replacement',
        labelAr: 'جراحة مفاصل',
        parentId: specialtyMap.get('ORTHOPEDICS') ?? null,
        isActive: true,
      }),

      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SUB_SPECIALTY,
        value: 'ARTHROSCOPY_SPORTS_MEDICINE',
        labelEn: 'Arthroscopy & Sports Medicine',
        labelAr: 'تنظير مفاصل وطب رياضي',
        parentId: specialtyMap.get('ORTHOPEDICS') ?? null,
        isActive: true,
      }),
    ];

    await this.ensureSeeds(baselineSeeds);
  }

  /**
   * Adds only missing lookup records.
   * Existing records are left unchanged.
   */
  private async ensureSeeds(seeds: Lookup[]): Promise<Lookup[]> {
    const saved: Lookup[] = [];

    for (const seed of seeds) {
      const existing = await this.lookupRepository.findOne({
        where: {
          category: seed.category,
          value: seed.value,
        },
      });

      if (existing) {
        saved.push(existing);
        continue;
      }

      const created = await this.lookupRepository.save(seed);
      saved.push(created);
    }

    return saved;
  }

  private buildSimpleSeeds(
    category: LookupCategory,
    values: string[],
  ): Lookup[] {
    return values.map((value) =>
      this.lookupRepository.create({
        category,
        value,
        labelEn: value,
        labelAr: value,
        isActive: true,
      }),
    );
  }
}