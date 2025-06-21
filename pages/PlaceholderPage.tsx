
import React from 'react';
import PageTitle from '../components/PageTitle';
import Card from '../components/Card';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useLocale } from '../LocaleContext';

interface PlaceholderPageProps {
  title: string; // Title will be passed already translated
  message: string; // Message will be passed already translated
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, message }) => {
  const { t } = useLocale();
  return (
    <>
      <PageTitle title={title} icon={<InformationCircleIcon className="h-8 w-8" />} />
      <Card>
        <div className="text-center py-12">
          <InformationCircleIcon className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
          <p className="text-slate-300 text-lg">{message}</p>
          <p className="text-slate-400 text-sm mt-2">{t('featureUnavailableMessage')}</p>
        </div>
      </Card>
    </>
  );
};

export default PlaceholderPage;