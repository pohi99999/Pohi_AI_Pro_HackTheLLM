
// pages/admin/AdminUsersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GenerateContentResponse } from "@google/genai";
import { BeakerIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon, UsersIcon as UsersIconOutline, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { ai } from '../../lib/gemini';
import { calculateVolume } from '../../lib/utils';

import { useLocale } from '../../LocaleContext';
import { getTranslatedUserRole, DIAMETER_TYPE_OPTIONS } from '../../locales';
import type { TranslationKey } from '../../locales'; // Import TranslationKey type
import { 
  UserRole, 
  MockCompany, 
  DemandStatus, 
  StockStatus, 
  ProductFeatures, 
  DemandItem, 
  StockItem, 
  GeneratedDataReport 
} from '../../types';
import PageTitle from '../../components/PageTitle';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import AiFeatureButton from '../../components/AiFeatureButton';
import Select from '../../components/Select';
import { 
  CUSTOMER_DEMANDS_STORAGE_KEY, 
  MANUFACTURER_STOCK_STORAGE_KEY, 
  MOCK_COMPANIES_STORAGE_KEY 
} from '../../constants';


// --- FŐ KOMPONENS ---
interface AdminUsersState {
  mockCompanies: MockCompany[];
  newCompanyName: string;
  newCompanyRole: UserRole.CUSTOMER | UserRole.MANUFACTURER | ''; 
  newCompanyStreet: string;
  newCompanyCity: string;
  newCompanyZipCode: string;
  newCompanyCountry: string;
  
  showCompanyActionForm: 'demand' | 'stock' | null;
  selectedCompanyForAction: MockCompany | null;
  companyActionFormData: Partial<ProductFeatures & { price?: string; sustainabilityInfo?: string; productName?: string }>; // Added productName
  companyActionFormLoading: boolean;

  dataGenerationLoading: boolean;
  generatedDataReport: GeneratedDataReport | null;

  // AI Communication Assistant
  recipientType: string;
  communicationScenario: string;
  generatedDraft: string;
  isDraftLoading: boolean;

  // AI Content Policy Checker
  textToCheck: string;
  policyCheckResult: string;
  isPolicyCheckLoading: boolean;
}

const initialCompanyActionFormData: Partial<ProductFeatures & { price?: string; sustainabilityInfo?: string; productName?: string }> = {
  productName: '', // Added productName
  diameterType: DIAMETER_TYPE_OPTIONS.find(opt => opt.value === 'mid')?.value || DIAMETER_TYPE_OPTIONS[0].value, 
  diameterFrom: '',
  diameterTo: '',
  length: '',
  quantity: '',
  notes: '',
  price: '',
  sustainabilityInfo: '',
};


export const AdminUsersPage: React.FC = () => {
  const { t, locale } = useLocale(); 
  const [state, setState] = useState<AdminUsersState>({
    mockCompanies: [],
    newCompanyName: '',
    newCompanyRole: '',
    newCompanyStreet: '',
    newCompanyCity: '',
    newCompanyZipCode: '',
    newCompanyCountry: '',
    showCompanyActionForm: null,
    selectedCompanyForAction: null,
    companyActionFormData: { ...initialCompanyActionFormData },
    companyActionFormLoading: false,
    dataGenerationLoading: false,
    generatedDataReport: null,
    recipientType: 'customer',
    communicationScenario: '',
    generatedDraft: '',
    isDraftLoading: false,
    textToCheck: '',
    policyCheckResult: '',
    isPolicyCheckLoading: false,
  });

 useEffect(() => {
    try {
      const storedCompanies = localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY);
      if (storedCompanies) {
        setState(prev => ({ ...prev, mockCompanies: JSON.parse(storedCompanies) }));
      }
    } catch (e) {
      console.error("Failed to load mock companies from localStorage", e);
    }
  }, []);

  const saveMockCompanies = (companies: MockCompany[]) => {
    localStorage.setItem(MOCK_COMPANIES_STORAGE_KEY, JSON.stringify(companies));
    setState(prev => ({...prev, mockCompanies: companies}));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyActionFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, companyActionFormData: { ...prev.companyActionFormData, [name]: value } }));
  };
  
  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.newCompanyName || !state.newCompanyRole) {
      alert(t('adminUsers_error_formIncomplete'));
      return;
    }
    if (state.mockCompanies.find(c => c.companyName.toLowerCase() === state.newCompanyName.toLowerCase())) {
        alert(t('adminUsers_error_companyNameExists'));
        return;
    }

    const newCompany: MockCompany = {
      id: `comp-${Date.now()}`,
      companyName: state.newCompanyName,
      role: state.newCompanyRole as UserRole.CUSTOMER | UserRole.MANUFACTURER, 
      address: {
        street: state.newCompanyStreet,
        city: state.newCompanyCity,
        zipCode: state.newCompanyZipCode,
        country: state.newCompanyCountry,
      }
    };
    const updatedCompanies = [...state.mockCompanies, newCompany];
    setState(prev => ({ 
        ...prev, 
        mockCompanies: updatedCompanies, 
        newCompanyName: '', 
        newCompanyRole: '',
        newCompanyStreet: '',
        newCompanyCity: '',
        newCompanyZipCode: '',
        newCompanyCountry: '',
    }));
    saveMockCompanies(updatedCompanies);
    alert(t('adminUsers_companyAddedSuccess', { companyName: newCompany.companyName }));
  };

  const openCompanyActionForm = (company: MockCompany, type: 'demand' | 'stock') => {
    setState(prev => ({
      ...prev,
      showCompanyActionForm: type,
      selectedCompanyForAction: company,
      companyActionFormData: { ...initialCompanyActionFormData, productName: t('productType_acaciaDebarkedSandedPost' as TranslationKey) },
    }));
  };

  const handleCompanyActionFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.selectedCompanyForAction || !state.showCompanyActionForm) return;

    const { productName, diameterType, diameterFrom, diameterTo, length, quantity } = state.companyActionFormData;
    if (!productName || !diameterType || !diameterFrom || !diameterTo || !length || !quantity) {
      alert(t('adminUsers_error_formIncomplete'));
      return;
    }
    
    setState(prev => ({...prev, companyActionFormLoading: true}));

    const calculatedCubicMeters = calculateVolume(parseFloat(diameterFrom), parseFloat(diameterTo), parseFloat(length), parseInt(quantity));

    if (state.showCompanyActionForm === 'demand') {
      const newDemand: DemandItem = {
        id: `DEM-ADM-${Date.now()}`,
        productName: productName!,
        diameterType: diameterType!,
        diameterFrom: diameterFrom!,
        diameterTo: diameterTo!,
        length: length!,
        quantity: quantity!,
        notes: state.companyActionFormData.notes || `${productName} ${t('adminUsers_demand_submitted_by_admin' as TranslationKey, { companyName: state.selectedCompanyForAction.companyName })}`,
        cubicMeters: calculatedCubicMeters,
        status: DemandStatus.RECEIVED,
        submissionDate: new Date().toISOString(),
        submittedByCompanyId: state.selectedCompanyForAction.id,
        submittedByCompanyName: state.selectedCompanyForAction.companyName,
      };
      try {
        const existingDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
        const existingDemands: DemandItem[] = existingDemandsRaw ? JSON.parse(existingDemandsRaw) : [];
        localStorage.setItem(CUSTOMER_DEMANDS_STORAGE_KEY, JSON.stringify([newDemand, ...existingDemands]));
        alert(t('customerNewDemand_demandSubmittedSuccess', { id: newDemand.id }));
      } catch (err) { console.error("Error saving admin-submitted demand", err); alert(t('error'));}

    } else if (state.showCompanyActionForm === 'stock') {
      const newStock: StockItem = {
        id: `STK-ADM-${Date.now()}`,
        productName: productName!,
        diameterType: diameterType!,
        diameterFrom: diameterFrom!,
        diameterTo: diameterTo!,
        length: length!,
        quantity: quantity!,
        notes: state.companyActionFormData.notes || `${productName} ${t('adminUsers_stock_uploaded_by_admin' as TranslationKey, { companyName: state.selectedCompanyForAction.companyName })}`,
        price: state.companyActionFormData.price,
        sustainabilityInfo: state.companyActionFormData.sustainabilityInfo,
        cubicMeters: calculatedCubicMeters,
        status: StockStatus.AVAILABLE,
        uploadDate: new Date().toISOString(),
        uploadedByCompanyId: state.selectedCompanyForAction.id,
        uploadedByCompanyName: state.selectedCompanyForAction.companyName,
      };
      try {
        const existingStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
        const existingStock: StockItem[] = existingStockRaw ? JSON.parse(existingStockRaw) : [];
        localStorage.setItem(MANUFACTURER_STOCK_STORAGE_KEY, JSON.stringify([newStock, ...existingStock]));
        alert(t('manufacturerNewStock_stockUploadedSuccess', { id: newStock.id || 'N/A' }));
      } catch (err) { console.error("Error saving admin-submitted stock", err); alert(t('error'));}
    }
    
    setState(prev => ({
        ...prev, 
        showCompanyActionForm: null, 
        selectedCompanyForAction: null, 
        companyActionFormData: {...initialCompanyActionFormData},
        companyActionFormLoading: false,
    }));
  };

