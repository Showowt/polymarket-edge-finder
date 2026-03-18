"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "edge" | "risk" | "success";
}

export function Card({
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const borderColors = {
    default: "border-[#1a1a2a]",
    edge: "border-l-[3px] border-l-[#00ff88] border-[#00ff8830]",
    risk: "border-l-[3px] border-l-[#ff4757] border-[#ff475730]",
    success: "border-l-[3px] border-l-[#4ecdc4] border-[#4ecdc430]",
  };

  return (
    <div
      className={`bg-[#0d1117] border ${borderColors[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  color = "#00ff88",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="text-[22px] font-bold mb-1" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-[#888] tracking-[1px] uppercase">
        {label}
      </div>
      {subtext && <div className="text-[10px] text-[#555] mt-1">{subtext}</div>}
    </Card>
  );
}
