import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HiveService } from './hive.service';
import { HarvestCreateDto, ScanDto, YardDayPatchDto } from './hive.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly hive: HiveService) {}

  @Post('scan')
  scan(@Body() dto: ScanDto) {
    if (dto.action === 'pickup-jar') return this.hive.pickupJar(dto.codeOrUrl);
    return this.hive.stampStaff(dto.codeOrUrl, dto.yardId);
  }

  @Get('today')
  today() {
    return this.hive.staffToday();
  }

  @Patch('yard-days/:yardId')
  patchDay(@Param('yardId') yardId: string, @Body() dto: YardDayPatchDto) {
    return this.hive.patchYardDay(yardId, dto);
  }

  @Post('harvests')
  open(@Body() dto: HarvestCreateDto) {
    return this.hive.openHarvest(dto);
  }
}
