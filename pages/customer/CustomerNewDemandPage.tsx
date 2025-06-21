
import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import AiFeatureButton from '../../components/AiFeatureButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import Select from '../../components/Select'; 
import { ProductFeatures, DemandItem, DemandStatus, AlternativeProduct, GeminiComparisonResponse, TranslationKey } from '../../types';
import { DIAMETER_TYPE_OPTIONS } from '../../locales'; 
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { GenerateContentResponse } from "@google/genai";
import { useLocale } from '../../LocaleContext';
import { CUSTOMER_DEMANDS_STORAGE_KEY } from '../../constants';
import { ai } from '../../lib/gemini';
import { calculateVolume } from '../../lib/utils'; // Import shared utility

const initialFormData: ProductFeatures & { productName: string } = {
  productName: '',
  diameterType: 'mid', 
  diameterFrom: '',
  diameterTo: '',
  length: '',
  quantity: '',
  notes: '',
  cubicMeters: 0,
};

export const CustomerNewDemandPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [formData, setFormData] = useState<ProductFeatures & { productName: string }>(initialFormData);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  const [alternativeProducts, setAlternativeProducts] = useState<AlternativeProduct[] | string | null>(null);
  const [productComparison, setProductComparison] = useState<GeminiComparisonResponse | string | null>(null);
  const [currentAiFeatureKey, setCurrentAiFeatureKey] = useState<string | null>(null); 

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const calculateCubicMetersLocal = useCallback(() => {
    const { diameterFrom, diameterTo, length, quantity } = formData;
    if (diameterFrom && diameterTo && length && quantity) {
      const volume = calculateVolume(parseFloat(diameterFrom), parseFloat(diameterTo), parseFloat(length), parseInt(quantity));
      setFormData(prev => ({ ...prev, cubicMeters: volume }));
    } else {
      setFormData(prev => ({ ...prev, cubicMeters: 0 }));
    }
  }, [formData.diameterFrom, formData.diameterTo, formData.length, formData.quantity]);

  useEffect(() => {
    calculateCubicMetersLocal();
  }, [calculateCubicMetersLocal]);

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

  const suggestAlternativeProductsWithGemini = useCallback(async (): Promise<AlternativeProduct[] | string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity) {
        return t('customerNewDemand_error_provideFeaturesForAlternatives');
    }
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `A customer is looking for alternatives to "${formData.productName}". Provide 2-3 specific alternative product suggestions in ${currentPromptLang}, in JSON format.
Alternatives could be different dimensions/batches of the same product, or closely related timber types suitable for similar applications.
Each suggestion should include a "name" (product name) and "specs" (short description of key specifications).

Original demand for "${formData.productName}":
- Diameter type: ${t(DIAMETER_TYPE_OPTIONS.find(opt => opt.value === formData.diameterType)?.labelKey || 'diameterType_mid' as TranslationKey)}
- Diameter: ${formData.diameterFrom}-${formData.diameterTo} cm
- Length: ${formData.length} m
- Quantity: ${formData.quantity} pcs
${formData.notes ? `- Notes: ${formData.notes}` : ''}

The response MUST ONLY contain the JSON array, [{ "name": "...", "specs": "..." }, ...], without any extra text or markdown. Output in ${currentPromptLang}.`;

    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      // Type for items from Gemini, before adding our own `id`
      type GeminiAlternativeProduct = Omit<AlternativeProduct, 'id'>;
      const parsedResult = parseJsonFromGeminiResponse<GeminiAlternativeProduct[]>(genResponse.text, "customerNewDemand_ai_suggestedAlternativesTitle" as TranslationKey);
      if (typeof parsedResult === 'string') return parsedResult; 
      
      if (Array.isArray(parsedResult)) {
        return parsedResult.map((item: GeminiAlternativeProduct, index: number) => ({ ...item, id: `gemini-alt-${Date.now()}-${index}` }));
      }
      return t('customerNewDemand_error_aiResponseNotArray');
    } catch (apiError: any) {
      console.error("Error suggesting alternative products with Gemini:", apiError);
      return t('customerNewDemand_error_alternativesGeneric');
    }
  }, [ai, formData, locale, t, parseJsonFromGeminiResponse]);

  const compareProductsWithGemini = useCallback(async (): Promise<GeminiComparisonResponse | string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!alternativeProducts || typeof alternativeProducts === 'string' || alternativeProducts.length === 0) {
      return t('customerNewDemand_error_noAlternativesForComparison');
    }
    const alternativeToCompare = alternativeProducts[0]; 
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const originalProductNameText = formData.productName || t('customerNewDemand_originalProductNameDefault');

    const promptContent = `A customer requests a product comparison between their requested "${originalProductNameText}" and an alternative. Provide the comparison in ${currentPromptLang}, in JSON format.
The JSON object should contain an "original" and an "alternative" key. Under each, include: "name" (string), "dimensions_quantity_notes" (string), "pros" (string array), and "cons" (string array).

Original Demand (Original):
- Product Name: "${originalProductNameText}"
- Dimensions/Quantity/Notes: "${t(DIAMETER_TYPE_OPTIONS.find(opt => opt.value === formData.diameterType)?.labelKey || 'diameterType_mid' as TranslationKey)}, Ø ${formData.diameterFrom}-${formData.diameterTo}cm, Length: ${formData.length}m, ${formData.quantity}pcs. ${formData.notes || 'No other notes.'}"

Alternative (Alternative):
- Product Name: "${alternativeToCompare.name}"
- Dimensions/Quantity/Notes: "${alternativeToCompare.specs}"

The response MUST ONLY contain the JSON object. Output in ${currentPromptLang}.`;

    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
        config: { responseMimeType: "application/json" }
      });
      const parsedResult = parseJsonFromGeminiResponse<GeminiComparisonResponse>(genResponse.text, "customerNewDemand_ai_productComparisonTitle" as TranslationKey);
      return parsedResult;
    } catch (apiError: any) {
      console.error("Error comparing products with Gemini:", apiError);
      return t('customerNewDemand_error_comparisonGeneric');
    }
  }, [ai, formData, locale, t, alternativeProducts, parseJsonFromGeminiResponse]);
  
  const generateAutoCommentWithGemini = useCallback(async (): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
     if (!formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity) {
        return t('customerNewDemand_error_provideFeaturesForComment');
    }
    const currentPromptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const promptContent = `A customer is ordering "${formData.productName}". Generate a short, polite, informative note in ${currentPromptLang} for their demand.
Product features for "${formData.productName}":
- Diameter type: ${t(DIAMETER_TYPE_OPTIONS.find(opt => opt.value === formData.diameterType)?.labelKey || 'diameterType_mid' as TranslationKey)}
- Diameter: ${formData.diameterFrom}-${formData.diameterTo} cm
- Length: ${formData.length} m
- Quantity: ${formData.quantity} pcs

The response should only contain the generated note text. Output in ${currentPromptLang}.`;
    try {
      const genResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: promptContent,
      });
      return genResponse.text || t('customerNewDemand_error_failedToGenerateComment');
    } catch (apiError: any) {
      console.error("Error generating auto comment with Gemini:", apiError);
      return t('customerNewDemand_error_commentGeneric');
    }
  }, [ai, formData, locale, t]);
  
  const handleAiFeatureClick = useCallback(async (
    targetFeatureKey: 'alternatives' | 'comparison' | 'autoComment',
    actionAsync: () => Promise<string | AlternativeProduct[] | GeminiComparisonResponse | void>
  ) => {
    setIsLoading(prev => ({ ...prev, [targetFeatureKey]: true }));
    setCurrentAiFeatureKey(targetFeatureKey);
    if (targetFeatureKey !== 'alternatives') setAlternativeProducts(null);
    if (targetFeatureKey !== 'comparison') setProductComparison(null);
    if (targetFeatureKey !== 'autoComment' && formData.notes?.startsWith(t('customerNewDemand_ai_notesAiErrorPrefix'))) {
      setFormData(prev => ({...prev, notes: ''}));
    }

    try {
      const resultData = await actionAsync();
      if (targetFeatureKey === 'alternatives') {
        setAlternativeProducts(resultData as AlternativeProduct[] | string);
        if (typeof resultData === 'string' || (Array.isArray(resultData) && resultData.length === 0)) {
            setProductComparison(null); 
        }
      } else if (targetFeatureKey === 'comparison') {
        setProductComparison(resultData as GeminiComparisonResponse | string);
      } else if (targetFeatureKey === 'autoComment') {
        const commentText = resultData as string;
        if (typeof commentText === 'string' && !commentText.toLowerCase().includes("error") && !commentText.toLowerCase().includes("failed") && !commentText.toLowerCase().includes(t('customerNewDemand_error_provideFeaturesForComment').toLowerCase().substring(0,10))) {
            setFormData(prev => ({ ...prev, notes: commentText }));
        } else if (typeof commentText === 'string') { 
             setFormData(prev => ({ ...prev, notes: `${t('customerNewDemand_ai_notesAiErrorPrefix')} ${commentText}` }));
        }
      }
    } catch (processError: any) {
        console.error(`Error in AI feature ${targetFeatureKey}:`, processError);
        const errorMsgText = t('customerNewDemand_error_aiUnexpected');
        if (targetFeatureKey === 'alternatives') setAlternativeProducts(errorMsgText);
        else if (targetFeatureKey === 'comparison') setProductComparison(errorMsgText);
        else if (targetFeatureKey === 'autoComment') setFormData(prev => ({ ...prev, notes: `${t('customerNewDemand_ai_notesAiErrorPrefix')} ${errorMsgText}`}));
    } finally {
      setIsLoading(prev => ({ ...prev, [targetFeatureKey]: false }));
    }
  }, [formData.notes, t, parseJsonFromGeminiResponse, suggestAlternativeProductsWithGemini, compareProductsWithGemini, generateAutoCommentWithGemini]); // Added dependencies

  const isAnyLoading = Object.values(isLoading).some(status => status);
  const diameterTypeOptionsForSelect = DIAMETER_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.productName) {
        alert(t('customerNewDemand_error_provideProductName'));
        return;
    }
    setIsLoading(prev => ({ ...prev, submit: true }));
    setCurrentAiFeatureKey(null); 

    const newDemandItem: DemandItem = {
      productName: formData.productName,
      diameterType: formData.diameterType,
      diameterFrom: formData.diameterFrom,
      diameterTo: formData.diameterTo,
      length: formData.length,
      quantity: formData.quantity,
      cubicMeters: formData.cubicMeters,
      notes: formData.notes,
      id: `DEM-${Date.now()}`,
      submissionDate: new Date().toISOString(),
      status: DemandStatus.RECEIVED,
    };

    try {
      const existingDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
      const existingDemands: DemandItem[] = existingDemandsRaw ? JSON.parse(existingDemandsRaw) : [];
      localStorage.setItem(CUSTOMER_DEMANDS_STORAGE_KEY, JSON.stringify([newDemandItem, ...existingDemands]));
    } catch (saveError: any) {
      console.error("Error saving demand:", saveError);
    }
    
    setTimeout(() => {
      alert(t('customerNewDemand_demandSubmittedSuccess', { id: newDemandItem.id }));
      setFormData(initialFormData);
      setAlternativeProducts(null);
      setProductComparison(null);
      setIsLoading(prev => ({ ...prev, submit: false }));
    }, 1500);
  };
  
  return (
    <>
      <PageTitle title={t('customerNewDemand_title')} subtitle={t('customerNewDemand_subtitle')} icon={<ShoppingCartIcon className="h-8 w-8"/>} />
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card title={t('customerNewDemand_productFeatures')}>
            <Input 
              label={t('customerNewDemand_productName')} 
              name="productName"
              value={formData.productName} 
              onChange={handleInputChange} 
              placeholder={t('customerNewDemand_productNamePlaceholder')}
              required 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select 
                label={t('customerNewDemand_diameterType')} 
                name="diameterType" 
                options={diameterTypeOptionsForSelect} 
                value={formData.diameterType} 
                onChange={handleInputChange} 
                required 
              />
              <div></div> {/* Placeholder for grid alignment */}
              <Input label={t('customerNewDemand_diameterFrom')} name="diameterFrom" type="number" step="0.1" min="0" value={formData.diameterFrom} onChange={handleInputChange} required />
              <Input label={t('customerNewDemand_diameterTo')} name="diameterTo" type="number" step="0.1" min="0" value={formData.diameterTo} onChange={handleInputChange} required />
              <Input label={t('customerNewDemand_length')} name="length" type="number" step="0.1" min="0" value={formData.length} onChange={handleInputChange} required />
              <Input label={t('customerNewDemand_quantity')} name="quantity" type="number" min="1" value={formData.quantity} onChange={handleInputChange} required />
            </div>
            <div className="mt-4">
                <Textarea 
                  label={t('notes')} 
                  name="notes" 
                  value={formData.notes || ''} 
                  onChange={handleInputChange} 
                  rows={4} 
                  placeholder={t('customerNewDemand_notesPlaceholder')}
                  aria-describedby="notes-ai-feedback"
                />
                {formData.notes?.startsWith(t('customerNewDemand_ai_notesAiErrorPrefix')) && <p id="notes-ai-feedback" className="text-xs text-red-400 mt-1">{formData.notes}</p>}
            </div>
            <div className="mt-6 p-4 bg-slate-700 rounded-md">
              <p className="text-lg font-semibold text-cyan-400">{t('calculatedCubicMeters')}: <span className="text-white">{formData.cubicMeters || 0} m³</span></p>
            </div>
          </Card>
          <Button 
            type="submit" 
            className="w-full md:w-auto" 
            isLoading={isLoading['submit']} 
            disabled={isAnyLoading || !formData.productName || !formData.diameterType || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity}
          >
            {t('customerNewDemand_submitDemandButton')}
          </Button>
        </div>

        <div className="space-y-4">
           <Card title={t('aiAssistant')}>
            <div className="space-y-3">
              <AiFeatureButton
                text={t('customerNewDemand_ai_suggestAlternatives')}
                onClick={() => handleAiFeatureClick('alternatives', suggestAlternativeProductsWithGemini)}
                isLoading={isLoading['alternatives']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity)}
              />
              <AiFeatureButton
                text={t('customerNewDemand_ai_compareProducts')}
                onClick={() => handleAiFeatureClick('comparison', compareProductsWithGemini)}
                isLoading={isLoading['comparison']}
                disabled={Boolean(!ai || isAnyLoading || !alternativeProducts || typeof alternativeProducts === 'string' || alternativeProducts.length === 0)}
              />
              <AiFeatureButton
                text={t('customerNewDemand_ai_generateAutoComment')}
                onClick={() => handleAiFeatureClick('autoComment', generateAutoCommentWithGemini)}
                isLoading={isLoading['autoComment']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity)}
              />
            </div>
          </Card>

          {isLoading['alternatives'] && currentAiFeatureKey === 'alternatives' && <LoadingSpinner text={t('customerNewDemand_ai_searchingAlternatives')} />}
          {alternativeProducts && currentAiFeatureKey === 'alternatives' && !isLoading['alternatives'] && (
            <Card title={t('customerNewDemand_ai_suggestedAlternativesTitle')} titleClassName={typeof alternativeProducts === 'string' ? "text-red-400" : "text-yellow-400"}>
              {typeof alternativeProducts === 'string' ? (
                <p className="text-slate-300">{alternativeProducts}</p>
              ) : alternativeProducts.length > 0 ? (
                <ul className="space-y-3">
                  {alternativeProducts.map(product => (
                    <li key={product.id} className="p-3 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">
                      <h4 className="font-semibold text-cyan-300">{product.name}</h4>
                      <p className="text-sm text-slate-300">{product.specs}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">{t('customerNewDemand_ai_noAlternativesFound')}</p>
              )}
            </Card>
          )}

          {isLoading['comparison'] && currentAiFeatureKey === 'comparison' && <LoadingSpinner text={t('customerNewDemand_ai_preparingComparison')} />}
          {productComparison && currentAiFeatureKey === 'comparison' && !isLoading['comparison'] && (
             <Card title={t('customerNewDemand_ai_productComparisonTitle')} titleClassName={typeof productComparison === 'string' ? "text-red-400" : "text-yellow-400"}>
                {typeof productComparison === 'string' ? (
                    <p className="text-slate-300">{productComparison}</p>
                ) : (
                    <div className="space-y-4 text-sm">
                        <div>
                            <h4 className="font-semibold text-cyan-300 mb-1">{productComparison.original.name}</h4>
                            <p className="text-slate-300 mb-1"><strong>{t('customerNewDemand_ai_comparisonFeatures')}:</strong> {productComparison.original.dimensions_quantity_notes}</p>
                            {productComparison.original.pros && productComparison.original.pros.length > 0 && <p className="text-green-300"><strong>{t('customerNewDemand_ai_comparisonPros')}:</strong> {productComparison.original.pros.join(', ')}</p>}
                            {productComparison.original.cons && productComparison.original.cons.length > 0 && <p className="text-red-300"><strong>{t('customerNewDemand_ai_comparisonCons')}:</strong> {productComparison.original.cons.join(', ')}</p>}
                        </div>
                        <div className="border-t border-slate-700 pt-4">
                            <h4 className="font-semibold text-cyan-300 mb-1">{productComparison.alternative.name}</h4>
                            <p className="text-slate-300 mb-1"><strong>{t('customerNewDemand_ai_comparisonFeatures')}:</strong> {productComparison.alternative.dimensions_quantity_notes}</p>
                            {productComparison.alternative.pros && productComparison.alternative.pros.length > 0 && <p className="text-green-300"><strong>{t('customerNewDemand_ai_comparisonPros')}:</strong> {productComparison.alternative.pros.join(', ')}</p>}
                            {productComparison.alternative.cons && productComparison.alternative.cons.length > 0 && <p className="text-red-300"><strong>{t('customerNewDemand_ai_comparisonCons')}:</strong> {productComparison.alternative.cons.join(', ')}</p>}
                        </div>
                    </div>
                )}
            </Card>
          )}
           {isLoading['autoComment'] && currentAiFeatureKey === 'autoComment' && <LoadingSpinner text={t('customerNewDemand_ai_generatingComment')} />}
        </div>
      </form>
    </>
  );
};
