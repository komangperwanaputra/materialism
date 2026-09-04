import React, { useState } from 'react';

export interface CategoryDataPoint {
  name: string;
  value: number;
}

interface FrostedGlowDonutChartProps {
  data: CategoryDataPoint[];
  totalAmount: number;
  privacyMode: boolean;
  activeCategoryIndex: number | null;
  onSelectCategory: (index: number | null) => void;
}

// Minimal & clean translucent palette (zero outlines)
const SLICE_PALETTE = [
  {
    gradient: ['#C5272E', '#a71d23', '#89181d'],
    solid: '#C5272E',
    glow: 'rgba(197, 39, 46, 0.45)',
  },
  {
    gradient: ['#f8fafc', '#e2e8f0', '#94a3b8'],
    solid: '#f8fafc',
    glow: 'rgba(255, 255, 255, 0.3)',
  },
  {
    gradient: ['#a71d23', '#89181d', '#6a1317'],
    solid: '#a71d23',
    glow: 'rgba(167, 29, 35, 0.35)',
  },
  {
    gradient: ['#cbd5e1', '#94a3b8', '#64748b'],
    solid: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.25)',
  },
  {
    gradient: ['#89181d', '#6a1317', '#3d080b'],
    solid: '#89181d',
    glow: 'rgba(137, 24, 29, 0.35)',
  },
  {
    gradient: ['#71717a', '#52525b', '#3f3f46'],
    solid: '#71717a',
    glow: 'rgba(113, 113, 122, 0.25)',
  },
];

export const FrostedGlowDonutChart: React.FC<FrostedGlowDonutChartProps> = ({
  data,
  totalAmount,
  privacyMode,
  activeCategoryIndex,
  onSelectCategory,
}) => {
  const [internalHover, setInternalHover] = useState<number | null>(null);
  const hoveredIndex = activeCategoryIndex !== null ? activeCategoryIndex : internalHover;

  const formatRupiah = (num: number) => {
    if (privacyMode) return 'Rp ••••••••';
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // SVG Geometry
  const size = 280;
  const center = size / 2;
  const outerR = 116;
  const innerR = 76;

  // Compute angles for each slice
  const sumValues = data.reduce((acc, d) => acc + d.value, 0) || 1;
  let accumulatedAngle = -Math.PI / 2; // Start from 12 o'clock

  const slices = data.map((d, index) => {
    const fraction = d.value / sumValues;
    const angleSpan = fraction * 2 * Math.PI;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angleSpan;
    accumulatedAngle = endAngle;

    // Clean gap between slices
    const hasGap = data.length > 1;
    const gapAngle = hasGap ? 0.04 : 0;
    const sAngle = startAngle + gapAngle / 2;
    const eAngle = Math.max(sAngle, endAngle - gapAngle / 2);

    const isHovered = hoveredIndex === index;
    const curOuterR = isHovered ? outerR + 5 : outerR;
    const curInnerR = isHovered ? innerR - 2 : innerR;

    // Outer & inner arc points
    const x1 = center + curOuterR * Math.cos(sAngle);
    const y1 = center + curOuterR * Math.sin(sAngle);
    const x2 = center + curOuterR * Math.cos(eAngle);
    const y2 = center + curOuterR * Math.sin(eAngle);

    const x3 = center + curInnerR * Math.cos(eAngle);
    const y3 = center + curInnerR * Math.sin(eAngle);
    const x4 = center + curInnerR * Math.cos(sAngle);
    const y4 = center + curInnerR * Math.sin(sAngle);

    const largeArc = eAngle - sAngle > Math.PI ? 1 : 0;

    // Path for slice - completely borderless and seamless
    const path = `M ${x1} ${y1} A ${curOuterR} ${curOuterR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${curInnerR} ${curInnerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    const palette = SLICE_PALETTE[index % SLICE_PALETTE.length];
    const percentage = ((d.value / sumValues) * 100).toFixed(1);

    return {
      name: d.name,
      value: d.value,
      percentage,
      path,
      palette,
      index,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="w-full flex flex-col items-center select-none">
      <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
        {/* Soft Radial Diffused Center Glow (as in Reference 2) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Main glowing light bloom */}
          <div
            className="w-44 h-44 rounded-full blur-2xl transition-all duration-500 ease-out"
            style={{
              backgroundColor: activeSlice ? activeSlice.palette.glow : 'rgba(239, 68, 68, 0.35)',
              transform: hoveredIndex !== null ? 'scale(1.15)' : 'scale(1)',
            }}
          />
          {/* Core brighter radial diffusion */}
          <div className="w-28 h-28 rounded-full bg-red-500/25 blur-xl pointer-events-none" />
        </div>

        {/* Pure Clean SVG Layer (Zero outlines, Zero borders) */}
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full relative z-10 overflow-visible"
        >
          <defs>
            {slices.map((s) => (
              <linearGradient
                key={`simple-grad-${s.index}`}
                id={`simple-grad-${s.index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={s.palette.gradient[0]} stopOpacity={0.92} />
                <stop offset="50%" stopColor={s.palette.gradient[1]} stopOpacity={0.65} />
                <stop offset="100%" stopColor={s.palette.gradient[2]} stopOpacity={0.28} />
              </linearGradient>
            ))}
          </defs>

          {/* Slices without any stroke / outline */}
          {slices.map((s) => {
            const isHighlighted = hoveredIndex === null || hoveredIndex === s.index;

            return (
              <path
                key={`slice-${s.index}`}
                d={s.path}
                fill={`url(#simple-grad-${s.index})`}
                stroke="none"
                strokeWidth={0}
                className="cursor-pointer transition-all duration-300 ease-out"
                style={{
                  opacity: isHighlighted ? 1 : 0.25,
                }}
                onMouseEnter={() => {
                  setInternalHover(s.index);
                  onSelectCategory(s.index);
                }}
                onMouseLeave={() => {
                  setInternalHover(null);
                  onSelectCategory(null);
                }}
              />
            );
          })}
        </svg>

        {/* Center Minimal Typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 z-20">
          {activeSlice ? (
            <div className="flex flex-col items-center transition-all duration-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {activeSlice.name}
              </span>
              <span className="text-3xl font-black font-heading text-white tracking-tight leading-none my-1">
                {activeSlice.percentage}%
              </span>
              <span className="text-xs font-semibold text-neutral-300 mt-0.5">
                {formatRupiah(activeSlice.value)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Total Expenses
              </span>
              <span className="text-xl font-black font-heading text-white tracking-tight leading-none my-1">
                {formatRupiah(totalAmount)}
              </span>
              <span className="text-[11px] text-neutral-400">
                {data.length} {data.length === 1 ? 'Category' : 'Categories'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
