
import React from 'react';
import { useLocale } from '../LocaleContext'; // Import useLocale

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[]; // Label is now the final translated string
  labelClassName?: string;
  selectClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', labelClassName = '', selectClassName = '', ...props }) => {
  const { t } = useLocale(); // Get t function
  const baseSelectClasses = "block w-full pl-3 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-100";
  
  // props.name is destructured into ...props
  const effectiveId = id || props.name;

  // Add warning for missing id/name when label is present
  // This line can cause issues in browser ESM setups without a build step defining 'process'.
  // Commenting it out as it's likely the source of a syntax error if 'process.env.NODE_ENV' is mishandled.
  /*
  if (label && !effectiveId && process.env.NODE_ENV === 'development') {
    console.warn(`Select component with label "${label}" is missing an 'id' or 'name' prop. This may cause accessibility issues if the label is not otherwise associated.`);
  }
  */
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={effectiveId} className={`block text-sm font-medium text-slate-300 mb-1 ${labelClassName}`}>
          {label}
        </label>
      )}
      <select
        id={effectiveId}
        className={`${baseSelectClasses} ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${selectClassName}`}
        {...props}
      >
        <option value="" disabled={props.value !== ""} className="text-slate-400">{t('select')}</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-slate-700 text-slate-100">
            {option.label} 
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Select;