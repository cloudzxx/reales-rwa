"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { mark: 24, text: 14 },
  md: { mark: 32, text: 18 },
  lg: { mark: 48, text: 24 },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizes[size];
  const gap = size === "sm" ? 8 : size === "md" ? 10 : 12;

  return (
    <div className={`flex items-center gap-${gap} ${className}`} style={{ gap }}>
      <LogoMark size={s.mark} />
      <div className="flex items-baseline gap-1">
        <span
          className="font-semibold text-gray-800"
          style={{ fontSize: s.text, fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          Reales
        </span>
        <span
          className="font-medium uppercase"
          style={{
            fontSize: s.text * 0.6,
            letterSpacing: "0.15em",
            background: "linear-gradient(to right, #6B21A8, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          RWA
        </span>
      </div>
    </div>
  );
}

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  const strokeW = size >= 48 ? 2.5 : size >= 32 ? 2 : 1.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`hexGrad-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6B21A8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={`checkGrad-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <polygon
        points="24,4 42,14 42,34 24,44 6,34 6,14"
        stroke={`url(#hexGrad-${size})`}
        strokeWidth={strokeW}
        fill="none"
        strokeLinejoin="round"
      />
      <line
        x1="6"
        y1="24"
        x2="38"
        y2="24"
        stroke={`url(#checkGrad-${size})`}
        strokeWidth={strokeW * 0.8}
        strokeLinecap="round"
      />
      <polyline
        points="32,17 37,22 44,13"
        stroke={`url(#checkGrad-${size})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}