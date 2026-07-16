import { Role } from '@prisma/client';

/** Authenticated user shape attached by JwtStrategy / @CurrentUser() */
export type Actor = {
  id: number;
  email: string;
  role: Role;
};
