import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class ListTeamsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['id', 'name', 'createdAt'])
  sortBy: 'id' | 'name' | 'createdAt' = 'id';
}
