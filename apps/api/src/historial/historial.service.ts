import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';

interface CajaQuery {
  tenantId: string;
  desde: string;
  hasta: string;
  tipoValor?: string;
  page: number;
  limit: number;
}

interface ResumenCCQuery {
  tenantId: string;
  soloConSaldo?: boolean;
  busqueda?: string;
}

interface FichaClienteQuery {
  tenantId: string;
  customerId: string;
  desde?: string;
  hasta?: string;
  ordenarPor?: 'fecha_contable' | 'fecha_comprobante' | 'fecha_vencimiento';
}

const TIPO_VALOR_DISPLAY: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CARD: 'Tarjeta',
};

function tipoValorDisplay(method: string): string {
  return TIPO_VALOR_DISPLAY[method] ?? method;
}

@Injectable()
export class HistorialService {
  constructor(private prisma: PrismaService) {}

  async getCajaDiariaHistorica(params: CajaQuery) {
    try {
      const { tenantId, desde, hasta, tipoValor, page, limit } = params;
      const offset = (page - 1) * limit;

      const movimientos = await this.prisma.$queryRaw<any[]>`
        SELECT
          cm.id,
          cm."createdAt"                                        as fecha,
          cm.description                                       as concepto,
          cm.method::text                                      as tipo_valor,
          cm."documentId"                                      as document_id,
          d."customerNameSnapshot"                             as razon_social,
          ldl."legacyDocumentName"                             as comprobante_tipo,
          COALESCE(ldl."legacyLetter", '')                     as letra,
          COALESCE(ldl."legacyPos"::text, '0')                 as punto_venta,
          COALESCE(ldl."legacyNumber"::text, '0')              as numero,
          CASE
            WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN cm.amount
            WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN 0
            WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN cm.amount
            WHEN cm.description ILIKE '%Recibos%' THEN cm.amount
            ELSE 0
          END                                                  as entradas,
          CASE
            WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN 0
            WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN cm.amount
            WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN 0
            WHEN cm.description ILIKE '%Pagos%' THEN cm.amount
            ELSE 0
          END                                                  as salidas,
          SUM(
            CASE
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN cm.amount
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN -cm.amount
              WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN cm.amount
              WHEN cm.description ILIKE '%Recibos%' THEN cm.amount
              WHEN cm.description ILIKE '%Pagos%' THEN -cm.amount
              ELSE 0
            END
          ) OVER (ORDER BY cm."createdAt" ASC, cm.id ASC)       as saldo_acumulado,
          COUNT(*) OVER()                                      as total_count
        FROM cash_movements cm
        LEFT JOIN documents d ON d.id = cm."documentId"
        LEFT JOIN legacy_document_links ldl
          ON ldl."tenantId" = cm."tenantId"
          AND ldl."legacyIdComprobante" = cm."reference"
        WHERE cm."tenantId" = ${tenantId}
          AND cm."createdAt" >= ${new Date(desde)}::timestamp
          AND cm."createdAt" <= ${new Date(hasta + 'T23:59:59')}::timestamp
          AND (cm."reference" IS NULL OR cm."reference" NOT IN (
            SELECT "reference" FROM current_account_entries
            WHERE "tenantId" = ${tenantId} AND "customerId" IS NULL AND "type" = 'PAYMENT' AND "reference" IS NOT NULL
          ))
          ${tipoValor ? Prisma.sql`AND cm.method = ${tipoValor}::"PaymentMethod"` : Prisma.empty}
        ORDER BY cm."createdAt" ASC, cm.id ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const resumen = await this.prisma.$queryRaw<any[]>`
        SELECT
          cm.method::text                                      as tipo_valor,
          SUM(
            CASE
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN cm.amount
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN 0
              WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN cm.amount
              WHEN cm.description ILIKE '%Recibos%' THEN cm.amount
              ELSE 0
            END
          )                                                    as entradas,
          SUM(
            CASE
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN 0
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN cm.amount
              WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN 0
              WHEN cm.description ILIKE '%Pagos%' THEN cm.amount
              ELSE 0
            END
          )                                                    as salidas,
          SUM(
            CASE
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL > 0 THEN cm.amount
              WHEN (ldl."rawJson"->>'wCaja')::DECIMAL < 0 THEN -cm.amount
              WHEN ldl.id IS NULL AND cm.method IN ('BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'MERCADO_PAGO') THEN cm.amount
              WHEN cm.description ILIKE '%Recibos%' THEN cm.amount
              WHEN cm.description ILIKE '%Pagos%' THEN -cm.amount
              ELSE 0
            END
          )                                                    as saldo
        FROM cash_movements cm
        LEFT JOIN legacy_document_links ldl
          ON ldl."tenantId" = cm."tenantId"
          AND ldl."legacyIdComprobante" = cm."reference"
        WHERE cm."tenantId" = ${tenantId}
          AND cm."createdAt" >= ${new Date(desde)}::timestamp
          AND cm."createdAt" <= ${new Date(hasta + 'T23:59:59')}::timestamp
          AND (cm."reference" IS NULL OR cm."reference" NOT IN (
            SELECT "reference" FROM current_account_entries
            WHERE "tenantId" = ${tenantId} AND "customerId" IS NULL AND "type" = 'PAYMENT' AND "reference" IS NOT NULL
          ))
          ${tipoValor ? Prisma.sql`AND cm.method = ${tipoValor}::"PaymentMethod"` : Prisma.empty}
        GROUP BY cm.method
        ORDER BY cm.method
      `;

      const movs = movimientos.map((m: any) => ({
        id: m.id,
        fecha: m.fecha,
        concepto: m.concepto,
        tipoValor: m.tipo_valor,
        tipoValorDisplay: tipoValorDisplay(m.tipo_valor),
        documentId: m.document_id,
        razonSocial: m.razon_social,
        comprobanteTipo: m.comprobante_tipo,
        letra: m.letra,
        puntoVenta: m.punto_venta,
        numero: m.numero,
        entradas: Number(m.entradas),
        salidas: Number(m.salidas),
        saldoAcumulado: Number(m.saldo_acumulado),
      }));

      const res = resumen.map((r: any) => ({
        tipoValor: r.tipo_valor,
        tipoValorDisplay: tipoValorDisplay(r.tipo_valor),
        entradas: Number(r.entradas),
        salidas: Number(r.salidas),
        saldo: Number(r.saldo),
      }));

      return {
        movimientos: movs,
        resumen: res,
        total: movs.length > 0 ? Number(movimientos[0].total_count) : 0,
        page,
        limit,
      };
    } catch (error) {
      console.error('getCajaDiariaHistorica error:', error);
      throw new InternalServerErrorException('Error al consultar historial de caja');
    }
  }

  async getResumenCC(params: ResumenCCQuery) {
    try {
      const { tenantId, soloConSaldo, busqueda } = params;

      const resultado = await this.prisma.$queryRaw<any[]>`
        SELECT
          c.id,
          c.name,
          c.cuit,
          c.phone,
          COALESCE(SUM(
            CASE
              WHEN cae.type IN ('INVOICE', 'DEBIT_NOTE') THEN cae.amount
              ELSE -ABS(cae.amount)
            END
          ), 0)::float as saldo_ars,
          0::float as saldo_usd
        FROM customers c
        LEFT JOIN current_account_entries cae
          ON cae."customerId" = c.id
          AND cae."tenantId" = ${tenantId}
        WHERE c."tenantId" = ${tenantId}
          ${busqueda ? Prisma.sql`AND (c.name ILIKE ${'%' + busqueda + '%'} OR c.cuit LIKE ${'%' + busqueda + '%'})` : Prisma.empty}
        GROUP BY c.id, c.name, c.cuit, c.phone
        ${soloConSaldo ? Prisma.sql`HAVING SUM(CASE WHEN cae.type IN ('INVOICE','DEBIT_NOTE') THEN cae.amount ELSE -ABS(cae.amount) END) != 0` : Prisma.empty}
        ORDER BY c.name ASC
      `;

      return resultado.map((r: any) => ({
        id: r.id,
        name: r.name,
        cuit: r.cuit,
        phone: r.phone,
        saldoArs: Number(r.saldo_ars),
        saldoUsd: Number(r.saldo_usd),
      }));
    } catch (error) {
      console.error('getResumenCC error:', error);
      throw new InternalServerErrorException('Error al consultar cuenta corriente');
    }
  }

  async getFichaCliente(params: FichaClienteQuery) {
    try {
      const { tenantId, customerId, desde, hasta, ordenarPor = 'fecha_contable' } = params;

      const orderField = ordenarPor === 'fecha_comprobante'
        ? 'd."date"'
        : ordenarPor === 'fecha_vencimiento'
          ? 'd."dueDate"'
          : 'cae."createdAt"';

      const movimientos = await this.prisma.$queryRaw<any[]>`
        SELECT
          cae.id,
          cae."createdAt"                                    as fecha_contable,
          d."date"                                           as fecha_comprobante,
          cae.type::text                                     as tipo,
          d."dueDate"                                        as fecha_vencimiento,
          ldl."legacyPos"                                    as punto_venta,
          ldl."legacyNumber"                                 as numero,
          ldl."legacyDocumentName"                           as comprobante_tipo,
          ldl."legacyLetter"                                 as letra,
          cae.description                                    as concepto,
          cae."documentId"                                   as document_id,
          CASE WHEN cae.type IN ('INVOICE','DEBIT_NOTE') THEN cae.amount ELSE 0 END        as debitos,
          CASE WHEN cae.type NOT IN ('INVOICE','DEBIT_NOTE') THEN cae.amount ELSE 0 END    as creditos,
          SUM(
            CASE
              WHEN cae.type IN ('INVOICE', 'DEBIT_NOTE') THEN cae.amount
              ELSE -ABS(cae.amount)
            END
          ) OVER (
            PARTITION BY cae."customerId"
            ORDER BY ${Prisma.sql([orderField])} ASC, cae.id ASC
          )                                                  as saldo_acumulado
        FROM current_account_entries cae
        LEFT JOIN documents d ON d.id = cae."documentId"
        LEFT JOIN legacy_document_links ldl
          ON ldl."tenantId" = cae."tenantId"
          AND ldl."legacyIdComprobante" = cae."reference"
        WHERE cae."tenantId" = ${tenantId}
          AND cae."customerId" = ${customerId}
          ${desde ? Prisma.sql`AND cae."createdAt" >= ${new Date(desde)}::timestamp` : Prisma.empty}
          ${hasta ? Prisma.sql`AND cae."createdAt" <= ${new Date(hasta + 'T23:59:59')}::timestamp` : Prisma.empty}
        ORDER BY ${Prisma.sql([orderField])} ASC, cae.id ASC
      `;

      const movs = movimientos.map((m: any) => ({
        id: m.id,
        fechaContable: m.fecha_contable,
        fechaComprobante: m.fecha_comprobante,
        tipo: m.tipo,
        fechaVencimiento: m.fecha_vencimiento,
        puntoVenta: m.punto_venta,
        numero: m.numero,
        comprobanteTipo: m.comprobante_tipo,
        letra: m.letra,
        concepto: m.concepto,
        documentId: m.document_id,
        debitos: Number(m.debitos),
        creditos: Number(m.creditos),
        saldoAcumulado: Number(m.saldo_acumulado),
      }));

      const saldoFinal = movs.length > 0
        ? movs[movs.length - 1].saldoAcumulado
        : 0;

      return { movimientos: movs, saldoFinal };
    } catch (error) {
      console.error('getFichaCliente error:', error);
      throw new InternalServerErrorException('Error al consultar ficha de cliente');
    }
  }
}
