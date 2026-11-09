import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayLabel, px, utcStamp } from "@/lib/format";
import type { ChartPoint } from "@/lib/signal";

type Row = ChartPoint & { price: number };

export function PriceChart({ points }: { points: ChartPoint[] }) {
  const data: Row[] = points.map((point) => ({ ...point, price: point.close }));
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={dayLabel}
            minTickGap={40}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
            width={40}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-line)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(label) => utcStamp(Number(label))}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              const label = name === "ema8" ? "8 EMA" : name === "ema21" ? "21 EMA" : "Price";
              return [px(n), label];
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--color-fg)"
            dot={false}
            strokeWidth={1.6}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ema8"
            stroke="var(--color-accent)"
            dot={false}
            strokeWidth={2}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ema21"
            stroke="var(--color-muted)"
            dot={false}
            strokeWidth={1.6}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
