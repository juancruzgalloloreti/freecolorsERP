import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { pageParams, paged } from '../common/pagination';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}
  async findAll(tenantId: string, query: { search?: string; page?: number | string; limit?: number | string }): Promise<any> {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 80, 300);
    const where: any = { tenantId };
    if (query.search) where.OR = [{ name: { contains: query.search, mode: 'insensitive' } }, { cuit: { contains: query.search, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: shouldPage ? skip : undefined,
        take: query.limit || shouldPage ? limit : 500,
      }),
      shouldPage ? this.prisma.supplier.count({ where }) : Promise.resolve(0),
    ]);
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }
  create(tenantId: string, role: string, data: any): any {
    this.assertManager(role);
    return this.prisma.supplier.create({ data: { ...data, tenantId } });
  }

  async update(tenantId: string, role: string, id: string, data: any): Promise<any> {
    this.assertManager(role);
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(tenantId: string, role: string, id: string): Promise<any> {
    this.assertManager(role);
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Proveedor inexistente');
    const documents = await this.prisma.document.count({ where: { tenantId, supplierId: id } });
    if (documents) {
      const archived = await this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
      return { ...archived, deleted: false, archived: true };
    }
    const deleted = await this.prisma.supplier.delete({ where: { id } });
    return { ...deleted, deleted: true, archived: false };
  }

  private assertManager(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo la cuenta owner puede modificar proveedores');
    }
  }
}


