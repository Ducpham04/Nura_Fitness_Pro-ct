#!/usr/bin/env node
/**
 * Báo cáo hiệu suất web từ Microsoft Clarity Data Export API.
 *
 * Cách dùng:
 *   export CLARITY_API_TOKEN="<token lấy ở Clarity → Settings → Data Export>"
 *   node scripts/clarity-report.mjs            # 3 ngày gần nhất (mặc định)
 *   node scripts/clarity-report.mjs --days 1   # 1 ngày
 *
 * Giới hạn API (của Microsoft): tối đa 3 ngày gần nhất, 10 request/ngày.
 * Script này dùng đúng 2 request: tổng quan + phân tích theo trang (URL).
 * Kết quả in ra màn hình và ghi file scripts/reports/clarity-YYYY-MM-DD.md
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const TOKEN = process.env.CLARITY_API_TOKEN;

const argDays = (() => {
  const i = process.argv.indexOf('--days');
  const v = i >= 0 ? Number(process.argv[i + 1]) : 3;
  return [1, 2, 3].includes(v) ? v : 3;
})();

if (!TOKEN) {
  console.error('❌ Thiếu CLARITY_API_TOKEN.');
  console.error('   Lấy token: https://clarity.microsoft.com → project → Settings → Data Export → Generate new API token');
  console.error('   Rồi chạy:  export CLARITY_API_TOKEN="..." && node scripts/clarity-report.mjs');
  process.exit(1);
}

/** Gọi Clarity API. dims: mảng tối đa 3 tên dimension (URL, Device, OS, Browser, Country, Source...). */
async function fetchInsights(numOfDays, dims = []) {
  const params = new URLSearchParams({ numOfDays: String(numOfDays) });
  dims.slice(0, 3).forEach((d, i) => params.set(`dimension${i + 1}`, d));
  const res = await fetch(`${API}?${params}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Clarity API ${res.status}: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Không parse được JSON: ${text.slice(0, 300)}`);
  }
}

/** Lấy metric theo tên từ mảng kết quả. */
const pick = (data, name) => data.find((m) => m.metricName === name)?.information ?? [];
const num = (v) => (v == null || v === '' ? 0 : Number(v));
const fmt = (n) => Number(n).toLocaleString('vi-VN');
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '—');

