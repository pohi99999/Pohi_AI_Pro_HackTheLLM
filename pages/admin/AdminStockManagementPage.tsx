

import React, { useState, useEffect } from 'react';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import AiFeatureButton from '../../components/AiFeatureButton';
import Textarea from '../../components/Textarea';
import LoadingSpinner from '../../components/LoadingSpinner';
import Button from '../../components/Button';
import SimpleBarChart from '../../components/SimpleBarChart'; // Added
import { OptimizationTip, StockItem, StockStatus } from '../../types';
import { CircleStackIcon, AdjustmentsHorizontalIcon, CheckBadgeIcon, HashtagIcon, CalendarDaysIcon, ArchiveBoxIcon, BeakerIcon, BanknotesIcon, ShieldCheckIcon, InformationCircleIcon, SparklesIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { GenerateContentResponse } from "@google/genai";
import { useLocale } from '../../LocaleContext';
import { getTranslatedStockStatus, DIAMETER_TYPE_OPTIONS } from '../../locales'; // Added DIAMETER_TYPE_OPTIONS
import { ai } from '../../lib/gemini'; // Import shared AI instance

const MANUFACTURER_STOCK_STORAGE_KEY = 'pohi-ai-manufacturer-stock';

interface AdminStockState {
  optimizationTips?: OptimizationTip[];
  productDescriptionForCategorization?: string;
  categorySuggestion?: string;
  productDescriptionForSustainability?: string;
  sustainabilityAssessment?: string;
  
  allStockItems?: StockItem[];
  isLoadingStockList?: boolean;

  selectedStockItemIdForAdminAi?: string | null;
  adminAiStockAnalysisResult?: string | null;
  isAdminAiLoadingForStockItem?: string | null;
  currentAiFeatureKey?: string;
}

const getStockStatusBadgeColor = (status?: StockStatus): string => {
  if (!status) return 'bg-slate-500 text-slate-50';
  switch (status) {
    case StockStatus.AVAILABLE:
      return 'bg-green-600 text-green-50';
    case StockStatus.RESERVED:
      return 'bg-yellow-500 text-yellow-50';
    case StockStatus.SOLD:
      return 'bg-red-600 text-red-50';
    default:
      return 'bg-slate-500 text-slate-50';
  }
};


const AdminStockManagementPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [isLoadingAi, setIsLoadingAi] = useState<Record<string, boolean>>({}); 
  const [state, setState] = useState<AdminStockState>({ isLoadingStockList: true, allStockItems: [] });

  const generateOptimizationTipsWithGemini = async (): Promise<OptimizationTip[]> => {
    if (!ai) {
      return [{ id: 'error-no-ai', tip: t('customerNewDemand_error_aiUnavailable') }];
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `For an admin of an online timber marketplace, generate general stock optimization tips in ${promptLang}. The tips should be practical, focus on efficient stock management, avoiding overproduction/shortages, and possibly touch on JIT (Just-In-Time) principles. Provide at least 3-5 tips. Your response should be a list, with each tip starting on a new line and preceded by '- ' (hyphen and space). The response should contain nothing else but this list.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      const rawText = response.text;
      const tips = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim())
        .filter(tip => tip.length > 0)
        .map((tip, index) => ({ id: `gemini-tip-${index}`, tip }));
      
      return tips.length > 0 ? tips : [{ id: 'parse-fail', tip: t('adminStock_error_failedToParseTips') }];
    } catch (error) {
      console.error("Error generating optimization tips with Gemini:", error);
      return [{ id: 'api-error', tip: t('adminStock_error_optimizationTipsGeneric') }];
    }
  };

  const generateCategorySuggestionWithGemini = async (description?: string): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!description || description.trim().length < 10) {
        return t('adminStock_error_provideMinLengthDescription', { action: t('adminStock_productCategorizationLabel_action') });
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `An admin of an online timber marketplace requests a product categorization suggestion. Based on the following product description, provide 1-2 relevant, hierarchical category suggestions in ${promptLang}. The categories should be specific to the timber industry. Use '>' to denote hierarchy.
Example: "Construction Wood > Structural Timber > Spruce Log" or "Raw Wood Material > Softwood > Logs for Processing".
The response should only contain the suggested categor(y/ies), each on a new line if multiple. No other text should be included.

Product Description:
"${description}"`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      return response.text || t('adminStock_error_categorySuggestionGeneric');
    } catch (error) {
      console.error("Error generating category suggestion with Gemini:", error);
      return t('adminStock_error_categorySuggestionGeneric');
    }
  };

  const generateSustainabilityAssessmentWithGemini = async (description?: string): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!description || description.trim().length < 10) {
        return t('adminStock_error_provideMinLengthDescription', { action: t('adminStock_sustainabilityAssessmentLabel_action') });
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `An admin of an online timber marketplace requests a sustainability assessment based on a product description. Based on the following description and sustainability information, provide a short assessment in ${promptLang}. Address the level of sustainability compliance the product seems to meet (e.g., basic, medium, high). Suggest what further information (e.g., certificates, details of harvesting methods) might be needed for a more accurate classification. The response should be a single paragraph. No other text should be included.

Product Description and Sustainability Information:
"${description}"`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      return response.text || t('adminStock_error_sustainabilityAssessmentGeneric');
    } catch (error) {
      console.error("Error generating sustainability assessment with Gemini:", error);
      return t('adminStock_error_sustainabilityAssessmentGeneric');
    }
  };

  const generateAdminStockAnalysisWithGemini = async (stockItem: StockItem): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    const productDetails = `${stockItem.diameterType}, Ø${stockItem.diameterFrom}-${stockItem.diameterTo}cm, Length: ${stockItem.length}m (${stockItem.quantity}pcs)`;
    const uploadDateFormatted = stockItem.uploadDate ? new Date(stockItem.uploadDate).toLocaleDateString(locale) : 'N/A';
    const translatedStatus = getTranslatedStockStatus(stockItem.status, t);
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';

    const prompt = `An admin of an online timber marketplace requests an analysis of a specific stock item in ${promptLang}.
Stock item details:
- ID: ${stockItem.id || 'N/A'}
- Product: ${productDetails}
- Uploaded: ${uploadDateFormatted}
- Status: "${translatedStatus}"
- Price: ${stockItem.price || 'Not specified'}
${stockItem.uploadedByCompanyName ? `- Uploading company: ${stockItem.uploadedByCompanyName}` : ''}
${stockItem.sustainabilityInfo ? `- Sustainability information: ${stockItem.sustainabilityInfo}` : ''}
${stockItem.notes ? `- Manufacturer's note: ${stockItem.notes}` : ''}

Task: Provide a structured analysis in ${promptLang}, using the following headings (use these exact markdown-formatted headings, and provide 1-2 sentences of content for each):
**${t('adminStock_aiAnalysis_summary')}**
**${t('adminStock_aiAnalysis_marketRelevance')}**
**${t('adminStock_aiAnalysis_pricingNote')}**
**${t('adminStock_aiAnalysis_potentialCustomers')}**

The response should only contain the requested structured analysis.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      return response.text || t('adminStock_error_failedToGenerateStockAnalysis');
    } catch (error) {
      console.error("Error generating admin stock analysis with Gemini:", error);
      return t('adminStock_error_adminStockAnalysisGeneric');
    }
  };

  const handleAiFeatureClick = async (
    featureKey: Extract<keyof AdminStockState, 'optimizationTips' | 'categorySuggestion' | 'sustainabilityAssessment'>,
    aiOperationKey: string
  ) => {
    setIsLoadingAi(prev => ({ ...prev, [aiOperationKey]: true }));
    setState(prev => ({ 
      ...prev, 
      optimizationTips: featureKey === 'optimizationTips' ? undefined : prev.optimizationTips,
      categorySuggestion: featureKey === 'categorySuggestion' ? undefined : prev.categorySuggestion,
      sustainabilityAssessment: featureKey === 'sustainabilityAssessment' ? undefined : prev.sustainabilityAssessment,
      currentAiFeatureKey: aiOperationKey
    }));

    let result;
    try {
      if (featureKey === 'optimizationTips') {
        result = await generateOptimizationTipsWithGemini();
      } else if (featureKey === 'categorySuggestion') {
        result = await generateCategorySuggestionWithGemini(state.productDescriptionForCategorization);
      } else if (featureKey === 'sustainabilityAssessment') {
        result = await generateSustainabilityAssessmentWithGemini(state.productDescriptionForSustainability);
      }
      setState(prev => ({ ...prev, [featureKey]: result }));
    } catch (error) {
      console.error(`Error in AI feature ${featureKey}:`, error);
      const errorMessage = t('adminUsers_error_aiFeatureGeneric');
      if (featureKey === 'optimizationTips') {
          setState(prev => ({ ...prev, optimizationTips: [{id: 'error-catch', tip: errorMessage}] }));
      } else { // For categorySuggestion and sustainabilityAssessment
          setState(prev => ({ ...prev, [featureKey]: errorMessage }));
      }
    } finally {
      setIsLoadingAi(prev => ({ ...prev, [aiOperationKey]: false }));
    }
  };


   const handleAdminStockItemAiAnalysis = async (stockItem: StockItem) => {
    if (!stockItem.id) return;
    if (state.selectedStockItemIdForAdminAi === stockItem.id && state.adminAiStockAnalysisResult) {
      setState(prev => ({ ...prev, selectedStockItemIdForAdminAi: null, adminAiStockAnalysisResult: null, isAdminAiLoadingForStockItem: null }));
      return;
    }
    setState(prev => ({ ...prev, isAdminAiLoadingForStockItem: stockItem.id, selectedStockItemIdForAdminAi: stockItem.id, adminAiStockAnalysisResult: null, currentAiFeatureKey: `adminAnalysis-${stockItem.id}` }));
    const result = await generateAdminStockAnalysisWithGemini(stockItem);
    setState(prev => ({ ...prev, adminAiStockAnalysisResult: result, isAdminAiLoadingForStockItem: null }));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setState(prev => ({ ...prev, isLoadingStockList: true, allStockItems: [] }));
    try {
      const storedStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
      if (storedStockRaw) {
        const parsedStock: StockItem[] = JSON.parse(storedStockRaw);
        parsedStock.sort((a, b) => (a.uploadDate && b.uploadDate) ? new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime() : 0);
        setState(prev => ({ ...prev, allStockItems: parsedStock }));
      }
    } catch (error) {
      console.error("Error loading stock for admin stock management:", error);
    }
    setState(prev => ({ ...prev, isLoadingStockList: false }));
  }, []);


  const getStockStatusChartData = () => {
    if (!state.allStockItems) return [];
    const counts: Record<StockStatus, number> = {
      [StockStatus.AVAILABLE]: 0,
      [StockStatus.RESERVED]: 0,
      [StockStatus.SOLD]: 0,
    };
    state.allStockItems.forEach(item => {
      if (item.status && counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
    return [
      { label: t('stockStatus_AVAILABLE'), value: counts[StockStatus.AVAILABLE], color: 'text-green-600' },
      { label: t('stockStatus_RESERVED'), value: counts[StockStatus.RESERVED], color: 'text-yellow-500' },
      { label: t('stockStatus_SOLD'), value: counts[StockStatus.SOLD], color: 'text-red-600' },
    ];
  };

  const getStockDiameterTypeChartData = () => {
    if (!state.allStockItems) return [];
    const counts: Record<string, number> = {};
    DIAMETER_TYPE_OPTIONS.forEach(opt => counts[opt.value] = 0);

    state.allStockItems.forEach(item => {
      if (item.diameterType && counts[item.diameterType] !== undefined) {
        counts[item.diameterType]++;
      }
    });

    return DIAMETER_TYPE_OPTIONS.map(opt => ({
        label: t(opt.labelKey),
        value: counts[opt.value],
        color: DIAMETER_TYPE_OPTIONS.indexOf(opt) === 0 ? 'text-sky-400' : DIAMETER_TYPE_OPTIONS.indexOf(opt) === 1 ? 'text-teal-400' : 'text-fuchsia-400'
    }));
  };

  const isAnyGlobalAiLoading = isLoadingAi.optimizationTipsOp || isLoadingAi.categorySuggestionOp || isLoadingAi.sustainabilityAssessmentOp;


  return (
    <>
      <PageTitle title={t('adminStock_title')} subtitle={t('adminStock_subtitle')} icon={<CircleStackIcon className="h-8 w-8"/>}/>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SimpleBarChart data={getStockStatusChartData()} title={t('adminStock_chart_statusTitle')} />
        <SimpleBarChart data={getStockDiameterTypeChartData()} title={t('adminStock_chart_diameterTypeTitle')} />
      </div>


      <h2 className="text-xl font-semibold text-white mt-8 mb-4 border-b border-slate-700 pb-2">{t('adminStock_aiToolsTitle')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title={t('adminStock_optimizationSuggestions')}>
          <p className="text-sm text-slate-300 mb-3">{t('adminStock_optimizationDescription')}</p>
          <AiFeatureButton
            text={t('adminStock_requestOptimizationSuggestions')}
            onClick={() => handleAiFeatureClick('optimizationTips', 'optimizationTipsOp')}
            isLoading={isLoadingAi.optimizationTipsOp}
            disabled={!ai || isAnyGlobalAiLoading}
          />
          {isLoadingAi.optimizationTipsOp && state.currentAiFeatureKey === 'optimizationTipsOp' && <LoadingSpinner text={t('adminStock_generatingSuggestions')} />}
          {state.optimizationTips && !isLoadingAi.optimizationTipsOp && state.currentAiFeatureKey === 'optimizationTipsOp' && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
              {state.optimizationTips.map(tip => (
                <div key={tip.id} className={`p-2 bg-slate-700/50 rounded text-sm ${tip.id.includes('error') || tip.id.includes('fail') ? 'text-red-300' : 'text-slate-200'}`}>
                  <AdjustmentsHorizontalIcon className={`h-4 w-4 inline mr-2 ${tip.id.includes('error') || tip.id.includes('fail') ? 'text-red-400' : 'text-yellow-400'}`}/>{tip.tip}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={t('adminStock_aiProductCategorization')}>
          <Textarea
            label={t('adminStock_productDescriptionLabel')}
            name="productDescriptionForCategorization"
            value={state.productDescriptionForCategorization || ''}
            onChange={handleInputChange}
            rows={3}
            placeholder={t('adminStock_productDescriptionPlaceholder')}
          />
          <AiFeatureButton
            text={t('adminStock_requestCategorySuggestion')}
            onClick={() => handleAiFeatureClick('categorySuggestion', 'categorySuggestionOp')}
            isLoading={isLoadingAi.categorySuggestionOp}
            disabled={Boolean(!ai || !state.productDescriptionForCategorization || (state.productDescriptionForCategorization?.trim().length || 0) < 10 || isAnyGlobalAiLoading)}
          />
          {isLoadingAi.categorySuggestionOp && state.currentAiFeatureKey === 'categorySuggestionOp' && <LoadingSpinner text={t('adminStock_searchingCategories')} />}
          {state.categorySuggestion && !isLoadingAi.categorySuggestionOp && state.currentAiFeatureKey === 'categorySuggestionOp' && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded">
              <h5 className={`font-semibold mb-1 ${state.categorySuggestion.includes("Hiba") || state.categorySuggestion.includes(t('adminStock_error_provideMinLengthDescription', {action:''}).substring(0,10)) ? "text-red-400" : "text-cyan-400"}`}>{t('adminStock_suggestedCategories')}</h5>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{state.categorySuggestion}</p>
            </div>
          )}
        </Card>

        <Card title={t('adminStock_aiSustainabilityAssessment')}>
          <Textarea
            label={t('adminStock_sustainabilityDescriptionLabel')}
            name="productDescriptionForSustainability"
            value={state.productDescriptionForSustainability || ''}
            onChange={handleInputChange}
            rows={3}
            placeholder={t('adminStock_sustainabilityDescriptionPlaceholder')}
          />
          <AiFeatureButton
            text={t('adminStock_requestSustainabilityAssessment')}
            onClick={() => handleAiFeatureClick('sustainabilityAssessment', 'sustainabilityAssessmentOp')}
            isLoading={isLoadingAi.sustainabilityAssessmentOp}
            disabled={Boolean(!ai || !state.productDescriptionForSustainability || (state.productDescriptionForSustainability?.trim().length || 0) < 10 || isAnyGlobalAiLoading)}
          />
          {isLoadingAi.sustainabilityAssessmentOp && state.currentAiFeatureKey === 'sustainabilityAssessmentOp' && <LoadingSpinner text={t('adminStock_assessing')} />}
          {state.sustainabilityAssessment && !isLoadingAi.sustainabilityAssessmentOp && state.currentAiFeatureKey === 'sustainabilityAssessmentOp' && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded">
               <h5 className={`font-semibold mb-1 ${state.sustainabilityAssessment.includes("Hiba") || state.sustainabilityAssessment.includes(t('adminStock_error_provideMinLengthDescription', {action:''}).substring(0,10)) ? "text-red-400" : "text-cyan-400"}`}>{t('adminStock_aiAssessment')}</h5>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{state.sustainabilityAssessment}</p>
            </div>
          )}
        </Card>
      </div>

      <h2 className="text-xl font-semibold text-white mt-10 mb-4 border-b border-slate-700 pb-2">{t('adminStock_currentSystemStock')}</h2>
      {state.isLoadingStockList ? (
         <LoadingSpinner text={t('adminStock_loadingManufacturerStock')} />
      ) : !state.allStockItems || state.allStockItems.length === 0 ? (
        <Card>
            <div className="text-center py-12">
            <InformationCircleIcon className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">{t('adminStock_noStockInSystem')}</p>
            </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.allStockItems.map(item => (
            <Card key={item.id} className="flex flex-col justify-between hover-glow transition-shadow duration-300">
              <div>
                <div className="p-4 border-b border-slate-700">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-cyan-400 flex items-center">
                        <HashtagIcon className="h-5 w-5 mr-2 text-cyan-500" />
                        {t('manufacturerMyStock_stockId')}: {item.id?.substring(0, 10)}...
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStockStatusBadgeColor(item.status)}`}>
                            {getTranslatedStockStatus(item.status, t)}
                        </span>
                    </div>
                     {item.uploadDate && (
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                        <CalendarDaysIcon className="h-4 w-4 mr-1 text-slate-500" />
                        {t('adminStock_stockItem_uploaded')}: {new Date(item.uploadDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                     )}
                     {item.uploadedByCompanyName && (
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                            <BuildingStorefrontIcon className="h-4 w-4 mr-1 text-slate-500" />
                            {t('adminStock_byCompany', { companyName: item.uploadedByCompanyName })}
                        </p>
                     )}
                  </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start text-sm text-slate-300">
                    <ArchiveBoxIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-slate-100">{t('adminStock_stockItem_features')}:</span> {item.diameterType}, Ø {item.diameterFrom}-{item.diameterTo}cm, {t('customerNewDemand_length').toLowerCase()}: {item.length}m, {item.quantity}pcs
                    </span>
                  </div>
                   <div className="flex items-center text-sm text-slate-300">
                    <BeakerIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0" />
                    <span>
                        <span className="font-medium text-slate-100">{t('adminStock_stockItem_cubicMeters')}:</span> {item.cubicMeters?.toFixed(3) || 'N/A'} m³
                    </span>
                  </div>
                  {item.price && (
                    <div className="flex items-center text-sm text-slate-300">
                        <BanknotesIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0" />
                        <span>
                            <span className="font-medium text-slate-100">{t('adminStock_stockItem_price')}:</span> {item.price}
                        </span>
                    </div>
                  )}
                   {item.sustainabilityInfo && (
                    <div className="flex items-start text-sm text-slate-300">
                        <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                        <span>
                            <span className="font-medium text-slate-100">{t('adminStock_stockItem_sustainability')}:</span> {item.sustainabilityInfo.length > 70 ? `${item.sustainabilityInfo.substring(0, 70)}...` : item.sustainabilityInfo}
                        </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="pt-2 mt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400">{t('adminStock_stockItem_notes')}:</p>
                      <p className="text-sm text-slate-300 break-words">{item.notes.length > 100 ? `${item.notes.substring(0, 100)}...` : item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                 <Button
                    onClick={() => handleAdminStockItemAiAnalysis(item)}
                    isLoading={state.isAdminAiLoadingForStockItem === item.id}
                    disabled={Boolean(!ai || (state.isAdminAiLoadingForStockItem !== null && state.isAdminAiLoadingForStockItem !== item.id) || isAnyGlobalAiLoading)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-cyan-400 border border-cyan-600 hover:bg-cyan-500/20"
                    leftIcon={<SparklesIcon className="h-4 w-4 text-yellow-400"/>}
                    title={state.selectedStockItemIdForAdminAi === item.id && state.adminAiStockAnalysisResult ? t('adminStock_hideAnalysis') : t('adminStock_requestAiAnalysis')}
                    >
                    {state.selectedStockItemIdForAdminAi === item.id && state.adminAiStockAnalysisResult ? t('adminStock_hideAnalysis') : t('adminStock_requestAiAnalysis')}
                 </Button>
                 {state.isAdminAiLoadingForStockItem === item.id && (
                    <div className="mt-3">
                        <LoadingSpinner size="sm" text={t('adminStock_aiAnalysisInProgress')} />
                    </div>
                 )}
                 {state.selectedStockItemIdForAdminAi === item.id && state.adminAiStockAnalysisResult && !state.isAdminAiLoadingForStockItem && state.currentAiFeatureKey === `adminAnalysis-${item.id}` && (
                    <div className={`mt-3 p-3 rounded text-xs ${state.adminAiStockAnalysisResult.includes("Error") || state.adminAiStockAnalysisResult.includes("Hiba") ? 'bg-red-900/50 border border-red-700 text-red-300' : 'bg-slate-700 text-slate-200'}`}>
                        {state.adminAiStockAnalysisResult.split('\n').map((line, index) => {
                            const isHeader = line.startsWith('**');
                            const cleanLine = line.replace(/\*\*/g, '');
                            return isHeader ? <strong key={index} className="block text-cyan-300 mt-1.5 first:mt-0">{cleanLine}</strong> : <p key={index} className="whitespace-pre-wrap">{cleanLine}</p>;
                        })}
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

export default AdminStockManagementPage;