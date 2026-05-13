export function maxDiscountForRole(role: string | undefined): number {
  if (role === 'OWNER') return 100;
  if (role === 'ADMIN') return 30;
  if (role === 'EMPLOYEE') return 10;
  return 0;
}
