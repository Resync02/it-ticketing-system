
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBackground,
}: StatCardProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-blue-200 hover:bg-slate-50/70">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBackground}`}
      >
        <Icon size={19} className={iconColor} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
          {title}
        </p>

        <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-[#172B4D] sm:text-2xl">
          {value.toLocaleString("id-ID")}
        </p>
      </div>
    </div>
  );
}
