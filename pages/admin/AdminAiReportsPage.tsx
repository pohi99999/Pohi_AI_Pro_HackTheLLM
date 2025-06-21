
import React, { useState, useCallback } from 'react';
import { useLocale } from '../../LocaleContext'; 
import { GenerateContentResponse } from "@google/genai";
import { ai } from '../../lib/gemini'; 

// --- START OF INLINED COMPONENTS (Should be imported from shared components if structure allows) ---

const PageTitle: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode }> = ({ title, subtitle, icon }) => {
  return (
    <div className="mb-8 pb-4 border-b border-slate-700">
      <div className="flex items-center space-x-3">
        {icon && <span className="text-cyan-400">{icon}</span>}
        <h1 className="text-3xl font-bold text-white">{title}</h1>
      </div>
      {subtitle && <p className="mt-1 text-md text-slate-400">{subtitle}</p>}
    </div>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; titleClassName?: string; bodyClassName?: string; actions?: React.ReactNode; }> = ({ title, children, className = '', titleClassName='', bodyClassName='', actions }) => {
  return (
    <div className={`bg-slate-800 shadow-xl rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className={`p-4 border-b border-slate-700 ${titleClassName}`}>
          <h3 className="text-lg font-semibold text-cyan-400">{title}</h3>
        </div>
      )}
      <div className={`p-4 ${bodyClassName}`}>
        {children}
      </div>
      {actions && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  inputClassName?: string;
}
const Input: React.FC<InputProps> = ({ label, id, error, className = '', labelClassName = '', inputClassName = '', ...props }) => {
  const baseInputClasses = "block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-100";
  const effectiveId = id || props.name;
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={effectiveId} className={`block text-sm font-medium text-slate-300 mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        id={effectiveId}
        className={`${baseInputClasses} ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${inputClassName}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className: classNameFromProps = '', 
  disabled: disabledFromProps,    
  ...restProps 
}) => {
  const baseStyles = 'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 inline-flex items-center justify-center transition-colors duration-150 ease-in-out hover-glow disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStyles = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500',
    secondary: 'bg-slate-600 text-slate-100 hover:bg-slate-500 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-cyan-400 hover:bg-cyan-500/10 focus:ring-cyan-500',
  };
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  const finalClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${classNameFromProps}`;
  const calculatedDisabledState = isLoading || disabledFromProps;
  return (
    <button
      className={finalClassName}
      disabled={calculatedDisabledState} 
      {...restProps} 
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4">
      <svg 
        className={`animate-spin text-cyan-500 ${sizeClasses[size]}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  );
};

// --- END OF INLINED COMPONENTS ---

interface SearchResult {
  date: string;
  stumpage_price: string; // Hungarian: Tőár
  nofu: string; // Hungarian NOFU code (Nomenklatúra Fa Osztályozási Rendszer)
  score: number; // Relevance score
  source_info?: string; // Optional: Brief info about the data source or context
}

export const AdminAiReportsPage: React.FC = () => {
  const { t, locale } = useLocale(); 
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [rawTextResult, setRawTextResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseGeminiJsonResponse = useCallback((jsonString: string): SearchResult[] | string => {
    let cleanedJsonString = jsonString.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleanedJsonString.match(fenceRegex);
    if (match && match[2]) {
      cleanedJsonString = match[2].trim();
    }
    try {
      const parsed = JSON.parse(cleanedJsonString);
      if (Array.isArray(parsed)) {
        // Validate structure of each item
        return parsed.filter(item => 
            typeof item.date === 'string' &&
            typeof item.stumpage_price === 'string' &&
            typeof item.nofu === 'string' &&
            typeof item.score === 'number'
        ) as SearchResult[];
      }
      return "AI response was not a valid JSON array.";
    } catch (e) {
      console.warn("Failed to parse Gemini JSON response for AI Reports:", e, "Raw text:", jsonString);
      return `Failed to parse AI's structured response. Raw output: ${jsonString.substring(0, 300)}...`;
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError(t('adminAiReports_error_enterSearchTerm'));
      return;
    }
    if (!ai) {
      setError(t('customerNewDemand_error_aiUnavailable')); // Re-use a generic AI unavailable message
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setRawTextResult(null);

    const promptLang = locale === 'hu' ? 'Hungarian' : (locale === 'de' ? 'German' : 'English');
    const prompt = `You are an AI assistant specialized in analyzing a Hungarian timber market and pricing database.
The user is querying about: "${query}".
The database contains information including "date", "stumpage_price" (tőár in Ft/m³), and "nofu" (Hungarian timber classification code).
Please search for relevant information.
If you find specific data points, return them as a JSON array of objects. Each object should have the following fields:
- "date": string (e.g., "YYYY-MM-DD" or period like "2023 Q3")
- "stumpage_price": string (e.g., "35000 Ft/m³")
- "nofu": string (the NOFU code, e.g., "01.2A")
- "score": number (a relevance score between 0.0 and 1.0 for this data point to the query)
- "source_info": string (optional, brief context if available, e.g., "Aggregated from NÉBIH reports")

If you cannot find specific structured data points or the query is more general, provide a concise textual summary of any relevant information you can infer or find related to the query.
Prioritize returning JSON if specific data points are found. Limit to a maximum of 5-7 most relevant JSON objects.
Respond in ${promptLang}. Your response MUST be either a valid JSON array as described, or a textual summary if JSON is not appropriate.
If returning JSON, ensure it is ONLY the JSON array, with no other text or markdown.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: { responseMimeType: "application/json" } // Request JSON, but be prepared for text
      });

      const responseText = response.text;
      
      // Try to parse as JSON first
      const parsedData = parseGeminiJsonResponse(responseText);

      if (typeof parsedData === 'string') {
        // If parsing failed or it was a string message from Gemini (e.g. "I couldn't find specific data...")
        // It's possible Gemini returned a textual summary instead of JSON
        const isLikelyJsonError = parsedData.startsWith("Failed to parse") || parsedData.startsWith("AI response was not a valid JSON array");
        if (isLikelyJsonError && responseText.trim().startsWith("[")) {
            // It looked like JSON but failed parsing, show the parser error message
             setRawTextResult(parsedData); // Show the parsing error
        } else if (isLikelyJsonError && !responseText.trim().startsWith("[")) {
            // It didn't look like JSON and parsing function confirmed it's not an array
            setRawTextResult(responseText); // Treat as textual summary
        }
         else if (!isLikelyJsonError) {
             // The parser returned a specific error message from Gemini
             setRawTextResult(parsedData);
        }
         else {
            // Fallback: if it's not a JSON parse error from our function, treat it as a text summary
            setRawTextResult(responseText);
        }

      } else if (Array.isArray(parsedData)) {
        setResults(parsedData);
        if(parsedData.length === 0) {
            setRawTextResult("AI found no specific data points matching your query in the structured format, but here's the raw response: \n" + responseText);
        }
      }

    } catch (err) {
      console.error("Gemini API Search error:", err);
      setError(err instanceof Error ? err.message : t('adminAiReports_error_networkOrServer'));
      setRawTextResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen">
      <PageTitle title={t('adminAiReports_vectorSearchTitle')} subtitle={t('adminAiReports_vectorSearchSubTitle')} />
      <Card className="bg-slate-800">
        <div className="space-y-4">
          <p className="text-slate-300">
            {t('adminAiReports_vectorSearchDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('adminAiReports_searchPlaceholder')}
              className="flex-grow" 
              inputClassName="sm:text-sm" 
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              onClick={handleSearch} 
              disabled={loading || !ai}
              isLoading={loading}
              className="sm:w-auto w-full" 
            >
              {loading ? t('searching') : t('search')}
            </Button>
          </div>
          {!ai && <p className="text-xs text-amber-400 mt-1">{t('customerNewDemand_error_aiUnavailable')}</p>}
        </div>
      </Card>

      {loading && !error && ( 
        <div className="flex justify-center mt-6">
          <LoadingSpinner text={t('adminAiReports_loadingResults')} />
        </div>
      )}

      {error && (
        <Card className="mt-6 bg-red-800/30 border border-red-700">
          <p className="text-red-400 font-semibold">{t('error_occured')}</p>
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {results.length > 0 && !loading && !error && (
        <Card className="mt-6 bg-slate-800">
          <h3 className="text-lg font-semibold mb-4 text-cyan-300">{t('adminAiReports_resultsTitle')} (AI Structured Output)</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="p-3 font-semibold text-slate-300">{t('date')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('adminAiReports_stumpagePriceHeader')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('adminAiReports_nofuHeader')}</th>
                  <th className="p-3 font-semibold text-slate-300">{t('relevance_score')}</th>
                  <th className="p-3 font-semibold text-slate-300">Info</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-3 text-slate-200">{item.date}</td>
                    <td className="p-3 text-slate-200">{item.stumpage_price}</td>
                    <td className="p-3 text-slate-200">{item.nofu}</td>
                    <td className="p-3 font-mono text-cyan-400">{item.score.toFixed(4)}</td>
                    <td className="p-3 text-slate-300 text-xs">{item.source_info || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {rawTextResult && !loading && !error && results.length === 0 && (
         <Card className="mt-6 bg-slate-800">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">AI Textual Response / Note</h3>
            <pre className="text-sm text-slate-200 whitespace-pre-wrap p-3 bg-slate-700/50 rounded max-h-96 overflow-y-auto custom-scrollbar">
              {rawTextResult}
            </pre>
         </Card>
      )}

      {results.length === 0 && !rawTextResult && !loading && !error && query && (
         <Card className="mt-6">
            <p className="text-slate-400 text-center py-4">No relevant information found or AI could not provide a structured response for your query.</p>
         </Card>
      )}
    </div>
  );
};

export default AdminAiReportsPage;
