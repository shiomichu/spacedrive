import React, { useState, useRef, FunctionComponent } from 'react';
import clsx from 'clsx';

export type PieChartProps = {
  data: { label: string; value: number }[];
  radius: number;
  strokeWidth?: number;
  innerRadius?: number;
  colors?: string[];
  className?: string;
  units?: string;
};

const PieChart: FunctionComponent<PieChartProps> = ({
  data,
  radius,
  strokeWidth = 2,
  innerRadius = 0,
  colors = ['indianred', 'lightblue', 'lightgreen', 'lightcoral', 'lightgoldenrodyellow'],
  className = '',
  units = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const pieChartRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const margin = 10;
  const svgSize = 2 * (radius + strokeWidth) + margin * 2;
  const center = radius + strokeWidth + margin;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const renderSlices = () => {
    let cumulativeValue = 0;

    return data.map((item, index) => {
      const sliceAngle = (item.value / total) * 360;
      const startAngle = (cumulativeValue / total) * 360;
      cumulativeValue += item.value;

      const isHovered = index === hoveredIndex;
      const middleAngle = startAngle + sliceAngle / 2;
      const translationDistance = sliceAngle > 50 ? 5 : 10;
      const translation = polarToCartesian(0, 0, translationDistance, middleAngle);
      const outerStart = polarToCartesian(center, center, radius, startAngle);
      const outerEnd = polarToCartesian(center, center, radius, startAngle + sliceAngle);
      const innerStart = polarToCartesian(center, center, innerRadius!, startAngle + sliceAngle);
      const innerEnd = polarToCartesian(center, center, innerRadius!, startAngle);
      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      const pathData = [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerStart.x} ${innerStart.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
        `Z`,
      ].join(' ');

      const hoverPathData = [
        `M ${polarToCartesian(center, center, radius + 10, startAngle).x} ${polarToCartesian(center, center, radius + 10, startAngle).y}`,
        `A ${radius + 10} ${radius + 10} 0 ${largeArcFlag} 1 ${polarToCartesian(center, center, radius + 10, startAngle + sliceAngle).x} ${polarToCartesian(center, center, radius + 10, startAngle + sliceAngle).y}`,
        `L ${polarToCartesian(center, center, innerRadius! - 10, startAngle + sliceAngle).x} ${polarToCartesian(center, center, innerRadius! - 10, startAngle + sliceAngle).y}`,
        `A ${innerRadius! - 10} ${innerRadius! - 10} 0 ${largeArcFlag} 0 ${polarToCartesian(center, center, innerRadius! - 10, startAngle).x} ${polarToCartesian(center, center, innerRadius! - 10, startAngle).y}`,
        `Z`,
      ].join(' ');

      return (
        <g className={clsx('transition-transform duration-300 ease-out', {
			'opacity-100': isHovered,
			'opacity-50': hoveredIndex !== null && !isHovered,
		  })}
		  key={index}>
          <path
            d={hoverPathData}
            fill="transparent"
            pointerEvents="bounding-box"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}
          />
          <path
            d={pathData}
            fill={colors[index % colors.length]}
            stroke="white"
            strokeWidth={strokeWidth}
            className={clsx('transition-transform duration-300 ease-out', {
              'opacity-100': isHovered,
              'opacity-50': hoveredIndex !== null && !isHovered,
            })}
            style={{
              transform: isHovered ? `translate(${translation.x}px, ${translation.y}px) scale(1.05)` : 'scale(1)',
              opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
            }}
          />
        </g>
      );
    });
  };

  return (
    <div ref={pieChartRef} className="relative inline-block transition-all">
      <div
        className={clsx('relative', className)}
        style={{ width: `${svgSize}px`, height: `${svgSize}px` }}
      >
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {renderSlices()}
        </svg>
        {hoveredIndex !== null && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded p-1.5 text-lg font-bold transition-transform duration-300 ease-out"
            style={{ zIndex: 10 }}
          >
            {data[hoveredIndex].value}
            <span className="ml-0.5 text-tiny text-ink-faint">
              {units}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PieChart;
