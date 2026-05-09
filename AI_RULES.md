# AI_RULES.md - Reglas para trabajar en este ERP

Este proyecto es un ERP web ya construido parcialmente.

Objetivo:
Estabilizar, completar y preparar para venta. No reconstruir.

Documentos guia:
- `ERP_MAP.md`: mapa de modulos, rutas y riesgos.
- `LEGACY_GAP_ANALYSIS.md`: brechas observadas contra el sistema legacy Aguila.
- `LEGACY_BUTTON_FUNCTIONS.md`: inventario boton/control por pantalla legacy.
- `LEGACY_INTERNAL_BUTTON_MAP.md`: analisis enriquecido de botones internos criticos.
- `LEGACY_VALIDATION_BACKLOG.md`: controles legacy que requieren validacion viva antes de copiar paridad exacta.
- `ERP_WEB_WORKFLOW_RULES.md`: reglas para traducir comportamiento legacy a una web app comoda.

## Reglas generales

- No rehacer módulos completos.
- No cambiar arquitectura sin autorización.
- No tocar estilos globales salvo pedido explícito.
- No agregar dependencias sin permiso.
- No inventar funcionalidades nuevas.
- No copiar la UI legacy de forma literal; usarla solo como fuente de reglas y comportamiento.
- Mantener la UI nueva minimalista: pocas acciones visibles, secundarias agrupadas y acciones avanzadas protegidas.
- No duplicar componentes si ya existe uno similar.
- No borrar código existente sin explicar impacto.
- No usar datos mock en módulos productivos salvo que se indique.
- No dejar TODOs, placeholders ni comentarios tipo "implementar después".
- No cambiar nombres de rutas, tablas, componentes o funciones existentes sin aprobación.
- Si hay más de 5 archivos productivos afectados, detenerse y pedir aprobación.

## Reglas ERP

- El backend calcula totales; el frontend solo muestra o prepara datos de entrada.
- Stock no puede quedar negativo salvo configuración explícita.
- Toda venta debe estar asociada a cliente operativo, medio de pago y comprobante.
- Todo movimiento de stock debe tener motivo.
- Toda operación crítica debe tener validación.
- Caja, stock, ventas, comprobantes, pagos y permisos son módulos críticos.
- Los errores deben mostrarse en español.
- Las acciones destructivas requieren confirmación.
- Los cambios que afecten plata, stock o permisos requieren prueba funcional.
- Las listas de precio operativas son fijas: LP1, LP2, LP3, LP4, LP5, CR y CU.

## Clasificación de riesgo

Critico:
- Mostrador y ventas.
- Caja.
- Stock.
- Comprobantes.
- Pagos y cuenta corriente.
- Usuarios, permisos y roles.

Importante:
- Productos.
- Clientes.
- Compras.
- Proveedores.
- Listas de precio.
- Cheques.

Secundario:
- Dashboard.
- Reportes.
- Configuración visual.
- Pantallas informativas.
- Detalles visuales no críticos.

## Modo orquestador obligatorio

Antes de modificar:
- Identificar módulo.
- Identificar archivos afectados.
- Identificar dependencias.
- Estimar riesgo.
- Proponer plan corto.

Durante la modificación:
- Aplicar cambios mínimos.
- No reconstruir arquitectura global.
- No modificar archivos fuera del módulo salvo que se explique por qué.
- No mezclar normalización visual con cambios de lógica crítica.

Después de modificar:
- Listar archivos tocados.
- Explicar cómo probar.
- Indicar riesgos pendientes.
- Ejecutar verificación proporcional al riesgo.

## Fases de trabajo

FASE 1: Mapa del módulo.
FASE 2: Diagnóstico.
FASE 3: Plan de cambios.
FASE 4: Implementación mínima.
FASE 5: Verificación.

No saltear fases.
No implementar durante diagnóstico.
No modificar archivos fuera del módulo sin explicar impacto.
