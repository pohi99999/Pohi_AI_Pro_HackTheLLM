
import React, { useRef, useEffect, useState } from 'react';
import { DemandItem, StockItem, MatchmakingSuggestion, DemandStatus, StockStatus, ConfirmedMatch } from '../types';
import { useLocale } from '../LocaleContext';
import { InformationCircleIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CONFIRMED_MATCHES_STORAGE_KEY } from '../constants';

interface MatchmakingVisualizationProps {
  suggestions: MatchmakingSuggestion[] | string; // Allow string for error messages
  demands: DemandItem[];
  stockItems: StockItem[];
  onConfirmMatch: (suggestion: MatchmakingSuggestion) => void;
}

const MatchmakingVisualization: React.FC<MatchmakingVisualizationProps> = ({
  suggestions,
  demands,
  stockItems,
  onConfirmMatch,
}) => {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineCoordinates, setLineCoordinates] = useState<
    Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      midX: number;
      midY: number;
      suggestion: MatchmakingSuggestion;
      isConfirmed: boolean;
    }>
  >([]);
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null);
  const [confirmedMatchIds, setConfirmedMatchIds] = useState<Set<string>>(new Set());

   useEffect(() => {
    const storedConfirmedMatchesRaw = localStorage.getItem(CONFIRMED_MATCHES_STORAGE_KEY);
    if (storedConfirmedMatchesRaw) {
        const storedConfirmedMatches: ConfirmedMatch[] = JSON.parse(storedConfirmedMatchesRaw);
        const confirmedSuggestionPairs = new Set(
            storedConfirmedMatches.map(match => `${match.demandId}-${match.stockId}`)
        );
        const newConfirmedSuggestionIds = new Set<string>();
        if (Array.isArray(suggestions)) {
            suggestions.forEach(sug => {
                if(confirmedSuggestionPairs.has(`${sug.demandId}-${sug.stockId}`)) {
                    newConfirmedSuggestionIds.add(sug.id);
                }
            });
        }
        setConfirmedMatchIds(newConfirmedSuggestionIds);
    }
  }, [suggestions]);


  const activeDemands = demands.filter(d => d.status === DemandStatus.RECEIVED);
  const availableStock = stockItems.filter(s => s.status === StockStatus.AVAILABLE);

  useEffect(() => {
    const calculateLines = () => {
      // Critical fix: Ensure suggestions is a valid array before proceeding
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        setLineCoordinates([]);
        return;
      }

      if (!containerRef.current) {
        setLineCoordinates([]);
        return;
      }

      const newCoordinates: typeof lineCoordinates = [];
      const containerRect = containerRef.current.getBoundingClientRect();

      suggestions.forEach(suggestion => {
        try {
            if (!suggestion || !suggestion.id || !suggestion.demandId || !suggestion.stockId) {
                console.warn(`[MatchmakingVisualization] Invalid suggestion object encountered:`, suggestion);
                return;
            }
            const demandElement = document.getElementById(`demand-vis-${suggestion.demandId}`);
            const stockElement = document.getElementById(`stock-vis-${suggestion.stockId}`);

            if (!demandElement) {
                // console.warn(`[MatchmakingVisualization] Demand element 'demand-vis-${suggestion.demandId}' not found for suggestion ${suggestion.id}. Skipping line.`);
                return; 
            }
            if (!stockElement) {
                // console.warn(`[MatchmakingVisualization] Stock element 'stock-vis-${suggestion.stockId}' not found for suggestion ${suggestion.id}. Skipping line.`);
                return; 
            }
            
            if (demandElement.offsetParent === null || stockElement.offsetParent === null) {
                // console.warn(`[MatchmakingVisualization] Element for suggestion ${suggestion.id} (Demand: ${suggestion.demandId}, Stock: ${suggestion.stockId}) is not currently visible. Skipping line.`);
                return;
            }
            
            const demandRect = demandElement.getBoundingClientRect();
            const stockRect = stockElement.getBoundingClientRect();

            if (demandRect.width === 0 && demandRect.height === 0) {
                console.warn(`[MatchmakingVisualization] Demand element 'demand-vis-${suggestion.demandId}' has zero dimensions. Suggestion ID: ${suggestion.id}`);
                return;
            }
            if (stockRect.width === 0 && stockRect.height === 0) {
                console.warn(`[MatchmakingVisualization] Stock element 'stock-vis-${suggestion.stockId}' has zero dimensions. Suggestion ID: ${suggestion.id}`);
                return;
            }

            const x1 = demandRect.right - containerRect.left;
            const y1 = demandRect.top + demandRect.height / 2 - containerRect.top;
            const x2 = stockRect.left - containerRect.left;
            const y2 = stockRect.top + stockRect.height / 2 - containerRect.top;
            
            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
                console.warn(`[MatchmakingVisualization] Calculated NaN coordinates for suggestion ${suggestion.id}. DemandRect:`, demandRect, "StockRect:", stockRect, "ContainerRect:", containerRect);
                return;
            }

            newCoordinates.push({
                id: suggestion.id,
                x1, y1, x2, y2,
                midX: (x1 + x2) / 2,
                midY: (y1 + y2) / 2,
                suggestion,
                isConfirmed: confirmedMatchIds.has(suggestion.id)
            });
        } catch (error) {
            console.error(`[MatchmakingVisualization] Error processing suggestion ${suggestion?.id} (Demand: ${suggestion?.demandId}, Stock: ${suggestion?.stockId}):`, error);
        }
      });
      setLineCoordinates(newCoordinates);
    };
    
    const animationFrameId = requestAnimationFrame(calculateLines);
    
    window.addEventListener('resize', calculateLines);
    
    const observer = new MutationObserver(calculateLines);
    if (containerRef.current) {
        const demandCol = containerRef.current.querySelector('#demand-column-vis');
        const stockCol = containerRef.current.querySelector('#stock-column-vis');
        if (demandCol) observer.observe(demandCol, { childList: true, subtree: true, attributes: true, characterData:true });
        if (stockCol) observer.observe(stockCol, { childList: true, subtree: true, attributes: true, characterData:true });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', calculateLines);
      observer.disconnect();
    };
  }, [suggestions, demands, stockItems, t, confirmedMatchIds]);

  const handleConfirmClick = (e: React.MouseEvent, suggestion: MatchmakingSuggestion) => {
    e.stopPropagation(); 
    onConfirmMatch(suggestion);
    setConfirmedMatchIds(prev => new Set(prev).add(suggestion.id));
  };


  const getMatchColor = (strength?: string, score?: number, isConfirmed?: boolean) => {
    if (isConfirmed) return 'stroke-yellow-500'; 
    if (typeof score === 'number') {
      if (score >= 0.8) return 'stroke-green-400';
      if (score >= 0.5) return 'stroke-yellow-400';
      return 'stroke-red-400';
    }
    if (strength) {
      const lowerStrength = strength.toLowerCase();
      if (lowerStrength.includes('high') || strength.includes('100') || strength.includes('9') || strength.includes('8')) return 'stroke-green-400';
      if (lowerStrength.includes('medium') || strength.includes('7') || strength.includes('6') || strength.includes('5')) return 'stroke-yellow-400';
      if (lowerStrength.includes('low') || strength.includes('4') || strength.includes('3') || strength.includes('2')) return 'stroke-red-400';
    }
    return 'stroke-cyan-500'; 
  };

  if (!Array.isArray(suggestions) || suggestions.length === 0) { // Check if suggestions is an array and non-empty
    const messageToDisplay = typeof suggestions === 'string' ? suggestions : t('adminMatchmaking_noPairingSuggestions');
    return (
      <div className="text-center text-slate-400 py-6">
        <InformationCircleIcon className="h-10 w-10 mx-auto mb-2 text-cyan-500" />
        {/* Display the error string if suggestions is a string, otherwise the default message */}
        {messageToDisplay} 
      </div>
    );
  }
  
  const renderItemCard = (item: DemandItem | StockItem, type: 'demand' | 'stock') => {
    const isDemand = type === 'demand';
    const companyName = isDemand ? (item as DemandItem).submittedByCompanyName : (item as StockItem).uploadedByCompanyName;

    return (
        <div 
            id={`${type}-vis-${item.id}`} 
            className={`p-2.5 rounded-md shadow-md text-xs mb-3 transition-all duration-200 ease-in-out relative
                        ${isDemand ? 'bg-sky-800/70 hover:bg-sky-700/90' : 'bg-emerald-800/70 hover:bg-emerald-700/90'}
                        ${lineCoordinates.some(lc => (isDemand && lc.suggestion.demandId === item.id) || (!isDemand && lc.suggestion.stockId === item.id)) ? 
                          (lineCoordinates.find(lc => (isDemand && lc.suggestion.demandId === item.id) || (!isDemand && lc.suggestion.stockId === item.id))?.isConfirmed ? 'ring-2 ring-yellow-500' : 'ring-2 ring-cyan-400' )
                          : 'ring-1 ring-slate-600'
                        }`}
            style={{ minHeight: '80px' }} 
        >
            <p className={`font-semibold ${isDemand ? 'text-sky-300' : 'text-emerald-300'}`}>
                {isDemand ? t('adminMatchmaking_demand') : t('adminMatchmaking_stock')}: {item.id?.substring(0, 8)}...
            </p>
            {companyName && <p className="text-slate-300 text-[11px] truncate" title={companyName}>{companyName}</p>}
            <p className="text-slate-200">{item.productName || item.diameterType}, Ø{item.diameterFrom}-{item.diameterTo}cm</p>
            <p className="text-slate-200">{t('customerNewDemand_length')}: {item.length}m, {item.quantity}pcs</p>
            <p className="text-slate-200">{t('customerMyDemands_cubicMeters')}: {item.cubicMeters?.toFixed(2) ?? 'N/A'} m³</p>
            {(item as StockItem).price && <p className="text-slate-200">{t('manufacturerMyStock_price')}: {(item as StockItem).price}</p>}
        </div>
    );
  };

  return (
    <div ref={containerRef} className="relative grid grid-cols-[1fr_auto_1fr] md:grid-cols-[1fr_auto_1fr] gap-x-4 md:gap-x-8 p-4 bg-slate-800 rounded-lg min-h-[400px]">
      <div id="demand-column-vis" className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-lg font-semibold text-sky-400 mb-3 sticky top-0 bg-slate-800 py-1 z-10">{t('adminMatchmaking_demand')} ({activeDemands.length})</h3>
        {activeDemands.length > 0 ? activeDemands.map(demand => renderItemCard(demand, 'demand')) : <p className="text-slate-400 text-sm">{t('adminMatchmaking_noDemandsForCompany')}</p>}
      </div>

      <div className="flex-shrink-0 w-16 md:w-24" /> {/* Spacer for lines */}

      <div id="stock-column-vis" className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <h3 className="text-lg font-semibold text-emerald-400 mb-3 sticky top-0 bg-slate-800 py-1 z-10">{t('adminMatchmaking_stock')} ({availableStock.length})</h3>
        {availableStock.length > 0 ? availableStock.map(stock => renderItemCard(stock, 'stock')) : <p className="text-slate-400 text-sm">{t('adminMatchmaking_noStockForCompany')}</p>}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ top: 0, left: 0 }}>
        <defs>
            <marker id="arrowhead-matchmaking-cyan" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-cyan-500 opacity-70" />
            </marker>
             <marker id="arrowhead-matchmaking-green" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-green-400 opacity-70" />
            </marker>
             <marker id="arrowhead-matchmaking-yellow" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-yellow-400 opacity-70" />
            </marker>
             <marker id="arrowhead-matchmaking-red" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-red-400 opacity-70" />
            </marker>
            <marker id="arrowhead-matchmaking-gold" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 8 2.5, 0 5" className="fill-current text-yellow-500 opacity-90" />
            </marker>
             <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        {lineCoordinates.map(coords => {
          if (isNaN(coords.x1) || isNaN(coords.y1) || isNaN(coords.x2) || isNaN(coords.y2)) return null; 
          const colorClass = getMatchColor(coords.suggestion.matchStrength, coords.suggestion.similarityScore, coords.isConfirmed);
          const markerId = coords.isConfirmed ? "arrowhead-matchmaking-gold" : 
                            colorClass.includes('green') ? "arrowhead-matchmaking-green" :
                            colorClass.includes('yellow-400') ? "arrowhead-matchmaking-yellow" : 
                            colorClass.includes('red') ? "arrowhead-matchmaking-red" :
                            "arrowhead-matchmaking-cyan";
          return (
          <g key={coords.id}>
            <line
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              className={`${colorClass} transition-all duration-300`}
              strokeWidth={hoveredSuggestionId === coords.id || coords.isConfirmed ? 4 : 2.5}
              markerEnd={`url(#${markerId})`}
              style={hoveredSuggestionId === coords.id ? { filter: 'url(#glow-filter)' } : {}}
            />
            
            <circle 
                cx={coords.midX} 
                cy={coords.midY} 
                r="10" 
                className={`cursor-pointer pointer-events-auto transition-all duration-200
                            ${coords.isConfirmed ? 'fill-yellow-500 hover:fill-yellow-400' : 'fill-cyan-500 hover:fill-cyan-400'}`}
                onMouseEnter={() => setHoveredSuggestionId(coords.id)}
                onMouseLeave={() => setHoveredSuggestionId(null)}
                onClick={(e) => !coords.isConfirmed && handleConfirmClick(e, coords.suggestion)}
            />
             {coords.isConfirmed ? (
                 <CheckCircleIcon 
                    x={coords.midX - 7} 
                    y={coords.midY - 7} 
                    className="h-3.5 w-3.5 text-slate-800 pointer-events-none" 
                    style={{ transform: `scale(2)` }} 
                />
             ) : (
                <PaperAirplaneIcon 
                    x={coords.midX - 5} 
                    y={coords.midY - 5} 
                    className="h-2.5 w-2.5 text-slate-800 pointer-events-none" 
                    style={{ transform: `scale(2)` }} 
                />
             )}
          </g>
        )})}
      </svg>
      
      {lineCoordinates.map(coords => {
        if (hoveredSuggestionId === coords.id) {
            const isLeftHalf = coords.midX < (containerRef.current?.clientWidth || 0) / 2;
            const tooltipStyle: React.CSSProperties = {
                position: 'absolute',
                top: `${coords.midY}px`, 
                left: isLeftHalf ? `${coords.midX + 25}px` : undefined, 
                right: !isLeftHalf ? `${(containerRef.current?.clientWidth || 0) - coords.midX + 25}px` : undefined, 
                transform: 'translateY(-50%)', 
                zIndex: 50,
                pointerEvents: 'none', 
            };

            return (
                <div 
                    key={`tooltip-${coords.id}`}
                    className={`p-3 border rounded-lg shadow-2xl text-xs w-64 md:w-72
                                ${coords.isConfirmed ? 'bg-slate-900 border-yellow-500' : 'bg-slate-900 border-cyan-400'}`}
                    style={tooltipStyle}
                >
                    <p className={`font-bold mb-1.5 ${coords.isConfirmed ? 'text-yellow-400' : 'text-cyan-300'}`}>
                        {coords.isConfirmed ? t('adminMatchmaking_matchConfirmed_title') : t('adminMatchmaking_reason')}
                    </p>
                    <p className="text-slate-200 mb-1 whitespace-pre-wrap leading-snug">{coords.suggestion.reason}</p>
                    {coords.suggestion.matchStrength && (
                        <p className="text-slate-300"><strong className={coords.isConfirmed ? 'text-yellow-400' : 'text-cyan-300'}>{t('adminMatchmaking_matchStrength')}</strong> {coords.suggestion.matchStrength}</p>
                    )}
                    {coords.suggestion.similarityScore !== undefined && (
                        <p className="text-slate-300"><strong className={coords.isConfirmed ? 'text-yellow-400' : 'text-cyan-300'}>{t('adminMatchmaking_similarityScoreLabel')}</strong> {(coords.suggestion.similarityScore * 100).toFixed(0)}%</p>
                    )}
                    {coords.isConfirmed && <p className="mt-2 text-green-400 font-semibold">{t('adminMatchmaking_alreadyConfirmed')}</p>}
                </div>
            );
        }
        return null;
      })}
    </div>
  );
};

export default MatchmakingVisualization;
