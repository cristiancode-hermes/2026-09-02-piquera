import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];
}

export class CheckInDto {
  @ApiProperty()
  @IsString()
  yardId!: string;
}

export class ScanDto {
  @ApiProperty()
  @IsString()
  codeOrUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  yardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['stamp', 'pickup-jar'])
  action?: 'stamp' | 'pickup-jar';
}

export class YardDayPatchDto {
  @ApiProperty()
  @IsIn(['open', 'limited', 'closed'])
  status!: 'open' | 'limited' | 'closed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  capacityOverride?: number;
}

export class HarvestCreateDto {
  @ApiProperty()
  @IsString()
  yardId!: string;

  @ApiProperty()
  @IsString()
  startsOn!: string;

  @ApiProperty()
  @IsString()
  endsOn!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  minStamps!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  jarsTotal!: number;
}

export class ProductPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
