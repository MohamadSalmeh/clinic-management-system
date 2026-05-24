import { BaseEntity } from '../../common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'lookups' })
@Index('IDX_lookup_category_is_active', ['category', 'isActive'])
export class Lookup extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'varchar', length: 255 })
  value!: string;

  @Column({ name: 'label_en', type: 'varchar', length: 255 })
  labelEn!: string;

  @Column({ name: 'label_ar', type: 'varchar', length: 255 })
  labelAr!: string;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId?: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
