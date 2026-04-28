/**
 * BUG FIX: antes exportaba de '@prisma/client' (default output),
 * pero el schema.prisma usa output = "../src/generated/client".
 * Son dos clientes distintos — nunca deben mezclarse en un monorepo.
 *
 * Ahora exportamos TODO desde el cliente generado en la ruta correcta,
 * incluidos los enums que el seed y los servicios necesitan.
 */
export {
  PrismaClient,
  Prisma,
  Plan,
  UserRole,
  IvaCondition,
  StockMovementType,
  DocumentType,
  DocumentStatus,
  CcEntryType,
  PaymentMethod,
} from '@prisma/client';
