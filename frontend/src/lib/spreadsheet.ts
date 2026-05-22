export interface ParsedSpreadsheetData {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  sheetName?: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  previewRows: Array<Record<string, string>>;
  totalRows: number;
}

export interface SpreadsheetColumn<T extends Record<string, unknown>> {
  key: keyof T | string;
  label: string;
}

type JSZipConstructor = {
  new (): {
    file(path: string, data: string): unknown;
    generateAsync(options: { type: 'blob'; mimeType: string }): Promise<Blob>;
  };
  loadAsync(input: ArrayBuffer): Promise<{
    file(path: string): {
      async(type: 'string'): Promise<string>;
    } | null;
  }>;
};

type JSZipDynamicImport = {
  default?: JSZipConstructor;
};

function parseCsv(text: string) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = false;
        continue;
      }

      currentValue += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if (char === '\r') {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      if (nextChar === '\n') {
        index += 1;
      }
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows;
}

function isRowEmpty(row: string[]) {
  return row.every((value) => !value.trim());
}

function normalizeHeaders(row: string[]) {
  const headers = row.map((value, index) => value.trim() || `Column ${index + 1}`);
  const counts = new Map<string, number>();

  return headers.map((header) => {
    const count = (counts.get(header) || 0) + 1;
    counts.set(header, count);
    return count === 1 ? header : `${header} (${count})`;
  });
}

function matrixToRecords(
  matrix: string[][],
  fileName: string,
  fileType: 'csv' | 'xlsx',
  sheetName?: string,
): ParsedSpreadsheetData {
  const trimmedMatrix = matrix.filter((row, index) => index === 0 || !isRowEmpty(row));
  const headerIndex = trimmedMatrix.findIndex((row) => !isRowEmpty(row));

  if (headerIndex === -1) {
    throw new Error('File không có dữ liệu để import');
  }

  const headers = normalizeHeaders(trimmedMatrix[headerIndex]);
  const dataRows = trimmedMatrix.slice(headerIndex + 1).filter((row) => !isRowEmpty(row));
  const rows = dataRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  });

  return {
    fileName,
    fileType,
    sheetName,
    headers,
    rows,
    previewRows: rows.slice(0, 8),
    totalRows: rows.length,
  };
}

function parseXmlDocument(xml: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, 'application/xml');
  const parserError = document.getElementsByTagName('parsererror')[0];

  if (parserError) {
    throw new Error('Không đọc được cấu trúc XML của file XLSX');
  }

  return document;
}

function extractNodeText(node: Element | null) {
  if (!node) {
    return '';
  }

  const textNodes = Array.from(node.getElementsByTagName('t'));
  if (textNodes.length > 0) {
    return textNodes.map((item) => item.textContent || '').join('');
  }

  return node.textContent || '';
}

function columnIndexFromReference(reference: string) {
  const letters = reference.toUpperCase().replace(/[^A-Z]/g, '');
  let result = 0;

  for (let index = 0; index < letters.length; index += 1) {
    result = result * 26 + (letters.charCodeAt(index) - 64);
  }

  return Math.max(result - 1, 0);
}

