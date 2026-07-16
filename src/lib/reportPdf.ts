import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const BRAND = '#f97316';
const INK = '#18181b';
const MUTED = '#71717a';
const LINE = '#e4e4e7';
const HEADER_BG = '#fafafa';
const ROW_ALT = '#f4f4f5';
const PAGE_MARGIN = 36;
const HEADER_HEIGHT = 52;
const FOOTER_RESERVE = 36;

export interface ReportPdfColumn {
  key: string;
  label: string;
  /** Relative width weight */
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface ReportPdfSummaryItem {
  label: string;
  value: string;
}

export interface BuildReportPdfOptions {
  title: string;
  subtitle: string;
  summary: ReportPdfSummaryItem[];
  columns: ReportPdfColumn[];
  rows: Record<string, string>[];
  generatedAt?: Date;
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'logo-mark-light.jpg'),
    path.join(process.cwd(), 'dist', 'logo-mark-light.jpg'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function paintText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: PDFKit.Mixins.TextOptions & { fontSize?: number } = {}
) {
  const { fontSize, ...rest } = opts;
  if (fontSize) doc.fontSize(fontSize);
  doc.text(text, x, y, { lineBreak: false, ...rest });
}

function drawBrandHeader(doc: PDFKit.PDFDocument, pageWidth: number) {
  doc.save();
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT).fill(INK);

  const logoPath = resolveLogoPath();
  let textX = PAGE_MARGIN;
  if (logoPath) {
    try {
      doc.image(logoPath, PAGE_MARGIN, 10, { height: 32, width: 32 });
      textX = PAGE_MARGIN + 40;
    } catch {
      // Logo optional
    }
  }

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16);
  paintText(doc, 'Gym', textX, 18);
  const gymWidth = doc.widthOfString('Gym');
  doc.fillColor(BRAND);
  paintText(doc, 'Apure', textX + gymWidth, 18);
  doc.restore();
}

function drawFooters(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number,
  generatedLabel: string
) {
  const y = pageHeight - 24;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .strokeColor(LINE)
      .lineWidth(0.5)
      .moveTo(PAGE_MARGIN, y - 8)
      .lineTo(pageWidth - PAGE_MARGIN, y - 8)
      .stroke();

    doc.fillColor(MUTED).font('Helvetica').fontSize(8);
    paintText(doc, `GymApure · ${generatedLabel}`, PAGE_MARGIN, y, {
      width: pageWidth / 2 - PAGE_MARGIN,
      align: 'left',
    });
    paintText(doc, `Página ${i - range.start + 1} de ${range.count}`, pageWidth / 2, y, {
      width: pageWidth / 2 - PAGE_MARGIN,
      align: 'right',
    });
  }
}

function wrapCell(
  doc: PDFKit.PDFDocument,
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines = 3
): string[] {
  doc.fontSize(fontSize);
  const safeWidth = Math.max(8, maxWidth);
  const raw = String(text || '—').trim() || '—';
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (lines.length < maxLines) lines.push(line);
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const next = current ? `${current} ${word}` : word;
    if (doc.widthOfString(next) <= safeWidth) {
      current = next;
      continue;
    }
    if (current) {
      pushLine(current);
      current = '';
    }
    if (lines.length >= maxLines) break;
    if (doc.widthOfString(word) <= safeWidth) {
      current = word;
      continue;
    }
    let chunk = '';
    for (const ch of word) {
      if (lines.length >= maxLines) break;
      if (doc.widthOfString(chunk + ch) <= safeWidth) {
        chunk += ch;
      } else if (chunk) {
        pushLine(chunk);
        chunk = ch;
      } else {
        pushLine(ch);
        chunk = '';
      }
    }
    current = chunk;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return ['—'];
  if (words.join(' ').length > lines.join(' ').length && lines.length === maxLines) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
  }
  return lines;
}

