// Markdown → DOCX converter cho báo cáo Fitnit Challenge
// Hỗ trợ: heading (#..####), bảng, bullet/numbered list, code block, blockquote,
//         horizontal rule, **bold**, `inline code`, đoạn văn thường.
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer,
} = require('docx');

const [,, mdPath, outPath, titleArg, subtitleArg] = process.argv;
const md = fs.readFileSync(mdPath, 'utf8');

const CONTENT_W = 9360;            // US Letter, lề 1"
const FONT = 'Arial';
const ACCENT = '1A5276';           // xanh đậm
const ACCENT2 = '2E75B6';
const CODE_BG = 'F2F4F5';
const HEAD_BG = '1A5276';
const ZEBRA = 'EEF3F7';

// ── Inline parser: **bold**, `code`, phần còn lại thường ──────────────────
function parseInline(text, baseOpts = {}) {
  const runs = [];
  // tách theo **bold** và `code`
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...baseOpts }));
    }
    if (m[2] !== undefined) {
      runs.push(new TextRun({ text: m[2], font: FONT, bold: true, ...baseOpts }));
    } else if (m[3] !== undefined) {
      runs.push(new TextRun({ text: m[3], font: 'Consolas', shading: { type: ShadingType.CLEAR, fill: CODE_BG }, ...baseOpts }));
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last), font: FONT, ...baseOpts }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text: '', font: FONT, ...baseOpts }));
  return runs;
}

function stripInline(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

// ── Table builder ─────────────────────────────────────────────────────────
function buildTable(headerCells, rows) {
  const nCols = headerCells.length;
  const colW = Math.floor(CONTENT_W / nCols);
  const widths = Array(nCols).fill(colW);
  widths[nCols - 1] = CONTENT_W - colW * (nCols - 1); // bù tròn
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const mkCell = (txt, i, opts) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    shading: opts.shading,
    children: [new Paragraph({ children: parseInline(txt.trim(), opts.run || {}), spacing: { after: 0 } })],
  });
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((c, i) => mkCell(c, i, {
      shading: { type: ShadingType.CLEAR, fill: HEAD_BG },
      run: { bold: true, color: 'FFFFFF', size: 20 },
    })),
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => mkCell(c ?? '', i, {
      shading: ri % 2 === 1 ? { type: ShadingType.CLEAR, fill: ZEBRA } : undefined,
      run: { size: 20 },
    })),
  }));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

// ── Parse markdown thành danh sách block ──────────────────────────────────
const lines = md.split('\n');
const children = [];
let i = 0;

function splitRow(line) {
  // bỏ | đầu/cuối rồi tách
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(x => x.trim());
}

while (i < lines.length) {
  let line = lines[i];
  const t = line.trim();

  // bỏ qua dòng trống
  if (t === '') { i++; continue; }

  // horizontal rule
  if (/^---+$/.test(t) || /^\*\*\*+$/.test(t)) {
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT2, space: 1 } },
      spacing: { before: 120, after: 120 },
      children: [new TextRun({ text: '', font: FONT })],
    }));
    i++; continue;
  }

  // code block
  if (t.startsWith('```')) {
    i++;
    const code = [];
    while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
    i++; // bỏ ``` đóng
    code.forEach((cl, idx) => {
      children.push(new Paragraph({
        shading: { type: ShadingType.CLEAR, fill: CODE_BG },
        spacing: { after: 0, before: idx === 0 ? 60 : 0, line: 240 },
        indent: { left: 120, right: 120 },
        children: [new TextRun({ text: cl || ' ', font: 'Consolas', size: 18 })],
      }));
    });
    children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '', font: FONT })] }));
    continue;
  }

  // heading
  const h = t.match(/^(#{1,6})\s+(.*)$/);
  if (h) {
    const level = h[1].length;
    const txt = stripInline(h[2]);
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    children.push(new Paragraph({
      heading: map[Math.min(level, 4)],
      children: [new TextRun({ text: txt, font: FONT })],
    }));
    i++; continue;
  }

  // table (dòng hiện tại có |, dòng kế là separator ---|---)
  if (t.startsWith('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim()) && lines[i+1].includes('-')) {
    const header = splitRow(lines[i]);
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      rows.push(splitRow(lines[i]));
      i++;
    }
    children.push(buildTable(header, rows));
    children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '', font: FONT })] }));
    continue;
  }

  // blockquote
  if (t.startsWith('>')) {
    const quote = [];
    while (i < lines.length && lines[i].trim().startsWith('>')) {
      quote.push(lines[i].trim().replace(/^>\s?/, ''));
      i++;
    }
    quote.forEach((q) => {
      if (q.trim() === '') return;
      children.push(new Paragraph({
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT2, space: 12 } },
        shading: { type: ShadingType.CLEAR, fill: 'F4F8FB' },
        spacing: { before: 40, after: 40 },
        children: parseInline(q, { italics: true, color: '444444' }),
      }));
    });
    continue;
  }

  // bullet list
  if (/^[-*]\s+/.test(t)) {
    while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
      const txt = lines[i].trim().replace(/^[-*]\s+/, '');
      children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        spacing: { after: 20 },
        children: parseInline(txt),
      }));
      i++;
    }
    continue;
  }

  // numbered list
  if (/^\d+\.\s+/.test(t)) {
    while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
      const txt = lines[i].trim().replace(/^\d+\.\s+/, '');
      children.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        spacing: { after: 20 },
        children: parseInline(txt),
      }));
      i++;
    }
    continue;
  }

  // đoạn văn thường (gộp nhiều dòng liên tiếp)
  const para = [t];
  i++;
  while (i < lines.length && lines[i].trim() !== '' &&
         !/^(#{1,6}\s|[-*]\s|\d+\.\s|>|```|\|)/.test(lines[i].trim()) &&
         !/^---+$/.test(lines[i].trim())) {
    para.push(lines[i].trim());
    i++;
  }
  children.push(new Paragraph({
    spacing: { after: 120, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    children: parseInline(para.join(' ')),
  }));
}

// ── Trang bìa ─────────────────────────────────────────────────────────────
const cover = [];
if (titleArg) {
  cover.push(new Paragraph({
    spacing: { before: 240, after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: titleArg, font: FONT, bold: true, size: 44, color: ACCENT })],
  }));
}
if (subtitleArg) {
  cover.push(new Paragraph({
    spacing: { after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: subtitleArg, font: FONT, size: 24, color: '555555' })],
  }));
}
if (titleArg) {
  cover.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 1 } },
    spacing: { after: 240 }, children: [new TextRun({ text: '', font: FONT })],
  }));
}

// ── Document ──────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: ACCENT },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: FONT, color: ACCENT2 },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: '333333' },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 21, bold: true, italics: true, font: FONT, color: '555555' },
        paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 3 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 6 } },
      children: [
        new TextRun({ text: 'Fitnit Challenge — ', font: FONT, size: 16, color: '888888' }),
        new TextRun({ children: ['Trang ', PageNumber.CURRENT], font: FONT, size: 16, color: '888888' }),
      ],
    })] }) },
    children: [...cover, ...children],
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outPath, buf); console.log('✓ Wrote ' + outPath); });
