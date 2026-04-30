import { ForbiddenException } from '@nestjs/common';

export type Permission =
  | 'users.manage'
  | 'documents.create'
  | 'documents.confirm'
  | 'documents.cancel'
  | 'sales.discount.apply'
  | 'sales.discount.override'
  | 'stock.adjust'
  | 'prices.update'
  | 'cash.open'
  | 'cash.close'
  | 'cash.move'
  | 'audit.read';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    'users.manage',
    'documents.create',
    'documents.confirm',
    'documents.cancel',
    'sales.discount.apply',
    'sales.discount.override',
    'stock.adjust',
    'prices.update',
    'cash.open',
    'cash.close',
    'cash.move',
    'audit.read',
  ],
  ADMIN: [
    'documents.create',
    'documents.confirm',
    'documents.cancel',
    'sales.discount.apply',
    'stock.adjust',
    'prices.update',
    'cash.open',
    'cash.close',
    'cash.move',
    'audit.read',
  ],
  EMPLOYEE: [
    'documents.create',
    'documents.confirm',
    'sales.discount.apply',
    'cash.open',
    'cash.close',
    'cash.move',
  ],
  READONLY: ['audit.read'],
};

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  return Boolean(role && ROLE_PERMISSIONS[role]?.includes(permission));
}

export function assertPermission(role: string | undefined, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenException('No tenes permiso para realizar esta accion');
  }
}

export function maxDiscountForRole(role: string | undefined): number {
  if (role === 'OWNER') return 100;
  if (role === 'ADMIN') return 30;
  if (role === 'EMPLOYEE') return 10;
  return 0;
}
