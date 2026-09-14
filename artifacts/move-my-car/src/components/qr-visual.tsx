import { ShieldCheck } from 'lucide-react';

type QrVisualProps = {
  id: number;
  compact?: boolean;
};

const finder = (row: number, col: number, size: number) => {
  const inBox = (r: number, c: number) => r >= row && r < row + size && c >= col && c < col + size;
  const edge = (r: number, c: number) => r === row || r === row + size - 1 || c === col || c === col + size - 1;
  const center = (r: number, c: number) => r >= row + 2 && r < row + size - 2 && c >= col + 2 && c < col + size - 2;
  return (r: number, c: number) => inBox(r, c) && (edge(r, c) || center(r, c));
};

export function QrVisual({ id, compact = false }: QrVisualProps) {
  const cells = Array.from({ length: 21 * 21 }, (_, index) => {
    const row = Math.floor(index / 21);
    const col = index % 21;
    const isFinder = finder(0, 0, 7)(row, col) || finder(0, 14, 7)(row, col) || finder(14, 0, 7)(row, col);
    const seeded = ((row * 17 + col * 31 + id * 13 + row * col) % 11) < 5;
    return isFinder || seeded;
  });

  return (
    <div className={`qr-paper relative rounded-xl border border-[hsl(var(--border))] p-3 ${compact ? 'w-[108px]' : 'w-[190px]'} shadow-[var(--shadow-xs)]`} data-testid={`qr-visual-${id}`}>
      <div className="grid aspect-square grid-cols-21 gap-[2px] bg-[hsl(var(--card))]" style={{ gridTemplateColumns: 'repeat(21, minmax(0, 1fr))' }}>
        {cells.map((filled, index) => <span key={index} className={filled ? 'qr-pixel' : 'bg-transparent'} />)}
      </div>
      {!compact && (
        <div className="mt-3 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">
          <ShieldCheck className="h-3 w-3 text-[hsl(var(--chart-2))]" />
          move my car
        </div>
      )}
    </div>
  );
}