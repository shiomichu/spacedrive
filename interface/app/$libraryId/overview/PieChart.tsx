import React, { useState, useEffect, useRef, FunctionComponent } from 'react';
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

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
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

  useEffect(() => {
    const handleMouseOut = (event: MouseEvent) => {
      if (pieChartRef.current && !pieChartRef.current.contains(event.target as Node)) {
        setHoveredIndex(null);
      }
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const margin = 10;
  const svgSize = 2 * (radius + strokeWidth) + margin * 2;
  const center = radius + strokeWidth + margin;

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

      const outerPathData = [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${center} ${center}`,
        `Z`,
      ].join(' ');

      const innerPathData = [
        `M ${innerStart.x} ${innerStart.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
        `L ${center} ${center}`,
        `Z`,
      ].join(' ');

      const fullPathData = [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
        `Z`,
      ].join(' ');

      return (
        <g
          key={index}
          onMouseOver={() => setHoveredIndex(index)}
          onMouseOut={() => setHoveredIndex(null)}
          className={clsx('transition-transform duration-300 ease-out', {
            'opacity-100': isHovered,
            'opacity-50': hoveredIndex !== null && !isHovered,
          })}
          style={{
            transform: isHovered ? `translate(${translation.x}px, ${translation.y}px) scale(1.05)` : 'scale(1)',
            opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            zIndex: isHovered ? 10 : 1,
          }}
        >
          {/* Full path for the whole slice, used for hover effect */}
          <path d={fullPathData} fill="transparent" />
          {/* Path for the outer portion of the slice, with color */}
          <path d={outerPathData} fill={colors[index % colors.length]} />
        </g>
      );
    });
  };

  return (
    <div ref={pieChartRef} className="relative inline-block">
      <div
        className={clsx('relative', className)}
        style={{ width: `${svgSize}px`, height: `${svgSize}px` }}
      >
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {renderSlices()}
          {hoveredIndex !== null && (
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none text-lg font-bold transition-opacity duration-300 ease-out"
              style={{ zIndex: 10 }}
            >
              {data[hoveredIndex]?.value}
              <tspan className="ml-0.5 text-tiny text-ink-faint">{units}</tspan>
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};

export default PieChart;
