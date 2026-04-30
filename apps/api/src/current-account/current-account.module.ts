import { Module } from '@nestjs/common';
import { CurrentAccountController } from './current-account.controller';
import { CurrentAccountService } from './current-account.service';

@Module({
  controllers: [CurrentAccountController],
  providers: [CurrentAccountService],
  exports: [CurrentAccountService],
})
export class CurrentAccountModule {}

