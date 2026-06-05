import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CurrentAccountController } from './current-account.controller';
import { CurrentAccountService } from './current-account.service';

@Module({
  imports: [PermissionsModule],
  controllers: [CurrentAccountController],
  providers: [CurrentAccountService],
  exports: [CurrentAccountService],
})
export class CurrentAccountModule {}