export async function buildReportPdf(options: BuildReportPdfOptions): Promise<Buffer> {
  const generatedAt = options.generatedAt ?? new Date();
  const generatedLabel = generatedAt.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${options.title} — GymApure`,
      Author: 'GymApure',
      Creator: 'GymApure',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const bottomLimit = pageHeight - FOOTER_RESERVE;
  const totalWeight = options.columns.reduce((sum, col) => sum + col.width, 0) || 1;
  const colWidths = options.columns.map((col) => (col.width / totalWeight) * contentWidth);

  const rowPadX = 6;
  const rowPadY = 5;
  const fontSize = 8;
  const headerFontSize = 8;
  const minRowH = 20;
  const lineH = 10;

  const drawTableHeader = (atY: number): number => {
    doc.font('Helvetica-Bold');
    const headerLines = options.columns.map((col, i) =>
      wrapCell(doc, col.label, colWidths[i] - rowPadX * 2, headerFontSize, 2)
    );
    const headerH = Math.max(
      minRowH,
      ...headerLines.map((lines) => lines.length * 11 + rowPadY * 2)
    );

    doc.rect(PAGE_MARGIN, atY, contentWidth, headerH).fill(HEADER_BG);
    doc.strokeColor(LINE).lineWidth(0.8).rect(PAGE_MARGIN, atY, contentWidth, headerH).stroke();

    let x = PAGE_MARGIN;
    options.columns.forEach((col, i) => {
      const w = colWidths[i];
      const lines = headerLines[i];
      const textH = lines.length * 11;
      const textY = atY + (headerH - textH) / 2;
      doc.fillColor(MUTED).font('Helvetica-Bold');
      lines.forEach((line, li) => {
        paintText(doc, line, x + rowPadX, textY + li * 11, {
          fontSize: headerFontSize,
          width: w - rowPadX * 2,
          align: col.align ?? 'left',
        });
      });
      x += w;
    });

    return atY + headerH;
  };

  const startContentPage = (includeTableHeader: boolean): number => {
    drawBrandHeader(doc, pageWidth);
    let nextY = HEADER_HEIGHT + 16;
    if (includeTableHeader) {
      nextY = drawTableHeader(nextY);
    }
    return nextY;
  };

  let y = startContentPage(false);

  doc.fillColor(INK).font('Helvetica-Bold');
  paintText(doc, options.title, PAGE_MARGIN, y, { fontSize: 18 });
  y += 24;

  doc.fillColor(MUTED).font('Helvetica');
  paintText(doc, options.subtitle, PAGE_MARGIN, y, { fontSize: 10, width: contentWidth });
  y += 16;

  paintText(doc, `Generado: ${generatedLabel}`, PAGE_MARGIN, y, { fontSize: 9 });
  y += 18;

  if (options.summary.length > 0) {
    const boxH = 36;
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, boxH, 6).fill('#fff7ed');
    doc.rect(PAGE_MARGIN, y, 4, boxH).fill(BRAND);

    const slotW = contentWidth / options.summary.length;
    options.summary.forEach((item, i) => {
      const x = PAGE_MARGIN + 12 + i * slotW;
      doc.fillColor(MUTED).font('Helvetica');
      paintText(doc, item.label.toUpperCase(), x, y + 7, {
        fontSize: 8,
        width: slotW - 16,
      });
      doc.fillColor(INK).font('Helvetica-Bold');
      paintText(doc, item.value, x, y + 18, { fontSize: 11, width: slotW - 16 });
    });
    y += boxH + 14;
  }

  if (options.rows.length === 0) {
    doc.fillColor(MUTED).font('Helvetica');
    paintText(doc, 'Sin registros para este criterio.', PAGE_MARGIN, y, {
      fontSize: 11,
      width: contentWidth,
    });
  } else {
    y = drawTableHeader(y);

    for (let rowIndex = 0; rowIndex < options.rows.length; rowIndex++) {
      const row = options.rows[rowIndex];
      doc.font('Helvetica');
      const cellLines = options.columns.map((col, i) =>
        wrapCell(doc, row[col.key] ?? '—', colWidths[i] - rowPadX * 2, fontSize, 3)
      );
      const rowH = Math.max(
        minRowH,
        ...cellLines.map((lines) => lines.length * lineH + rowPadY * 2)
      );

      if (y + rowH > bottomLimit) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        y = startContentPage(true);
      }

      if (rowIndex % 2 === 1) {
        doc.rect(PAGE_MARGIN, y, contentWidth, rowH).fill(ROW_ALT);
      }

      doc
        .strokeColor(LINE)
        .lineWidth(0.4)
        .moveTo(PAGE_MARGIN, y + rowH)
        .lineTo(PAGE_MARGIN + contentWidth, y + rowH)
        .stroke();

      let x = PAGE_MARGIN;
      options.columns.forEach((col, i) => {
        const w = colWidths[i];
        const lines = cellLines[i];
        const textH = lines.length * lineH;
        const textY = y + (rowH - textH) / 2;
        doc.fillColor(INK).font('Helvetica');
        lines.forEach((line, li) => {
          paintText(doc, line, x + rowPadX, textY + li * lineH, {
            fontSize,
            width: w - rowPadX * 2,
            align: col.align ?? 'left',
          });
        });
        x += w;
      });

      y += rowH;
    }
  }

  drawFooters(doc, pageWidth, pageHeight, generatedLabel);
  doc.end();
  return done;
}

export function formatReportDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatReportDateOnly(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatReportMoney(value: number | null | undefined, prefix = ''): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return prefix ? `${prefix}${n}` : n;
}

export function formatReportStatus(status: string): string {
  const map: Record<string, string> = {
    approved: 'Aprobado',
    pending: 'Pendiente',
    rejected: 'Rechazado',
    active: 'Activo',
    inactive: 'Inactivo',
  };
  return map[status] ?? status;
}

export function formatDateRangeSubtitle(from: string | null, to: string | null): string {
  if (from && to) {
    return `Período: ${formatReportDateOnly(from)} — ${formatReportDateOnly(to)}`;
  }
  if (from) return `Desde: ${formatReportDateOnly(from)}`;
  if (to) return `Hasta: ${formatReportDateOnly(to)}`;
  return 'Sin filtro de fechas';
}
