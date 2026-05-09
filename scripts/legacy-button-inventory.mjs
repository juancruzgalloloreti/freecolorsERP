import fs from "node:fs";
import path from "node:path";

const rawDir = path.join("docs", "legacy-audit", "raw");
const outFile = "LEGACY_BUTTON_FUNCTIONS.md";

const CONTROL_TYPES = new Set([
  "Button",
  "RadioButton",
  "CheckBox",
  "ComboBox",
  "Edit",
  "TabItem",
  "ListItem",
  "HeaderItem",
]);

const risky = [
  /grabar/i,
  /guardar/i,
  /cancelar/i,
  /eliminar/i,
  /borrar/i,
  /anular/i,
  /inventario/i,
  /movimientos a otro producto/i,
  /precio especial/i,
  /cambiar/i,
  /deposito/i,
  /transferencia/i,
  /cierre/i,
  /cerrar caja/i,
  /recibir/i,
  /verificar/i,
  /autorizar/i,
];

const medium = [
  /añadir/i,
  /editar/i,
  /copiar producto/i,
  /cargar/i,
  /contado/i,
  /cta\.?cte/i,
  /stock/i,
  /importar/i,
  /etiqueta/i,
  /solicitar compra/i,
  /venta perdida/i,
  /pedido/i,
  /mail/i,
  /redondear/i,
  /actualizar/i,
  /aplicar/i,
  /confirmar/i,
];

