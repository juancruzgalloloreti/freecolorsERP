import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PriceListsService } from './price-lists.service';

@UseGuards(JwtAuthGuard)
@Controller('priceLists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}

  @Get()
  findAll() { return this.service.findAll(); }
}
