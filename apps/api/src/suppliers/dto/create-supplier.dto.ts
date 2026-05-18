import { IsString, IsOptional, IsEmail, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum IvaCondition {
  RESPONSABLE_INSCRIPTO = 'RESPONSABLE_INSCRIPTO',
  MONOTRIBUTISTA = 'MONOTRIBUTISTA',
  CONSUMIDOR_FINAL = 'CONSUMIDOR_FINAL',
  EXENTO = 'EXENTO',
  NO_CATEGORIZADO = 'NO_CATEGORIZADO',
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Proveedor S.A.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(13)
  cuit?: string;

  @ApiPropertyOptional({ enum: IvaCondition })
  @IsOptional()
  @IsEnum(IvaCondition)
  ivaCondition?: IvaCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
