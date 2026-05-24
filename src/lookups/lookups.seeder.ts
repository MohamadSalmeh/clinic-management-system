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
    const existingCount = await this.lookupRepository.count();

    if (existingCount > 0) {
      return;
    }

    const specialtySeeds = await this.lookupRepository.save([
      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SPECIALTY,
        value: 'CARDIOLOGY',
        labelEn: 'Cardiology',
        labelAr: 'العيادة القلبية',
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SPECIALTY,
        value: 'ORTHOPEDICS',
        labelEn: 'Orthopedics',
        labelAr: 'العيادة العظمية',
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.MEDICAL_SPECIALTY,
        value: 'PEDIATRICS',
        labelEn: 'Pediatrics',
        labelAr: 'عيادة الأطفال',
        isActive: true,
      }),
    ]);

    const conditionCategorySeeds = await this.lookupRepository.save([
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
    ]);

    const specialtyMap = new Map<string, number>();
    for (const specialty of specialtySeeds) {
      specialtyMap.set(specialty.value, specialty.id);
    }

    const conditionCategoryMap = new Map<string, number>();
    for (const category of conditionCategorySeeds) {
      conditionCategoryMap.set(category.value, category.id);
    }

    const baselineSeeds = [
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
      ...this.buildSimpleSeeds(LookupCategory.ALLERGY, [
        'Penicillin',
        'Peanut',
        'Dust',
        'Latex',
      ]),
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'IRRITABLE_BOWEL_SYNDROME',
        labelEn: 'Irritable Bowel Syndrome',
        labelAr: 'القولون العصبي',
        parentId: conditionCategoryMap.get('GASTROENTEROLOGY_DISEASES') ?? null,
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'GASTRIC_ULCER',
        labelEn: 'Gastric Ulcer',
        labelAr: 'قرحة المعدة',
        parentId: conditionCategoryMap.get('GASTROENTEROLOGY_DISEASES') ?? null,
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'ASTHMA',
        labelEn: 'Asthma',
        labelAr: 'الربو',
        parentId: conditionCategoryMap.get('RESPIRATORY_DISEASES') ?? null,
        isActive: true,
      }),
      this.lookupRepository.create({
        category: LookupCategory.CHRONIC_CONDITION,
        value: 'CHRONIC_BRONCHITIS',
        labelEn: 'Chronic Bronchitis',
        labelAr: 'التهاب القصبات المزمن',
        parentId: conditionCategoryMap.get('RESPIRATORY_DISEASES') ?? null,
        isActive: true,
      }),
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

    await this.lookupRepository.save(baselineSeeds);
  }

  private buildSimpleSeeds(category: LookupCategory, values: string[]): Lookup[] {
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
