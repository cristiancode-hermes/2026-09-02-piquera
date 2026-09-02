import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HiveService } from './hive.service';
import { CheckInDto, CheckoutDto } from './hive.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';
import type { AuthUser } from '../auth/current-user';

@ApiTags('hive')
@Controller()
export class HiveController {
  constructor(private readonly hive: HiveService) {}

  @Get('home')
  home() {
    return this.hive.home();
  }

  @Get('yards')
  yards() {
    return this.hive.listYards();
  }

  @Get('yards/:slug')
  yard(@Param('slug') slug: string) {
    return this.hive.getYard(slug);
  }

  @Get('products')
  products() {
    return this.hive.listProducts();
  }

  @Get('addons')
  addons() {
    return this.hive.listAddons();
  }

  @Post('passes/checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.hive.checkout(user.userId, dto.productId, dto.addonIds || []);
  }

  @Get('passes/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.hive.listMyPasses(user.userId);
  }

  @Get('passes/mine/:code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myPass(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.hive.getMyPass(user.userId, code);
  }

  @Get('passes/by-code/:code')
  byCode(@Param('code') code: string) {
    return this.hive.getByCode(code);
  }

  @Post('passes/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hive.cancelPass(user.userId, id);
  }

  @Get('check-ins/mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myStamps(@CurrentUser() user: AuthUser) {
    return this.hive.myCheckIns(user.userId);
  }

  @Post('check-ins')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  stamp(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.hive.stampSelf(user.userId, dto.yardId);
  }

  @Get('harvests/current')
  harvest() {
    return this.hive.currentHarvest();
  }

  @Post('harvests/:id/claim')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  claim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hive.claimHarvest(user.userId, id);
  }
}
