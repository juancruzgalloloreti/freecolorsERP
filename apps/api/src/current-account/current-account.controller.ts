import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentAccountService } from './current-account.service';

@UseGuards(JwtAuthGuard)
@Controller('currentAccount')
export class CurrentAccountController {
  constructor(private readonly service: CurrentAccountService) {}

  @Get()
  findAll() { return this.service.findAll(); }
}
