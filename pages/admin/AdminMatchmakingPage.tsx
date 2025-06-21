
import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import AiFeatureButton from '../../components/AiFeatureButton';
import Textarea from '../../components/Textarea';
import LoadingSpinner from '../../components/LoadingSpinner';
import SimpleBarChart from '../../components/SimpleBarChart';
import MatchmakingVisualization from '../../components/MatchmakingVisualization'; 
import {
    MatchmakingSuggestion,
    DisputeResolutionSuggestion,
    DemandItem,
    StockItem,
    DemandStatus,
    StockStatus,
    MockCompany,
    UserRole,
    TranslationKey,
    ConfirmedMatch 
} from '../../types';
import {
    ArrowsRightLeftIcon,
    ScaleIcon,
    InformationCircleIcon,
    SparklesIcon,
    BanknotesIcon,
    BuildingStorefrontIcon,
    CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { GenerateContentResponse } from "@google/genai";
import { useLocale } from '../../LocaleContext';
import { getTranslatedDemandStatus, getTranslatedStockStatus } from '../../locales';
import { CUSTOMER_DEMANDS_STORAGE_KEY, MANUFACTURER_STOCK_STORAGE_KEY, MOCK_COMPANIES_STORAGE_KEY, CONFIRMED_MATCHES_STORAGE_KEY } from '../../constants';
import { ai } from '../../lib/gemini'; 


interface AdminMatchmakingState {
  matchmakingSuggestions?: MatchmakingSuggestion[] | string;
  disputeDetails?: string;
  disputeResolutionSuggestions?: DisputeResolutionSuggestion[];
  
  allDemands?: DemandItem[];
  isLoadingDemandsList?: boolean;
  allStockItems?: StockItem[];
  isLoadingStockList?: boolean;
  mockCompanies?: MockCompany[];
  isLoadingCompanies?: boolean;

  currentAiFeatureKey?: string;
  showAiEmphasisText: boolean;
  lastConfirmedMatchInfo: string | null;
  initialSuggestionsLoading: boolean; 
}

const getDemandStatusBadgeColor = (status: DemandStatus): string => {
  switch (status) {
    case DemandStatus.RECEIVED: return 'bg-sky-500 text-sky-50';
    case DemandStatus.PROCESSING: return 'bg-amber-500 text-amber-50';
    case DemandStatus.COMPLETED: return 'bg-green-500 text-green-50';
    case DemandStatus.CANCELLED: return 'bg-red-500 text-red-50';
    default: return 'bg-slate-500 text-slate-50';
  }
};

const getStockStatusBadgeColor = (status?: StockStatus): string => {
    if (!status) return 'bg-slate-500 text-slate-50';
    switch (status) {
      case StockStatus.AVAILABLE: return 'bg-green-600 text-green-50';
      case StockStatus.RESERVED: return 'bg-yellow-500 text-yellow-50';
      case StockStatus.SOLD: return 'bg-red-600 text-red-50';
      default: return 'bg-slate-500 text-slate-50';
    }
  };


export const AdminMatchmakingPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [isLoadingAi, setIsLoadingAi] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<AdminMatchmakingState>({
    isLoadingDemandsList: true,
    allDemands: [],
    isLoadingStockList: true,
    allStockItems: [],
    isLoadingCompanies: true,
    mockCompanies: [],
    showAiEmphasisText: false,
    lastConfirmedMatchInfo: null,
    initialSuggestionsLoading: false, 
  });
  const [initialSuggestionsAttempted, setInitialSuggestionsAttempted] = useState(false);


  const parseJsonFromGeminiResponse = useCallback(function <T>(textValue: string, featureNameKey: TranslationKey): T | string {
    let jsonStrToParse = textValue.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchResult = jsonStrToParse.match(fenceRegex);
    if (matchResult && matchResult[2]) {
      jsonStrToParse = matchResult[2].trim();
    }
    try {
      return JSON.parse(jsonStrToParse) as T;
    } catch (error: any) {
      const featureNameText = t(featureNameKey);
      console.error(`Failed to parse JSON response for ${featureNameText}:`, error, "Raw text:", textValue);
      return t('customerNewDemand_error_failedToParseJson', { featureName: featureNameText, rawResponse: textValue.substring(0,100) });
    }
  }, [t]);

  const generateAutomaticPairingSuggestionsWithGemini = useCallback(async (): Promise<MatchmakingSuggestion[] | string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');

    const activeDemandsLocal = state.allDemands?.filter(d => d.status === DemandStatus.RECEIVED) || [];
    const availableStockLocal = state.allStockItems?.filter(s => s.status === StockStatus.AVAILABLE) || [];

    if (activeDemandsLocal.length === 0 || availableStockLocal.length === 0) {
      return t('adminMatchmaking_noPairingSuggestions');
    }
    
    const MAX_ITEMS_TO_SEND = 7; 
    const currentRelevantDemandData = activeDemandsLocal.slice(0, MAX_ITEMS_TO_SEND).map(d => ({
        id: d.id,
        productName: d.productName,
        diameterType: d.diameterType,
        diameterFrom: d.diameterFrom,
        diameterTo: d.diameterTo,
        length: d.length,
        quantity: d.quantity,
        notes: d.notes?.substring(0,50), 
        submittedByCompanyName: d.submittedByCompanyName,
        cubicMeters: d.cubicMeters
    }));
    const currentRelevantStockData = availableStockLocal.slice(0, MAX_ITEMS_TO_SEND).map(s => ({
        id: s.id,
        productName: s.productName,
        diameterType: s.diameterType,
        diameterFrom: s.diameterFrom,
        diameterTo: s.diameterTo,
        length: s.length,
        quantity: s.quantity,
        price: s.price, 
        notes: s.notes?.substring(0,50), 
        uploadedByCompanyName: s.uploadedByCompanyName,
        cubicMeters: s.cubicMeters,
        sustainabilityInfo: s.sustainabilityInfo?.substring(0,50) 
    }));

    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';

    const promptContent = `You are an AI assistant for a timber trading platform.
Based on the following active Customer Demands and available Manufacturer Stock, identify the most promising pairings for various timber products.
Provide your response as a JSON array in ${currentPromptLang}. Each object should represent a pairing and include the following fields:
- "demandId": string (ID of the demand)
- "stockId": string (ID of the stock item)
- "reason": string (A detailed justification in ${currentPromptLang} for why the pairing is good. Consider the following:
    - Matching dimensions (diameter, length) and quantities for the product (typically "${activeDemandsLocal[0]?.productName || 'various timber'}").
    - If it's a niche item or potentially slow-moving stock, highlight this.
    - If quantities differ significantly (e.g., small demand, large stock), EXPLICITLY MENTION THE POSSIBILITY OF CONSOLIDATION. Example: "This 10-piece demand can be well combined with other small items from the manufacturer's larger stock of 200 pieces." or "The manufacturer's stock could satisfy multiple smaller demands."
    - Highlight if specific notes from demand/stock align.
  )
- "matchStrength": string (A qualitative assessment of the match strength, e.g., "High", "Medium", "Low", or a numeric percentage like "85%")
- "similarityScore": number (A numeric similarity score between 0.0 and 1.0 based on overall fit. For example, 0.9 for a very strong match, 0.5 for a moderate match.)

CRITICAL: Ensure every object in the returned JSON array STRICTLY adheres to the specified fields: 'demandId' (string, non-empty), 'stockId' (string, non-empty), 'reason' (string, non-empty), 'matchStrength' (optional string), 'similarityScore' (optional number 0.0-1.0).
The response MUST ONLY contain the JSON array.

Customer Demands (Top ${currentRelevantDemandData.length} active items):
${JSON.stringify(currentRelevantDemandData, null, 2)}

Manufacturer Stock (Top ${currentRelevantStockData.length} available items):
${JSON.stringify(currentRelevantStockData, null, 2)}
`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      
      type RawGeminiSuggestion = {
        demandId: any;
        stockId: any;
        reason: any;
        matchStrength?: any;
        similarityScore?: any;
      };
      const parsedResult = parseJsonFromGeminiResponse(response.text, "adminMatchmaking_requestMatchmakingSuggestions" as TranslationKey);

      if (typeof parsedResult === 'string') return parsedResult; 

      if (Array.isArray(parsedResult)) {
        const validSuggestions: MatchmakingSuggestion[] = [];
        let invalidCount = 0;
        const problematicItems: RawGeminiSuggestion[] = [];

        for (const item of parsedResult) {
          if (
            typeof item.demandId === 'string' && item.demandId.trim() !== '' &&
            typeof item.stockId === 'string' && item.stockId.trim() !== '' &&
            typeof item.reason === 'string' && item.reason.trim() !== '' &&
            (item.matchStrength === undefined || typeof item.matchStrength === 'string') &&
            (item.similarityScore === undefined || typeof item.similarityScore === 'number')
          ) {
            validSuggestions.push({
              id: `gemini-match-${item.demandId}-${item.stockId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              demandId: item.demandId,
              stockId: item.stockId,
              reason: item.reason,
              matchStrength: item.matchStrength || 'Medium', 
              similarityScore: (typeof item.similarityScore === 'number' && item.similarityScore >= 0 && item.similarityScore <=1) ? item.similarityScore : 0.5,
            });
          } else {
            invalidCount++;
            if (problematicItems.length < 5) { 
                problematicItems.push(item);
            }
          }
        }

        if (invalidCount > 0) {
            console.warn(`[AdminMatchmakingPage] AI returned ${invalidCount} invalid suggestion item(s) that were filtered out. First few problematic items (if any):`, problematicItems);
        }

        if (parsedResult.length > 0 && validSuggestions.length === 0) {
          return t('adminMatchmaking_error_failedToParsePairing', {rawResponse: "AI returned array but items had missing/invalid core fields or all items were invalid."});
        }
        
        return validSuggestions;
      }
      return t('adminMatchmaking_error_failedToParsePairing', {rawResponse: "AI response was not a valid array of suggestions."});
    } catch (apiError: any) {
      console.error("Error generating AI matchmaking suggestions:", apiError);
      if (apiError.message) {
        console.error("Gemini API Error Message:", apiError.message);
      }
      if (apiError.stack) {
        console.error("Gemini API Error Stack:", apiError.stack);
      }
      return t('adminMatchmaking_error_pairingGeneric');
    }
  }, [state.allDemands, state.allStockItems, locale, t, parseJsonFromGeminiResponse]);

  const generateDisputeResolutionSuggestionsWithGemini = useCallback(async (currentDisputeDetails: string): Promise<DisputeResolutionSuggestion[]> => {
    if (!ai) {
      return [{ id: 'error-no-ai', suggestion: t('customerNewDemand_error_aiUnavailable') }];
    }
    if (!currentDisputeDetails || currentDisputeDetails.trim().length < 10) {
        return [{ id: 'error-no-details', suggestion: t('adminMatchmaking_error_noDisputeDetails') }];
    }
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `An admin of an online timber marketplace requests dispute resolution suggestions. For the following dispute, provide several (at least 2-3) specific, practical resolution suggestions in ${currentPromptLang} to help the parties reach an agreement.
Provide your response as a list, with each suggestion starting on a new line and preceded by '- ' (hyphen and space). Do not include any introduction, summary, or other explanation outside the list. I only want the list of suggestions.

Dispute Details:
${currentDisputeDetails}

Example of desired response format (only return lines starting with hyphen):
- Suggestion 1: Initiate direct negotiation between parties with a mediator.
- Suggestion 2: Obtain an independent expert opinion on the disputed issue (e.g., quality, quantity).
- Suggestion 3: Offer partial compensation or a discount for quicker resolution.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
      });
      
      const rawTextContent = response.text;
      const suggestionsText = rawTextContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());

      if (suggestionsText.length > 0) {
        return suggestionsText.map((sg, index) => ({ id: `gemini-dr-${index}`, suggestion: sg }));
      }
      
      const fallbackMessage = t('adminMatchmaking_error_failedToParseDisputeSuggestions', {
        rawResponse: (rawTextContent && rawTextContent.length > 0 && !rawTextContent.toLowerCase().includes("nem tudok segíteni") && !rawTextContent.toLowerCase().includes("i cannot assist"))
            ? (rawTextContent.length > 150 ? rawTextContent.substring(0,150) + "..." : rawTextContent) 
            : t('adminMatchmaking_noRelevantSuggestion') 
      });
      return [{ id: 'parse-fail', suggestion: fallbackMessage }];

    } catch (apiError: any) {
      console.error("Error generating dispute resolution suggestions with Gemini:", apiError);
      return [{ id: 'api-error', suggestion: t('adminMatchmaking_error_disputeResolutionGeneric') }];
    }
  }, [locale, t]);

  const handleAiFeatureClick = useCallback((
    featureKey: 'matchmakingSuggestions' | 'disputeResolutionSuggestions', 
    aiOperationKey: string,
    isInitialLoad: boolean = false 
  ) => {
    if (!isInitialLoad) {
      setIsLoadingAi(prev => ({ ...prev, [aiOperationKey]: true }));
    } else {
       setState(prev => ({ ...prev, initialSuggestionsLoading: true }));
    }
     setState(prev => ({
        ...prev,
        matchmakingSuggestions: featureKey === 'matchmakingSuggestions' ? undefined : prev.matchmakingSuggestions,
        disputeResolutionSuggestions: featureKey === 'disputeResolutionSuggestions' ? undefined : prev.disputeResolutionSuggestions,
        currentAiFeatureKey: aiOperationKey,
        showAiEmphasisText: featureKey === 'matchmakingSuggestions' ? false : prev.showAiEmphasisText,
        lastConfirmedMatchInfo: null, 
    }));

    const execute = async () => {
        let resultData;
        try {
            if(featureKey === 'matchmakingSuggestions') {
                resultData = await generateAutomaticPairingSuggestionsWithGemini();
                 setState(prev => ({ ...prev, showAiEmphasisText: typeof resultData !== 'string' && Array.isArray(resultData) && resultData.length > 0 }));
            } else if (featureKey === 'disputeResolutionSuggestions') {
                resultData = await generateDisputeResolutionSuggestionsWithGemini(state.disputeDetails || '');
            }
            setState(prev => ({ ...prev, [featureKey]: resultData }));
        } catch (processError: any) {
            console.error(`Error in AI feature ${featureKey}:`, processError);
            const errorMessageText = t('adminMatchmaking_error_criticalProcessingError');
            if (featureKey === 'disputeResolutionSuggestions') {
                setState(prev => ({ ...prev, disputeResolutionSuggestions: [{id: 'error-catch', suggestion: errorMessageText}] }));
            } else if (featureKey === 'matchmakingSuggestions') {
                 setState(prev => ({ ...prev, matchmakingSuggestions: errorMessageText }));
            }
        } finally {
             if (!isInitialLoad) {
                setIsLoadingAi(prev => ({ ...prev, [aiOperationKey]: false}));
             } else {
                setState(prev => ({ ...prev, initialSuggestionsLoading: false }));
             }
        }
    };
    execute();
  }, [generateAutomaticPairingSuggestionsWithGemini, generateDisputeResolutionSuggestionsWithGemini, state.disputeDetails, t]);


  useEffect(() => {
    setState(prev => ({ ...prev, isLoadingDemandsList: true, isLoadingStockList: true, isLoadingCompanies: true }));
    try {
      const storedDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
      const storedStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
      const storedCompaniesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);

      const parsedDemands: DemandItem[] = storedDemandsRaw ? JSON.parse(storedDemandsRaw) : [];
      const parsedStock: StockItem[] = storedStockRaw ? JSON.parse(storedStockRaw) : [];
      
      setState(prev => ({ 
          ...prev, 
          allDemands: parsedDemands, 
          allStockItems: parsedStock,
          mockCompanies: storedCompaniesRaw ? JSON.parse(storedCompaniesRaw) : [],
          isLoadingDemandsList: false, 
          isLoadingStockList: false, 
          isLoadingCompanies: false 
      }));
    } catch (loadError: any) {
      console.error("Error loading data for admin matchmaking:", loadError);
      setState(prev => ({ ...prev, allDemands: [], allStockItems: [], mockCompanies: [], isLoadingDemandsList: false, isLoadingStockList: false, isLoadingCompanies: false }));
    }
  }, []); 


  useEffect(() => {
    const activeDemandsLocal = state.allDemands?.filter(d => d.status === DemandStatus.RECEIVED) || [];
    const availableStockLocal = state.allStockItems?.filter(s => s.status === StockStatus.AVAILABLE) || [];

    const canLoadInitialSuggestions =
      !state.isLoadingDemandsList &&
      !state.isLoadingStockList &&
      !initialSuggestionsAttempted && // Use the new flag here
      ai && 
      activeDemandsLocal.length > 0 &&
      availableStockLocal.length > 0;

    if (canLoadInitialSuggestions) {
      setInitialSuggestionsAttempted(true); // Mark as attempted
      handleAiFeatureClick('matchmakingSuggestions', 'initialAiPairingOp', true);
    }
  }, [
    state.isLoadingDemandsList,
    state.isLoadingStockList,
    state.allDemands,
    state.allStockItems,
    initialSuggestionsAttempted, // Add to dependency array
    handleAiFeatureClick 
    // ai object is a global const, not strictly needed in deps if it never changes
  ]);


  const handleConfirmMatch = (suggestion: MatchmakingSuggestion) => {
    const demand = state.allDemands?.find(d => d.id === suggestion.demandId);
    const stock = state.allStockItems?.find(s => s.id === suggestion.stockId);

    if (!demand || !stock) {
        alert("Error: Demand or Stock item not found for confirmation.");
        return;
    }

    const commissionRate = 0.05; 
    let calculatedCommissionAmount = 0;
    
    if (stock.price) {
        const priceMatch = stock.price.match(/(\d+(\.\d+)?)\s*EUR\/(m³|db|pcs)/i);
        if (priceMatch) {
            const priceValue = parseFloat(priceMatch[1]);
            const priceUnit = priceMatch[3].toLowerCase();
            if ((priceUnit === 'm³' || priceUnit === 'm3') && stock.cubicMeters) {
                calculatedCommissionAmount = priceValue * stock.cubicMeters * commissionRate;
            } else if ((priceUnit === 'db' || priceUnit === 'pcs') && stock.quantity) {
                calculatedCommissionAmount = priceValue * parseInt(stock.quantity) * commissionRate;
            } else { 
                 calculatedCommissionAmount = priceValue * commissionRate; 
            }
        } else { 
             calculatedCommissionAmount = (stock.cubicMeters || 1) * 2 * commissionRate; 
        }
    } else { 
        calculatedCommissionAmount = (stock.cubicMeters || 1) * 2 * commissionRate; 
    }
    calculatedCommissionAmount = parseFloat(calculatedCommissionAmount.toFixed(2));


    const newConfirmedMatch: ConfirmedMatch = {
        id: `CONF-${Date.now()}-${demand.id.slice(-4)}-${stock.id?.slice(-4)}`,
        demandId: demand.id,
        demandDetails: { ...demand } as DemandItem, 
        stockId: stock.id!,
        stockDetails: { ...stock } as StockItem, 
        matchDate: new Date().toISOString(),
        commissionRate,
        commissionAmount: calculatedCommissionAmount,
        billed: false,
    };

    try {
        const existingConfirmedRaw = localStorage.getItem(CONFIRMED_MATCHES_STORAGE_KEY);
        const existingConfirmed: ConfirmedMatch[] = existingConfirmedRaw ? JSON.parse(existingConfirmedRaw) : [];
        localStorage.setItem(CONFIRMED_MATCHES_STORAGE_KEY, JSON.stringify([newConfirmedMatch, ...existingConfirmed]));
        
        const confirmationMessage = t('adminMatchmaking_matchConfirmed_toast', { commission: calculatedCommissionAmount.toFixed(2) });
        setState(prev => ({...prev, lastConfirmedMatchInfo: confirmationMessage}));
        setTimeout(() => setState(prev => ({...prev, lastConfirmedMatchInfo: null})), 5000); 

    } catch (saveError: any) {
        console.error("Error saving confirmed match:", saveError);
        alert("Error saving confirmed match.");
    }
  };
  
  const handleDisputeDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const getDemandStatusChartData = useCallback(() => {
    if (!state.allDemands) return [];
    const demandCounts: Record<DemandStatus, number> = {
      [DemandStatus.RECEIVED]: 0,
      [DemandStatus.PROCESSING]: 0,
      [DemandStatus.COMPLETED]: 0,
      [DemandStatus.CANCELLED]: 0,
    };
    state.allDemands.forEach(demandItem => {
      if (demandCounts[demandItem.status] !== undefined) {
        demandCounts[demandItem.status]++;
      }
    });
    return [
      { label: t('demandStatus_RECEIVED'), value: demandCounts[DemandStatus.RECEIVED], color: 'text-sky-500' },
      { label: t('demandStatus_PROCESSING'), value: demandCounts[DemandStatus.PROCESSING], color: 'text-amber-500' },
      { label: t('demandStatus_COMPLETED'), value: demandCounts[DemandStatus.COMPLETED], color: 'text-green-500' },
      { label: t('demandStatus_CANCELLED'), value: demandCounts[DemandStatus.CANCELLED], color: 'text-red-500' },
    ];
  }, [state.allDemands, t]);

  const isAnyAiCurrentlyLoading = Object.values(isLoadingAi).some(s => s) || state.initialSuggestionsLoading;
  
  const demandsForVisualization = state.allDemands || [];
  const stockForVisualization = state.allStockItems || [];
  const currentActiveDemandsCount = demandsForVisualization.filter(d => d.status === DemandStatus.RECEIVED).length;
  const currentAvailableStockCount = stockForVisualization.filter(s => s.status === StockStatus.AVAILABLE).length;

  return (
    <>
      <PageTitle title={t('adminMatchmaking_title')} subtitle={t('adminMatchmaking_subtitle')} icon={<ArrowsRightLeftIcon className="h-8 w-8"/>}/>
      
      {state.lastConfirmedMatchInfo && (
        <div className="fixed top-20 right-5 bg-green-500 text-white p-3 rounded-lg shadow-lg z-[100] flex items-center animate-pulse">
            <CheckCircleIcon className="h-6 w-6 mr-2"/>
            <span>{state.lastConfirmedMatchInfo}</span>
        </div>
      )}

      <div className="mb-8">
        <SimpleBarChart data={getDemandStatusChartData()} title={t('adminMatchmaking_chart_demandStatusTitle')} />
      </div>

      <h2 className="text-xl font-semibold text-white mt-2 mb-4 border-b border-slate-700 pb-2">{t('adminStock_aiToolsTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card title={t('adminMatchmaking_requestMatchmakingSuggestions', {productName: ''}).replace('(AI for )','(AI)')} className="hover-glow">
          <p className="text-sm text-slate-300 mb-3">{t('adminMatchmaking_aiMatchmakingDescription', {productName: t('adminMatchmaking_title')}).replace(" '{{productName}}' "," ")}</p>
          <AiFeatureButton
            text={t('adminMatchmaking_requestMatchmakingSuggestions', {productName: ''})}
            onClick={() => handleAiFeatureClick('matchmakingSuggestions', 'aiPairingOp', false)}
            isLoading={isLoadingAi.aiPairingOp || state.initialSuggestionsLoading}
            disabled={!ai || isAnyAiCurrentlyLoading || currentActiveDemandsCount === 0 || currentAvailableStockCount === 0}
            leftIcon={<SparklesIcon className="h-5 w-5 text-yellow-400" />}
          />
           { (currentActiveDemandsCount === 0 || currentAvailableStockCount === 0) && !isAnyAiCurrentlyLoading &&
            <p className="text-xs text-amber-300 mt-2">{t('adminMatchmaking_noPairingSuggestions')}</p>
          }
          {(isLoadingAi.aiPairingOp || state.initialSuggestionsLoading) && (state.currentAiFeatureKey === 'aiPairingOp' || state.currentAiFeatureKey === 'initialAiPairingOp') && <LoadingSpinner text={t('adminStock_generatingSuggestions')} />}
          
          {state.showAiEmphasisText && !isAnyAiCurrentlyLoading && (
              <p className="mt-3 text-center text-lg font-semibold text-cyan-300 animate-pulse">
                  {t('adminMatchmaking_aiEmphasisText')}
              </p>
          )}

          {state.matchmakingSuggestions && !isAnyAiCurrentlyLoading && (state.currentAiFeatureKey === 'aiPairingOp' || state.currentAiFeatureKey === 'initialAiPairingOp') && (
             <div className="mt-4">
              {typeof state.matchmakingSuggestions === 'string' ? (
                <p className="text-sm text-red-300 p-3 bg-red-900/30 rounded">{state.matchmakingSuggestions}</p>
              ) : !Array.isArray(state.matchmakingSuggestions) || state.matchmakingSuggestions.length === 0 ? (
                <p className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded">{t('adminMatchmaking_noPairingSuggestions')}</p>
              ) : ( 
                <MatchmakingVisualization
                    suggestions={state.matchmakingSuggestions}
                    demands={demandsForVisualization} 
                    stockItems={stockForVisualization}
                    onConfirmMatch={handleConfirmMatch}
                />
              )}
            </div>
          )}
        </Card>

        <Card title={t('adminMatchmaking_aiDisputeResolutionAdvisor')} className="hover-glow">
          <Textarea
            label={t('adminMatchmaking_disputeDetailsLabel')}
            name="disputeDetails"
            value={state.disputeDetails || ''}
            onChange={handleDisputeDetailsChange}
            rows={5}
            placeholder={t('adminMatchmaking_disputeDetailsPlaceholder')}
          />
          <AiFeatureButton
            text={t('adminMatchmaking_requestResolutionSuggestions')}
            onClick={() => handleAiFeatureClick('disputeResolutionSuggestions', "disputeResOp", false)}
            isLoading={isLoadingAi.disputeResOp}
            disabled={Boolean(!ai || !state.disputeDetails || (state.disputeDetails?.trim().length || 0) < 10 || isAnyAiCurrentlyLoading)}
            aria-label={t('adminMatchmaking_requestResolutionSuggestions')}
          />
          {isLoadingAi.disputeResOp && state.currentAiFeatureKey === 'disputeResOp' && <LoadingSpinner text={t('adminMatchmaking_searchingSuggestions')} />}
          {state.disputeResolutionSuggestions && !isLoadingAi.disputeResOp && state.currentAiFeatureKey === 'disputeResOp' && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <h5 className="font-semibold text-cyan-400 mb-1">{t('adminMatchmaking_suggestedResolutionSteps')}</h5>
              {state.disputeResolutionSuggestions.map(suggestion => (
                <div key={suggestion.id} className={`p-2 bg-slate-700/50 rounded text-sm ${suggestion.id.startsWith('error-') || suggestion.id === 'api-error' || suggestion.id === 'parse-fail' || suggestion.id === 'error-catch' || suggestion.suggestion.toLowerCase().includes('error') || suggestion.suggestion.toLowerCase().includes('hiba') ? 'text-red-300' : 'text-slate-200'}`}>
                  <ScaleIcon className={`h-4 w-4 inline mr-2 ${suggestion.id.startsWith('error-') || suggestion.id === 'api-error' || suggestion.id === 'parse-fail' || suggestion.id === 'error-catch' || suggestion.suggestion.toLowerCase().includes('error') || suggestion.suggestion.toLowerCase().includes('hiba') ? 'text-red-400' : 'text-yellow-400'}`}/>
                  {suggestion.suggestion}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title={t('adminMatchmaking_demandsByCompanyTitle')} className="mb-6 hover-glow">
        {state.isLoadingCompanies || state.isLoadingDemandsList ? (
          <LoadingSpinner text={t('adminMatchmaking_loadingCompanyData')} />
        ) : !state.mockCompanies || state.mockCompanies.filter(c => c.role === UserRole.CUSTOMER).length === 0 ? (
          <p className="text-slate-400 p-4">{t('adminMatchmaking_noCompaniesFound')}</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto p-1 custom-scrollbar">
            {state.mockCompanies.filter(c => c.role === UserRole.CUSTOMER).map(company => {
              const companyDemands = state.allDemands?.filter(d => d.submittedByCompanyId === company.id) || [];
              const totalCubicMeters = companyDemands.reduce((sum, d) => sum + (d.cubicMeters || 0), 0);
              return (
                <Card key={company.id} title={`${company.companyName} (${t('adminMatchmaking_totalVolume', {volume: totalCubicMeters.toFixed(2)})})`} className="bg-slate-700/60 !shadow-sm">
                  {company.address && (company.address.street || company.address.city || company.address.country) && (
                    <p className="text-xs text-slate-400 px-3 pb-1 -mt-2">
                        {company.address.street && `${company.address.street}, `}
                        {company.address.zipCode && `${company.address.zipCode} `}
                        {company.address.city && `${company.address.city}, `}
                        {company.address.country}
                    </p>
                  )}
                  {companyDemands.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">{t('adminMatchmaking_noDemandsForCompany')}</p>
                  ) : (
                    <ul className="space-y-2 p-2">
                      {companyDemands.map(demand => (
                        <li key={demand.id} className="p-2 bg-slate-600/50 rounded text-xs">
                           <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sky-300">ID: {demand.id.substring(0,10)}...</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${getDemandStatusBadgeColor(demand.status)}`}>{getTranslatedDemandStatus(demand.status,t)}</span>
                           </div>
                           <p className="text-slate-300">{demand.productName || demand.diameterType}, Ø{demand.diameterFrom}-{demand.diameterTo}cm, {demand.length}m, {demand.quantity}pcs</p>
                           <p className="text-slate-300">{t('customerMyDemands_cubicMeters')}: {demand.cubicMeters?.toFixed(3) || 'N/A'} m³</p>
                           {demand.notes && <p className="text-slate-400 italic truncate" title={demand.notes}>"{demand.notes}"</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={t('adminMatchmaking_stockByCompanyTitle')} className="hover-glow">
        {state.isLoadingCompanies || state.isLoadingStockList ? (
          <LoadingSpinner text={t('adminMatchmaking_loadingCompanyData')} />
        ) : !state.mockCompanies || state.mockCompanies.filter(c => c.role === UserRole.MANUFACTURER).length === 0 ? (
          <p className="text-slate-400 p-4">{t('adminMatchmaking_noCompaniesFound')}</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto p-1 custom-scrollbar">
            {state.mockCompanies.filter(c => c.role === UserRole.MANUFACTURER).map(company => {
              const companyStock = state.allStockItems?.filter(s => s.uploadedByCompanyId === company.id) || [];
              const totalCubicMeters = companyStock.reduce((sum, s) => sum + (s.cubicMeters || 0), 0);
              return (
                <Card key={company.id} title={`${company.companyName} (${t('adminMatchmaking_totalVolume', {volume: totalCubicMeters.toFixed(2)})})`} className="bg-slate-700/60 !shadow-sm">
                  {company.address && (company.address.street || company.address.city || company.address.country) && (
                    <p className="text-xs text-slate-400 px-3 pb-1 -mt-2">
                        {company.address.street && `${company.address.street}, `}
                        {company.address.zipCode && `${company.address.zipCode} `}
                        {company.address.city && `${company.address.city}, `}
                        {company.address.country}
                    </p>
                  )}
                  {companyStock.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3">{t('adminMatchmaking_noStockForCompany')}</p>
                  ) : (
                    <ul className="space-y-2 p-2">
                      {companyStock.map(stock => (
                        <li key={stock.id} className="p-2 bg-slate-600/50 rounded text-xs">
                           <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-emerald-300">ID: {stock.id?.substring(0,10)}...</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${getStockStatusBadgeColor(stock.status)}`}>{getTranslatedStockStatus(stock.status,t)}</span>
                           </div>
                           <p className="text-slate-300">{stock.productName || stock.diameterType}, Ø{stock.diameterFrom}-{stock.diameterTo}cm, {stock.length}m, {stock.quantity}pcs</p>
                           <p className="text-slate-300">{t('customerMyDemands_cubicMeters')}: {stock.cubicMeters?.toFixed(3) || 'N/A'} m³</p>
                           {stock.price && <p className="text-slate-300"><BanknotesIcon className="h-4 w-4 inline mr-1 text-green-400"/>{stock.price}</p>}
                           {stock.notes && <p className="text-slate-400 italic truncate" title={stock.notes}>"{stock.notes}"</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
};

export default AdminMatchmakingPage;
