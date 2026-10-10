"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "numeric" }).format(new Date(d.date)),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0eaea3" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0eaea3" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 12, border: "1px solid var(--border)" }}
        />
        <Area type="monotone" dataKey="total" stroke="#0eaea3" strokeWidth={2} fill="url(#salesColor)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