const EXACT_FUNCTIONS = [
  [/^Ver Cta\. Cte\.$/i, "Abrir estado/ficha de cuenta corriente del cliente."],
  [/^Que Percibe$/i, "Ver o calcular percepciones/impuestos adicionales del comprobante."],
  [/^SubTotal$/i, "Fila resumen de subtotal calculado."],
  [/^TOTAL$/i, "Fila resumen de total final calculado."],
  [/^Desc\.Ampliada$/i, "Editar/ver descripcion ampliada del item."],
  [/^%$/i, "Aplicar porcentaje al item/documento segun contexto."],
  [/^Descuento$/i, "Aplicar descuento al item/documento."],
  [/^Varios$/i, "Abrir acciones varias de item/comprobante."],
  [/^Varios 2$/i, "Abrir segundo grupo de acciones varias de item/comprobante."],
  [/^Carritos$/i, "Abrir/recuperar carritos o selecciones guardadas."],
  [/^Dep[oó]sito$/i, "Elegir deposito para item/operacion."],
  [/^Presupuesto$/i, "Relacionar, cargar o convertir presupuesto segun flujo activo."],
  [/^Datos Remito$/i, "Cargar datos de remito/entrega asociados al comprobante."],
  [/^Cambiar$/i, "Cambiar definicion/tipo de comprobante u operacion."],
  [/^Aplicacion de Comprobantes Pres\.$/i, "Aplicar comprobantes presupuestarios."],
  [/^Aplicacion de Comprobantes$/i, "Aplicar comprobantes."],
  [/^Asiento Contable/i, "Cargar asiento contable."],
  [/^Pagos$/i, "Cargar pago."],
  [/^Recibos$/i, "Cargar recibo/cobranza."],
  [/^Depositos Bancarios$/i, "Cargar deposito bancario."],
  [/^Deposito Bancario/i, "Cargar deposito bancario."],
  [/^Transferencias de Valores$/i, "Cargar transferencia de valores."],
  [/^Transferencia entre Depositos$/i, "Cargar transferencia entre depositos."],
  [/^Ajuste de Inventario Negativo$/i, "Cargar ajuste de inventario negativo."],
  [/^Ajuste de Inventario Positivo$/i, "Cargar ajuste de inventario positivo."],
  [/^Ajuste por Inventario$/i, "Cargar ajuste por inventario."],
  [/^Inventario Fisico$/i, "Abrir inventario fisico."],
  [/^\(F4\)-Factura Fiscal$/i, "Seleccionar factura fiscal."],
  [/^\(F5\)-Factura manual$/i, "Seleccionar factura manual."],
  [/^\(F6\)-NC Fiscal$/i, "Seleccionar nota de credito fiscal."],
  [/^\(F7\)-NC Manual$/i, "Seleccionar nota de credito manual."],
  [/^\(F8\)-ND Fiscal$/i, "Seleccionar nota de debito fiscal."],
  [/^\(F9\)-ND Manual$/i, "Seleccionar nota de debito manual."],
  [/^Factura Fiscal$/i, "Seleccionar factura fiscal."],
  [/^Factura manual$/i, "Seleccionar factura manual."],
  [/^Factura Presupuestos$/i, "Seleccionar factura/presupuesto."],
  [/^Factura Proveedores/i, "Seleccionar factura de proveedor."],
  [/^NC Proveedores/i, "Seleccionar nota de credito de proveedor."],
  [/^ND Proveedores/i, "Seleccionar nota de debito de proveedor."],
  [/^Unid\.De Neg\.$/i, "Abrir/seleccionar unidad de negocio."],
  [/^UN$/i, "Abrir/seleccionar unidad de negocio."],
  [/^Registrar Llamada$/i, "Registrar llamada/soporte comercial."],
  [/^Soporte$/i, "Abrir soporte."],
  [/^TICKETS Soporte$/i, "Abrir tickets de soporte."],
  [/^Agenda$/i, "Abrir agenda."],
  [/^Obtener CAE \/ Imp\.Fiscal$/i, "Abrir avisos/operacion fiscal CAE o impresion fiscal."],
  [/^Cambiar Clave Usuario$/i, "Cambiar clave del usuario."],
  [/^Colores$/i, "Configurar colores/tema legacy."],
  [/^Versiones Instaladas$/i, "Ver versiones instaladas."],
  [/^Manual del sistema$/i, "Abrir manual del sistema."],
  [/^Terminos y Condiciones$/i, "Abrir terminos y condiciones."],
  [/^Ver Mensajes$/i, "Abrir mensajes del sistema."],
  [/^Línea arriba$/i, "Desplazar grilla una linea arriba."],
  [/^Línea abajo$/i, "Desplazar grilla una linea abajo."],
  [/^Av Pág$/i, "Avanzar pagina en grilla/lista."],
  [/^Re Pág$/i, "Retroceder pagina en grilla/lista."],
  [/^Columna a la izquierda$/i, "Mover grilla una columna a la izquierda."],
  [/^Columna a la derecha$/i, "Mover grilla una columna a la derecha."],
  [/^Página a la derecha$/i, "Mover grilla una pagina a la derecha."],
  [/^Subir$/i, "Aumentar valor en control numerico."],
  [/^Bajar$/i, "Disminuir valor en control numerico."],
  [/^Caja Central$/i, "Caja seleccionable para consulta."],
  [/^Caja Mostrador$/i, "Caja seleccionable para consulta/mostrador."],
  [/^Carga de Operaciones$/i, "Abrir selector de operaciones."],
  [/^Consultar Productos$/i, "Abrir consulta operativa de productos."],
  [/^Preparar Transferencia entre depósitos$/i, "Abrir preparacion de transferencia entre depositos."],
  [/^Ampliar$/i, "Abrir detalle ampliado del registro seleccionado."],
  [/^Ampliar Comprobante$/i, "Abrir detalle ampliado del comprobante."],
  [/^Ampliar Operacion$/i, "Abrir detalle ampliado de la operacion."],
  [/^Amplia Cheque$/i, "Abrir detalle ampliado del cheque."],
  [/^Ordenar Columnas$/i, "Configurar orden/visibilidad de columnas."],
  [/^Mas Opciones de búsqueda$/i, "Mostrar filtros avanzados de busqueda."],
  [/^Opciones de Busq\.$/i, "Mostrar filtros avanzados de busqueda."],
  [/^Comprobantes sin Imputación$/i, "Abrir consulta de comprobantes sin imputacion."],
  [/^Link Web Ventas$/i, "Abrir vinculo/consulta de ventas web."],
  [/^Resumen x Clasificación$/i, "Emitir resumen agrupado por clasificacion."],
  [/^Excel con detalle de productos$/i, "Exportar Excel con detalle de productos."],
  [/^Imprimir listado$/i, "Imprimir listado actual."],
  [/^Múltiples formatos de impresión$/i, "Elegir formato de impresion."],
  [/^Seleccionar cuales$/i, "Seleccionar subconjunto de registros."],
  [/^Tildar Todo$/i, "Marcar todos los registros visibles."],
  [/^Invertir Tildes$/i, "Invertir seleccion de registros."],
  [/^Verificar Recepción$/i, "Abrir/verificar recepcion de compra."],
  [/^Ver Verificaciones$/i, "Ver verificaciones de recepcion existentes."],
  [/^Imprimir Orden de Compras$/i, "Imprimir orden de compra."],
  [/^Cancelar Pendiente$/i, "Cancelar saldo/estado pendiente."],
  [/^Depurar$/i, "Depurar registros antiguos/pendientes segun filtro."],
  [/^Autorizar$/i, "Autorizar orden/operacion."],
  [/^Recalcula Estados$/i, "Recalcular estados de ordenes/registros."],
  [/^Corrige OCp\/Sin\/Rm$/i, "Corregir relacion OC/siniestro/remito segun legacy."],
  [/^Asignar Cta\. Cte\. \(F1\)$/i, "Asignar cuenta corriente al pedido web."],
  [/^Ver Detalle \(F2\)$/i, "Abrir detalle del pedido web."],
  [/^Foto del Producto$/i, "Abrir/ver foto del producto seleccionado."],
  [/^Pendientes$/i, "Consultar pendientes del producto/cliente segun contexto."],
  [/^Consulta Movimientos del Deposito seleccionado$/i, "Consultar movimientos del deposito activo para el producto seleccionado."],
  [/^Armado de Kits\/Conjuntos de Productos$/i, "Abrir armado de kits/conjuntos de productos."],
  [/^Marcar Cual Producto con un mismo código es el que se vende$/i, "Marcar producto vendible cuando existen codigos repetidos."],
  [/^Ficha Certificado$/i, "Abrir ficha/certificado del producto."],
  [/^Presupuestos$/i, "Abrir presupuestos relacionados."],
  [/^Informaci[oó]n Comercial$/i, "Abrir informacion comercial del cliente/producto."],
  [/^Consulta Pedidos de Venta$/i, "Abrir consulta de pedidos de venta."],
  [/^\(F10\) Pedidos$/i, "Abrir pedidos del cliente/pedido activo."],
  [/^\(F9\) Nuevo ítem$/i, "Agregar nuevo item al pedido activo."],
  [/^Cta\.Cte\.BLOQUEADA$/i, "Mostrar/gestionar estado de cuenta corriente bloqueada."],
  [/^\(F6\)-Facturar$/i, "Facturar producto/seleccion desde consulta de productos."],
  [/^Movimientos a otro Producto$/i, "Mover/reasignar movimientos de stock a otro producto."],
  [/^Exportar$/i, "Exportar datos de la pantalla actual."],
  [/^Parámetros Pantalla de Carga$/i, "Configurar parametros de la pantalla de carga."],
  [/^Usuarios Habilitados$/i, "Definir usuarios habilitados para la operacion."],
  [/^Tomar Numerador$/i, "Tomar/asignar numerador al comprobante/punto de venta."],
  [/^Usuarios$/i, "Filtrar/seleccionar usuarios."],
  [/^Nueva$/i, "Crear nueva orden/operacion en la pantalla actual."],
  [/^Anular$/i, "Anular registro/orden/operacion seleccionada."],
  [/^Consultar$/i, "Consultar registro/orden/operacion seleccionada."],
  [/^Migraci[oó]n$/i, "Ejecutar o revisar utilidad de migracion legacy."],
  [/^No$/i, "Indicador/accion corta de notas o estado; validar etiqueta visual si se replica exacta."],
];

