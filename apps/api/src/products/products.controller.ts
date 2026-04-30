import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any): any { return this.service.findAll(req.user.tenantId, query); }

  @Get('search')
  search(@Req() req: any, @Query() query: any): any { return this.service.search(req.user.tenantId, query); }

  @Get('brands')
  brands(@Req() req: any) { return this.service.listBrands(req.user.tenantId); }

  @Post('brands')
  createBrand(@Req() req: any, @Body() body: any) { return this.service.createBrand(req.user.tenantId, req.user.role, body); }

  @Get('categories')
  categories(@Req() req: any) { return this.service.listCategories(req.user.tenantId); }

  @Post('categories')
  createCategory(@Req() req: any, @Body() body: any) { return this.service.createCategory(req.user.tenantId, req.user.role, body); }

  @Get('export')
  async exportProducts(@Req() req: any, @Res() res: any): Promise<any> {
    const csv = await this.service.exportProducts(req.user.tenantId, req.user.role);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="productos-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string): any { return this.service.get(req.user.tenantId, id); }

  @Post()
  create(@Req() req: any, @Body() body: any): any { return this.service.create(req.user.tenantId, req.user.sub, req.user.role, body); }

  @Post('bulk-delete')
  bulkDelete(@Req() req: any, @Body() body: any): any { return this.service.bulkRemove(req.user.tenantId, req.user.role, body.ids); }

  @Post('import')
  importProducts(@Req() req: any, @Body() body: any): any {
    return this.service.importProducts(req.user.tenantId, req.user.sub, req.user.role, body.rows, body.options);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any): any { return this.service.update(req.user.tenantId, req.user.sub, req.user.role, id, body); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string): any { return this.service.remove(req.user.tenantId, req.user.role, id); }
}


