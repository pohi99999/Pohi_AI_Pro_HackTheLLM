

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  textareaClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, className = '', labelClassName = '', textareaClassName = '', ...props }) => {
  const baseTextareaClasses = "block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-100";
  
  // props.name is destructured into ...props
  const effectiveId = id || props.name;

  // Add warning for missing id/name when label is present
  // Use Vite's import.meta.env.DEV for development mode check - REMOVED TO FIX TS ERROR
  // if (label && !effectiveId && import.meta.env.DEV) {
  //   console.warn(`Textarea component with label "${label}" is missing an 'id' or 'name' prop. This may cause accessibility issues if the label is not otherwise associated.`);
  // }

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={effectiveId} className={`block text-sm font-medium text-slate-300 mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <textarea
        id={effectiveId}
        rows={props.rows || 3}
        className={`${baseTextareaClasses} ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${textareaClassName}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Textarea;