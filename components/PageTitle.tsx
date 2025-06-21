

import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, icon }) => {
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

export default PageTitle;