const AUTO_FUNCTIONS = [
  [/^tConceptoOperacion$/i, "Concepto/descripcion de la operacion."],
  [/^tFechaOperacion$/i, "Fecha de operacion."],
  [/^tProvincia$/i, "Provincia fiscal/domicilio."],
  [/^cmdMail$/i, "Enviar comprobante por mail."],
  [/^tFecha$/i, "Fecha del comprobante."],
  [/^tLocalidad$/i, "Localidad del cliente/domicilio."],
  [/^tRazonSocial$/i, "Razon social del cliente."],
  [/^cmdPaginaSiguiente$/i, "Ir a pagina siguiente de resultados."],
  [/^cmdPaginaAnterior$/i, "Ir a pagina anterior de resultados."],
  [/^cmdConfirmarPedidoActivo$/i, "Confirmar/seleccionar pedido activo."],
];

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenName(file) {
  return file
    .replace(/^legacy-(ui-dump|internal|live)-/, "")
    .replace(/\.json$/, "")
    .replace(/--/g, " / ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function riskFor(label) {
  if (risky.some((r) => r.test(label))) return "Alto";
  if (medium.some((r) => r.test(label))) return "Medio";
  if (!label || /toolstripbutton/i.test(label)) return "Validar";
  if (/open|minimizar|maximizar|restaurar|cerrar|línea|columna|página|av pág|re pág|subir|bajar/i.test(label)) return "Bajo";
  return "Bajo";
}

function moduleFor(label, screen) {
  const s = `${label} ${screen}`;
  if (/depositos bancarios|caja|contado|valor|cheque|depositar|movimientos de valores/i.test(s)) return "Caja/valores";
  if (/precio|lista|lp[1-5]|l\.precios|c\/iva/i.test(s)) return "Precios";
  if (/stock|deposito|inventario|transferencia|series/i.test(s)) return "Stock";
  if (/cta\.?cte|cuenta corriente|cliente|razon social|empresa|domicilio/i.test(s)) return "Clientes/cuenta corriente";
  if (/compra|proveedor|recepcion|orden/i.test(s)) return "Compras";
  if (/factura|comprobante|presupuesto|remito|grabar|imprime|cae|mail/i.test(s)) return "Comprobantes/ventas";
  if (/usuario|clave|permiso/i.test(s)) return "Usuarios";
  if (/buscar|filtro|clasif|excel|txt/i.test(s)) return "Consulta/exporte";
  return "General";
}

function functionFor(label, type, autoId, screen) {
  const t = `${label} ${autoId}`.toLowerCase();
  const exact = EXACT_FUNCTIONS.find(([pattern]) => pattern.test(label));
  if (exact) return exact[1];
  const byAuto = AUTO_FUNCTIONS.find(([pattern]) => pattern.test(autoId));
  if (byAuto) return byAuto[1];
  if (type === "TabItem") return "Cambiar pestaña/sección operativa.";
  if (type === "HeaderItem") return "Columna de grilla; define dato visible/ordenable.";
  if (type === "Edit") return "Campo de entrada/filtro/dato editable.";
  if (type === "ComboBox") return "Selector de opción/lista.";
  if (type === "CheckBox") return "Activar/desactivar opción.";
  if (type === "RadioButton") return "Elegir una opción excluyente.";
  if (/buscar c\/?equiv|equiv/.test(t)) return "Buscar incluyendo equivalencias/códigos alternativos.";
  if (/buscar/.test(t)) return "Ejecutar búsqueda o abrir selector relacionado.";
  if (/stock/.test(t)) return "Consultar stock/movimientos o aplicar operación de stock según pantalla.";
  if (/rotaci/.test(t)) return "Consultar rotación del producto.";
  if (/ventas/.test(t)) return "Consultar ventas o módulo de ventas.";
  if (/compras/.test(t)) return "Consultar/completar flujo de compras.";
  if (/venta perdida/.test(t)) return "Registrar demanda no concretada.";
  if (/solicitar compra/.test(t)) return "Crear solicitud de compra por faltante.";
  if (/precio especial/.test(t)) return "Gestionar precio especial.";
  if (/importar.*excel|importar productos/.test(t)) return "Importar productos/items desde Excel.";
  if (/exportar.*excel|excel/.test(t)) return "Exportar datos a Excel.";
  if (/exportar.*txt|txt/.test(t)) return "Exportar datos a TXT.";
  if (/etiqueta/.test(t)) return "Generar/imprimir etiquetas.";
  if (/copiar/.test(t)) return "Copiar dato al portapapeles o duplicar entidad.";
  if (/notas|observaciones/.test(t)) return "Ver/editar notas u observaciones.";
  if (/inventario/.test(t)) return "Abrir/ejecutar operación de inventario.";
  if (/cuenta corriente|cta\.?cte/.test(t)) return "Ver/usar cuenta corriente del cliente.";
  if (/domicilio/.test(t)) return "Gestionar domicilio/datos de entrega.";
  if (/contado|caja mostrador/.test(t)) return "Seleccionar o aplicar pago contado/caja mostrador.";
  if (/grabar|guardar/.test(t)) return "Persistir/finalizar operación.";
  if (/cancelar/.test(t)) return "Cancelar operación actual.";
  if (/eliminar|borrar/.test(t)) return "Eliminar registro/item.";
  if (/modificar|editar/.test(t)) return "Editar registro/item seleccionado.";
  if (/añadir|agregar|nuevo/.test(t)) return "Crear nuevo registro/item.";
  if (/cargar/.test(t)) return "Cargar selección en el flujo activo.";
  if (/imprimir|impresora/.test(t)) return "Imprimir o configurar impresión.";
  if (/mail/.test(t)) return "Enviar por email.";
  if (/redondear/.test(t)) return "Aplicar redondeo.";
  if (/clasif/.test(t)) return "Ver/elegir clasificación.";
  if (/open/.test(t)) return "Abrir lista desplegable.";
  if (/minimizar|maximizar|restaurar|cerrar/.test(t)) return "Control de ventana legacy; no aplica como función de negocio web.";
  if (/toolstripbutton/i.test(label)) return "Botón sin texto funcional en UIA; requiere validar tooltip/icono.";
  if (type === "ListItem") return "Opcion seleccionable de la lista/grilla de esta pantalla.";
  return "Accion propia de la pantalla; requiere validacion viva si se va a implementar exacta.";
}

function statusFor(label, type, autoId) {
  if (/toolstripbutton/i.test(label)) return "Validar tooltip/icono";
  if (/^\(sin texto\)$/.test(label) && !autoId) return "Validar tooltip/icono";
  if (AUTO_FUNCTIONS.some(([pattern]) => pattern.test(autoId))) return "Mapeado por auto_id";
  if (["HeaderItem", "Edit", "ComboBox", "CheckBox", "RadioButton", "TabItem"].includes(type)) return "Observado por tipo UIA";
  if (EXACT_FUNCTIONS.some(([pattern]) => pattern.test(label))) return "Mapeado";
  if (/open|minimizar|maximizar|restaurar|cerrar/i.test(label)) return "Control UI";
  if (autoId) return "Inferido por auto_id";
  return "Inferido por texto";
}

function webDestination(label, type, screen) {
  const m = moduleFor(label, screen);
  if (type === "TabItem") return "Tab/sección web equivalente.";
  if (/minimizar|maximizar|restaurar|cerrar/i.test(label)) return "No aplica; usar navegación/drawer web.";
  if (/open/i.test(label)) return "Combo/select nativo.";
  if (m === "Stock") return "Mostrador/productos/stock según contexto.";
  if (m === "Precios") return "Consulta productos/listas de precio.";
  if (m === "Caja/valores") return "Caja, pagos o cheques/valores.";
  if (m === "Clientes/cuenta corriente") return "Cliente ocasional, cliente registrado o cuenta corriente.";
  if (m === "Compras") return "Compras/recepción/proveedores.";
  if (m === "Comprobantes/ventas") return "Mostrador/comprobantes.";
  if (m === "Consulta/exporte") return "Filtro, búsqueda o exporte.";
  return "Evaluar en módulo destino.";
}

const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".json")).sort();
const lines = [];
const screenBlocks = [];
lines.push("# LEGACY_BUTTON_FUNCTIONS.md - Inventario boton/control legacy");
lines.push("");
lines.push("Ultima actualizacion: 2026-05-08");
lines.push("");
lines.push("Generado desde dumps UIA en `docs/legacy-audit/raw/`. Este documento busca paridad funcional: entender que hace cada control legacy y donde debe vivir en la web.");
lines.push("");
lines.push("Convencion: `Validar` no significa ignorar; significa que el dump no trae tooltip/efecto y hay que probarlo vivo sin grabar/borrar.");
lines.push("");

