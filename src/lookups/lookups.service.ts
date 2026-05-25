import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Lookup } from './entities/lookup.entity';
import { CreateLookupDto, LookupQueryDto, UpdateLookupDto } from './dto';

@Injectable()
export class LookupsService {
  constructor(
    @InjectRepository(Lookup)
    private readonly lookupRepository: Repository<Lookup>,
  ) {}

  async findAll(query: LookupQueryDto): Promise<Lookup[]> {
    const where: FindOptionsWhere<Lookup> = { isActive: true };

    if (query.category) {
      where.category = query.category;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    return this.lookupRepository.find({
      where,
      order: { labelEn: 'ASC' },
    });
  }

  async create(dto: CreateLookupDto): Promise<Lookup> {
    const lookup = this.lookupRepository.create({
      category: dto.category,
      value: dto.value,
      labelEn: dto.labelEn,
      labelAr: dto.labelAr,
      parentId: dto.parentId ?? null,
      isActive: true,
    });

    return this.lookupRepository.save(lookup);
  }

  async findOne(id: number): Promise<Lookup> {
    const lookup = await this.lookupRepository.findOne({ where: { id } });

    if (!lookup) {
      throw new NotFoundException('Lookup not found');
    }

    return lookup;
  }

  async update(id: number, dto: UpdateLookupDto): Promise<Lookup> {
    const lookup = await this.findOne(id);

    if (dto.category !== undefined) {
      lookup.category = dto.category;
    }

    if (dto.value !== undefined) {
      lookup.value = dto.value;
    }

    if (dto.labelEn !== undefined) {
      lookup.labelEn = dto.labelEn;
    }

    if (dto.labelAr !== undefined) {
      lookup.labelAr = dto.labelAr;
    }

    if (dto.parentId !== undefined) {
      lookup.parentId = dto.parentId;
    }

    return this.lookupRepository.save(lookup);
  }

  async toggleStatus(id: number): Promise<Lookup> {
    const lookup = await this.findOne(id);
    lookup.isActive = !lookup.isActive;

    return this.lookupRepository.save(lookup);
  }

  async remove(id: number): Promise<void> {
    const lookup = await this.findOne(id);
    await this.lookupRepository.remove(lookup);
  }
}
