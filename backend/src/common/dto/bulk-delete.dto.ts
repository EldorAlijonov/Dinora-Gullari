import { IsArray, IsDateString, IsIn, IsMongoId, IsOptional } from 'class-validator';

export type BulkDeleteScope = 'selected' | 'day' | 'week' | 'month' | 'range';

export class BulkDeleteDto {
  @IsIn(['selected', 'day', 'week', 'month', 'range'])
  scope: BulkDeleteScope;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  ids?: string[];

  @IsOptional()
  @IsDateString()
  anchorDate?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
