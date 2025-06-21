import React from 'react';
import { Waypoint } from '../types';
import { MapPinIcon, TruckIcon } from '@heroicons/react/24/solid'; 
import { useLocale } from '../LocaleContext';
import Card from '../components/Card';

interface SimulatedRouteMapProps {
  waypoints: Waypoint[];
  optimizedRouteDescription?: string;
}

const SimulatedRouteMap: React.FC<SimulatedRouteMapProps> = ({ waypoints, optimizedRouteDescription }) => {
  const { t } = useLocale();

  if (!waypoints || waypoints.length === 0) {
     return (
      <Card title={t('adminTruckPlanning_routeMap_title')} className="bg-slate-800 shadow-lg">
        <div className="text-center text-slate-400 py-4">{t('adminTruckPlanning_routeMap_noWaypoints')}</div>
      </Card>
    );
  }

  const mapWidth = 600;
  const mapHeight = 300;
  const padding = 30; // Increased padding for labels

  const getPosition = (index: number, total: number) => {
    const divisor = (total - 1 === 0) ? 1 : (total - 1); 
    const xRatio = total > 1 ? index / divisor : 0.5; 
    let x = padding + xRatio * (mapWidth - 2 * padding);
    
    let yOffset = 0;
    if (total > 2) {
      const peakIndex = Math.floor(total / 3); // peak earlier
      const valleyIndex = Math.floor(total * 2 / 3); // valley later
      
      if (index <= peakIndex) {
        yOffset = -40 * (index / peakIndex); // Dip down first
      } else if (index <= valleyIndex) {
        // Curve up from peak to valley
        const progress = (index - peakIndex) / (valleyIndex - peakIndex);
        yOffset = -40 + 80 * progress; // From -40 up to +40
      } else {
        // Curve down from valley to end
        const progress = (index - valleyIndex) / (total - 1 - valleyIndex);
        yOffset = 40 - 40 * progress; // From +40 down to 0
      }
    }
    const yBase = mapHeight / 2 + yOffset;
    const yRandomOffset = (Math.random() * 10 - 5); 
    let y = yBase + yRandomOffset;
    
    y = Math.max(padding + 10, Math.min(y, mapHeight - padding - 20)); // -20 for bottom label space
    x = Math.max(padding, Math.min(x, mapWidth - padding));

    return { x, y };
  };
  
  const points = waypoints.map((wp, i) => getPosition(i, waypoints.length));

  return (
    <Card title={t('adminTruckPlanning_routeMap_title')} className="bg-slate-800 shadow-lg">
      <div className="p-4">
        {optimizedRouteDescription && (
          <p className="text-sm text-slate-300 mb-3">{t('adminTruckPlanning_routeMap_description')}: {optimizedRouteDescription}</p>
        )}
        <div className="bg-slate-700/50 p-2 rounded-lg">
          <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} width="100%" preserveAspectRatio="xMidYMin meet" aria-labelledby="route-map-title-svg">
            <title id="route-map-title-svg">{t('adminTruckPlanning_routeMap_svgTitle')}</title>
            
            <rect width={mapWidth} height={mapHeight} className="fill-slate-600" rx="5" ry="5"/>
            <text x={mapWidth / 2} y={mapHeight / 2} dy=".3em" textAnchor="middle" className="text-2xl fill-slate-500 opacity-30 select-none font-semibold">
              {t('adminTruckPlanning_routeMap_simulatedMapArea')}
            </text>

            {points.slice(0, -1).map((p, i) => (
              <line
                key={`line-${i}`}
                x1={p.x}
                y1={p.y}
                x2={points[i+1].x}
                y2={points[i+1].y}
                className="stroke-cyan-400"
                strokeWidth="2"
                strokeDasharray="4 2"
                markerEnd={i === points.length - 2 ? "url(#routeMapArrow)" : undefined}
              />
            ))}
            <defs>
                <marker id="routeMapArrow" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-cyan-400" />
                </marker>
            </defs>

            {waypoints.map((waypoint, i) => {
              const { x, y } = points[i];
              const IconComponent = waypoint.type === 'pickup' ? TruckIcon : MapPinIcon;
              const iconColor = waypoint.type === 'pickup' ? 'text-emerald-400' : 'text-red-400';

              return (
                <g key={`waypoint-${i}`} transform={`translate(${x - 8}, ${y - 16})`}> 
                   <IconComponent className={`h-6 w-6 fill-current ${iconColor}`} />
                   <title>{`${waypoint.order + 1}. ${waypoint.name} (${t(waypoint.type === 'pickup' ? 'adminTruckPlanning_routeMap_pickup' : 'adminTruckPlanning_routeMap_dropoff')})`}</title>
                   <text x="8" y="28" className="text-[10px] fill-slate-200" textAnchor="middle">
                     {waypoint.order + 1}. {waypoint.name.length > 20 ? `${waypoint.name.substring(0,17)}...` : waypoint.name}
                   </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-3">
            <h4 className="text-sm font-semibold text-cyan-300 mb-1">{t('adminTruckPlanning_routeMap_waypointList')}:</h4>
            <ul className="text-xs text-slate-300 space-y-0.5 max-h-28 overflow-y-auto custom-scrollbar pr-2">
                {waypoints.sort((a,b) => a.order - b.order).map(wp => ( // Ensure sorted display
                    <li key={`${wp.order}-${wp.name}`}>
                       {wp.order + 1}. {wp.name} ({t(wp.type === 'pickup' ? 'adminTruckPlanning_routeMap_pickup' : 'adminTruckPlanning_routeMap_dropoff')})
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </Card>
  );
};

export default SimulatedRouteMap;