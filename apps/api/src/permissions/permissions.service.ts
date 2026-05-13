import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject, forwardRef } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AuditService)) private audit: AuditService,
  ) {}

  private readonly roleDefaults: Record<string, string[]> = {
    OWNER: ['*'],
    ADMIN: [
      'sale.create', 'sale.discount', 'sale.discount.apply', 'sale.discount.override', 'sale.cancel', 'sale.view',
      'stock.view', 'stock.adjust', 'stock.transfer',
      'cash.open', 'cash.close', 'cash.move',
      'customer.create', 'customer.edit', 'customer.delete', 'customer.credit_limit',
      'supplier.create', 'supplier.edit', 'supplier.delete',
      'product.create', 'product.edit', 'product.delete',
      'document.create', 'document.confirm', 'document.cancel', 'document.approve_large_amount',
      'price.update',
      'audit.read',
      'purchase.view', 'purchase.create', 'purchase.edit', 'purchase.receive', 'purchase.cancel',
      'check.view', 'check.manage',
      'approval.view', 'approval.manage', 'approval.decide',
      'report.view', 'report.export',
      'user.create', 'user.edit', 'user.manage', 'user.delete', 'user.manage_permissions',
    ],
    EMPLOYEE: [
      'sale.create', 'sale.discount', 'sale.discount.apply', 'sale.view',
      'stock.view',
      'cash.open', 'cash.close', 'cash.move',
      'customer.create', 'customer.edit',
      'supplier.create', 'supplier.edit',
      'document.create', 'document.confirm',
      'purchase.view', 'purchase.create', 'purchase.receive',
      'check.view',
      'approval.view', 'approval.decide',
    ],
    READONLY: [
      'sale.view', 'stock.view', 'purchase.view', 'check.view', 'approval.view', 'report.view', 'audit.read',
    ],
  }

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    })
  }

  async findById(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    })
    if (!permission) {
      throw new NotFoundException('Permission not found')
    }
    return permission
  }

  async findByCode(code: string) {
    return this.prisma.permission.findUnique({
      where: { code },
    })
  }

  async findByCategory(category: string) {
    return this.prisma.permission.findMany({
      where: { category },
      orderBy: { code: 'asc' },
    })
  }

  async create(data: { code: string; description: string; category: string }) {
    const existing = await this.prisma.permission.findUnique({
      where: { code: data.code },
    })
    if (existing) {
      throw new ConflictException(`Permission with code ${data.code} already exists`)
    }
    return this.prisma.permission.create({
      data,
    })
  }

  async update(id: string, data: { description?: string; category?: string }) {
    const permission = await this.findById(id)
    return this.prisma.permission.update({
      where: { id },
      data,
    })
  }

  async remove(id: string) {
    await this.findById(id)
    return this.prisma.permission.delete({
      where: { id },
    })
  }

  private async assertUserInTenant(userId: string, tenantId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado en el tenant');
  }

  // User permissions
  async getUserPermissions(userId: string, tenantId?: string) {
    if (tenantId) await this.assertUserInTenant(userId, tenantId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        userPermissions: {
          include: { permission: true },
          orderBy: { grantedAt: 'desc' },
        },
      },
    })
    if (!user) return []

    if (this.roleDefaults[user.role]?.includes('*')) {
      return this.findAll()
    }

    const explicit = user.userPermissions.map((up) => up.permission)
    const explicitCodes = new Set(explicit.map((permission) => permission.code))
    const defaultCodes = (this.roleDefaults[user.role] ?? []).filter((code) => code !== '*' && !explicitCodes.has(code))

    if (defaultCodes.length === 0) return explicit

    const defaults = await this.prisma.permission.findMany({
      where: { code: { in: defaultCodes } },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    })
    return [...explicit, ...defaults]
  }

  async grantPermissionToUser(tenantId: string, userId: string, permissionId: string, requesterId: string) {
    await this.assertUserInTenant(userId, tenantId)

    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    })
    if (existing) {
      throw new ConflictException('User already has this permission')
    }

    const result = await this.prisma.userPermission.create({
      data: {
        userId,
        permissionId,
      },
    })

    await this.audit.record({
      tenantId,
      userId: requesterId,
      action: 'permissions.grant',
      entityType: 'UserPermission',
      entityId: result.id,
      summary: `Permiso ${permissionId} otorgado a usuario ${userId}`,
      metadata: { targetUserId: userId, permissionId },
    })

    return result
  }

  async revokePermissionFromUser(tenantId: string, userId: string, permissionId: string, requesterId: string) {
    await this.assertUserInTenant(userId, tenantId)

    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    })
    if (!existing) {
      throw new NotFoundException('User permission not found')
    }

    const result = await this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    })

    await this.audit.record({
      tenantId,
      userId: requesterId,
      action: 'permissions.revoke',
      entityType: 'UserPermission',
      entityId: permissionId,
      summary: `Permiso ${permissionId} revocado de usuario ${userId}`,
      metadata: { targetUserId: userId, permissionId },
    })

    return result
  }

  async syncUserPermissions(tenantId: string, userId: string, permissionCodes: string[], requesterId: string) {
    await this.assertUserInTenant(userId, tenantId)
    if (requesterId === userId) {
      throw new ForbiddenException('No podés modificar tus propios permisos')
    }

    // Get all permission IDs from codes
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes,
        },
      },
    })
    const permissionIds = permissions.map((p) => p.id)

    // Delete existing user permissions
    const deleted = await this.prisma.userPermission.deleteMany({
      where: { userId },
    })

    // Create new user permissions
    await this.prisma.userPermission.createMany({
      data: permissionIds.map((permissionId) => ({
        userId,
        permissionId,
      })),
      skipDuplicates: true,
    })

    await this.audit.record({
      tenantId,
      userId: requesterId,
      action: 'permissions.sync',
      entityType: 'User',
      entityId: userId,
      summary: `Permisos sincronizados para usuario ${userId}: ${permissionCodes.length} permisos`,
      metadata: { targetUserId: userId, permissionCodes, previousCount: deleted.count },
    })

    return this.getUserPermissions(userId, tenantId)
  }

  async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (!user) return false

    if (this.roleDefaults[user.role]?.includes('*') || this.roleDefaults[user.role]?.includes(permissionCode)) {
      return true
    }

    const userPermissions = await this.getUserPermissions(userId)
    return userPermissions.some((p) => p.code === permissionCode)
  }

  async hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (!user) return false

    if (this.roleDefaults[user.role]?.includes('*') || permissionCodes.some((code) => this.roleDefaults[user.role]?.includes(code))) {
      return true
    }

    const userPermissions = await this.getUserPermissions(userId)
    return userPermissions.some((p) => permissionCodes.includes(p.code))
  }

  // Seed default permissions
  async seedDefaultPermissions() {
    const defaultPermissions = [
      // Sales permissions
      { code: 'sale.create', description: 'Crear ventas', category: 'sales' },
      { code: 'sale.discount', description: 'Aplicar descuentos en ventas', category: 'sales' },
      { code: 'sale.discount.apply', description: 'Aplicar descuento por línea', category: 'sales' },
      { code: 'sale.discount.override', description: 'Sobreescribir límite de descuento', category: 'sales' },
      { code: 'sale.cancel', description: 'Cancelar ventas', category: 'sales' },
      { code: 'sale.view', description: 'Ver ventas', category: 'sales' },
      // Stock permissions
      { code: 'stock.view', description: 'Ver stock', category: 'stock' },
      { code: 'stock.adjust', description: 'Ajustar stock', category: 'stock' },
      { code: 'stock.transfer', description: 'Transferir stock entre depósitos', category: 'stock' },
      // Cash permissions
      { code: 'cash.open', description: 'Abrir caja', category: 'cash' },
      { code: 'cash.close', description: 'Cerrar caja', category: 'cash' },
      { code: 'cash.move', description: 'Registrar movimientos de caja', category: 'cash' },
      // Customers permissions
      { code: 'customer.create', description: 'Crear clientes', category: 'customers' },
      { code: 'customer.edit', description: 'Editar clientes', category: 'customers' },
      { code: 'customer.delete', description: 'Eliminar clientes', category: 'customers' },
      { code: 'customer.credit_limit', description: 'Modificar límite de crédito', category: 'customers' },
      // Suppliers permissions
      { code: 'supplier.create', description: 'Crear proveedores', category: 'suppliers' },
      { code: 'supplier.edit', description: 'Editar proveedores', category: 'suppliers' },
      { code: 'supplier.delete', description: 'Eliminar proveedores', category: 'suppliers' },
      // Purchases permissions
      { code: 'purchase.view', description: 'Ver compras', category: 'purchases' },
      { code: 'purchase.create', description: 'Crear órdenes de compra', category: 'purchases' },
      { code: 'purchase.edit', description: 'Editar órdenes de compra', category: 'purchases' },
      { code: 'purchase.receive', description: 'Registrar recepciones de compra', category: 'purchases' },
      { code: 'purchase.cancel', description: 'Cancelar órdenes de compra', category: 'purchases' },
      // Checks permissions
      { code: 'check.view', description: 'Ver cheques', category: 'checks' },
      { code: 'check.manage', description: 'Gestionar estados de cheques', category: 'checks' },
      // Approval permissions
      { code: 'approval.view', description: 'Ver aprobaciones', category: 'approvals' },
      { code: 'approval.manage', description: 'Gestionar flujos de aprobación', category: 'approvals' },
      { code: 'approval.decide', description: 'Aprobar o rechazar solicitudes', category: 'approvals' },
      // Products permissions
      { code: 'product.create', description: 'Crear productos', category: 'products' },
      { code: 'product.edit', description: 'Editar productos', category: 'products' },
      { code: 'product.delete', description: 'Eliminar productos', category: 'products' },
      // Documents permissions
      { code: 'document.create', description: 'Crear documentos', category: 'documents' },
      { code: 'document.confirm', description: 'Confirmar documentos', category: 'documents' },
      { code: 'document.cancel', description: 'Anular documentos', category: 'documents' },
      { code: 'document.approve_large_amount', description: 'Aprobar documentos de monto elevado', category: 'documents' },
      // Reports permissions
      { code: 'report.view', description: 'Ver reportes', category: 'reports' },
      { code: 'report.export', description: 'Exportar reportes', category: 'reports' },
      // Price permissions
      { code: 'price.update', description: 'Actualizar precios', category: 'prices' },
      // Audit permissions
      { code: 'audit.read', description: 'Ver registro de auditoría', category: 'audit' },
      // Users permissions
      { code: 'user.create', description: 'Crear usuarios', category: 'users' },
      { code: 'user.edit', description: 'Editar usuarios', category: 'users' },
      { code: 'user.manage', description: 'Gestionar usuarios', category: 'users' },
      { code: 'user.delete', description: 'Eliminar usuarios', category: 'users' },
      { code: 'user.manage_permissions', description: 'Gestionar permisos de usuarios', category: 'users' },
    ]

    for (const permission of defaultPermissions) {
      const existing = await this.prisma.permission.findUnique({
        where: { code: permission.code },
      })
      if (!existing) {
        await this.prisma.permission.create({
          data: permission,
        })
      }
    }

    return { count: defaultPermissions.length }
  }
}
