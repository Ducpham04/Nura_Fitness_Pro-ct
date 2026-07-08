// Lịch tuân thủ theo tháng — phong cách HEATMAP: ô nhỏ bo tròn, màu theo trạng thái.
//   good = đạt/đúng · off = thiếu/lệch · none = chưa có (hoặc ngày nghỉ)
// Dùng chung cho Tập luyện và Dinh dưỡng. Chỉ nhận state đã tính sẵn từ data thật.
type CellState = 'good' | 'off' | 'none';

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

interface Palette {
  surface: string; ink: string; sub: string; faint: string; border: string; track: string; shadow: string;
}

export default function AdherenceCalendar({
  c, title, icon, accent, offColor, stateByDate, goodLabel, offLabel, summary,
}: {
  c: Palette;
  title: string;
  icon: React.ReactNode;
  accent: string;               // màu "đạt"
  offColor: string;             // màu "lệch/thiếu"
  stateByDate: Record<string, Exclude<CellState, 'none'>>;
  goodLabel: string;
  offLabel: string;
  summary?: string;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = `${year}-${pad(month + 1)}-${pad(now.getDate())}`;
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // T2 = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: ({ key: string; state: CellState; future: boolean; today: boolean } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({ key, state: stateByDate[key] ?? 'none', future: key > todayKey, today: key === todayKey });
  }

  const cellBg = (state: CellState) =>
    state === 'good' ? accent : state === 'off' ? offColor : c.track;

  return (
      <div className="rounded-[16px] p-4 md:p-5" style={{ backgroundColor: c.surface, border: `1px solid ${c.border}`, boxShadow: c.shadow }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px]" style={{ backgroundColor: `${accent}22`, color: accent }}>{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-grotesk text-[15px] font-bold tracking-tight" style={{ color: c.ink }}>{title}</p>
            <p className="text-[11px]" style={{ color: c.sub }}>Tháng {month + 1}</p>
          </div>
        </div>

        {/* Heatmap: nhãn thứ + lưới ô nhỏ, không hiện số (di chuột xem ngày) */}
        <div className="mx-auto mt-4 max-w-[280px]">
          <div className="grid grid-cols-7 gap-[5px]">
            {WD.map((w, i) => (
              <span key={i} className="text-center text-[9px] font-bold" style={{ color: c.faint }}>{w}</span>
            ))}
          </div>
          <div className="mt-[5px] grid grid-cols-7 gap-[5px]">
            {cells.map((cell, i) =>
              cell === null ? (
                <span key={`b${i}`} />
              ) : (
                <span
                  key={cell.key}
                  title={cell.key}
                  className="aspect-square rounded-[5px]"
                  style={{
                    backgroundColor: cellBg(cell.state),
                    opacity: cell.future ? 0.32 : cell.state === 'none' ? 0.75 : 1,
                    boxShadow: cell.today ? `0 0 0 2px ${c.surface}, 0 0 0 3.5px ${accent}` : 'none',
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* Chú thích + tổng kết */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Legend color={accent} label={goodLabel} />
          <Legend color={offColor} label={offLabel} />
          <Legend color={c.track} label="Chưa có" />
        </div>
        {summary && <p className="mt-3 text-center text-[12px] font-semibold" style={{ color: c.ink }}>{summary}</p>}
      </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'inherit' }}>
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
        {label}
      </span>
  );
}
