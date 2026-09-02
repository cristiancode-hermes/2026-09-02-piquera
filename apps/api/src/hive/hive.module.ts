import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { HiveService } from './hive.service';
import { HiveController } from './hive.controller';
import { StaffController } from './staff.controller';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [HiveController, StaffController, AdminController],
  providers: [HiveService],
  exports: [HiveService],
})
export class HiveModule {}
