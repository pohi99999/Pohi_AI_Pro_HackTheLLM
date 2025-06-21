
import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '../../components/PageTitle';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Select from '../../components/Select';
import AiFeatureButton from '../../components/AiFeatureButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { StockItem, StockStatus, TranslationKey, ProductFeatures, AlternativeProduct } from '../../types'; // Added AlternativeProduct
import { DIAMETER_TYPE_OPTIONS } from '../../locales'; 
import { CubeIcon, PhotoIcon } from '@heroicons/react/24/outline'; // Added PhotoIcon
import { GenerateContentResponse, GenerateImagesResponse } from "@google/genai"; // Corrected GeneratedImageResponse to GenerateImagesResponse
import { useLocale } from '../../LocaleContext';
import { MANUFACTURER_STOCK_STORAGE_KEY } from '../../constants';
import { ai } from '../../lib/gemini';
import { calculateVolume } from '../../lib/utils';

// AI Listing Analysis specific types
interface ListingQualityAnalysis {
    completeness: string[]; 
    quality_appeal: string[]; 
    target_audience: string; 
}

export const ManufacturerNewStockPage: React.FC = () => {
  const { t, locale } = useLocale();
  const initialFormData: StockItem & {productName: string} = { 
    productName: '', 
    diameterType: 'mid',
    diameterFrom: '',
    diameterTo: '',
    length: '',
    quantity: '',
    price: '',
    sustainabilityInfo: '',
    notes: '',
    cubicMeters: 0,
    status: StockStatus.AVAILABLE, 
  };

  const [formData, setFormData] = useState<StockItem & {productName: string}>(initialFormData);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<string | null>(null);
  const [aiMarketingText, setAiMarketingText] = useState<string | null>(null);
  const [aiListingAnalysis, setAiListingAnalysis] = useState<ListingQualityAnalysis | string | null>(null);
  const [aiGeneratedPhoto, setAiGeneratedPhoto] = useState<string | null>(null);
  const [aiPhotoError, setAiPhotoError] = useState<string | null>(null);
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

  const generatePriceSuggestionWithGemini = useCallback(async (): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity) {
      return t('manufacturerNewStock_error_provideFeaturesForPrice');
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `As an AI assistant for a timber marketplace, suggest a market-oriented price for the following product.
Product: ${formData.productName}
Type: ${formData.diameterType}, Diameter: ${formData.diameterFrom}-${formData.diameterTo}cm, Length: ${formData.length}m, Quantity: ${formData.quantity}pcs
Notes: ${formData.notes || 'N/A'}
Sustainability: ${formData.sustainabilityInfo || 'N/A'}
Cubic Meters: ${formData.cubicMeters?.toFixed(3)} m³

Provide the price suggestion in ${promptLang} as a string (e.g., "Suggested price: 110-130 EUR/m³ based on current market for similar quality spruce logs." or "Consider 12-15 EUR/piece for specialized items.").
The response should ONLY contain the price suggestion string.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt });
      return response.text || t('manufacturerNewStock_error_priceSuggestionGeneric');
    } catch (error) {
      console.error("Error generating price suggestion with Gemini:", error);
      return t('manufacturerNewStock_error_priceSuggestionGeneric');
    }
  }, [ai, formData, locale, t]);

  const generateMarketingTextWithGemini = useCallback(async (): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity) {
      return t('manufacturerNewStock_error_provideFeaturesForAnalysis'); 
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `Generate a concise and appealing marketing text (2-3 sentences) in ${promptLang} for the following timber product to be listed on an online marketplace.
Product: ${formData.productName}
Type: ${formData.diameterType}, Diameter: ${formData.diameterFrom}-${formData.diameterTo}cm, Length: ${formData.length}m, Quantity: ${formData.quantity}pcs
Notes: ${formData.notes || 'N/A'}
Sustainability: ${formData.sustainabilityInfo || 'N/A'}
Price: ${formData.price || 'To be specified'}

Highlight key selling points like quality, origin (if mentioned), suitability for certain applications, or sustainability aspects.
The response should ONLY contain the marketing text.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt });
      return response.text || t('manufacturerNewStock_error_marketingTextGeneric');
    } catch (error) {
      console.error("Error generating marketing text with Gemini:", error);
      return t('manufacturerNewStock_error_marketingTextGeneric');
    }
  }, [ai, formData, locale, t]);

  const analyzeProductListingWithGemini = useCallback(async (): Promise<ListingQualityAnalysis | string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
     if (!formData.productName || (!formData.notes && !formData.sustainabilityInfo)) {
      return t('manufacturerNewStock_error_provideFeaturesForAnalysis');
    }
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `Analyze the following timber product listing for an online marketplace. Provide feedback in ${promptLang} as a JSON object with three keys:
1.  "completeness": An array of strings, listing specific suggestions for additional information that would make the listing more complete (e.g., "Specify wood treatment if any", "Add details about drying process").
2.  "quality_appeal": An array of strings, with suggestions to improve the perceived quality and appeal of the listing (e.g., "Highlight if it's suitable for high-value applications like furniture", "Mention if wood is from certified sustainable sources if applicable").
3.  "target_audience": A string describing the potential target audience for this product (e.g., "Construction companies, DIY home builders, furniture makers").

Product Listing Data:
- Product Name: ${formData.productName}
- Dimensions: ${formData.diameterType}, Ø ${formData.diameterFrom}-${formData.diameterTo}cm, Length: ${formData.length}m, Quantity: ${formData.quantity}pcs
- Price: ${formData.price || 'Not specified'}
- Notes: ${formData.notes || 'No additional notes provided.'}
- Sustainability Info: ${formData.sustainabilityInfo || 'No sustainability information provided.'}

The response MUST ONLY contain the JSON object.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const parsedResult = parseJsonFromGeminiResponse<ListingQualityAnalysis>(response.text, 'manufacturerNewStock_ai_analyzeProductListing' as TranslationKey);
      if(typeof parsedResult === 'string'){
         return t('manufacturerNewStock_ai_analysisFailedExtract', { rawResponse: parsedResult.substring(0, 100) });
      }
      return parsedResult;
    } catch (error) {
      console.error("Error analyzing product listing with Gemini:", error);
      return t('manufacturerNewStock_error_listingAnalysisGeneric');
    }
  }, [ai, formData, locale, t, parseJsonFromGeminiResponse]);

  const generateProductPhotoWithImagen = useCallback(async (): Promise<string> => {
    if (!ai) return t('customerNewDemand_error_aiUnavailable');
    if (!formData.productName) {
      return t('manufacturerNewStock_error_provideFeaturesForImage');
    }
    
    const promptText = `Photorealistic image of a timber product: "${formData.productName}". 
    ${formData.notes ? `Additional details: ${formData.notes}. ` : ''}
    ${formData.sustainabilityInfo ? `Sustainability aspect: ${formData.sustainabilityInfo}. ` : ''}
    The product should be shown in a clean, well-lit setting, possibly on a neutral background or in a relevant environment (e.g., stacked wood, construction site if structural). Suitable for a marketplace listing. Focus on the wood's texture and quality.`;

    try {
      const response: GenerateImagesResponse = await ai.models.generateImages({ // Corrected type
        model: 'imagen-3.0-generate-002',
        prompt: promptText,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
      });

      if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      } else {
        return t('manufacturerNewStock_error_failedToGenerateImage');
      }
    } catch (error: any) {
      console.error("Error generating product photo with Imagen:", error);
      return error.message || t('manufacturerNewStock_error_imageGenerationGeneric');
    }
  }, [ai, formData.productName, formData.notes, formData.sustainabilityInfo, t]);


  const handleAiFeatureClick = useCallback(async (
    feature: 'price' | 'marketing' | 'analysis' | 'photo',
    actionAsync: () => Promise<string | ListingQualityAnalysis> // Removed AlternativeProduct[] as it's not used here
  ) => {
    setIsLoading(prev => ({ ...prev, [feature]: true }));
    setCurrentAiFeatureKey(feature);
    if (feature !== 'price') setAiPriceSuggestion(null);
    if (feature !== 'marketing') setAiMarketingText(null);
    if (feature !== 'analysis') setAiListingAnalysis(null);
    if (feature !== 'photo') { setAiGeneratedPhoto(null); setAiPhotoError(null); }


    try {
      const resultData = await actionAsync();
      if (feature === 'price') setAiPriceSuggestion(resultData as string);
      if (feature === 'marketing') setAiMarketingText(resultData as string);
      if (feature === 'analysis') setAiListingAnalysis(resultData as ListingQualityAnalysis | string);
      if (feature === 'photo') {
          if ((resultData as string).startsWith('data:image')) {
            setAiGeneratedPhoto(resultData as string);
            setAiPhotoError(null);
          } else {
            setAiPhotoError(resultData as string);
            setAiGeneratedPhoto(null);
          }
      }
    } catch (err) {
      console.error("AI Feature Error:", err);
      const errorMsg = t('manufacturerNewStock_error_aiFeatureError');
      if (feature === 'price') setAiPriceSuggestion(errorMsg);
      if (feature === 'marketing') setAiMarketingText(errorMsg);
      if (feature === 'analysis') setAiListingAnalysis(errorMsg);
      if (feature === 'photo') { setAiPhotoError(errorMsg); setAiGeneratedPhoto(null); }
    } finally {
      setIsLoading(prev => ({ ...prev, [feature]: false }));
    }
  }, [t]); 

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.productName) {
        alert(t('customerNewDemand_error_provideProductName')); 
        return;
    }
    setIsLoading(prev => ({ ...prev, submit: true }));
    setCurrentAiFeatureKey(null);

    const newStockItem: StockItem = {
      ...formData,
      id: `STK-${Date.now()}`,
      uploadDate: new Date().toISOString(),
      status: StockStatus.AVAILABLE, 
    };

    try {
      const existingStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
      const existingStock: StockItem[] = existingStockRaw ? JSON.parse(existingStockRaw) : [];
      localStorage.setItem(MANUFACTURER_STOCK_STORAGE_KEY, JSON.stringify([newStockItem, ...existingStock]));
    } catch (saveError: any) {
      console.error("Error saving stock:", saveError);
    }
    
    setTimeout(() => {
      alert(t('manufacturerNewStock_stockUploadedSuccess', { id: newStockItem.id || 'N/A' }));
      setFormData(initialFormData);
      setAiPriceSuggestion(null);
      setAiMarketingText(null);
      setAiListingAnalysis(null);
      setAiGeneratedPhoto(null);
      setAiPhotoError(null);
      setIsLoading(prev => ({ ...prev, submit: false }));
    }, 1500);
  };

  const isAnyLoading = Object.values(isLoading).some(status => status);
  const diameterTypeOptionsForSelect = DIAMETER_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }));

  return (
    <>
      <PageTitle title={t('manufacturerNewStock_title')} subtitle={t('manufacturerNewStock_subtitle')} icon={<CubeIcon className="h-8 w-8" />} />
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card title={t('manufacturerNewStock_productFeaturesAndPricing')}>
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
            <Input 
              label={t('manufacturerMyStock_price')} 
              name="price"
              value={formData.price || ''} 
              onChange={handleInputChange} 
              placeholder={t('manufacturerNewStock_pricePlaceholder')}
            />
            <Textarea 
              label={t('manufacturerNewStock_sustainabilityInfo')}
              name="sustainabilityInfo"
              value={formData.sustainabilityInfo || ''}
              onChange={handleInputChange}
              rows={3}
              placeholder={t('manufacturerNewStock_sustainabilityPlaceholder')}
            />
            <Textarea 
              label={t('notes')} 
              name="notes" 
              value={formData.notes || ''} 
              onChange={handleInputChange} 
              rows={3} 
              placeholder={t('manufacturerNewStock_notesPlaceholder')}
            />
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
            {t('manufacturerNewStock_uploadStockButton')}
          </Button>
        </div>

        <div className="space-y-4">
          <Card title={t('manufacturerNewStock_ai_title')}>
            <div className="space-y-3">
              <AiFeatureButton
                text={t('manufacturerNewStock_ai_requestPriceSuggestion')}
                onClick={() => handleAiFeatureClick('price', generatePriceSuggestionWithGemini)}
                isLoading={isLoading['price']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity)}
              />
              <AiFeatureButton
                text={t('manufacturerNewStock_ai_generateMarketingText')}
                onClick={() => handleAiFeatureClick('marketing', generateMarketingTextWithGemini)}
                isLoading={isLoading['marketing']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName || !formData.diameterFrom || !formData.diameterTo || !formData.length || !formData.quantity)}
              />
              <AiFeatureButton
                text={t('manufacturerNewStock_ai_analyzeProductListing')}
                onClick={() => handleAiFeatureClick('analysis', analyzeProductListingWithGemini)}
                isLoading={isLoading['analysis']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName || (!formData.notes && !formData.sustainabilityInfo))}
              />
              <AiFeatureButton
                text={t('manufacturerNewStock_ai_generateProductPhoto')}
                onClick={() => handleAiFeatureClick('photo', generateProductPhotoWithImagen)}
                isLoading={isLoading['photo']}
                disabled={Boolean(!ai || isAnyLoading || !formData.productName)}
                leftIcon={<PhotoIcon className="h-5 w-5 text-purple-400" />}
              />
            </div>
          </Card>

          {isLoading['price'] && currentAiFeatureKey === 'price' && <LoadingSpinner text={t('manufacturerNewStock_ai_generatingResponse')} />}
          {aiPriceSuggestion && currentAiFeatureKey === 'price' && !isLoading['price'] && (
            <Card title={t('manufacturerNewStock_ai_priceSuggestionTitle')} titleClassName={aiPriceSuggestion.includes("Error") || aiPriceSuggestion.includes("Hiba") ? "text-red-400" : "text-yellow-400"}>
              <p className="text-slate-300">{aiPriceSuggestion}</p>
            </Card>
          )}

          {isLoading['marketing'] && currentAiFeatureKey === 'marketing' && <LoadingSpinner text={t('manufacturerNewStock_ai_generatingResponse')} />}
          {aiMarketingText && currentAiFeatureKey === 'marketing' && !isLoading['marketing'] && (
            <Card title={t('manufacturerNewStock_ai_marketingTextTitle')} titleClassName={aiMarketingText.includes("Error") || aiMarketingText.includes("Hiba") ? "text-red-400" : "text-yellow-400"}>
              <p className="text-slate-300 whitespace-pre-wrap">{aiMarketingText}</p>
            </Card>
          )}

          {isLoading['analysis'] && currentAiFeatureKey === 'analysis' && <LoadingSpinner text={t('manufacturerNewStock_ai_generatingResponse')} />}
          {aiListingAnalysis && currentAiFeatureKey === 'analysis' && !isLoading['analysis'] && (
            <Card title={t('manufacturerNewStock_ai_listingAnalysisTitle')} titleClassName={typeof aiListingAnalysis === 'string' && (aiListingAnalysis.includes("Error") || aiListingAnalysis.includes("Hiba")) ? "text-red-400" : "text-yellow-400"}>
              {typeof aiListingAnalysis === 'string' ? (
                <p className="text-slate-300">{aiListingAnalysis}</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <h5 className="font-semibold text-cyan-300">{t('manufacturerNewStock_ai_analysisCompleteness')}</h5>
                    <ul className="list-disc list-inside text-slate-300 pl-4">
                      {aiListingAnalysis.completeness.map((item, idx) => <li key={`comp-${idx}`}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-cyan-300">{t('manufacturerNewStock_ai_analysisQualityAppeal')}</h5>
                    <ul className="list-disc list-inside text-slate-300 pl-4">
                      {aiListingAnalysis.quality_appeal.map((item, idx) => <li key={`qa-${idx}`}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-cyan-300">{t('manufacturerNewStock_ai_analysisTargetAudience')}</h5>
                    <p className="text-slate-300">{aiListingAnalysis.target_audience}</p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {isLoading['photo'] && currentAiFeatureKey === 'photo' && <LoadingSpinner text={t('manufacturerNewStock_ai_generatingPhoto')} />}
          {(aiGeneratedPhoto || aiPhotoError) && currentAiFeatureKey === 'photo' && !isLoading['photo'] && (
            <Card title={aiGeneratedPhoto ? t('manufacturerNewStock_ai_generatedPhotoTitle') : t('manufacturerNewStock_ai_imageGenErrorTitle')} 
                  titleClassName={aiPhotoError ? "text-red-400" : "text-yellow-400"}>
              {aiGeneratedPhoto && (
                <img src={aiGeneratedPhoto} alt={t('manufacturerNewStock_ai_generatedPhotoTitle')} className="rounded-md w-full object-contain max-h-96"/>
              )}
              {aiPhotoError && (
                <p className="text-slate-300">{aiPhotoError}</p>
              )}
            </Card>
          )}

        </div>
      </form>
    </>
  );
};
