
import React, { useState } from 'react';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import AiFeatureButton from '../../components/AiFeatureButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { EnvelopeIcon, DocumentCheckIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'; // Completed import
import { useLocale } from '../../LocaleContext';
import { GenerateContentResponse } from "@google/genai";
import { ai } from '../../lib/gemini';

interface AdminShippingTemplatesState {
  emailDraft?: string;
  waybillSuggestions?: string[];
  currentAiFeatureKey?: string;
}

export const AdminShippingTemplatesPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<AdminShippingTemplatesState>({});

  const generateEmailDraftWithGemini = async (): Promise<string> => {
    if (!ai) return t('adminShippingTemplates_error_emailGeneric'); // Or a more specific "AI unavailable"
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `Generate a polite and professional email draft in ${promptLang} for notifying a customer that their timber order is ready for shipping. Include placeholders like [Customer Name], [Order Number], and [Expected Delivery Date/Time]. The response should only contain the email draft text.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt });
      return response.text || t('adminShippingTemplates_error_emailGeneric');
    } catch (error) {
      console.error("Error generating email draft:", error);
      return t('adminShippingTemplates_error_emailGeneric');
    }
  };

  const generateWaybillCheckSuggestionsWithGemini = async (): Promise<string[]> => {
    if (!ai) return [t('adminShippingTemplates_error_waybillGeneric')];
    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const prompt = `Provide a list of 3-5 key checkpoints in ${promptLang} for an admin to verify on a timber transport waybill before dispatch. Each point should start with '- '. The response should only contain this list.`;
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt });
      const suggestions = response.text?.split('\n').filter(s => s.startsWith('- ')).map(s => s.substring(2).trim()) || [];
      return suggestions.length > 0 ? suggestions : [t('adminShippingTemplates_error_noSuggestionsFromAI')];
    } catch (error) {
      console.error("Error generating waybill suggestions:", error);
      return [t('adminShippingTemplates_error_waybillGeneric')];
    }
  };


  const handleAiFeatureClick = async (
    featureKey: keyof AdminShippingTemplatesState,
    aiOperationKey: string,
    action: () => Promise<string | string[]>
  ) => {
    setIsLoading(prev => ({ ...prev, [aiOperationKey]: true }));
    setState(prev => ({ 
      ...prev, 
      emailDraft: featureKey === 'emailDraft' ? undefined : prev.emailDraft,
      waybillSuggestions: featureKey === 'waybillSuggestions' ? undefined : prev.waybillSuggestions,
      currentAiFeatureKey: aiOperationKey 
    }));
    try {
      const result = await action();
      setState(prev => ({ ...prev, [featureKey]: result }));
    } catch (err) {
      console.error(`Error with ${aiOperationKey}:`, err);
      if (featureKey === 'emailDraft') setState(prev => ({ ...prev, emailDraft: t('adminShippingTemplates_error_emailGeneric') }));
      if (featureKey === 'waybillSuggestions') setState(prev => ({ ...prev, waybillSuggestions: [t('adminShippingTemplates_error_waybillGeneric')] }));
    } finally {
      setIsLoading(prev => ({ ...prev, [aiOperationKey]: false }));
    }
  };

  const isAnyLoading = Object.values(isLoading).some(s => s);

  return (
    <>
      <PageTitle title={t('adminShippingTemplates_title')} subtitle={t('adminShippingTemplates_subtitle')} icon={<ClipboardDocumentListIcon className="h-8 w-8" />} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={t('adminShippingTemplates_emailDraftGeneration')}>
          <p className="text-sm text-slate-300 mb-3">{t('adminShippingTemplates_emailDraftDescription')}</p>
          <AiFeatureButton
            text={t('adminShippingTemplates_requestEmailDraft')}
            onClick={() => handleAiFeatureClick('emailDraft', 'emailDraftOp', generateEmailDraftWithGemini)}
            isLoading={isLoading.emailDraftOp}
            disabled={!ai || isAnyLoading}
            leftIcon={<EnvelopeIcon className="h-5 w-5 text-blue-400" />}
          />
          {isLoading.emailDraftOp && state.currentAiFeatureKey === 'emailDraftOp' && <LoadingSpinner text={t('adminShippingTemplates_generatingDraft')} />}
          {state.emailDraft && !isLoading.emailDraftOp && state.currentAiFeatureKey === 'emailDraftOp' && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded">
              <h5 className={`font-semibold mb-1 ${state.emailDraft.includes("Error") || state.emailDraft.includes("Hiba") ? "text-red-400" : "text-cyan-400"}`}>{t('adminShippingTemplates_generatedEmailDraft')}</h5>
              <pre className="text-sm text-slate-200 whitespace-pre-wrap">{state.emailDraft}</pre>
            </div>
          )}
        </Card>

        <Card title={t('adminShippingTemplates_waybillCheckSuggestions')}>
          <p className="text-sm text-slate-300 mb-3">{t('adminShippingTemplates_waybillCheckDescription')}</p>
          <AiFeatureButton
            text={t('adminShippingTemplates_requestCheckSuggestions')}
            onClick={() => handleAiFeatureClick('waybillSuggestions', 'waybillCheckOp', generateWaybillCheckSuggestionsWithGemini)}
            isLoading={isLoading.waybillCheckOp}
            disabled={!ai || isAnyLoading}
            leftIcon={<DocumentCheckIcon className="h-5 w-5 text-green-400" />}
          />
          {isLoading.waybillCheckOp && state.currentAiFeatureKey === 'waybillCheckOp' && <LoadingSpinner text={t('adminShippingTemplates_searchingSuggestions')} />}
          {state.waybillSuggestions && !isLoading.waybillCheckOp && state.currentAiFeatureKey === 'waybillCheckOp' &&(
            <div className="mt-4 p-3 bg-slate-700/50 rounded">
              <h5 className={`font-semibold mb-1 ${state.waybillSuggestions.some(s => s.includes("Error") || s.includes("Hiba")) ? "text-red-400" : "text-cyan-400"}`}>{t('adminShippingTemplates_suggestedCheckpoints')}</h5>
              {state.waybillSuggestions.length === 0 || (state.waybillSuggestions.length === 1 && (state.waybillSuggestions[0] === t('adminShippingTemplates_error_noSuggestionsFromAI') || state.waybillSuggestions[0] === t('adminShippingTemplates_error_waybillGeneric'))) ? (
                  <p className="text-sm text-red-300">{state.waybillSuggestions[0] || t('adminShippingTemplates_noSuggestionsReceived')}</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                    {state.waybillSuggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
