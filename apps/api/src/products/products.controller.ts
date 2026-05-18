import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
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
  @RequirePermission('products.manage')
  createBrand(@Req() req: any, @Body() body: any) { return this.service.createBrand(req.user.tenantId, req.user.role, body); }

  @Get('categories')
  categories(@Req() req: any) { return this.service.listCategories(req.user.tenantId); }

  @Post('categories')
  @RequirePermission('products.manage')
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
  @RequirePermission('products.create')
  create(@Req() req: any, @Body() dto: CreateProductDto): any { return this.service.create(req.user.tenantId, req.user.sub, req.user.role, dto); }

  @Post('bulk-delete')
  @RequirePermission('products.delete')
  bulkDelete(@Req() req: any, @Body() body: any): any { return this.service.bulkRemove(req.user.tenantId, req.user.role, body.ids); }

  @Post('import')
  @RequirePermission('products.manage')
  importProducts(@Req() req: any, @Body() body: any): any {
    return this.service.importProducts(req.user.tenantId, req.user.sub, req.user.role, body.rows, body.options);
  }

  @Patch(':id')
  @RequirePermission('products.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto): any { return this.service.update(req.user.tenantId, req.user.sub, req.user.role, id, dto); }

  @Delete(':id')
  @RequirePermission('products.delete')
  remove(@Req() req: any, @Param('id') id: string): any { return this.service.remove(req.user.tenantId, req.user.role, id); }
}
