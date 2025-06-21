
import React, { useState } from 'react';
import { useAppContext } from '../App';
import { UserRole } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import { useLocale } from '../LocaleContext';
import { getTranslatedUserRole } from '../locales';
import PohiSvgLogo from '../components/PohiSvgLogo'; // Import the new SVG logo component

const LoginPage: React.FC = () => {
  const { setUserRole } = useAppContext();
  const { t } = useLocale(); // Use locale context
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleLogin = () => {
    if (selectedRole) {
      setUserRole(selectedRole);
    }
  };

  const roles: UserRole[] = [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.MANUFACTURER];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center video-bg-placeholder p-4">
       <div className="absolute top-8 left-8 text-3xl font-bold text-cyan-400">
         {t('login_pohiAi')} {/* This will now render "Pohi AI Pro" */}
      </div>
      <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-md">
        <div className="p-6 sm:p-8">
          <div className="mx-auto mb-8 h-24 w-24 rounded-full ring-4 ring-cyan-600 flex items-center justify-center overflow-hidden bg-slate-700">
            <PohiSvgLogo size={80} /> {/* Use PohiSvgLogo here, adjust size if needed */}
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-2">{t('login_welcome')}</h2>
          <p className="text-sm text-center text-slate-300 mb-8">{t('login_selectRole')}</p>
          
          <div className="space-y-4 mb-8">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full p-3 rounded-md text-left font-medium transition-all duration-200 ease-in-out hover-glow
                  ${selectedRole === role ? 'bg-cyan-600 text-white ring-2 ring-cyan-400' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}
                `}
              >
                {getTranslatedUserRole(role, t)}
              </button>
            ))}
          </div>

          <Button
            onClick={handleLogin}
            disabled={!selectedRole}
            className="w-full"
            size="lg"
          >
            {t('continue')}
          </Button>
        </div>
      </Card>
      <p className="text-xs text-slate-400 mt-8 text-center">{t('login_prototypeInfo')}</p>
    </div>
  );
};

export default LoginPage;