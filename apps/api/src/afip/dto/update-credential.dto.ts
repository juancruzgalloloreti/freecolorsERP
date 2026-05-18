import { IsString, IsEnum, IsDateString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum AfipEnv {
  TESTING = 'TESTING',
  PRODUCTION = 'PRODUCTION',
}

export class UpdateCredentialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cuit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  cert?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  privateKey?: string;

  @ApiPropertyOptional({ enum: AfipEnv })
  @IsOptional()
  @IsEnum(AfipEnv)
  environment?: AfipEnv;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
