// Tiny XLSX exporter — uses SpreadsheetML 2003 (XML) which Excel, Numbers, and
// Google Sheets open natively as .xls / .xlsx. No npm dependency required.
//
// Usage:
//   exportXlsx({
//     filename: 'tx.xlsx',
//     sheets: [{ name: 'Transactions', headers, rows }],
//   });

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(v) {
  if (v == null || v === '') return `<Cell><Data ss:Type="String"></Data></Cell>`;
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
  }
  // Detect ISO date — emit as DateTime
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
    return `<Cell ss:StyleID="sDate"><Data ss:Type="DateTime">${escapeXml(v)}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
}

function rowXml(values) {
  return `<Row>${values.map(cell).join('')}</Row>`;
}

function sheetXml({ name = 'Sheet1', headers = [], rows = [] }) {
  const headerRow = headers.length
    ? `<Row>${headers.map((h) => `<Cell ss:StyleID="sHead"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`
    : '';
  const body = rows.map(rowXml).join('');
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${headerRow}${body}</Table></Worksheet>`;
}

export function buildXlsx({ sheets = [] }) {
  const styles = `
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="sHead">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2A63E2" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Left"/>
    </Style>
    <Style ss:ID="sDate"><NumberFormat ss:Format="yyyy-mm-dd"/></Style>
  </Styles>`;
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${styles}
${sheets.map(sheetXml).join('\n')}
</Workbook>`;
}

export function exportXlsx({ filename = 'export.xls', sheets }) {
  const xml = buildXlsx({ sheets });
  // .xls extension w/ ms-excel MIME — opens in Excel + Sheets natively.
  // (.xlsx requires a zipped OOXML container which would need a 200KB+ lib;
  // SpreadsheetML covers the common bookkeeping use case.)
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Force .xls suffix even if caller passes .xlsx — Excel reads both
  a.download = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
