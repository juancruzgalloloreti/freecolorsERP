import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runDryRun } from './dry-run';
import { runImport, step1Cleanup } from './import';

const prisma = new PrismaClient();

async function main() {
  const step = process.argv[2] || 'dry-run';

  console.log('══════════════════════════════════════════════');
  console.log('  Migración Legacy → ERP');
  console.log('══════════════════════════════════════════════');

  switch (step) {
    case 'dry-run': {
      const report = await runDryRun();
      if (report.needsReview.length > 0) {
        console.log(`\n⚠  ${report.needsReview.length} registros en NEEDS_REVIEW`);
        for (const nr of report.needsReview.slice(0, 5)) {
          console.log(`   - #${nr.idcomprobante} (${nr.type}): ${nr.reason}`);
        }
        if (report.needsReview.length > 5) {
          console.log(`   ... y ${report.needsReview.length - 5} más`);
        }
      }
      if (report.orphanProducts.length > 0) {
        console.log(`\n⚠  ${report.orphanProducts.length} productos con código vacío en movimientos`);
      }
      if (report.cuitCollisions.length > 0) {
        console.log(`\n⚠  ${report.cuitCollisions.length} CUITs con múltiples razones sociales`);
        for (const col of report.cuitCollisions.slice(0, 5)) {
          console.log(`   - CUIT ${col.cuit}: ${col.razonesSociales.join(', ')}`);
        }
      }
      if (report.numberCollisions.length > 0) {
        console.log(`\n⚠  ${report.numberCollisions.length} colisiones de número de comprobante`);
      }
      console.log(`\n✅ Dry run completado. ${report.importableCount} registros importables de ${report.totalComprobantes}.`);
      break;
    }

    case 'import': {
      await runImport();
      break;
    }

    case 'cleanup': {
      await step1Cleanup();
      break;
    }

    default:
      console.error('Uso: npx ts-node migrate-legacy/index.ts [dry-run|import|cleanup]');
      process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
