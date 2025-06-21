

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
  inputClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, error, className = '', labelClassName = '', inputClassName = '', ...props }) => {
  const baseInputClasses = "block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-100";
  
  // props.name is destructured into ...props
  const effectiveId = id || props.name;

  // Add warning for missing id/name when label is present
  // Use Vite's import.meta.env.DEV for development mode check - REMOVED TO FIX TS ERROR
  // if (label && !effectiveId && import.meta.env.DEV) { 
  //   console.warn(`Input component with label "${label}" is missing an 'id' or 'name' prop. This may cause accessibility issues if the label is not otherwise associated.`);
  // }

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

export default Input;