"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "edge" | "risk" | "warning" | "success" | "muted";
}

const variants = {
  default: {
    bg: "rgba(255,255,255,0.1)",
    border: "rgba(255,255,255,0.2)",
    text: "#ffffff",
  },
  edge: {
    bg: "rgba(0,255,136,0.1)",
    border: "rgba(0,255,136,0.3)",
    text: "#00ff88",
  },
  risk: {
    bg: "rgba(255,71,87,0.1)",
    border: "rgba(255,71,87,0.3)",
    text: "#ff4757",
  },
  warning: {
    bg: "rgba(255,215,0,0.1)",
    border: "rgba(255,215,0,0.3)",
    text: "#ffd700",
  },
  success: {
    bg: "rgba(78,205,196,0.1)",
    border: "rgba(78,205,196,0.3)",
    text: "#4ecdc4",
  },
  muted: {
    bg: "rgba(136,136,136,0.1)",
    border: "rgba(136,136,136,0.3)",
    text: "#888",
  },
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  const v = variants[variant];

  return (
    <span
      className="inline-flex items-center px-3 py-1 text-[10px] font-bold tracking-[2px] uppercase"
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.text,
      }}
    >
      {children}
    </span>
  );
}
