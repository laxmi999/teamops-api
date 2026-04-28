import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Connected to the database successfully.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Disconnected from the database.');
  }

  // async executeTransaction<T>(
  //   operations: (prisma: Prisma.TransactionClient) => Promise<T>,
  // ): Promise<T> {
  //   return this.$transaction(async (prisma) => {
  //     try {
  //       const result = await operations(prisma);
  //       console.log('✅ Transaction executed successfully.');
  //       return result;
  //     } catch (error) {
  //       console.error('❌ Transaction failed:', error);
  //       throw error; // Rethrow to ensure the transaction is rolled back
  //     }
  //   });
  // }
}
