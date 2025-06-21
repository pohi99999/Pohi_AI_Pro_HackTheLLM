

import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName='', bodyClassName='', actions }) => {
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

export default Card;