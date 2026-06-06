import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const TENANT_ID = 'cmp4aa5590000htk1esx6jdhx';

interface MatchReport {
  total: number;
  matchedByLegacyInDesc: number;
  matchedByPvNumber: number;
  matchedByAmountDateCustomer: number;
  collisionsResolved: number;
  unmatched: number;
  log: string[];
}

async function main() {
  const report: MatchReport = {
    total: 0, matchedByLegacyInDesc: 0, matchedByPvNumber: 0,
    matchedByAmountDateCustomer: 0, collisionsResolved: 0,
    unmatched: 0, log: [],
  };

  const entries = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id, description, amount, date, "customerId"
    FROM current_account_entries
    WHERE "tenantId" = ${TENANT_ID} AND "reference" IS NULL
  `);

  report.total = entries.length;
  report.log.push(`Total CC entries to process: ${entries.length}`);

  for (const entry of entries) {
    const matchedId = await tryMatch(entry, report);
    if (matchedId) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE current_account_entries SET "reference" = ${matchedId} WHERE id = ${entry.id}
      `);
    } else {
      report.unmatched++;
      report.log.push(`UNMATCHED: id=${entry.id} desc=[${entry.description}] amount=${entry.amount} date=${entry.date}`);
    }
  }

  report.log.push('');
  report.log.push('=== REPORTE FINAL ===');
  report.log.push(`Total CC entries: ${report.total}`);
  report.log.push(`Matcheados por legacy en description: ${report.matchedByLegacyInDesc}`);
  report.log.push(`Matcheados por tipo+PV+numero: ${report.matchedByPvNumber}`);
  report.log.push(`Matcheados por amount+date+customer: ${report.matchedByAmountDateCustomer}`);
  report.log.push(`Colisiones resueltas (elegido más cercano): ${report.collisionsResolved}`);
  report.log.push(`Sin match: ${report.unmatched}`);

  const reportStr = report.log.join('\n');
  console.log(reportStr);
  fs.writeFileSync('/tmp/populate-cc-reference-report.txt', reportStr);
  console.log('Report saved to /tmp/populate-cc-reference-report.txt');
}

async function tryMatch(entry: any, report: MatchReport): Promise<string | null> {
  const desc: string = entry.description;

  // Priority 1: Try extracting from description if it has "legacy NNN"
  const legacyMatch = desc.match(/legacy[:\s]*(\d+)/i);
  if (legacyMatch) {
    const legacyId = legacyMatch[1];
    const exists = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 1 FROM legacy_document_links
      WHERE "tenantId" = ${TENANT_ID} AND "legacyIdComprobante" = ${legacyId}
    `);
    if (exists.length > 0) {
      report.matchedByLegacyInDesc++;
      report.log.push(`MATCHED (desc legacy): ${desc} -> legacyId=${legacyId}`);
      return legacyId;
    }
  }

  // Priority 2: Parse "Tipo - xPV-Number" to match legacy_document_links
  const pvMatch = desc.match(/^(.+?)\s*-\s*([a-zA-Z]?)(\d+)-(\d+)$/);
  if (pvMatch) {
    const tipo = pvMatch[1].trim();
    const letter = pvMatch[2].toLowerCase() || '';
    const pos = parseInt(pvMatch[3], 10);
    const number = parseInt(pvMatch[4], 10);

    const candidates = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "legacyIdComprobante", "legacyDate"
      FROM legacy_document_links
      WHERE "tenantId" = ${TENANT_ID}
        AND "legacyDocumentName" = ${tipo}
        AND "legacyPos" = ${pos}
        AND "legacyNumber" = ${number}
        AND (${letter} = '' OR LOWER("legacyLetter") = ${letter})
    `);

    if (candidates.length === 1) {
      report.matchedByPvNumber++;
      report.log.push(`MATCHED (PV+number): ${desc} -> legacyId=${candidates[0].legacyIdComprobante}`);
      return candidates[0].legacyIdComprobante;
    }
    if (candidates.length > 1) {
      report.collisionsResolved++;
      const best = pickClosestDate(candidates, new Date(entry.date));
      report.log.push(`COLLISION (${candidates.length}) for ${desc}, picked legacyId=${best.legacyIdComprobante}`);
      return best.legacyIdComprobante;
    }
  }

  // Priority 3: Match by customerId + amount + date
  if (entry.customerId) {
    const entryDate = new Date(entry.date);
    const dayBefore = new Date(entryDate.getTime() - 24 * 60 * 60 * 1000);
    const dayAfter = new Date(entryDate.getTime() + 24 * 60 * 60 * 1000);

    const candidates = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "legacyIdComprobante", "legacyDate"
      FROM legacy_document_links
      WHERE "tenantId" = ${TENANT_ID}
        AND ("rawJson"->>'wCtaCte')::DECIMAL = ${entry.amount}
        AND "legacyDate" >= ${dayBefore}
        AND "legacyDate" <= ${dayAfter}
    `);

    if (candidates.length === 1) {
      report.matchedByAmountDateCustomer++;
      report.log.push(`MATCHED (amount+date): ${desc} amount=${entry.amount} -> legacyId=${candidates[0].legacyIdComprobante}`);
      return candidates[0].legacyIdComprobante;
    }
    if (candidates.length > 1) {
      report.collisionsResolved++;
      const best = pickClosestDate(candidates, entryDate);
      report.log.push(`COLLISION (${candidates.length}) for ${desc} amount=${entry.amount}, picked legacyId=${best.legacyIdComprobante}`);
      return best.legacyIdComprobante;
    }
  }

  return null;
}

function pickClosestDate(candidates: any[], target: Date): any {
  let best = candidates[0];
  let bestDiff = Math.abs(new Date(candidates[0].legacyDate).getTime() - target.getTime());
  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(new Date(candidates[i].legacyDate).getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidates[i];
    }
  }
  return best;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
