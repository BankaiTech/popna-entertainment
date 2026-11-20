/**
 * Small .xlsx reader for customer uploads. No library: an .xlsx file is a ZIP of XML files, so we
 * unzip with the browser's DecompressionStream and read the cells with DOMParser.
 * Returns the same shape as parseCsv(). Every sheet whose first row has headers is read;
 * rows from all sheets are joined (headers are matched by name).
 */

interface ZipEntry { name: string; method: number; offset: number; size: number }

function zipEntries(buf: DataView): ZipEntry[] {
  // End of central directory record: signature 0x06054b50, searched from the end.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (buf.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not an Excel (.xlsx) file');
  const count = buf.getUint16(eocd + 10, true);
  let p = buf.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (buf.getUint32(p, true) !== 0x02014b50) break;
    const method = buf.getUint16(p + 10, true);
    const size = buf.getUint32(p + 20, true);
    const nameLen = buf.getUint16(p + 28, true);
    const extraLen = buf.getUint16(p + 30, true);
    const commentLen = buf.getUint16(p + 32, true);
    const offset = buf.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf.buffer, buf.byteOffset + p + 46, nameLen));
    entries.push({ name, method, offset, size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readEntry(ab: ArrayBuffer, e: ZipEntry): Promise<string> {
  const buf = new DataView(ab);
  // Local file header: data starts after the 30-byte header + name + extra field.
  const nameLen = buf.getUint16(e.offset + 26, true);
  const extraLen = buf.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = new Uint8Array(ab.slice(start, start + e.size));
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error('Unsupported Excel file');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

/** "B12" -> 1 (zero-based column). */
function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel keeps 3156397712 as a number; show it without "3.15E+09" or ".0". */
function numberText(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return Number.isInteger(n) ? BigInt(Math.round(n)).toString() : String(n);
}

export async function parseXlsx(file: Blob): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ab = await file.arrayBuffer();
  const entries = zipEntries(new DataView(ab));
  const get = async (name: string) => {
    const e = entries.find((x) => x.name === name);
    return e ? readEntry(ab, e) : '';
  };
  const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml');

  const shared: string[] = [];
  const sst = await get('xl/sharedStrings.xml');
  if (sst) {
    for (const si of Array.from(xml(sst).getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''));
    }
  }

  // Sheets in workbook order.
  const rels = xml(await get('xl/_rels/workbook.xml.rels'));
  const target: Record<string, string> = {};
  for (const r of Array.from(rels.getElementsByTagName('Relationship'))) {
    const t = r.getAttribute('Target') ?? '';
    target[r.getAttribute('Id') ?? ''] = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\//, '')}`;
  }
  const wb = xml(await get('xl/workbook.xml'));
  const sheetFiles = Array.from(wb.getElementsByTagName('sheet'))
    .map((s) => target[s.getAttribute('r:id') ?? s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? ''])
    .filter(Boolean);

  const headers: string[] = [];
  const rows: Record<string, string>[] = [];
  for (const path of sheetFiles) {
    const doc = xml(await get(path));
    const table: string[][] = [];
    for (const rowEl of Array.from(doc.getElementsByTagName('row'))) {
      const cells: string[] = [];
      for (const c of Array.from(rowEl.getElementsByTagName('c'))) {
        const type = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        let text: string;
        if (type === 's') text = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') text = Array.from(c.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('');
        else if (type === 'str' || type === 'b' || type === 'e') text = v;
        else text = v === '' ? '' : numberText(v);
        const ref = c.getAttribute('r');
        cells[ref ? columnIndex(ref) : cells.length] = text.trim();
      }
      if (cells.some((x) => x && x.trim() !== '')) table.push(Array.from(cells, (x) => x ?? ''));
    }
    if (table.length < 2) continue;
    const head = table[0].map((h) => h.trim());
    for (const h of head) if (h && !headers.includes(h)) headers.push(h);
    for (const cells of table.slice(1)) {
      const r: Record<string, string> = {};
      head.forEach((h, i) => { if (h) r[h] = (cells[i] ?? '').trim(); });
      rows.push(r);
    }
  }
  return { headers, rows };
}
