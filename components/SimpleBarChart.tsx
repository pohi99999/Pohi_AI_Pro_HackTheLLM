

import React from 'react';
import { useLocale } from '../LocaleContext';

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string; 
}

interface SimpleBarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  barHeight?: number; 
  gap?: number; 
  labelWidthPx?: number; 
  showValues?: 'absolute' | 'percentage' | 'none';
  totalForPercentage?: number; 
}

const VIEWBOX_TOTAL_WIDTH_UNITS = 1000; 
const END_PADDING_UNITS = 20; 

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  barHeight = 40, 
  gap = 15,       
  labelWidthPx = 120, 
  showValues = 'absolute',
  totalForPercentage,
}) => {
  const { t } = useLocale();
  if (!data || data.length === 0) {
    return <div className="text-center text-slate-400 py-4">{t('adminDashboard_noDataForChart')}</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const chartHeightViewBox = data.length * (barHeight + gap) - gap;

  if (showValues === 'percentage' && typeof totalForPercentage !== 'number') {
    // console.warn("SimpleBarChart: 'totalForPercentage' is recommended when 'showValues' is 'percentage' for accurate display. Defaulting to 0% for items if total is not provided or zero.");
  }
  
  const labelAreaWidthUnits = (labelWidthPx / 500) * VIEWBOX_TOTAL_WIDTH_UNITS;
  const valueTextPaddingUnits = 10; 
  const barAreaWidthUnits = VIEWBOX_TOTAL_WIDTH_UNITS - labelAreaWidthUnits - END_PADDING_UNITS;

  return (
    <div className="bg-slate-700/30 p-4 rounded-lg shadow">
      {title && <h3 className="text-md font-semibold text-cyan-300 mb-3 text-center">{title}</h3>}
      <svg 
        width="100%" 
        viewBox={`0 0 ${VIEWBOX_TOTAL_WIDTH_UNITS} ${chartHeightViewBox > 0 ? chartHeightViewBox : barHeight }`} 
        aria-labelledby={title ? title.replace(/\s+/g, '-') : undefined}
        preserveAspectRatio="xMidYMin meet" 
      >
        <title id={title ? title.replace(/\s+/g, '-') : undefined}>{title || t('adminDashboard_barChart')}</title>
        {data.map((item, index) => {
          const y = index * (barHeight + gap);
          
          let displayValue = '';
          if (showValues === 'absolute') {
            displayValue = item.value.toLocaleString(navigator.language);
          } else if (showValues === 'percentage') {
            if (totalForPercentage != null && totalForPercentage > 0) {
                displayValue = `${((item.value / totalForPercentage) * 100).toFixed(1)}%`;
            } else {
                displayValue = `0.0%`; 
            }
          }

          const barRectWidthUnits = maxValue > 0 ? (item.value / maxValue) * barAreaWidthUnits : 0;
          const showTextInsideBar = barRectWidthUnits > (VIEWBOX_TOTAL_WIDTH_UNITS * 0.15); 

          return (
            <g key={item.label} transform={`translate(0, ${y})`} className="simple-bar-group">
              <style>
                {`
                  .simple-bar-group:hover .bar-rect {
                    opacity: 0.85;
                    transform: scaleY(1.02); /* Slight grow effect */
                  }
                  .bar-rect {
                    transition: width 0.5s ease-in-out, opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
                    transform-origin: left center;
                  }
                `}
              </style>
              <text
                x={labelAreaWidthUnits - valueTextPaddingUnits}
                y={barHeight / 2}
                dy=".35em"
                textAnchor="end"
                className="text-xs fill-current text-slate-300"
                aria-label={`${item.label}: ${displayValue}`}
                fontSize="18px" 
              >
                {item.label.length > (labelAreaWidthUnits / 15)  ? `${item.label.substring(0,Math.floor(labelAreaWidthUnits/15)-3)}...` : item.label}
              </text>
              <rect
                x={labelAreaWidthUnits}
                y={0}
                width={barRectWidthUnits}
                height={barHeight}
                className={`bar-rect ${item.color || 'fill-current text-cyan-500'}`}
                rx="3"
                ry="3"
              >
                <title>{`${item.label}: ${displayValue}`}</title>
              </rect>
              {showValues !== 'none' && item.value >= 0 && ( 
                <text
                  x={showTextInsideBar ? (labelAreaWidthUnits + barRectWidthUnits - valueTextPaddingUnits) : (labelAreaWidthUnits + barRectWidthUnits + valueTextPaddingUnits)}
                  y={barHeight / 2}
                  dy=".35em"
                  textAnchor={showTextInsideBar ? "end" : "start"}
                  className={`text-xs font-medium ${showTextInsideBar ? "fill-white" : "fill-slate-200"}`}
                  fontSize="16px" 
                >
                  {displayValue}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SimpleBarChart;