function buildReport(overall, byUrl, days) {
  const traffic = pick(overall, 'Traffic')[0] ?? {};
  const engage = pick(overall, 'EngagementTime')[0] ?? {};
  const scroll = pick(overall, 'ScrollDepth')[0] ?? {};

  const sessions = num(traffic.totalSessionCount);
  const bots = num(traffic.totalBotSessionCount);
  const users = num(traffic.distinctUserCount);
  const humanSessions = sessions - bots;

  // Tổng các tín hiệu ma sát (mỗi metric có mảng, thường 1 phần tử tổng)
  const sumMetric = (name) =>
    pick(overall, name).reduce((s, r) => s + num(r.subTotal ?? Object.values(r).find((x) => !isNaN(Number(x)))), 0);

  const dead = sumMetric('DeadClickCount');
  const rage = sumMetric('RageClickCount');
  const quickback = sumMetric('QuickbackClick');
  const excessScroll = sumMetric('ExcessiveScroll');
  const scriptErr = sumMetric('ScriptErrorCount');
  const errClick = sumMetric('ErrorClickCount');

  const now = new Date();
  const lines = [];
  lines.push(`# Báo cáo hiệu suất web — Microsoft Clarity`);
  lines.push('');
  lines.push(`> Kỳ dữ liệu: **${days} ngày gần nhất** · Xuất lúc: ${now.toLocaleString('vi-VN')}`);
  lines.push('');

  lines.push(`## 1. Lưu lượng (Traffic)`);
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push(`|---|---|`);
  lines.push(`| Tổng phiên (sessions) | ${fmt(sessions)} |`);
  lines.push(`| Phiên người thật | ${fmt(humanSessions)} |`);
  lines.push(`| Phiên bot | ${fmt(bots)} (${pct(bots, sessions)}) |`);
  lines.push(`| Người dùng riêng biệt | ${fmt(users)} |`);
  lines.push(`| Số trang / phiên | ${traffic.pagesPerSessionPercentage ?? '—'} |`);
  lines.push('');

  lines.push(`## 2. Mức độ gắn kết (Engagement)`);
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push(`|---|---|`);
  lines.push(`| Tổng thời gian (giây) | ${fmt(num(engage.totalTime))} |`);
  lines.push(`| Thời gian chủ động (giây) | ${fmt(num(engage.activeTime))} |`);
  lines.push(`| TG chủ động TB / phiên | ${humanSessions > 0 ? (num(engage.activeTime) / humanSessions).toFixed(1) + 's' : '—'} |`);
  lines.push(`| Độ sâu cuộn TB | ${scroll.averageScrollDepth ?? scroll.subTotal ?? '—'} |`);
  lines.push('');

  lines.push(`## 3. Tín hiệu ma sát (chỉ báo bỏ bước / bực bội)`);
  lines.push('');
  lines.push(`| Tín hiệu | Số lần | / phiên người thật | Ý nghĩa |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| 😡 Rage clicks | ${fmt(rage)} | ${pct(rage, humanSessions)} | Bấm liên tục vì bực (nút hỏng/hiểu lầm) |`);
  lines.push(`| 💀 Dead clicks | ${fmt(dead)} | ${pct(dead, humanSessions)} | Bấm vào chỗ không phản hồi |`);
  lines.push(`| ↩️ Quick backs | ${fmt(quickback)} | ${pct(quickback, humanSessions)} | Vào trang rồi thoát ngay (sai kỳ vọng) |`);
  lines.push(`| 🌀 Excessive scroll | ${fmt(excessScroll)} | ${pct(excessScroll, humanSessions)} | Cuộn quá nhiều để tìm (bố cục khó) |`);
  lines.push(`| ⚠️ Error clicks | ${fmt(errClick)} | ${pct(errClick, humanSessions)} | Bấm gây lỗi JS |`);
  lines.push(`| 🐞 Script errors | ${fmt(scriptErr)} | ${pct(scriptErr, humanSessions)} | Lỗi JS xảy ra |`);
  lines.push('');

  // Top trang có ma sát cao
  const urlTraffic = pick(byUrl, 'Traffic');
  if (urlTraffic.length) {
    lines.push(`## 4. Trang có lưu lượng cao nhất`);
    lines.push('');
    lines.push(`| Trang (URL) | Phiên | Người dùng |`);
    lines.push(`|---|---|---|`);
    urlTraffic
      .map((r) => ({ url: r.Url ?? r.URL ?? '(không rõ)', s: num(r.totalSessionCount), u: num(r.distinctUserCount) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .forEach((r) => lines.push(`| ${r.url} | ${fmt(r.s)} | ${fmt(r.u)} |`));
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`_Nguồn: Microsoft Clarity Data Export API. Giới hạn: 3 ngày gần nhất, 10 request/ngày._`);
  lines.push(`_Chỉ số chuyển đổi/rớt-bước/trả-phí chính xác lấy từ admin dashboard, không phải Clarity._`);

  return lines.join('\n');
}

(async () => {
  console.log(`⏳ Đang lấy dữ liệu Clarity (${argDays} ngày)...`);
  const overall = await fetchInsights(argDays);
  let byUrl = [];
  try {
    byUrl = await fetchInsights(argDays, ['URL']);
  } catch (e) {
    console.warn('⚠️ Không lấy được breakdown theo URL:', e.message);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outDir = join(__dirname, 'reports');
  mkdirSync(outDir, { recursive: true });

  // Lưu JSON thô để tinh chỉnh parser mà không tốn thêm request (giới hạn 10/ngày).
  writeFileSync(
    join(outDir, `clarity-raw-${new Date().toISOString().slice(0, 10)}.json`),
    JSON.stringify({ overall, byUrl }, null, 2),
    'utf8',
  );

  const report = buildReport(overall, byUrl, argDays);
  const outFile = join(outDir, `clarity-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(outFile, report, 'utf8');

  console.log('\n' + report + '\n');
  console.log(`✅ Đã lưu: ${outFile}`);
})().catch((e) => {
  console.error('❌ Lỗi:', e.message);
  process.exit(1);
});
