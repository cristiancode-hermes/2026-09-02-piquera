import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HiveService } from './hive.service';
import { ProductPatchDto } from './hive.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly hive: HiveService) {}

  @Get('stats')
  stats() {
    return this.hive.adminStats();
  }

  @Patch('products/:id')
  patch(@Param('id') id: string, @Body() dto: ProductPatchDto) {
    return this.hive.patchProduct(id, dto);
  }
}
