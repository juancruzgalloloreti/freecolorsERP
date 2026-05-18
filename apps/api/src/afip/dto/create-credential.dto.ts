import { IsString, IsEnum, IsDateString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum AfipEnv {
  TESTING = 'TESTING',
  PRODUCTION = 'PRODUCTION',
}

export class CreateCredentialDto {
  @ApiProperty({ example: '30-12345678-9' })
  @IsString()
  cuit: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  cert: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  privateKey: string;

  @ApiProperty({ enum: AfipEnv })
  @IsEnum(AfipEnv)
  environment: AfipEnv;

  @ApiProperty()
  @IsDateString()
  expiresAt: string;
}
