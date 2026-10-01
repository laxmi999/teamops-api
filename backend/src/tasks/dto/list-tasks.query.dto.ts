import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class ListTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number;

  @IsOptional()
  @IsIn(['id', 'title', 'status', 'dueDate', 'createdAt', 'updatedAt'])
  sortBy: 'id' | 'title' | 'status' | 'dueDate' | 'createdAt' | 'updatedAt' =
    'id';
}