const handleGenerateSimulatedData = () => {
    setState(prev => ({ ...prev, dataGenerationLoading: true, generatedDataReport: null }));

    let currentMockCompanies: MockCompany[] = JSON.parse(localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY) || '[]');
    const productName = t('productType_acaciaDebarkedSandedPost' as TranslationKey); 
    const existingCompanyNames = new Set(currentMockCompanies.map(c => c.companyName.toLowerCase()));

    const scenarioCompanies = [
        { nameKey: "scenario_customer_A_name", role: UserRole.CUSTOMER },
        { nameKey: "scenario_customer_B_name", role: UserRole.CUSTOMER },
        { nameKey: "scenario_manufacturer_X_name", role: UserRole.MANUFACTURER },
        { nameKey: "scenario_manufacturer_Y_name", role: UserRole.MANUFACTURER },
        { nameKey: "scenario_manufacturer_Z_name", role: UserRole.MANUFACTURER },
    ];
    
    const sampleCitiesHu = [t('city_sample_2' as TranslationKey), t('city_sample_3' as TranslationKey), t('city_sample_4' as TranslationKey), t('city_sample_5' as TranslationKey), t('city_sample_6' as TranslationKey)];
    const sampleCitiesRo = [t('city_sample_1' as TranslationKey)];
    const sampleCountries = [t('country_sample_hu' as TranslationKey), t('country_sample_ro' as TranslationKey)]; 
    let scenarioCompanyObjects: Record<string, MockCompany> = {};
    let newCompaniesCount = 0;

    scenarioCompanies.forEach((sc, index) => {
        const companyName = t(sc.nameKey as TranslationKey);
        let company = currentMockCompanies.find(c => c.companyName === companyName);
        if (!company) {
            const country = sampleCountries[index % sampleCountries.length];
            const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
            company = {
                id: `comp-scen-${sc.role.slice(0,3).toLowerCase()}-${Date.now()}-${index}`,
                companyName: companyName,
                role: sc.role as UserRole.CUSTOMER | UserRole.MANUFACTURER,
                address: {
                    street: `${index + 1} Scenario St.`,
                    city: cityPool[index % cityPool.length],
                    zipCode: `${3000 + index * 10}`,
                    country: country,
                }
            };
            currentMockCompanies.push(company);
            existingCompanyNames.add(companyName.toLowerCase());
            newCompaniesCount++;
        }
        scenarioCompanyObjects[sc.nameKey] = company;
    });

    const scenarioDemands: DemandItem[] = [
        { 
            id: `DEM-SCEN-A-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '14', diameterTo: '18', length: '3', quantity: '166',
            cubicMeters: calculateVolume(14, 18, 3, 166), notes: t('scenario_demand_note_A' as TranslationKey), status: DemandStatus.RECEIVED,
            submissionDate: new Date().toISOString(), submittedByCompanyId: scenarioCompanyObjects["scenario_customer_A_name"].id,
            submittedByCompanyName: scenarioCompanyObjects["scenario_customer_A_name"].companyName
        },
        { 
            id: `DEM-SCEN-B-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '290',
            cubicMeters: calculateVolume(12, 16, 2.5, 290), notes: t('scenario_demand_note_B' as TranslationKey), status: DemandStatus.RECEIVED,
            submissionDate: new Date().toISOString(), submittedByCompanyId: scenarioCompanyObjects["scenario_customer_B_name"].id,
            submittedByCompanyName: scenarioCompanyObjects["scenario_customer_B_name"].companyName
        }
    ];

    const scenarioStockItems: StockItem[] = [
        { 
            id: `STK-SCEN-X-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '14', diameterTo: '18', length: '3', quantity: '133',
            price: '22 EUR/db', cubicMeters: calculateVolume(14, 18, 3, 133), notes: t('scenario_stock_note_X' as TranslationKey),
            sustainabilityInfo: "PEFC", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_X_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_X_name"].companyName
        },
        { 
            id: `STK-SCEN-Y-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '145',
            price: '19 EUR/db', cubicMeters: calculateVolume(12, 16, 2.5, 145), notes: t('scenario_stock_note_Y' as TranslationKey),
            sustainabilityInfo: "FSC Mix", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_Y_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_Y_name"].companyName
        },
        { 
            id: `STK-SCEN-Z-${Date.now()}`, productName: productName, diameterType: 'mid', diameterFrom: '12', diameterTo: '16', length: '2.5', quantity: '186',
            price: '20 EUR/db', cubicMeters: calculateVolume(12, 16, 2.5, 186), notes: t('scenario_stock_note_Z' as TranslationKey),
            sustainabilityInfo: "Lokális kitermelés", status: StockStatus.AVAILABLE, uploadDate: new Date().toISOString(),
            uploadedByCompanyId: scenarioCompanyObjects["scenario_manufacturer_Z_name"].id,
            uploadedByCompanyName: scenarioCompanyObjects["scenario_manufacturer_Z_name"].companyName
        }
    ];
    
    let generatedDemands = [...scenarioDemands];
    let generatedStockItems = [...scenarioStockItems];
    let customers = currentMockCompanies.filter(c => c.role === UserRole.CUSTOMER);
    let manufacturers = currentMockCompanies.filter(c => c.role === UserRole.MANUFACTURER);
    const targetCompanyCount = 10;

    for (let i = customers.length; i < targetCompanyCount; i++) {
        const country = sampleCountries[i % sampleCountries.length];
        const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
        const companyName = `${t('adminUsers_generatedMockCompanyPrefix' as TranslationKey)} ${t('userRole_CUSTOMER' as TranslationKey)} ${i + 1 + scenarioCompanies.filter(sc => sc.role === UserRole.CUSTOMER).length}`;
        if (existingCompanyNames.has(companyName.toLowerCase())) continue;
        const newCustomer: MockCompany = { 
            id: `comp-cust-rand-${Date.now()}-${i}`, companyName, role: UserRole.CUSTOMER,
            address: { street: `${i+1} Random St.`, city: cityPool[i % cityPool.length], zipCode: `${4000 + i * 10}`, country }
        };
        currentMockCompanies.push(newCustomer); customers.push(newCustomer); existingCompanyNames.add(companyName.toLowerCase()); newCompaniesCount++;
    }
    for (let i = manufacturers.length; i < targetCompanyCount; i++) {
        const country = sampleCountries[(i+1) % sampleCountries.length];
        const cityPool = country === t('country_sample_ro' as TranslationKey) ? sampleCitiesRo : sampleCitiesHu;
        const companyName = `${t('adminUsers_generatedMockCompanyPrefix' as TranslationKey)} ${t('userRole_MANUFACTURER' as TranslationKey)} ${i + 1 + scenarioCompanies.filter(sc => sc.role === UserRole.MANUFACTURER).length}`;
        if (existingCompanyNames.has(companyName.toLowerCase())) continue;
        const newMan: MockCompany = { 
            id: `comp-man-rand-${Date.now()}-${i}`, companyName, role: UserRole.MANUFACTURER,
            address: { street: `${100+i} Random Rd.`, city: cityPool[i % cityPool.length], zipCode: `${5000 + i * 10}`, country }
        };
        currentMockCompanies.push(newMan); manufacturers.push(newMan); existingCompanyNames.add(companyName.toLowerCase()); newCompaniesCount++;
    }
    
    saveMockCompanies(currentMockCompanies);

    customers.forEach(customer => {
        if (scenarioDemands.some(sd => sd.submittedByCompanyId === customer.id)) return;
        const numDemands = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numDemands; i++) {
            const dFrom = Math.floor(Math.random() * 8) + 8; const dTo = dFrom + Math.floor(Math.random() * 6) + 2;
            const len = (Math.random() * 3 + 2.5).toFixed(1); const qty = Math.floor(Math.random() * 91) + 10;
            generatedDemands.push({
                id: `DEM-RAND-${customer.id.slice(-4)}-${Date.now() + i}`, productName: productName, diameterType: 'mid',
                diameterFrom: String(dFrom), diameterTo: String(dTo), length: String(len), quantity: String(qty),
                cubicMeters: calculateVolume(dFrom, dTo, parseFloat(len), qty), status: DemandStatus.RECEIVED,
                submissionDate: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString(),
                submittedByCompanyId: customer.id, submittedByCompanyName: customer.companyName,
                notes: `${t('adminUsers_simulatedDemandNotePrefix' as TranslationKey)} ${productName}`
            });
        }
    });

    manufacturers.forEach(manufacturer => {
        if (scenarioStockItems.some(ss => ss.uploadedByCompanyId === manufacturer.id)) return;
        const numStock = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numStock; i++) {
            const dFrom = Math.floor(Math.random() * 10) + 10; const dTo = dFrom + Math.floor(Math.random() * 7) + 3;
            const len = (Math.random() * 3.5 + 3).toFixed(1); const qty = Math.floor(Math.random() * 131) + 20;
            generatedStockItems.push({
                id: `STK-RAND-${manufacturer.id.slice(-4)}-${Date.now() + i}`, productName: productName, diameterType: 'mid',
                diameterFrom: String(dFrom), diameterTo: String(dTo), length: String(len), quantity: String(qty),
                price: `${(Math.random() * 40 + 15).toFixed(0)} EUR/db`,
                cubicMeters: calculateVolume(dFrom, dTo, parseFloat(len), qty), status: StockStatus.AVAILABLE,
                uploadDate: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 14).toISOString(),
                uploadedByCompanyId: manufacturer.id, uploadedByCompanyName: manufacturer.companyName,
                notes: `${t('adminUsers_simulatedStockNotePrefix' as TranslationKey)} ${productName}, ${t('adminUsers_simulatedStockQuality' as TranslationKey)}`,
                sustainabilityInfo: `${t('adminUsers_simulatedSustainabilityInfoPrefix' as TranslationKey)} FSC 100% ${t('adminUsers_simulatedSustainabilityInfoSuffix' as TranslationKey)}`
            });
        }
    });

    try {
        const existingDemandsRaw = localStorage.getItem(CUSTOMER_DEMANDS_STORAGE_KEY);
        const existingDemands: DemandItem[] = existingDemandsRaw ? JSON.parse(existingDemandsRaw) : [];
        localStorage.setItem(CUSTOMER_DEMANDS_STORAGE_KEY, JSON.stringify([...generatedDemands, ...existingDemands.filter(ed => !generatedDemands.find(gd => gd.id === ed.id))]));

        const existingStockRaw = localStorage.getItem(MANUFACTURER_STOCK_STORAGE_KEY);
        const existingStock: StockItem[] = existingStockRaw ? JSON.parse(existingStockRaw) : [];
        localStorage.setItem(MANUFACTURER_STOCK_STORAGE_KEY, JSON.stringify([...generatedStockItems, ...existingStock.filter(es => !generatedStockItems.find(gs => gs.id === es.id))]));
        
        const createdCustomers = currentMockCompanies.filter(c => c.role === UserRole.CUSTOMER).length - (JSON.parse(localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY) || '[]') as MockCompany[]).filter(mc => mc.role === UserRole.CUSTOMER).length + scenarioCompanies.filter(sc => sc.role === UserRole.CUSTOMER).length;
        const createdManufacturers = currentMockCompanies.filter(c => c.role === UserRole.MANUFACTURER).length - (JSON.parse(localStorage.getItem(MOCK_COMPANIES_STORAGE_KEY) || '[]') as MockCompany[]).filter(mc => mc.role === UserRole.MANUFACTURER).length + scenarioCompanies.filter(sc => sc.role === UserRole.MANUFACTURER).length;


        setState(prev => ({ 
            ...prev, 
            dataGenerationLoading: false, 
            generatedDataReport: {
                newCustomers: newCompaniesCount,
                newManufacturers: newCompaniesCount,
                newDemands: generatedDemands.length,
                newStockItems: generatedStockItems.length,
                productName: productName,
                scenarioInfo: t('adminUsers_dataGenerationReport_scenario_info' as TranslationKey)
            }
        }));
    } catch (error) {
        console.error("Error saving simulated data:", error);
        setState(prev => ({ ...prev, dataGenerationLoading: false, generatedDataReport: null }));
        alert(t('adminUsers_dataGenerationFailure'));
    }
  };

  const generateMessageDraftWithGemini = async (recipient: string, scenarioText: string): Promise<string> => {
    if (!ai) return t('adminUsers_error_messageDraftGeneric');
    const promptLang = locale === 'hu' ? 'Hungarian' : (locale === 'de' ? 'German' : 'English');
    
    let recipientTypeString = t('recipient_all_users'); 
    if(recipient === 'customer') recipientTypeString = t('recipient_customer');
    if(recipient === 'manufacturer') recipientTypeString = t('recipient_manufacturer');

    const prompt = `You are an AI assistant for "Pohi AI Pro", an online timber marketplace.
Generate a professional communication draft in ${promptLang}.
The message is intended for: ${recipientTypeString}.
The purpose/scenario of the communication is: "${scenarioText}".

The draft should be polite, concise, and relevant to a timber trading platform.
Include placeholders like [Specific Details] or [Partner Name] where appropriate.
The response should only contain the email draft text. Do not include any extra explanation or markdown formatting.
Sign off as "The Pohi AI Pro Team".`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      return response.text || t('adminUsers_error_messageDraftGeneric');
    } catch (error) {
      console.error("Error generating message draft with Gemini:", error);
      return t('adminUsers_error_messageDraftGeneric');
    }
  };

  const handleGenerateMessageDraft = async () => {
    if (!state.communicationScenario) {
      alert(t("adminUsers_error_enterScenario"));
      return;
    }
    setState(prev => ({ ...prev, isDraftLoading: true, generatedDraft: '' }));
    
    const draft = await generateMessageDraftWithGemini(state.recipientType, state.communicationScenario);
    
    setState(prev => ({ ...prev, generatedDraft: draft, isDraftLoading: false }));
  };
  
  const handleContentPolicyCheck = async () => {
    if (!state.textToCheck) {
      alert(t("adminUsers_error_enterTextToCheck"));
      return;
    }
    if (!ai) {
      setState(prev => ({ ...prev, policyCheckResult: t('customerNewDemand_error_aiUnavailable')}));
      return;
    }
    setState(prev => ({ ...prev, isPolicyCheckLoading: true, policyCheckResult: '' }));
    
    const promptLang = locale === 'hu' ? 'Hungarian' : (locale === 'de' ? 'German' : 'English');
    const prompt = `Please review the following text for an online timber marketplace. Check if it's appropriate, professional, and doesn't violate general content policies (e.g., no offensive language, no misleading claims). 
Provide your feedback in ${promptLang}. 
If it's okay, say "${t('adminUsers_contentPolicy_passed')}". 
If it needs review, say "${t('adminUsers_contentPolicy_reviewNeeded')}" followed by specific, actionable suggestions (1-2 brief points).
Text to check: "${state.textToCheck}"
The response should only contain the policy check result and suggestions if any.`;

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
      });
      setState(prev => ({ ...prev, policyCheckResult: response.text || t('adminUsers_error_contentCheckGeneric'), isPolicyCheckLoading: false }));
    } catch (error) {
      console.error("Error checking content policy with Gemini:", error);
      setState(prev => ({ ...prev, policyCheckResult: t('adminUsers_error_contentCheckGeneric'), isPolicyCheckLoading: false }));
    }
  };


  const companyRoleOptions = [
    { value: UserRole.CUSTOMER, label: t('adminUsers_user_customer') },
    { value: UserRole.MANUFACTURER, label: t('adminUsers_user_manufacturer') }
  ];
  // Use imported DIAMETER_TYPE_OPTIONS and map them
  const diameterTypeOptions = DIAMETER_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }));
  
  const recipientTypeOptions = [
    { value: 'customer', label: t('recipient_customer') },
    { value: 'manufacturer', label: t('recipient_manufacturer') },
    { value: 'all_users', label: t('recipient_all_users') }
  ];
  
  const currentFormTitle = state.showCompanyActionForm === 'demand' 
    ? t('adminUsers_newDemandFor', { companyName: state.selectedCompanyForAction?.companyName || '' })
    : state.showCompanyActionForm === 'stock'
    ? t('adminUsers_newStockFor', { companyName: state.selectedCompanyForAction?.companyName || '' })
    : '';


  return (
    <>
      <PageTitle title={t('adminUsers_title')} subtitle={t('adminUsers_subtitle')} icon={<UsersIconOutline className="h-8 w-8"/>}/>
      
      {state.showCompanyActionForm && state.selectedCompanyForAction && (
         <Card title={currentFormTitle} className="mb-6 bg-slate-700/50">
           <form onSubmit={handleCompanyActionFormSubmit} className="space-y-4">
            <Input label={t('customerNewDemand_productName')} name="productName" value={state.companyActionFormData.productName || ''} onChange={handleCompanyActionFormInputChange} required />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label={t('customerNewDemand_diameterType')} name="diameterType" options={diameterTypeOptions} value={state.companyActionFormData.diameterType || ''} onChange={handleCompanyActionFormInputChange} required />
                <div></div> {/* Placeholder for grid structure */}
                <Input label={t('customerNewDemand_diameterFrom')} name="diameterFrom" type="number" step="0.1" min="0" value={state.companyActionFormData.diameterFrom || ''} onChange={handleCompanyActionFormInputChange} required />
                <Input label={t('customerNewDemand_diameterTo')} name="diameterTo" type="number" step="0.1" min="0" value={state.companyActionFormData.diameterTo || ''} onChange={handleCompanyActionFormInputChange} required />
                <Input label={t('customerNewDemand_length')} name="length" type="number" step="0.1" min="0" value={state.companyActionFormData.length || ''} onChange={handleCompanyActionFormInputChange} required />
                <Input label={t('customerNewDemand_quantity')} name="quantity" type="number" min="1" value={state.companyActionFormData.quantity || ''} onChange={handleCompanyActionFormInputChange} required />
                {state.showCompanyActionForm === 'stock' && (
                  <Input label={t('manufacturerMyStock_price')} name="price" value={state.companyActionFormData.price || ''} onChange={handleCompanyActionFormInputChange} placeholder={t('adminUsers_form_stockPricePlaceholder')} />
                )}
             </div>
             <Textarea label={t('notes')} name="notes" value={state.companyActionFormData.notes || ''} onChange={handleCompanyActionFormInputChange} rows={3} placeholder={state.showCompanyActionForm === 'demand' ? t('adminUsers_form_demandNotePlaceholder') : t('adminUsers_form_stockNotePlaceholder')} />
             {state.showCompanyActionForm === 'stock' && (
                <Textarea label={t('manufacturerNewStock_sustainabilityInfo')} name="sustainabilityInfo" value={state.companyActionFormData.sustainabilityInfo || ''} onChange={handleCompanyActionFormInputChange} rows={3} placeholder={t('manufacturerNewStock_sustainabilityPlaceholder')}/>
             )}
             <div className="flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setState(prev => ({...prev, showCompanyActionForm: null, selectedCompanyForAction: null}))} disabled={state.companyActionFormLoading}>
                    {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isLoading={state.companyActionFormLoading}>
                    {t('submit')}
                </Button>
             </div>
           </form>
         </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title={t('adminUsers_manageCompanies')}>
            <form onSubmit={handleAddCompany} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-6 p-1 border-b border-slate-700 pb-4">
                <h3 className="text-md font-semibold text-cyan-300 mb-2 md:col-span-2">{t('adminUsers_addNewCompany')}</h3>
                <Input label={t('adminUsers_companyName')} name="newCompanyName" value={state.newCompanyName} onChange={handleInputChange} placeholder={t('adminUsers_form_companyNamePlaceholder')} required />
                <Select label={t('adminUsers_role')} name="newCompanyRole" options={companyRoleOptions} value={state.newCompanyRole} onChange={handleInputChange} required />
                <Input label={t('adminUsers_companyStreet')} name="newCompanyStreet" value={state.newCompanyStreet} onChange={handleInputChange} placeholder={t('adminUsers_form_companyStreetPlaceholder')} />
                <Input label={t('adminUsers_companyCity')} name="newCompanyCity" value={state.newCompanyCity} onChange={handleInputChange} placeholder={t('adminUsers_form_companyCityPlaceholder')} />
                <Input label={t('adminUsers_companyZipCode')} name="newCompanyZipCode" value={state.newCompanyZipCode} onChange={handleInputChange} placeholder={t('adminUsers_form_companyZipCodePlaceholder')} />
                <Input label={t('adminUsers_companyCountry')} name="newCompanyCountry" value={state.newCompanyCountry} onChange={handleInputChange} placeholder={t('adminUsers_form_companyCountryPlaceholder')} />
                <div className="md:col-span-2 flex justify-end mt-2">
                    <Button type="submit">{t('adminUsers_addCompanyButton')}</Button>
                </div>
            </form>

            <h3 className="text-md font-semibold text-cyan-300 mb-3">{t('adminUsers_registeredCompanies')} ({state.mockCompanies.length})</h3>
            {state.mockCompanies.length === 0 ? (
                <p className="text-slate-400">{t('adminUsers_noCompanies')}</p>
            ) : (
                <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <ul className="space-y-3">
                    {state.mockCompanies.map(company => (
                        <li key={company.id} className="p-3 bg-slate-700/70 rounded-md shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-slate-100 flex items-center">
                                        <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-cyan-400"/>
                                        {company.companyName}
                                    </p>
                                    <p className="text-xs text-slate-300">{getTranslatedUserRole(company.role, t)}</p>
                                    {company.address && (company.address.street || company.address.city) && 
                                        <p className="text-xs text-slate-400">
                                            {company.address.street && `${company.address.street}, `}
                                            {company.address.zipCode && `${company.address.zipCode} `}
                                            {company.address.city && `${company.address.city}, `}
                                            {company.address.country}
                                        </p>
                                    }
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 sm:mt-0">
                                    {company.role === UserRole.CUSTOMER && 
                                        <Button size="sm" variant="secondary" onClick={() => openCompanyActionForm(company, 'demand')} className="text-xs !py-1 !px-2">
                                            {t('adminUsers_submitDemandForCompany')}
                                        </Button>
                                    }
                                    {company.role === UserRole.MANUFACTURER &&
                                        <Button size="sm" variant="secondary" onClick={() => openCompanyActionForm(company, 'stock')} className="text-xs !py-1 !px-2">
                                            {t('adminUsers_uploadStockForCompany')}
                                        </Button>
                                    }
                                </div>
                            </div>
                        </li>
                    ))}
                    </ul>
                </div>
            )}
        </Card>
        
        <div className="space-y-6">
            <Card title={t('adminUsers_aiCommunicationAssistant')}>
                <Select
                    label={t('adminUsers_recipientTypeLabel')}
                    name="recipientType"
                    options={recipientTypeOptions}
                    value={state.recipientType}
                    onChange={handleInputChange}
                />
                <Input
                    label={t('adminUsers_scenarioLabel')}
                    name="communicationScenario"
                    value={state.communicationScenario}
                    onChange={handleInputChange}
                    placeholder={t('adminUsers_scenarioPlaceholder')}
                />
                <AiFeatureButton
                    text={t('adminUsers_generateMessageDraft')}
                    onClick={handleGenerateMessageDraft}
                    isLoading={state.isDraftLoading}
                    disabled={!state.communicationScenario.trim() || !ai}
                    leftIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
                />
                {state.isDraftLoading && <div className="mt-2"><div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-cyan-500 rounded-full mx-auto"></div><p className="text-sm text-slate-300 text-center">{t('adminUsers_generatingDraft')}</p></div>}
                {state.generatedDraft && !state.isDraftLoading && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-cyan-300 mb-1">{t('adminUsers_generatedDraft')}</h4>
                    <Textarea value={state.generatedDraft} readOnly rows={8} className="bg-slate-600/50"/>
                </div>
                )}
            </Card>

            <Card title={t('adminUsers_aiContentPolicyChecker')}>
                <Textarea
                    label={t('adminUsers_textToCheckLabel')}
                    name="textToCheck"
                    value={state.textToCheck}
                    onChange={handleInputChange}
                    placeholder={t('adminUsers_textToCheckPlaceholder')}
                    rows={4}
                />
                <AiFeatureButton
                    text={t('adminUsers_checkContent')}
                    onClick={handleContentPolicyCheck}
                    isLoading={state.isPolicyCheckLoading}
                    disabled={!state.textToCheck.trim() || !ai}
                    leftIcon={<ShieldCheckIcon className="h-5 w-5" />}
                />
                {state.isPolicyCheckLoading && <div className="mt-2"><div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-cyan-500 rounded-full mx-auto"></div><p className="text-sm text-slate-300 text-center">{t('adminUsers_checkingContent')}</p></div>}
                {state.policyCheckResult && !state.isPolicyCheckLoading && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-cyan-300 mb-1">{t('adminUsers_checkResult')}</h4>
                    <Textarea value={state.policyCheckResult} readOnly rows={4} className="bg-slate-600/50"/>
                </div>
                )}
            </Card>
        </div>
      </div>
      
      <Card title={t('adminUsers_generateSimulatedData')} className="mb-6">
        <p className="text-sm text-slate-300 mb-3">
            {t('adminUsers_generateSimulatedDataDescriptionSpecific' as TranslationKey, { productName: t('productType_acaciaDebarkedSandedPost' as TranslationKey) })}
        </p>
        <Button 
            onClick={handleGenerateSimulatedData} 
            isLoading={state.dataGenerationLoading}
            leftIcon={<BeakerIcon className="h-5 w-5" />}
        >
            {t('adminUsers_generateAcaciaDataButton' as TranslationKey, {productName: t('productType_acaciaDebarkedSandedPost' as TranslationKey)})}
        </Button>
        {state.dataGenerationLoading && <div className="mt-2"><div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-cyan-500 rounded-full mx-auto"></div><p className="text-sm text-slate-300 text-center">{t('adminUsers_dataGenerationInProgress')}</p></div>}
        {state.generatedDataReport && !state.dataGenerationLoading && (
            <div className="mt-4 p-3 bg-slate-700 rounded text-sm">
                <h4 className="font-semibold text-cyan-300 mb-1">{t('adminUsers_dataGenerationReport_title')}</h4>
                <p>{t('adminUsers_dataGenerationReport_product' as TranslationKey, {productName: state.generatedDataReport.productName})}</p>
                <p>{t('adminUsers_dataGenerationReport_companies' as TranslationKey, {customerCount: state.generatedDataReport.newCustomers, manufacturerCount: state.generatedDataReport.newManufacturers})}</p>
                <p>{t('adminUsers_dataGenerationReport_demands' as TranslationKey, {demandCount: state.generatedDataReport.newDemands})}</p>
                <p>{t('adminUsers_dataGenerationReport_stock' as TranslationKey, {stockCount: state.generatedDataReport.newStockItems})}</p>
                {state.generatedDataReport.scenarioInfo && <p className="text-xs text-amber-300 mt-1">{state.generatedDataReport.scenarioInfo}</p>}
                <p className="text-xs text-slate-400 mt-1">{t('adminUsers_dataGenerationReport_info')}</p>
            </div>
        )}
      </Card>
    </>
  );
};

export default AdminUsersPage;
