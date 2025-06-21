
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import AiFeatureButton from '../../components/AiFeatureButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import VisualTruckLoad from '../../components/VisualTruckLoad'; 
import SimulatedRouteMap from '../../components/SimulatedRouteMap'; 
import { 
  LoadingPlan, 
  CostEstimation, 
  OptimizationTip, 
  LoadingPlanResponse, 
  CostEstimationResponse, 
  LoadingPlanItem,
  Waypoint,
  TranslationKey,
  ConfirmedMatch, 
  MockCompany,    
  // UserRole, // UserRole not directly used in this file's logic after changes
  // DemandItem, // Not directly used    
  // StockItem // Not directly used       
} from '../../types';
import { TruckIcon, CurrencyEuroIcon, CogIcon, ArrowPathIcon, EnvelopeIcon } from '@heroicons/react/24/outline'; 
import { GenerateContentResponse } from "@google/genai";
import { useLocale } from '../../LocaleContext';
import { ai } from '../../lib/gemini'; 
import { MOCK_COMPANIES_STORAGE_KEY, CONFIRMED_MATCHES_STORAGE_KEY } from '../../constants'; 

interface AdminTruckPlanningState {
  loadingPlan?: LoadingPlan | string;
  costEstimation?: CostEstimation | string;
  freightOptimizationTips?: OptimizationTip[] | string;
  shippingEmailDraft?: string; 
  currentAiFeatureKey?: string; 
  confirmedMatches: ConfirmedMatch[]; 
  companies: MockCompany[];          
  noRelevantMatchesForPlanning: boolean; 
}

