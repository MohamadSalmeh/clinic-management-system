// filepath: c:\Users\hp\Desktop\projcet1\clinic-management-system\src\admins\dto\admin-dashboard-query.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { DashboardRange } from '../interfaces/admin-dashboard.interface';

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsEnum(DashboardRange)
  range: DashboardRange = DashboardRange.RANGE_30D;
}