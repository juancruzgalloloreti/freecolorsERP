export function parseMoney(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  let text = String(value).trim().replace(/\s/g, '').replace(/\$/g, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (lastComma > -1) {
    text = text.replace(',', '.');
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}