export const AdminTruckPlanningPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<AdminTruckPlanningState>({
    confirmedMatches: [],
    companies: [],
    noRelevantMatchesForPlanning: false,
  });

  useEffect(() => {
    try {
      const matchesRaw = localStorage.getItem(CONFIRMED_MATCHES_STORAGE_KEY);
      const companiesRaw = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
      const loadedMatches: ConfirmedMatch[] = matchesRaw ? JSON.parse(matchesRaw) : [];
      const loadedCompanies: MockCompany[] = companiesRaw ? JSON.parse(companiesRaw) : [];
      
      const unbilledMatches = loadedMatches.filter(m => !m.billed);

      setState(prev => ({ 
        ...prev, 
        confirmedMatches: unbilledMatches, 
        companies: loadedCompanies,
        noRelevantMatchesForPlanning: unbilledMatches.length === 0,
      }));
    } catch (error) {
      console.error("Error loading data for truck planning:", error);
      setState(prev => ({
        ...prev,
        confirmedMatches: [],
        companies: [],
        noRelevantMatchesForPlanning: true,
      }));
    }
  }, []);


  const parseJsonFromGeminiResponse = useCallback(function <T>(textValue: string, featureNameKey: TranslationKey): T | string {
    let jsonStr = textValue.trim(); 
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchResult = jsonStr.match(fenceRegex); 
    if (matchResult && matchResult[2]) {
      jsonStr = matchResult[2].trim();
    }
    try {
      return JSON.parse(jsonStr) as T;
    } catch (errorCaught: any) { 
      const featureNameText = t(featureNameKey);
      console.error(`Failed to parse JSON response for ${featureNameText}:`, errorCaught, "Raw text:", textValue);
      return t('adminTruckPlanning_error_parsing_truck', { featureName: featureNameText, rawResponse: textValue.substring(0,300) });
    }
  }, [t]);

  const generateOptimalLoadingPlanWithGemini = useCallback(async (): Promise<LoadingPlan | string> => {
    if (!ai) return t('adminTruckPlanning_error_aiUnavailable_truck');
    
    const relevantMatches = state.confirmedMatches.filter(m => !m.billed);
    if (relevantMatches.length === 0) {
      return t('adminTruckPlanning_error_noMatchesForPlanning'); 
    }

    const currentPickupPoints = relevantMatches.map(matchItem => {
        const manufacturerCompany = state.companies.find(c => c.id === matchItem.stockDetails.uploadedByCompanyId);
        return {
            companyName: manufacturerCompany?.companyName || matchItem.stockDetails.uploadedByCompanyName || 'Unknown Manufacturer',
            address: manufacturerCompany?.address ? `${manufacturerCompany.address.street || ''}, ${manufacturerCompany.address.zipCode || ''} ${manufacturerCompany.address.city || ''}, ${manufacturerCompany.address.country || ''}`.trim().replace(/^,|,$/g, '') : 'Address not specified',
            items: [{ 
                name: `${matchItem.stockDetails.productName || matchItem.stockDetails.diameterType || 'Timber'} (from ${matchItem.stockDetails.uploadedByCompanyName || 'N/A'})`,
                quantity: matchItem.stockDetails.quantity,
                volumeM3: matchItem.stockDetails.cubicMeters?.toFixed(2) || 'N/A',
                quality: matchItem.stockDetails.notes?.substring(0,50) || 'Standard Quality', 
                stockId: matchItem.stockId, 
            }]
        };
    }).filter(p => p.items.length > 0);

    const currentDropOffPoints = relevantMatches.map(matchItem => {
        const customerCompany = state.companies.find(c => c.id === matchItem.demandDetails.submittedByCompanyId);
        return {
            companyName: customerCompany?.companyName || matchItem.demandDetails.submittedByCompanyName || 'Unknown Customer',
            address: customerCompany?.address ? `${customerCompany.address.street || ''}, ${customerCompany.address.zipCode || ''} ${customerCompany.address.city || ''}, ${customerCompany.address.country || ''}`.trim().replace(/^,|,$/g, '') : 'Address not specified',
            items: [{ 
                name: `${matchItem.demandDetails.productName || matchItem.demandDetails.diameterType || 'Timber'} (for ${matchItem.demandDetails.submittedByCompanyName || 'N/A'})`,
                quantity: matchItem.demandDetails.quantity,
                volumeM3: matchItem.demandDetails.cubicMeters?.toFixed(2) || 'N/A',
                demandId: matchItem.demandId, 
            }]
        };
    }).filter(d => d.items.length > 0);

    if (currentPickupPoints.length === 0 || currentDropOffPoints.length === 0) {
        return t('adminTruckPlanning_error_insufficientDataForPlanning'); 
    }

    const productNameKey: TranslationKey = 'productType_acaciaDebarkedSandedPost'; 
    const resolvedProductName: string = t(productNameKey);
    const currentPromptLang: string = locale === 'hu' ? 'Hungarian' : 'English';

    const promptContent = `An admin of a timber company requests an optimal loading and transport plan for a 25m³ (approx. 24-ton, 13.5m flatbed) truck in ${currentPromptLang}.
The transport involves consolidating items for multiple Customers, picked up from multiple Manufacturers.
Products are timber, primarily ${resolvedProductName}, transported in "crates" or bundles.

Pickup locations and items:
${JSON.stringify(currentPickupPoints, null, 2)}

Drop-off locations and items:
${JSON.stringify(currentDropOffPoints, null, 2)}

The response MUST be in JSON format, in ${currentPromptLang}, and include the following fields:
- "planDetails": string (brief description, e.g., "Optimized multi-pickup and multi-drop loading plan for ${resolvedProductName}, for a 25m³ truck, based on confirmed matches.")
- "items": LoadingPlanItem[] (a JSON array of LoadingPlanItem objects. Each object must be separated by a comma if there are multiple objects. For example: [ { "name": "Item A", "volumeM3": "5", ... }, { "name": "Item B", "volumeM3": "3", ... } ]. Each LoadingPlanItem object MUST include:
    - "name": string (e.g., "${resolvedProductName} - for [Customer Name], [Number] units/crates")
    - "volumeM3": string (total volume of this customer's items, e.g., "8" or "8 m³")
    - "destinationName": string (Customer/drop-off location name)
    - "dropOffOrder": number (drop-off sequence, starting from 1)
    - "loadingSuggestion": string (a full, coherent textual suggestion in ${currentPromptLang} for loading these items, considering LIFO for that drop-off)
    - "quality": string (optional, e.g., "Debarked, sanded, Prima A" - infer from data or use a default like "Standard Quality")
    - "notesOnItem": string (optional, e.g., "[Number] crates, total [quantity] pcs [dimensions] posts for Demand ID [Demand ID]")
  )
- "capacityUsed": string (truck capacity utilization in percentage, e.g., "92%")
- "waypoints": Waypoint[] (a JSON array of Waypoint objects. Each object must be separated by a comma if there are multiple objects. For example: [ { "name": "Stop 1", "type": "'pickup'", "order": 0 }, { "name": "Stop 2", "type": "'dropoff'", "order": 1 } ]. Each Waypoint object MUST include:
    - "name": string (Manufacturer or Customer company name and site)
    - "type": "'pickup'" | "'dropoff'" (type of stop, ensure quotes are present in the JSON string value)
    - "order": number (sequence in the route, starting from 0)
  )
- "optimizedRouteDescription": string (a short textual description of the optimized route in ${currentPromptLang})

CRITICAL: The response must ONLY contain the JSON object. No other text, explanations, or markdown formatting. The JSON must be perfectly valid. Strings must have quotes and newlines properly escaped. Ensure all objects in JSON arrays are correctly separated by commas, and there are NO extraneous characters (like unquoted words or symbols) between array elements or object properties. Pay close attention to commas in arrays.
The 'items' and 'waypoints' arrays are directly used for visualization; their correctness and completeness are paramount.
`;

    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      const parsedResult = parseJsonFromGeminiResponse<LoadingPlanResponse>(genResponse.text, "adminTruckPlanning_optimalLoadingPlan" as TranslationKey);
      if (typeof parsedResult === 'string') return parsedResult; 
      
      if (!parsedResult.items || !Array.isArray(parsedResult.items) || (parsedResult.items.length > 0 && typeof parsedResult.items[0] !== 'object') || !parsedResult.waypoints || !Array.isArray(parsedResult.waypoints)) {
        console.error("Parsed loading plan has incorrect structure for items or waypoints:", parsedResult);
        const featureNameText = t("adminTruckPlanning_optimalLoadingPlan" as TranslationKey);
        return t('adminTruckPlanning_error_parsing_truck', { featureName: featureNameText, rawResponse: "Invalid items or waypoints structure" });
      }
      const newPlanId = `gemini-multidrop-${Date.now()}`;
      return { ...parsedResult, id: newPlanId };
    } catch (apiError: any) {
      console.error("Error generating multi-drop loading plan with Gemini:", apiError);
      return t('adminTruckPlanning_error_planGeneric');
    }
  }, [state.confirmedMatches, state.companies, locale, t, parseJsonFromGeminiResponse]);


  const estimateLogisticsCostWithGemini = useCallback(async (): Promise<CostEstimation | string> => {
    if (!ai) return t('adminTruckPlanning_error_aiUnavailable_truck');
    const currentPromptLang: string = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `An admin of a timber company requests a logistics cost estimation for an approx. 300 km domestic transport within Hungary, for a full truckload (24 tons) of spruce logs. 
Provide an estimation in JSON format, in ${currentPromptLang}, in EUR, with the following fields: "totalCost" (the total estimated cost, e.g., "450-550 EUR"), "factors" (an array of main cost factors, e.g., ["Fuel price", "Road tolls", "Driver's wages", "Loading time", "Administrative costs"]).
Important: The response should only contain the JSON object, without any extra text or markdown.`;
    
    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      const parsedResult = parseJsonFromGeminiResponse<CostEstimationResponse>(genResponse.text, "adminTruckPlanning_logisticsCostEstimation" as TranslationKey);
      if (typeof parsedResult === 'string') return parsedResult;
      const newCostId = `gemini-cost-${Date.now()}`;
      return { ...parsedResult, id: newCostId };
    } catch (apiError: any) {
      console.error("Error estimating logistics cost with Gemini:", apiError);
      return t('adminTruckPlanning_error_costGeneric');
    }
  }, [locale, t, parseJsonFromGeminiResponse]);

  const generateFreightOptimizationTipsWithGemini = useCallback(async (): Promise<OptimizationTip[] | string> => {
    if (!ai) return t('adminTruckPlanning_error_aiUnavailable_truck');
    const currentPromptLang: string = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `An admin of a timber company requests freight optimization tips. Provide at least 3-5 specific, practical tips in ${currentPromptLang} for optimizing timber transport. The tips should be in a list, each tip on a new line, prefixed with '- ' (hyphen and space). The response should contain nothing else.`;

    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
      });
      const rawText = genResponse.text;
      const tipsArray = rawText.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim())
        .filter(tip => tip.length > 0)
        .map((tip, tipIndex) => ({ id: `gemini-fopt-${tipIndex}`, tip }));
      
      return tipsArray.length > 0 ? tipsArray : t('adminTruckPlanning_error_failedToParseTipsGeneric');
    } catch (apiError: any) {
      console.error("Error generating freight optimization tips with Gemini:", apiError);
      return t('adminTruckPlanning_error_tipsGeneric');
    }
  }, [locale, t]);
  
  const generateShippingEmailDraftWithGemini = useCallback(async (currentLoadingPlan: LoadingPlan): Promise<string> => {
    if (!ai) return t('adminShippingTemplates_error_emailGeneric');
    const currentPromptLang: string = locale === 'hu' ? 'Hungarian' : 'English';
    
    let customerNames = "[Customer Names]"; 
    if (currentLoadingPlan.items && Array.isArray(currentLoadingPlan.items)) {
        const planItems = currentLoadingPlan.items as LoadingPlanItem[]; 
        if(planItems.length > 0 && typeof planItems[0] === 'object') {
            const uniqueDestinations = Array.from(new Set(planItems.map(item => item.destinationName).filter(Boolean)));
            if (uniqueDestinations.length > 0) {
                customerNames = uniqueDestinations.join(', ');
            }
        }
    } else if (currentLoadingPlan.waypoints && currentLoadingPlan.waypoints.length > 0) {
        const uniqueDestinations = Array.from(new Set(currentLoadingPlan.waypoints.filter(wp => wp.type === 'dropoff').map(wp => wp.name).filter(Boolean)));
         if (uniqueDestinations.length > 0) {
            customerNames = uniqueDestinations.join(', ');
        }
    }

    const promptContent = `Based on the provided consolidated timber loading plan (ID: ${currentLoadingPlan.id.substring(0,10)}...), generate a polite and professional email draft in ${currentPromptLang}.
This email is from "Pohi AI Pro Logistics" to the involved customers (${customerNames}) notifying them that their order (part of this consolidated truckload) is scheduled for shipment.
Include placeholders like [Estimated Delivery Window - e.g., tomorrow afternoon, or a specific date if derivable from context].
The email should be reassuring about the consolidated nature of the transport if relevant.
Plan details for context: ${currentLoadingPlan.planDetails}. Route: ${currentLoadingPlan.optimizedRouteDescription || 'N/A'}.
The response should only contain the email draft text.`;
    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: promptContent });
      return genResponse.text || t('adminShippingTemplates_error_emailGeneric');
    } catch (apiError: any) {
      console.error("Error generating shipping email draft:", apiError);
      return t('adminShippingTemplates_error_emailGeneric');
    }
  }, [locale, t]);


  const handleAiFeatureClick = useCallback(async (
    targetFeatureKey: keyof AdminTruckPlanningState,
    operationKey: string 
  ) => {
    setIsLoading(prev => ({ ...prev, [operationKey]: true }));
    setState(prev => ({ 
      ...prev, 
      loadingPlan: targetFeatureKey === 'loadingPlan' ? undefined : prev.loadingPlan,
      costEstimation: targetFeatureKey === 'costEstimation' ? undefined : prev.costEstimation,
      freightOptimizationTips: targetFeatureKey === 'freightOptimizationTips' ? undefined : prev.freightOptimizationTips,
      shippingEmailDraft: targetFeatureKey === 'shippingEmailDraft' ? undefined : prev.shippingEmailDraft,
      currentAiFeatureKey: operationKey 
    })); 

    let resultData;
    try {
        if (targetFeatureKey === 'loadingPlan') {
            resultData = await generateOptimalLoadingPlanWithGemini();
        } else if (targetFeatureKey === 'costEstimation') {
            resultData = await estimateLogisticsCostWithGemini();
        } else if (targetFeatureKey === 'freightOptimizationTips') {
            resultData = await generateFreightOptimizationTipsWithGemini();
        } else if (targetFeatureKey === 'shippingEmailDraft') {
            if (state.loadingPlan && typeof state.loadingPlan !== 'string') {
                resultData = await generateShippingEmailDraftWithGemini(state.loadingPlan);
            } else {
                resultData = t('adminTruckPlanning_error_generateEmailWithoutPlan');
            }
        }
      setState(prev => ({ ...prev, [targetFeatureKey]: resultData as any })); // Cast to any for simplicity with union type
    } catch (processError: any) {
        console.error(`Error in AI feature ${targetFeatureKey}:`, processError);
        const featureNameText = t(targetFeatureKey as TranslationKey, {productName: ''}) || targetFeatureKey;
        setState(prev => ({ ...prev, [targetFeatureKey]: t('adminTruckPlanning_error_critical_truck', {featureName: featureNameText}) as any }));
    } finally {
        setIsLoading(prev => ({ ...prev, [operationKey]: false }));
    }
  }, [generateOptimalLoadingPlanWithGemini, estimateLogisticsCostWithGemini, generateFreightOptimizationTipsWithGemini, generateShippingEmailDraftWithGemini, state.loadingPlan, t]);
  
  const isAnyLoading = Object.values(isLoading).some(s => s);

  const renderLoadingPlanResult = (planData: LoadingPlan | string) => {
    if (typeof planData === 'string') {
      return <p className="text-sm text-red-400 whitespace-pre-wrap">{planData}</p>;
    }
    if (!planData || !planData.planDetails) return null;

    const currentPlanItems = (Array.isArray(planData.items) && planData.items.every(item => typeof item === 'object')) 
        ? planData.items as LoadingPlanItem[] 
        : [];
    
    const currentWaypoints = Array.isArray(planData.waypoints) ? planData.waypoints : [];

    return (
      <>
        <h5 className="font-semibold text-cyan-300 mb-1">{t('adminTruckPlanning_aiSuggestionLoadingPlan', {id: planData.id?.substring(0,16) || 'N/A'})}</h5>
        <p className="text-sm text-slate-200"><strong>{t('adminTruckPlanning_planDetails')}</strong> {planData.planDetails}</p>
        
        {currentPlanItems.length > 0 &&
          <div className="my-4">
            <VisualTruckLoad items={currentPlanItems} planDetails={planData.planDetails} />
          </div>
        }

        {currentWaypoints.length > 0 &&
            <div className="my-4">
                <SimulatedRouteMap waypoints={currentWaypoints} optimizedRouteDescription={planData.optimizedRouteDescription} />
            </div>
        }
        
        {typeof planData.items === 'string' && planData.items && ( 
          <p className="text-sm text-slate-200"><strong>{t('adminTruckPlanning_planItems')}</strong> {planData.items}</p>
        )}
        {currentPlanItems.length > 0 && (
            <div>
                <h6 className="text-sm font-semibold text-slate-100 mt-2">{t('adminTruckPlanning_planItems')}</h6>
                <ul className="space-y-2 mt-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {currentPlanItems.map((item, index) => (
                        <li key={index} className="p-2 bg-slate-600/50 rounded">
                            <span className="font-medium text-cyan-400 block">{item.name}</span>
                            {item.quality && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_planItemQuality')}: {item.quality}</span>}
                            {item.volumeM3 && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_planItemVolume')}: {item.volumeM3}</span>}
                            {item.densityTonPerM3 && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_planItemDensity')}: {item.densityTonPerM3}</span>}
                            {item.weightTon && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_planItemWeight')}: {item.weightTon}</span>}
                            {item.destinationName && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_visualTruck_destination')}: {item.destinationName}</span>}
                            {item.dropOffOrder !== undefined && <span className="text-xs text-slate-300 block">{t('adminTruckPlanning_visualTruck_dropOrder')}: {item.dropOffOrder}</span>}
                            {item.loadingSuggestion && <p className="text-xs text-slate-300 mt-1">{t('adminTruckPlanning_planItemLoadingSuggestion')}: {item.loadingSuggestion}</p>}
                            {item.notesOnItem && <p className="text-xs text-slate-400 mt-0.5 italic">{item.notesOnItem}</p>}
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <p className="text-sm text-slate-200 mt-2"><strong>{t('adminTruckPlanning_planCapacityUsed')}</strong> {planData.capacityUsed}</p>
      </>
    );
  };
  
  return (
    <>
      <PageTitle title={t('adminTruckPlanning_title')} subtitle={t('adminTruckPlanning_subtitle')} icon={<TruckIcon className="h-8 w-8"/>}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={t('adminTruckPlanning_optimalLoadingPlan')}>
          <p className="text-sm text-slate-300 mb-3">{t('adminTruckPlanning_optimalLoadingPlanDescription', { productName: t('productType_acaciaDebarkedSandedPost')})}</p>
          <AiFeatureButton
            text={t('adminTruckPlanning_requestMultiDropPlan', { productName: t('productType_acaciaDebarkedSandedPost')})}
            onClick={() => handleAiFeatureClick('loadingPlan', 'loadingPlanOp')}
            isLoading={isLoading.loadingPlanOp}
            disabled={!ai || isAnyLoading || state.noRelevantMatchesForPlanning}
            leftIcon={<ArrowPathIcon className="h-5 w-5 text-blue-400" />}
          />
           {state.noRelevantMatchesForPlanning && !isAnyLoading && (
              <p className="text-xs text-amber-300 mt-2">{t('adminTruckPlanning_error_noMatchesForPlanning')}</p>
          )}
          {isLoading.loadingPlanOp && state.currentAiFeatureKey === 'loadingPlanOp' && <LoadingSpinner text={t('adminTruckPlanning_generatingPlan')} />}
          {state.loadingPlan && !isLoading.loadingPlanOp && state.currentAiFeatureKey === 'loadingPlanOp' && (
            <div className={`mt-4 p-3 rounded ${typeof state.loadingPlan === 'string' && (state.loadingPlan.toLowerCase().includes("error") || state.loadingPlan.toLowerCase().includes("hiba") || state.loadingPlan.includes(t('adminTruckPlanning_error_noMatchesForPlanning', { productName: '' }).substring(0,20))  || state.loadingPlan.includes(t('adminTruckPlanning_error_insufficientDataForPlanning', { productName: '' }).substring(0,20)) ) ? 'bg-red-900/30 border border-red-700' : 'bg-slate-700/50'}`}>
              {renderLoadingPlanResult(state.loadingPlan)}
              {typeof state.loadingPlan !== 'string' && state.loadingPlan.items && 
                  <AiFeatureButton
                      text={t('adminTruckPlanning_generateShippingEmail')}
                      onClick={() => handleAiFeatureClick('shippingEmailDraft', 'shippingEmailOp')}
                      isLoading={isLoading.shippingEmailOp}
                      disabled={!ai || isAnyLoading}
                      leftIcon={<EnvelopeIcon className="h-5 w-5 text-orange-400" />}
                      className="mt-4"
                  />
              }
            </div>
          )}
           {isLoading.shippingEmailOp && state.currentAiFeatureKey === 'shippingEmailOp' && <LoadingSpinner text={t('adminTruckPlanning_generatingEmail')} />}
            {state.shippingEmailDraft && !isLoading.shippingEmailOp && state.currentAiFeatureKey === 'shippingEmailOp' && (
                <div className={`mt-4 p-3 rounded ${state.shippingEmailDraft.toLowerCase().includes("error") || state.shippingEmailDraft.toLowerCase().includes("hiba") ? 'bg-red-900/30 border border-red-700' : 'bg-slate-700/50'}`}>
                    <h5 className="font-semibold text-cyan-300 mb-1">{t('adminTruckPlanning_generatedShippingEmailTitle')}</h5>
                    <pre className="text-sm text-slate-200 whitespace-pre-wrap">{state.shippingEmailDraft}</pre>
                </div>
            )}
        </Card>

        <div> 
            <Card title={t('adminTruckPlanning_logisticsCostEstimation')} className="mb-6">
            <p className="text-sm text-slate-300 mb-3">{t('adminTruckPlanning_logisticsCostEstimationDescription')}</p>
            <AiFeatureButton
                text={t('adminTruckPlanning_requestCostEstimation')}
                onClick={() => handleAiFeatureClick('costEstimation', 'costEstOp')}
                isLoading={isLoading.costEstOp}
                disabled={!ai || isAnyLoading}
                leftIcon={<CurrencyEuroIcon className="h-5 w-5 text-green-400" />}
            />
            {isLoading.costEstOp && state.currentAiFeatureKey === 'costEstOp' && <LoadingSpinner text={t('adminTruckPlanning_estimatingCost')} />}
            {state.costEstimation && !isLoading.costEstOp && state.currentAiFeatureKey === 'costEstOp' && (
                <div className={`mt-4 p-3 rounded ${typeof state.costEstimation === 'string' && (state.costEstimation.toLowerCase().includes("error") || state.costEstimation.toLowerCase().includes("hiba") ) ? 'bg-red-900/30 border border-red-700' : 'bg-slate-700/50'}`}>
                {typeof state.costEstimation === 'string' ? (
                     <p className="text-sm text-red-400 whitespace-pre-wrap">{state.costEstimation}</p>
                ) : (
                <>
                    <h5 className="font-semibold text-cyan-300 mb-1">{t('adminTruckPlanning_aiSuggestionCostEstimation', {id: state.costEstimation.id?.substring(0,12) || 'N/A'})}</h5>
                    <p className="text-lg font-bold text-white">{state.costEstimation.totalCost}</p>
                    <p className="text-xs text-slate-300 mt-1"><strong>{t('adminTruckPlanning_influencingFactors')}</strong> {state.costEstimation.factors.join(', ')}</p>
                </>
                )}
                </div>
            )}
            </Card>

            <Card title={t('adminTruckPlanning_freightOptimizationTips')}>
            <p className="text-sm text-slate-300 mb-3">{t('adminTruckPlanning_freightOptimizationTipsDescription')}</p>
            <AiFeatureButton
                text={t('adminTruckPlanning_requestOptimizationTips')}
                onClick={() => handleAiFeatureClick('freightOptimizationTips', 'freightOptOp')}
                isLoading={isLoading.freightOptOp}
                disabled={!ai || isAnyLoading}
                leftIcon={<CogIcon className="h-5 w-5 text-purple-400" />}
            />
            {isLoading.freightOptOp && state.currentAiFeatureKey === 'freightOptOp' && <LoadingSpinner text={t('adminTruckPlanning_searchingTips')} />}
            {state.freightOptimizationTips && !isLoading.freightOptOp && state.currentAiFeatureKey === 'freightOptOp' &&(
                <div className={`mt-4 p-3 rounded ${typeof state.freightOptimizationTips === 'string' && (state.freightOptimizationTips.toLowerCase().includes("error") || state.freightOptimizationTips.toLowerCase().includes("hiba") ) ? 'bg-red-900/30 border border-red-700' : 'bg-slate-700/50'}`}>
                <h5 className="font-semibold text-cyan-400 mb-1">{t('adminTruckPlanning_aiSuggestionOptimizationTips')}</h5>
                {typeof state.freightOptimizationTips === 'string' ? (
                     <p className="text-sm text-red-400">{state.freightOptimizationTips}</p>
                ) : state.freightOptimizationTips.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                    {state.freightOptimizationTips.map(tip => <li key={tip.id}>{tip.tip}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-300">{t('adminTruckPlanning_noDisplayableTips')}</p>
                )}
                </div>
            )}
            </Card>
        </div>
      </div>
    </>
  );
};
