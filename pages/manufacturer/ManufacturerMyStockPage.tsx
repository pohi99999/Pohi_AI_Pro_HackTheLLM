
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { StockItem, StockStatus } from '../../types';
import { CubeTransparentIcon, InformationCircleIcon, CalendarDaysIcon, HashtagIcon, ArchiveBoxIcon, BeakerIcon, BanknotesIcon, ShieldCheckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { useLocale } from '../../LocaleContext';
import { getTranslatedStockStatus } from '../../locales';

const MANUFACTURER_STOCK_STORAGE_KEY = 'pohi-ai-manufacturer-stock';

const getStockStatusBadgeColor = (status?: StockStatus): string => {
  if (!status) return 'bg-slate-500 text-slate-50';
  switch (status) {
    case StockStatus.AVAILABLE:
      return 'bg-green-600 text-green-50';
    case StockStatus.RESERVED:
      return 'bg-yellow-500 text-yellow-50';
    case StockStatus.SOLD:
      return 'bg-red-600 text-red-50';
    default:
      return 'bg-slate-500 text-slate-50';
  }
};

const ManufacturerMyStockPage: React.FC = () => {
  const { t, locale } = useLocale();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
      if (storedStockRaw) {
        const parsedStock: StockItem[] = JSON.parse(storedStockRaw);
        // For Manufacturer's "My Stock", only show items they uploaded themselves (not by admin for another company)
        // This simple check assumes direct upload if `uploadedByCompanyId` is missing.
        // A more robust system would involve checking against the current logged-in user's company ID.
        // For this prototype, we'll assume items without `uploadedByCompanyId` are "theirs".
        const ownStock = parsedStock.filter(item => !item.uploadedByCompanyId);

        ownStock.sort((a, b) => {
            if (a.uploadDate && b.uploadDate) {
                return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
            }
            return 0;
        });
        setStockItems(ownStock);
      }
    } catch (error) {
      console.error("Error loading stock items:", error);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <>
        <PageTitle title={t('manufacturerMyStock_title')} subtitle={t('manufacturerMyStock_subtitle')} icon={<CubeTransparentIcon className="h-8 w-8" />} />
        <LoadingSpinner text={t('manufacturerMyStock_loadingStock')} />
      </>
    );
  }

  return (
    <>
      <PageTitle title={t('manufacturerMyStock_title')} subtitle={t('manufacturerMyStock_subtitle')} icon={<CubeTransparentIcon className="h-8 w-8" />} />
      
      {stockItems.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <InformationCircleIcon className="h-16 w-16 text-cyan-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">{t('manufacturerMyStock_noStock')}</p>
            <p className="text-slate-400 text-sm mt-2">{t('manufacturerMyStock_uploadNewStockPrompt')}</p>
            <Button variant="primary" size="md" className="mt-6">
              <NavLink to="/manufacturer/new-stock">{t('menu_manufacturer_new_stock')}</NavLink>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stockItems.map(item => (
            <Card key={item.id} className="flex flex-col justify-between hover-glow transition-shadow duration-300">
              <div>
                <div className="p-4 border-b border-slate-700">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-cyan-400 flex items-center">
                        <HashtagIcon className="h-5 w-5 mr-2 text-cyan-500" />
                        {t('manufacturerMyStock_stockId')}: {item.id?.substring(0, 10)}...
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStockStatusBadgeColor(item.status)}`}>
                            {getTranslatedStockStatus(item.status, t)}
                        </span>
                    </div>
                     {item.uploadDate && (
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                        <CalendarDaysIcon className="h-4 w-4 mr-1 text-slate-500" />
                        {t('manufacturerMyStock_uploaded')}: {new Date(item.uploadDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                     )}
                     {item.uploadedByCompanyName && ( // Display if uploaded by admin for a company
                        <p className="text-xs text-slate-400 flex items-center mt-1">
                            <BuildingStorefrontIcon className="h-4 w-4 mr-1 text-slate-500" />
                             {t('manufacturerMyStock_byCompany', { companyName: item.uploadedByCompanyName })}
                        </p>
                     )}
                  </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start text-sm text-slate-300">
                    <ArchiveBoxIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-slate-100">{t('customerMyDemands_features')}:</span> {item.diameterType}, Ø {item.diameterFrom}-{item.diameterTo}cm, {t('customerNewDemand_length').toLowerCase()}: {item.length}m, {item.quantity}pcs
                    </span>
                  </div>
                   <div className="flex items-center text-sm text-slate-300">
                    <BeakerIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0" />
                    <span>
                        <span className="font-medium text-slate-100">{t('customerMyDemands_cubicMeters')}:</span> {item.cubicMeters?.toFixed(3) || 'N/A'} m³
                    </span>
                  </div>
                  {item.price && (
                    <div className="flex items-center text-sm text-slate-300">
                        <BanknotesIcon className="h-5 w-5 mr-2 text-cyan-400 shrink-0" />
                        <span>
                            <span className="font-medium text-slate-100">{t('manufacturerMyStock_price')}:</span> {item.price}
                        </span>
                    </div>
                  )}
                   {item.sustainabilityInfo && (
                    <div className="flex items-start text-sm text-slate-300">
                        <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-400 shrink-0 mt-0.5" />
                        <span>
                            <span className="font-medium text-slate-100">{t('manufacturerMyStock_sustainability')}:</span> {item.sustainabilityInfo.length > 70 ? `${item.sustainabilityInfo.substring(0, 70)}...` : item.sustainabilityInfo}
                        </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="pt-2 mt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400">{t('notes')}:</p>
                      <p className="text-sm text-slate-300 break-words">{item.notes.length > 100 ? `${item.notes.substring(0, 100)}...` : item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* 
              <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end space-x-2">
                <Button size="sm" variant="secondary">{t('details')}</Button>
                <Button size="sm" variant="primary">{t('changeStatus')}</Button> // Example, key needed
              </div>
              */}
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default ManufacturerMyStockPage;
