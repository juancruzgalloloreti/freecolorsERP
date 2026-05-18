export function parseCsv(text: string) {
  let semiCount = 0;
  let commaCount = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inStr = !inStr;
    else if (!inStr) { if (c === ';') semiCount++; else if (c === ',') commaCount++; }
  }
  const delimiter = semiCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...data] = rows;
  return data.map((values) => normalizeImportRow(headers, values));
}

export function decodeCsv(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

export function normalizeImportRow(headers: string[], values: string[]) {
  const row: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    const cleanHeader = String(header || '').trim();
    const letter = String.fromCharCode(65 + index);
    const value = values[index]?.trim() ?? '';
    if (cleanHeader) row[cleanHeader] = value;
    row[letter] = value;
  });
  return row;
}

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
