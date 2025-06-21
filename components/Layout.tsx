
import React, { useState, useEffect, Fragment } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../App';
import { UserRole, MenuItem, TranslationKey } from '../types';
import { MENU_ITEMS_CONFIG } from '../constants';
import {
  Bars3Icon, XMarkIcon, UserCircleIcon, ArrowLeftOnRectangleIcon,
  ChartBarIcon, UsersIcon, CircleStackIcon, ArrowsRightLeftIcon, TruckIcon,
  BanknotesIcon, EnvelopeIcon, DocumentChartBarIcon, ShoppingCartIcon, CubeIcon, DocumentTextIcon, ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';
import { useLocale } from '../LocaleContext';
import { getTranslatedUserRole } from '../locales';
import PohiSvgLogo from './PohiSvgLogo';
import Button from './Button';

const iconMap: Record<string, React.ReactNode> = {
  'menu_admin_dashboard': <ChartBarIcon className="h-6 w-6" />,
  'menu_admin_users': <UsersIcon className="h-6 w-6" />,
  'menu_admin_stock': <CircleStackIcon className="h-6 w-6" />,
  'menu_admin_matchmaking': <ArrowsRightLeftIcon className="h-6 w-6" />,
  'menu_admin_truck_planning': <TruckIcon className="h-6 w-6" />,
  'menu_admin_billing': <BanknotesIcon className="h-6 w-6" />,
  'menu_admin_shipping_templates': <EnvelopeIcon className="h-6 w-6" />,
  'menu_admin_ai_reports': <DocumentChartBarIcon className="h-6 w-6" />,
  'menu_customer_new_demand': <ShoppingCartIcon className="h-6 w-6" />,
  'menu_customer_acacia_pole_order': <ShoppingCartIcon className="h-6 w-6" />,
  'menu_customer_my_demands': <DocumentTextIcon className="h-6 w-6" />,
  'menu_manufacturer_new_stock': <CubeIcon className="h-6 w-6" />,
  'menu_manufacturer_my_stock': <DocumentTextIcon className="h-6 w-6" />,
};

const PohiLogoWithName: React.FC<{ isSidebarCollapsed: boolean }> = ({ isSidebarCollapsed }) => (
  <div className={`flex items-center h-16 justify-center transition-all duration-300 ease-in-out overflow-hidden ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
    <PohiSvgLogo className="h-10 w-10 flex-shrink-0" />
    <span className={`ml-3 text-xl font-bold whitespace-nowrap transition-opacity duration-200 ease-in-out ${isSidebarCollapsed ? 'opacity-0 scale-0 w-0' : 'opacity-100 scale-100 w-auto delay-100'}`}>
      <span className="text-cyan-400">P</span>
      <span className="text-white">ohi AI </span>
      <span className="text-cyan-400">Pro</span>
    </span>
  </div>
);


export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole, logout } = useAppContext();
  const { locale, setLocale, t } = useLocale();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (mobile) {
        setIsMobileSidebarOpen(false); 
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userRole) {
      const currentMenuItems = MENU_ITEMS_CONFIG[userRole].map(item => ({
        ...item,
        label: t(item.labelKey as TranslationKey),
        icon: item.icon || iconMap[item.labelKey as string] || <UsersIcon className="h-6 w-6" />
      }));
      setMenu(currentMenuItems);
    }
  }, [userRole, t, locale]);

  useEffect(() => { 
    if (isMobileView && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isMobileView]);


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const translatedUserRoleString = userRole ? getTranslatedUserRole(userRole, t) : '';

  const sidebarContent = (isCollapsed: boolean) => (
    <>
      <div className={`border-b border-slate-700 ${isMobileView ? 'flex items-center justify-between' : ''}`}>
        <PohiLogoWithName isSidebarCollapsed={isCollapsed && !isMobileView} />
        {isMobileView && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-white mr-2"
            aria-label={t('cancel')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex-grow overflow-y-auto custom-scrollbar py-4 space-y-1.5">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center py-2.5 rounded-md mx-2 group hover-glow
               ${isCollapsed && !isMobileView ? 'px-0 justify-center w-16 h-16' : 'px-4'}
               ${isActive
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
               }`
            }
            title={isCollapsed && !isMobileView ? item.label : undefined}
            onClick={() => isMobileView && setIsMobileSidebarOpen(false)}
          >
            {({ isActive }) => (
              <>
                {item.icon && (
                  <span className={`
                    ${isCollapsed && !isMobileView ? 'h-6 w-6' : 'mr-3 h-6 w-6'} 
                    ${isActive ? 'text-white' : 'text-cyan-400 group-hover:text-cyan-300'}
                  `}>{item.icon}</span>
                )}
                <span className={`${isCollapsed && !isMobileView ? 'sr-only' : 'opacity-100'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`px-3 py-4 border-t border-slate-700 space-y-3 ${isCollapsed && !isMobileView ? 'flex flex-col items-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed && !isMobileView ? 'flex-col space-y-2 w-full' : 'justify-between'}`}>
          <div className={`flex items-center ${isCollapsed && !isMobileView ? 'flex-col space-y-1' : ''}`}>
            <Button
              onClick={() => setLocale('hu')}
              variant="ghost"
              size="sm"
              className={`!p-1.5 ${locale === 'hu' ? 'text-cyan-400 font-semibold !bg-cyan-500/10' : 'text-slate-300 hover:text-white'}`}
              aria-pressed={locale === 'hu'}
              title={isCollapsed && !isMobileView ? "Magyar" : undefined}
            >
              HU
            </Button>
            { !(isCollapsed && !isMobileView) && <span className="text-slate-500 mx-0.5">|</span>}
            <Button
              onClick={() => setLocale('en')}
              variant="ghost"
              size="sm"
              className={`!p-1.5 ${locale === 'en' ? 'text-cyan-400 font-semibold !bg-cyan-500/10' : 'text-slate-300 hover:text-white'}`}
              aria-pressed={locale === 'en'}
              title={isCollapsed && !isMobileView ? "English" : undefined}
            >
              EN
            </Button>
             { !(isCollapsed && !isMobileView) && <span className="text-slate-500 mx-0.5">|</span>}
            <Button
              onClick={() => setLocale('de')}
              variant="ghost"
              size="sm"
              className={`!p-1.5 ${locale === 'de' ? 'text-cyan-400 font-semibold !bg-cyan-500/10' : 'text-slate-300 hover:text-white'}`}
              aria-pressed={locale === 'de'}
              title={isCollapsed && !isMobileView ? "Deutsch" : undefined}
            >
              DE
            </Button>
          </div>
          {!isMobileView && (
            <Button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              variant="ghost"
              size="sm"
              className="!p-2 text-slate-400 hover:text-white"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
            </Button>
          )}
        </div>

        <div className={`flex items-center p-2 rounded-md ${isCollapsed && !isMobileView ? 'flex-col space-y-1 items-center w-full py-2' : 'space-x-3 bg-slate-700/50'}`}>
          <UserCircleIcon className={`h-8 w-8 flex-shrink-0 ${isCollapsed && !isMobileView ? 'h-7 w-7' : ''} text-cyan-400`} />
          <div className={`${isCollapsed && !isMobileView ? 'text-center' : ''}`}>
            <span className={`block text-sm font-medium text-white ${isCollapsed && !isMobileView ? 'sr-only' : ''}`}>Pohi User</span>
            <span className={`block text-xs text-slate-400 ${isCollapsed && !isMobileView ? 'text-[10px]' : ''}`}>{translatedUserRoleString}</span>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="secondary" 
          size="sm"
          className={`w-full ${isCollapsed && !isMobileView ? '!px-0 !py-2' : ''}`}
          leftIcon={<ArrowLeftOnRectangleIcon className={`h-5 w-5 ${isCollapsed && !isMobileView ? 'mx-auto' : ''}`} />}
          title={isCollapsed && !isMobileView ? t('logout') : undefined}
        >
          <span className={`${isCollapsed && !isMobileView ? 'sr-only' : 'inline'}`}>{t('logout')}</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      {isMobileView && (
        <>
          <aside
            className={`fixed inset-y-0 left-0 z-50 bg-slate-800 shadow-xl flex flex-col transition-transform duration-300 ease-in-out w-64
              ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            aria-label="Main Navigation Sidebar (Mobile)"
          >
            {sidebarContent(false)}
          </aside>
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </>
      )}

      {!isMobileView && (
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 bg-slate-800 shadow-xl flex flex-col transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'w-20' : 'w-64'}
          `}
          aria-label="Main Navigation Sidebar (Desktop)"
        >
          {sidebarContent(isSidebarCollapsed)}
        </aside>
      )}
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out 
                      ${!isMobileView && !isSidebarCollapsed ? 'ml-64' : (!isMobileView && isSidebarCollapsed ? 'ml-20' : 'ml-0')}
                   `}>
        <header className="bg-slate-800 shadow-md sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 lg:px-8">
          {isMobileView && (
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white"
              aria-controls="main-navigation-sidebar"
              aria-expanded={isMobileSidebarOpen}
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}
           <div className="flex-1 text-center md:text-left">
             {isMobileView && !isMobileSidebarOpen && (
                <div className="inline-block">
                     <PohiLogoWithName isSidebarCollapsed={true} />
                </div>
             )}
           </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
        </main>

        <footer className="bg-slate-800 border-t border-slate-700 py-3 px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-slate-400">{t('layout_footerPrototype')}</p>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
