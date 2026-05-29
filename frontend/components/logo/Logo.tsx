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
    <div className={`flex items-center ${className}`} style={{ gap }}>
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
        <linearGradient id={`diamondGrad-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6B21A8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={`lockGrad-${size}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect
        x="9" y="9"
        width="30" height="30"
        rx="4"
        transform="rotate(45 24 24)"
        stroke={`url(#diamondGrad-${size})`}
        strokeWidth={strokeW}
        fill="none"
        strokeLinejoin="round"
      />
      <rect
        x="19" y="25"
        width="10" height="8"
        rx="1.5"
        stroke={`url(#lockGrad-${size})`}
        strokeWidth={strokeW * 0.8}
        fill="none"
      />
      <path
        d={`M21 25 V${20.5 + (size < 32 ? 0 : 0)} A3 3 0 0 1 27 ${20.5 + (size < 32 ? 0 : 0)} V25`}
        stroke={`url(#lockGrad-${size})`}
        strokeWidth={strokeW * 0.8}
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="24"
        cy={25 + (size >= 48 ? 4 : size >= 32 ? 3.5 : 3)}
        r={size >= 48 ? 1.2 : size >= 32 ? 1 : 0.8}
        fill={`url(#lockGrad-${size})`}
      />
    </svg>
  );
}