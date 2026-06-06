import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { HistorialService } from './historial.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('historial')
export class HistorialController {
  constructor(private readonly service: HistorialService) {}

  @Get('caja')
  @RequirePermission('historial.caja')
  async getCajaDiaria(
    @Req() req: any,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('tipoValor') tipoValor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getCajaDiariaHistorica({
      tenantId: req.user.tenantId,
      desde: desde || '2019-01-01',
      hasta: hasta || new Date().toISOString().split('T')[0],
      tipoValor,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get('cuenta-corriente')
  @RequirePermission('historial.cuenta-corriente')
  async getResumenCC(
    @Req() req: any,
    @Query('soloConSaldo') soloConSaldo?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.service.getResumenCC({
      tenantId: req.user.tenantId,
      soloConSaldo: soloConSaldo === 'true',
      busqueda,
    });
  }

  @Get('cuenta-corriente/:customerId')
  @RequirePermission('historial.cuenta-corriente')
  async getFichaCliente(
    @Req() req: any,
    @Param('customerId') customerId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('ordenarPor') ordenarPor?: string,
  ) {
    return this.service.getFichaCliente({
      tenantId: req.user.tenantId,
      customerId,
      desde,
      hasta,
      ordenarPor: ordenarPor as any,
    });
  }
}
