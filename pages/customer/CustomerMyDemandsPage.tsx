
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { NavLink } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import AiFeatureButton from '../../components/AiFeatureButton';
import { DemandItem, DemandStatus, StockItem, StockStatus, AiStockSuggestion, TranslationKey } from '../../types';
import { DocumentTextIcon, InformationCircleIcon, TagIcon, CalendarDaysIcon, HashtagIcon, ArchiveBoxIcon, BeakerIcon, SparklesIcon, BuildingStorefrontIcon, CubeIcon } from '@heroicons/react/24/outline';
import { GenerateContentResponse } from "@google/genai";
import { useLocale } from '../../LocaleContext';
import { getTranslatedDemandStatus, getTranslatedStockStatus } from '../../locales';
import { CUSTOMER_DEMANDS_STORAGE_KEY, MANUFACTURER_STOCK_STORAGE_KEY } from '../../constants';
import { ai } from '../../lib/gemini';

const getStatusBadgeColor = (status: DemandStatus): string => {
  switch (status) {
    case DemandStatus.RECEIVED:
      return 'bg-sky-500 text-sky-50';
    case DemandStatus.PROCESSING:
      return 'bg-amber-500 text-amber-50';
    case DemandStatus.COMPLETED:
      return 'bg-green-500 text-green-50';
    case DemandStatus.CANCELLED:
      return 'bg-red-500 text-red-50';
    default:
      return 'bg-slate-500 text-slate-50';
  }
};