async function parseXlsx(file: File) {
  let JSZipClass: JSZipConstructor;

  try {
    const jszipImport = (await import('jszip')) as unknown as JSZipDynamicImport;
    JSZipClass = jszipImport.default || (jszipImport as unknown as JSZipConstructor);
  } catch {
    throw new Error('Thiếu thư viện để đọc file XLSX');
  }

  const zip = await JSZipClass.loadAsync(await file.arrayBuffer());
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');

  if (!workbookXml) {
    throw new Error('File XLSX không hợp lệ');
  }

  const workbookDocument = parseXmlDocument(workbookXml);
  const firstSheet = workbookDocument.getElementsByTagName('sheet')[0];

  if (!firstSheet) {
    throw new Error('File XLSX không có sheet nào');
  }

  const sheetName = firstSheet.getAttribute('name') || 'Sheet1';
  const relationId =
    firstSheet.getAttribute('r:id') ||
    firstSheet.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'id',
    );

  if (!relationId) {
    throw new Error('Không tìm thấy sheet relation trong file XLSX');
  }

  const relationsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');

  if (!relationsXml) {
    throw new Error('File XLSX thiếu workbook relations');
  }

  const relationsDocument = parseXmlDocument(relationsXml);
  const relations = Array.from(relationsDocument.getElementsByTagName('Relationship'));
  const relation = relations.find((item) => item.getAttribute('Id') === relationId);
  const target = relation?.getAttribute('Target');

  if (!target) {
    throw new Error('Không tìm thấy sheet target trong file XLSX');
  }

  const normalizedTarget = target.startsWith('/')
    ? target.replace(/^\/+/, '')
    : `xl/${target.replace(/^\.?\//, '')}`;
  const worksheetXml = await zip.file(normalizedTarget)?.async('string');

  if (!worksheetXml) {
    throw new Error('Không đọc được sheet dữ liệu trong file XLSX');
  }

  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedStringsXml
    ? Array.from(parseXmlDocument(sharedStringsXml).getElementsByTagName('si')).map((item) =>
        extractNodeText(item),
      )
    : [];

  const worksheetDocument = parseXmlDocument(worksheetXml);
  const rowNodes = Array.from(worksheetDocument.getElementsByTagName('row'));
  const matrix: string[][] = [];

  rowNodes.forEach((rowNode) => {
    const rowIndex = Number(rowNode.getAttribute('r') || '1') - 1;
    const cells = Array.from(rowNode.getElementsByTagName('c'));
    const row: string[] = matrix[rowIndex] || [];

    cells.forEach((cell) => {
      const cellReference = cell.getAttribute('r') || '';
      const cellType = cell.getAttribute('t');
      const columnIndex = columnIndexFromReference(cellReference);
      let value = '';

      if (cellType === 'inlineStr') {
        value = extractNodeText(cell.getElementsByTagName('is')[0] || null);
      } else {
        const valueNode = cell.getElementsByTagName('v')[0] || null;
        const rawValue = valueNode?.textContent || '';

        if (cellType === 's') {
          value = sharedStrings[Number(rawValue)] || '';
        } else if (cellType === 'b') {
          value = rawValue === '1' ? 'TRUE' : 'FALSE';
        } else {
          value = rawValue;
        }
      }

      row[columnIndex] = value;
    });

    matrix[rowIndex] = row;
  });

  const maxColumns = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const denseMatrix = matrix.map((row) =>
    Array.from({ length: maxColumns }, (_, index) => row[index] || ''),
  );

  return matrixToRecords(denseMatrix, file.name, 'xlsx', sheetName);
}

export async function parseSpreadsheetFile(file: File) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    return matrixToRecords(parseCsv(await file.text()), file.name, 'csv');
  }

  if (lowerName.endsWith('.xlsx')) {
    return parseXlsx(file);
  }

  throw new Error('Chỉ hỗ trợ file CSV hoặc XLSX');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sheetNameOrDefault(sheetName: string) {
  const sanitized = sheetName.replace(/[\\/*?:[\]]/g, ' ').trim();
  return (sanitized || 'Sheet1').slice(0, 31);
}

function columnLetter(index: number) {
  let current = index + 1;
  let result = '';

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function buildInlineCell(reference: string, value: unknown) {
  if (value === null || value === undefined) {
    return `<c r="${reference}" t="inlineStr"><is><t></t></is></c>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }

  const stringValue = String(value);
  const preserveSpace =
    stringValue.startsWith(' ') ||
    stringValue.endsWith(' ') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');
  const preserveAttr = preserveSpace ? ' xml:space="preserve"' : '';
  return `<c r="${reference}" t="inlineStr"><is><t${preserveAttr}>${escapeXml(stringValue)}</t></is></c>`;
}

export async function createXlsxBlob<T extends Record<string, unknown>>(
  sheetName: string,
  columns: SpreadsheetColumn<T>[],
  rows: T[],
) {
  const jszipImport = (await import('jszip')) as unknown as JSZipDynamicImport;
  const JSZipClass = jszipImport.default || (jszipImport as unknown as JSZipConstructor);
  const zip = new JSZipClass();
  const normalizedSheetName = sheetNameOrDefault(sheetName);
  const workbookRows = [
    columns.map((column) => column.label),
    ...rows.map((row) =>
      columns.map((column) => row[column.key as keyof T] ?? ''),
    ),
  ];

  const sheetRowsXml = workbookRows
    .map((row, rowIndex) => {
      const cellsXml = row
        .map((value, columnIndex) =>
          buildInlineCell(`${columnLetter(columnIndex)}${rowIndex + 1}`, value),
        )
        .join('');
      return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
    })
    .join('');

  const nowIso = new Date().toISOString();
  const worksheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${sheetRowsXml}</sheetData>` +
    `</worksheet>`;
  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${escapeXml(normalizedSheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;
  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;
  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;
  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
    `<borders count="1"><border/></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
    `</styleSheet>`;
  const coreXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ` +
    `xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:creator>CHY CRM</dc:creator><cp:lastModifiedBy>CHY CRM</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>` +
    `</cp:coreProperties>`;
  const appXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ` +
    `xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
    `<Application>CHY CRM</Application>` +
    `</Properties>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', rootRelsXml);
  zip.file('docProps/core.xml', coreXml);
  zip.file('docProps/app.xml', appXml);
  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', workbookRelsXml);
  zip.file('xl/styles.xml', stylesXml);
  zip.file('xl/worksheets/sheet1.xml', worksheetXml);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
