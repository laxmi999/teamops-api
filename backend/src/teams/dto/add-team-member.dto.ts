import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AddTeamMemberDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;
}