export const CustomerMyDemandsPage: React.FC = () => { 
  const { t, locale } = useLocale();
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDemandIdForAi, setSelectedDemandIdForAi] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAiLoadingForDemand, setIsAiLoadingForDemand] = useState<string | null>(null);

  const [selectedDemandIdForStockSuggestion, setSelectedDemandIdForStockSuggestion] = useState<string | null>(null);
  const [suggestedStock, setSuggestedStock] = useState<AiStockSuggestion[] | string | null>(null);
  const [isAiLoadingForStockSuggestion, setIsAiLoadingForStockSuggestion] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
      if (storedDemandsRaw) {
        const parsedDemands: DemandItem[] = JSON.parse(storedDemandsRaw);
        const ownDemands = parsedDemands.filter(item => !item.submittedByCompanyId);
        ownDemands.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
        setDemands(ownDemands);
      }
      const storedStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
      if (storedStockRaw) {
        const parsedStock: StockItem[] = JSON.parse(storedStockRaw);
        setAllStockItems(parsedStock.filter(s => s.status === StockStatus.AVAILABLE));
      }
    } catch (error) {
      console.error("Error loading demands or stock:", error);
    }
    setIsLoading(false);
  }, []);

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

  const generateDemandStatusExplanationWithGemini = useCallback(async (demandItem: DemandItem): Promise<string> => {
    if (!ai) {
      return t('customerNewDemand_error_aiUnavailable');
    }
    const productDetailsText = `${demandItem.diameterType} Ø${demandItem.diameterFrom}-${demandItem.diameterTo}cm, Length: ${demandItem.length}m (${demandItem.quantity}pcs)`;
    const submissionDateFormattedText = new Date(demandItem.submissionDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    const translatedStatusText = getTranslatedDemandStatus(demandItem.status, t);
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `A customer wants a more detailed, AI-generated, friendly explanation of their timber demand status in ${currentPromptLang}.
Demand details:
- ID: ${demandItem.id}
- Product: ${productDetailsText}
- Submitted: ${submissionDateFormattedText}
- Current status: "${translatedStatusText}" 
Task: Provide a 2-3 sentence generalized explanation of what this "${translatedStatusText}" status might mean in practice in timber trading, and possibly what the next likely step in processing might be. Avoid specific promises or delivery times; provide general information. The response should only contain the generated explanation text, without any extra formatting or prefix/suffix. Respond in ${currentPromptLang}.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
      });
      return response.text || t('customerMyDemands_error_failedToGenerateExplanation');
    } catch (apiError: any) {
      console.error("Error generating demand status explanation with Gemini:", apiError);
      return t('customerMyDemands_error_aiStatusExplanationGeneric');
    }
  }, [locale, t]);

  const handleAiDemandAnalysis = async (demandItem: DemandItem) => {
    if (selectedDemandIdForAi === demandItem.id && aiAnalysisResult) {
      setSelectedDemandIdForAi(null);
      setAiAnalysisResult(null);
      setIsAiLoadingForDemand(null);
      return;
    }
    setIsAiLoadingForDemand(demandItem.id);
    setSelectedDemandIdForAi(demandItem.id); 
    setAiAnalysisResult(null); 
    setSelectedDemandIdForStockSuggestion(null);
    setSuggestedStock(null);
    const resultText = await generateDemandStatusExplanationWithGemini(demandItem);
    setAiAnalysisResult(resultText);
    setIsAiLoadingForDemand(null);
  };

  const generateSimilarStockSuggestionsWithGemini = useCallback(async (demandItem: DemandItem): Promise<AiStockSuggestion[] | string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    const availableStockItems = allStockItems.filter(s => s.status === StockStatus.AVAILABLE);
    if (availableStockItems.length === 0) {
      return t('customerMyDemands_ai_suggestStock_noStockAvailable');
    }
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const MAX_STOCK_ITEMS_TO_SEND = 30;
    const currentRelevantStockData = availableStockItems.slice(0, MAX_STOCK_ITEMS_TO_SEND).map(s => ({
        id: s.id,
        diameterType: s.diameterType,
        diameterFrom: s.diameterFrom,
        diameterTo: s.diameterTo,
        length: s.length,
        quantity: s.quantity,
        price: s.price,
        notes: s.notes?.substring(0,100),
        sustainabilityInfo: s.sustainabilityInfo?.substring(0,100),
        uploadedByCompanyName: s.uploadedByCompanyName
    }));
    const promptContent = `A customer on a timber trading platform has the following demand. Find 1-3 similar or alternative available stock items from the provided list.
For each suggestion, provide "stockItemId", a "reason" (why it's a good match/alternative, considering dimensions, quantity, price, notes), "matchStrength" (e.g., "High", "Medium", "Low", or a numeric percentage like "85%"), and "similarityScore" (numeric, 0.0-1.0).
Respond in JSON format as an array of objects in ${currentPromptLang}.
Customer Demand:
- ID: ${demandItem.id}
- Diameter Type: ${demandItem.diameterType}
- Diameter: ${demandItem.diameterFrom}-${demandItem.diameterTo} cm
- Length: ${demandItem.length} m
- Quantity: ${demandItem.quantity} pcs
${demandItem.notes ? `- Notes: ${demandItem.notes.substring(0,100)}` : ''}

Available Stock Items (up to ${MAX_STOCK_ITEMS_TO_SEND} items):
${JSON.stringify(currentRelevantStockData, null, 2)}

The response MUST ONLY contain the JSON array. Output in ${currentPromptLang}.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      const parsedResult = parseJsonFromGeminiResponse<AiStockSuggestion[]>(response.text, "customerMyDemands_ai_suggestStock_title" as TranslationKey);
      return parsedResult;
    } catch (apiError: any) {
      console.error("Error generating similar stock suggestions with Gemini:", apiError);
      return t('customerMyDemands_ai_suggestStock_errorGeneric');
    }
  }, [allStockItems, locale, t, parseJsonFromGeminiResponse]);

  const handleAiStockSuggestion = async (demandItem: DemandItem) => {
    if (selectedDemandIdForStockSuggestion === demandItem.id && suggestedStock) {
        setSelectedDemandIdForStockSuggestion(null);
        setSuggestedStock(null);
        setIsAiLoadingForStockSuggestion(null);
        return;
    }
    setIsAiLoadingForStockSuggestion(demandItem.id);
    setSelectedDemandIdForStockSuggestion(demandItem.id);
    setSuggestedStock(null);
    setSelectedDemandIdForAi(null); 
    setAiAnalysisResult(null); 
    const resultData = await generateSimilarStockSuggestionsWithGemini(demandItem);
    setSuggestedStock(resultData);
    setIsAiLoadingForStockSuggestion(null);
  };


  if (isLoading) {
    return (
      <>
        <PageTitle title={t('customerMyDemands_title')} subtitle={t('customerMyDemands_subtitle')} icon={<DocumentTextIcon className="h-8 w-8" />} />
        <LoadingSpinner text={t('customerMyDemands_loadingDemands')} />
      </>
    );
  }

  return (
    <>
      <PageTitle title={t('customerMyDemands_title')} subtitle={t('customerMyDemands_subtitle')} icon={<DocumentTextIcon className="h-8 w-8" />} />
      
      {demands.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <InformationCircleIcon className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">{t('customerMyDemands_noDemands')}</p>
            <p className="text-slate-400 text-sm mt-2">{t('customerMyDemands_submitNewDemandPrompt')}</p>
            <Button variant="primary" size="md" className="mt-6">
              <NavLink to="/customer/new-demand">{t('menu_customer_new_demand')}</NavLink>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demands.map(demand => (
            <Card key={demand.id} className="flex flex-col justify-between hover-glow transition-shadow duration-300">
              <div>
                <div className="p-4 border-b border-slate-700">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-cyan-400 flex items-center">
                      <HashtagIcon className="h-5 w-5 mr-2 text-cyan-500" />
                      {t('customerMyDemands_demandId')}: {demand.id.substring(0,10)}...
                    </h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(demand.status)}`}>
                      {getTranslatedDemandStatus(demand.status,t)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center mt-1">
                    <CalendarDaysIcon className="h-4 w-4 mr-1 text-slate-500" />
                    {t('customerMyDemands_submitted')}: {new Date(demand.submissionDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {demand.submittedByCompanyName && (
                    <p className="text-xs text-slate-400 flex items-center mt-1">
                        <BuildingStorefrontIcon className="h-4 w-4 mr-1 text-slate-500" />
                        {t('adminMatchmaking_byCompany', { companyName: demand.submittedByCompanyName })}
                    </p>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start text-sm text-slate-300">
                    <ArchiveBoxIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-slate-100">{t('customerMyDemands_features')}:</span> {demand.diameterType}, Ø {demand.diameterFrom}-{demand.diameterTo}cm, {t('customerNewDemand_length').toLowerCase()}: {demand.length}m, {demand.quantity}pcs
                    </span>
                  </div>
                   <div className="flex items-center text-sm text-slate-300">
                    <BeakerIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0" />
                    <span>
                        <span className="font-medium text-slate-100">{t('customerMyDemands_cubicMeters')}:</span> {demand.cubicMeters?.toFixed(3) || 'N/A'} m³
                    </span>
                  </div>
                  {demand.notes && (
                    <div className="pt-2 mt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400">{t('notes')}:</p>
                      <p className="text-sm text-slate-300 break-words">{demand.notes.length > 100 ? `${demand.notes.substring(0, 100)}...` : demand.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-slate-700 bg-slate-800/50 space-y-2">
                 <AiFeatureButton
                    onClick={() => handleAiDemandAnalysis(demand)}
                    isLoading={isAiLoadingForDemand === demand.id}
                    disabled={Boolean(isAiLoadingForDemand && isAiLoadingForDemand !== demand.id)}
                    text={selectedDemandIdForAi === demand.id && aiAnalysisResult ? t('customerMyDemands_ai_hideExplanation') : t('customerMyDemands_ai_requestStatusExplanation')}
                    leftIcon={<SparklesIcon className="h-5 w-5 text-yellow-400"/>}
                 />
                 {isAiLoadingForDemand === demand.id && (
                     <div className="mt-2"><LoadingSpinner size="sm" text={t('customerMyDemands_ai_analysisInProgress')} /></div>
                 )}
                 {selectedDemandIdForAi === demand.id && aiAnalysisResult && !isAiLoadingForDemand && (
                    <div className={`mt-2 p-2 rounded text-xs ${aiAnalysisResult.includes("Error") || aiAnalysisResult.includes("Hiba") ? 'bg-red-900/50 border border-red-700 text-red-300' : 'bg-slate-700 text-slate-200'}`}>
                        <strong className={aiAnalysisResult.includes("Error") || aiAnalysisResult.includes("Hiba") ? "text-red-300" : "text-cyan-300"}>{t('customerMyDemands_ai_explanationTitle')}</strong> {aiAnalysisResult}
                    </div>
                 )}

                 <AiFeatureButton
                    onClick={() => handleAiStockSuggestion(demand)}
                    isLoading={isAiLoadingForStockSuggestion === demand.id}
                    disabled={Boolean(isAiLoadingForStockSuggestion && isAiLoadingForStockSuggestion !== demand.id) || allStockItems.length === 0}
                    text={selectedDemandIdForStockSuggestion === demand.id && suggestedStock ? t('customerMyDemands_ai_suggestStock_hideSuggestions') : t('customerMyDemands_ai_suggestStock_button')}
                    leftIcon={<CubeIcon className="h-5 w-5 text-teal-400"/>}
                 />
                 {allStockItems.length === 0 && !isAiLoadingForStockSuggestion && (
                     <p className="text-xs text-amber-300 mt-1">{t('customerMyDemands_ai_suggestStock_noStockAvailable')}</p>
                 )}
                 {isAiLoadingForStockSuggestion === demand.id && (
                     <div className="mt-2"><LoadingSpinner size="sm" text={t('customerMyDemands_ai_suggestStock_loading')} /></div>
                 )}
                 {selectedDemandIdForStockSuggestion === demand.id && suggestedStock && !isAiLoadingForStockSuggestion && (
                    <div className="mt-2 p-2 rounded bg-slate-700 max-h-60 overflow-y-auto custom-scrollbar">
                        <h5 className={`font-semibold text-xs mb-1.5 ${typeof suggestedStock === 'string' && (suggestedStock.includes("Error") || suggestedStock.includes("Hiba")) ? 'text-red-300' : 'text-cyan-300'}`}>{t('customerMyDemands_ai_suggestStock_title')}</h5>
                        {typeof suggestedStock === 'string' ? (
                            <p className="text-xs text-red-300">{suggestedStock}</p>
                        ) : suggestedStock.length === 0 ? (
                            <p className="text-xs text-slate-300">{t('customerMyDemands_ai_suggestStock_noMatches')}</p>
                        ) : (
                            <ul className="space-y-2">
                                {suggestedStock.map(suggestion => {
                                    const stockDetail = allStockItems.find(s => s.id === suggestion.stockItemId);
                                    if (!stockDetail) {
                                        return <li key={`notfound-${suggestion.stockItemId}`} className="text-xs text-red-400">{t('customerMyDemands_ai_suggestStock_stockItemDetailsNotFound', {id: suggestion.stockItemId || 'N/A'})}</li>;
                                    }
                                    return (
                                        <li key={suggestion.stockItemId} className="p-1.5 bg-slate-600/70 rounded text-xs">
                                            <p className="font-medium text-teal-300">
                                                {stockDetail.uploadedByCompanyName ? `${stockDetail.uploadedByCompanyName}: ` : ''}
                                                {stockDetail.diameterType}, Ø{stockDetail.diameterFrom}-{stockDetail.diameterTo}cm, {stockDetail.length}m, {stockDetail.quantity}pcs
                                                {stockDetail.price ? ` (${stockDetail.price})` : ''}
                                            </p>
                                            <p className="text-slate-200 mt-0.5"><strong className="text-yellow-400">{t('adminMatchmaking_reason')}:</strong> {suggestion.reason}</p>
                                            <p className="text-slate-300 text-[10px]"><strong className="text-yellow-400">{t('adminMatchmaking_matchStrength')}</strong> {suggestion.matchStrength || 'N/A'}, <strong className="text-yellow-400">{t('adminMatchmaking_similarityScoreLabel')}</strong> {(suggestion.similarityScore || 0) * 100}%</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                 )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};
