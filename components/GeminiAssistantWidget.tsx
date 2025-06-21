
import React, { useState } from 'react';
import { useLocale } from '../LocaleContext';
import Button from './Button';
import Textarea from './Textarea';
import LoadingSpinner from './LoadingSpinner';
import { GenerateContentResponse } from "@google/genai";
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { ai } from '../lib/gemini'; // Import shared AI instance

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
}

const GeminiAssistantWidget: React.FC = () => {
  const { t, locale } = useLocale();
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    if (!ai) {
      setError(t('customerNewDemand_error_aiUnavailable'));
      setChatHistory(prev => [...prev, {id: `err-${Date.now()}`, sender: 'gemini', text: t('customerNewDemand_error_aiUnavailable')}]);
      return;
    }

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputValue,
    };
    setChatHistory(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    const promptLang = locale === 'hu' ? 'Hungarian' : 'English';
    const systemPrompt = t('adminDashboard_geminiAssistantSystemPrompt', { platformName: "Pohi AI Pro", language: promptLang });
    
    const fullPrompt = `${systemPrompt}\n\nUser query: "${newUserMessage.text}"\n\nAssistant response in ${promptLang}:`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: fullPrompt,
      });
      
      const aiResponseText = response.text;
      setChatHistory(prev => [...prev, { id: `gemini-${Date.now()}`, sender: 'gemini', text: aiResponseText }]);
    } catch (apiError: any) {
      console.error("Error calling Gemini API:", apiError);
      const errorMessage = apiError.message || t('adminDashboard_geminiAssistantError');
      setError(errorMessage);
      setChatHistory(prev => [...prev, {id: `err-api-${Date.now()}`, sender: 'gemini', text: errorMessage}]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border border-dashed border-slate-600 rounded-lg bg-slate-700/50 flex flex-col h-full max-h-[600px]">
      <h3 className="text-lg font-semibold text-cyan-400 mb-2">
        {t('adminDashboard_geminiAssistantTitle')}
      </h3>
      <p className="text-sm text-slate-300 mb-3">
        {t('adminDashboard_geminiAssistantWelcome')}
      </p>
      
      <div className="flex-grow overflow-y-auto mb-3 pr-2 custom-scrollbar space-y-3">
        {chatHistory.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-2.5 rounded-lg text-sm shadow
                ${message.sender === 'user' 
                  ? 'bg-cyan-600 text-white rounded-br-none' 
                  : 'bg-slate-600 text-slate-100 rounded-bl-none'}
                ${message.text.includes(t('customerNewDemand_error_aiUnavailable')) || message.text.includes(t('adminDashboard_geminiAssistantError')) ? 'border border-red-500' : ''}  
              `}
            >
              <p className="font-semibold text-xs mb-0.5 opacity-80">
                {message.sender === 'user' ? t('adminDashboard_geminiAssistant_userLabel') : t('adminDashboard_geminiAssistant_aiLabel')}
              </p>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-2.5 rounded-lg text-sm shadow bg-slate-600 text-slate-100 rounded-bl-none">
                <LoadingSpinner size="sm" text={t('adminDashboard_geminiAssistantThinking')} />
            </div>
          </div>
        )}
      </div>
      
      {error && !isLoading && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      <div className="flex items-end space-x-2 pt-2 border-t border-slate-600">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('adminDashboard_geminiAssistantInputPlaceholder')}
          aria-label={t('adminDashboard_geminiAssistantInputPlaceholder')}
          rows={2}
          className="mb-0 flex-grow" 
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          variant="primary"
          className="h-full px-3"
          aria-label={t('adminDashboard_geminiAssistantSend')}
        >
          <PaperAirplaneIcon className="h-5 w-5"/>
        </Button>
      </div>
    </div>
  );
};

export default GeminiAssistantWidget;
