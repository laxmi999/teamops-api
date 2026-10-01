import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class ListProjectsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teamId?: number;

  @IsOptional()
  @IsIn(['id', 'name', 'createdAt', 'updatedAt'])
  sortBy: 'id' | 'name' | 'createdAt' | 'updatedAt' = 'id';
}
