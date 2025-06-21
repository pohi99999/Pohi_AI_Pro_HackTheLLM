

import React from 'react';
import Button from './Button';
import { SparklesIcon } from '@heroicons/react/20/solid';

interface AiFeatureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  isLoading?: boolean;
  text: string;
  leftIcon?: React.ReactNode; // Added prop to accept custom left icons
}

const AiFeatureButton: React.FC<AiFeatureButtonProps> = ({
  onClick,
  isLoading,
  text,
  leftIcon: customLeftIcon, // Use the passed leftIcon
  className, // Destructure className passed to AiFeatureButton
  ...props // other props including 'disabled'
}) => {
  return (
    <Button
      onClick={onClick}
      isLoading={isLoading}
      variant="ghost"
      // Combine the default AiFeatureButton classes with any className passed as a prop
      className={`text-cyan-400 border border-cyan-600 hover:bg-cyan-500/20 w-full justify-start text-left ${className || ''}`.trim()}
      // Use the customLeftIcon if provided, otherwise default to SparklesIcon
      leftIcon={customLeftIcon !== undefined ? customLeftIcon : <SparklesIcon className="h-5 w-5 text-yellow-400" />}
      {...props} // Pass down other ButtonHTMLAttributes, like 'disabled'
    >
      {text}
    </Button>
  );
};

export default AiFeatureButton;