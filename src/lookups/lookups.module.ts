import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { Lookup } from './entities/lookup.entity';
import { LookupsController } from './lookups.controller';
import { LookupsSeeder } from './lookups.seeder';
import { LookupsService } from './lookups.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Lookup]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [LookupsController],
  providers: [LookupsService, LookupsSeeder],
  exports: [TypeOrmModule, LookupsService],
})
export class LookupsModule {}
