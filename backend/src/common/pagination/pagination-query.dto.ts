import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min, IsOptional } from 'class-validator';

/**
 * Shared offset pagination params for list endpoints.
 * Subclasses add `sortBy` whitelists (and resource filters) per endpoint.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