for (const file of files) {
  const rows = JSON.parse(fs.readFileSync(path.join(rawDir, file), "utf8"));
  const screen = screenName(file);
  const controls = [];
  const seen = new Set();
  for (const row of rows) {
    const type = clean(row.control_type);
    if (!CONTROL_TYPES.has(type)) continue;
    const label = clean(row.text) || "(sin texto)";
    const autoId = clean(row.auto_id);
    if (type === "Edit" && !label && !autoId) continue;
    const key = `${type}|${label}|${autoId}|${JSON.stringify(row.rect ?? [])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    controls.push({ type, label, autoId });
  }
  if (!controls.length) continue;
  const counts = controls.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});
  const block = [];
  block.push(`## ${screen}`);
  block.push("");
  block.push(`Fuente: \`${path.join(rawDir, file).replaceAll("\\", "/")}\`.`);
  block.push("");
  block.push("| Tipo | Control | Auto ID | Funcion | Destino web | Riesgo | Estado |");
  block.push("|---|---|---|---|---|---|---|");
  for (const c of controls) {
    const label = c.label.replaceAll("|", "\\|");
    const autoId = c.autoId || "-";
    block.push(
      `| ${c.type} | \`${label}\` | \`${autoId}\` | ${functionFor(c.label, c.type, c.autoId, screen)} | ${webDestination(c.label, c.type, screen)} | ${riskFor(c.label)} | ${statusFor(c.label, c.type, c.autoId)} |`,
    );
  }
  block.push("");
  screenBlocks.push({ screen, file, controls: controls.length, counts, block });
}

lines.push("## Cobertura");
lines.push("");
lines.push("| Pantalla/estado | Controles | Botones | Pestañas | Inputs | Combos | Checks/radios | Fuente |");
lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
for (const item of screenBlocks) {
  const buttons = item.counts.Button ?? 0;
  const tabs = item.counts.TabItem ?? 0;
  const inputs = item.counts.Edit ?? 0;
  const combos = item.counts.ComboBox ?? 0;
  const checks = (item.counts.CheckBox ?? 0) + (item.counts.RadioButton ?? 0);
  lines.push(`| ${item.screen} | ${item.controls} | ${buttons} | ${tabs} | ${inputs} | ${combos} | ${checks} | \`${item.file}\` |`);
}
lines.push("");
lines.push("## Detalle por pantalla");
lines.push("");
for (const item of screenBlocks) lines.push(...item.block);

fs.writeFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${outFile} from ${files.length} raw dumps.`);
