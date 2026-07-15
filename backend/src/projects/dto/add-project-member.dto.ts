import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AddProjectMemberDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;
}
