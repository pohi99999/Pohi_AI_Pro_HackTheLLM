

import React from 'react';
import { UserRole, MenuItem, AlternativeProduct, ComparisonData, MarketNewsItem, FaqItem, DemandForecast, OptimizationTip, MatchmakingSuggestion, DisputeResolutionSuggestion, LoadingPlan, CostEstimation, FeedbackAnalysisData, UserActivitySummary, UserActivityDataPoint, ProductPerformanceData, SystemHealthStatusItem, DemandStatus, StockStatus, OrderStatusSummaryPoint, StockStatusSummaryPoint, KeyProductPriceTrend, MonthlyPlatformSummaryData, TranslationKey } from './types'; 
import { 
  DocumentChartBarIcon, BanknotesIcon, ChartBarIcon, UsersIcon, CircleStackIcon, 
  ArrowsRightLeftIcon, TruckIcon, EnvelopeIcon, ShoppingCartIcon, CubeIcon, DocumentTextIcon 
} from '@heroicons/react/24/outline';


export interface MenuConfigItem {
  labelKey: TranslationKey;
  path: string;
  icon?: React.ReactNode; // This icon is now primarily set in Layout.tsx's iconMap for consistency
}

export const MENU_ITEMS_CONFIG: Record<UserRole, MenuConfigItem[]> = {
  [UserRole.ADMIN]: [
    { labelKey: 'menu_admin_dashboard', path: '/admin/dashboard', icon: React.createElement(ChartBarIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_users', path: '/admin/users', icon: React.createElement(UsersIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_stock', path: '/admin/stock-management', icon: React.createElement(CircleStackIcon, { className: "h-5 w-5" }) }, 
    { labelKey: 'menu_admin_matchmaking', path: '/admin/matchmaking', icon: React.createElement(ArrowsRightLeftIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_truck_planning', path: '/admin/truck-planning', icon: React.createElement(TruckIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_billing', path: '/admin/billing', icon: React.createElement(BanknotesIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_shipping_templates', path: '/admin/shipping-templates', icon: React.createElement(EnvelopeIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_admin_ai_reports', path: '/admin/ai-reports', icon: React.createElement(DocumentChartBarIcon, { className: "h-5 w-5" }) },
  ],
  [UserRole.CUSTOMER]: [ 
    { labelKey: 'menu_customer_new_demand', path: '/customer/new-demand', icon: React.createElement(ShoppingCartIcon, { className: "h-5 w-5" }) }, 
    { labelKey: 'menu_customer_acacia_pole_order', path: '/customer/acacia-pole-order', icon: React.createElement(ShoppingCartIcon, { className: "h-5 w-5" }) }, 
    { labelKey: 'menu_customer_my_demands', path: '/customer/my-demands', icon: React.createElement(DocumentTextIcon, { className: "h-5 w-5" }) },
  ],
  [UserRole.MANUFACTURER]: [
    { labelKey: 'menu_manufacturer_new_stock', path: '/manufacturer/new-stock', icon: React.createElement(CubeIcon, { className: "h-5 w-5" }) },
    { labelKey: 'menu_manufacturer_my_stock', path: '/manufacturer/my-stock', icon: React.createElement(DocumentTextIcon, { className: "h-5 w-5" }) },
  ],
};


const MOCK_ORDER_COUNTS = {
  [DemandStatus.RECEIVED]: 25,
  [DemandStatus.PROCESSING]: 15,
  [DemandStatus.COMPLETED]: 50,
  [DemandStatus.CANCELLED]: 5,
};
const totalOrders = Object.values(MOCK_ORDER_COUNTS).reduce((sum, count) => sum + count, 0);

const MOCK_STOCK_COUNTS = {
  [StockStatus.AVAILABLE]: 120,
  [StockStatus.RESERVED]: 30,
  [StockStatus.SOLD]: 250,
};
const totalStockItems = Object.values(MOCK_STOCK_COUNTS).reduce((sum, count) => sum + count, 0);

// Storage Keys
export const CUSTOMER_DEMANDS_STORAGE_KEY = 'pohi-ai-customer-demands';
export const MANUFACTURER_STOCK_STORAGE_KEY = 'pohi-ai-manufacturer-stock';
export const MOCK_COMPANIES_STORAGE_KEY = 'pohi-ai-mock-companies';
export const CONFIRMED_MATCHES_STORAGE_KEY = 'pohi-ai-confirmed-matches';


export const MOCK_AI_RESPONSES = {
  alternativeProducts: [
    { id: 'alt1', name: 'Alternative Spruce Log Prima A/B 20-39cm', specs: 'Diameter: 20-39cm, Length: 4-6m, Quality: A/B' },
    { id: 'alt2', name: 'Alternative Pine Industrial Log C 15-29cm', specs: 'Diameter: 15-29cm, Length: 3-5m, Quality: C' },
  ] as AlternativeProduct[],
  productComparison: {
    original: { name: 'Original Requested Product', Price: 'N/A (Customer demand)', Quality: 'Specified', Dimensions: 'Customer requested' }, 
    alternative: { name: 'Alternative Spruce Log Prima', Price: 'Estimated: 110 EUR/m³', Quality: 'A/B', Dimensions: 'More standardized' },
  } as ComparisonData,
  autoCommentBuyer: "Looking for high-quality, freshly cut timber, primarily for structural use. Please consider the specified dimensional tolerances.", 
  priceSuggestionManufacturer: "Suggested price: 125 EUR/m³. This is based on current market prices and pricing of similar quality products.", 
  sustainabilityReport: "This product comes from sustainable forestry (PEFC/FSC certificate can be attached). Environmental footprint was minimized during harvesting, using modern, low-emission machinery.", 
  marketingText: "Premium quality timber directly from the producer! Ideal choice for demanding projects. Short delivery times, competitive prices. Contact us today!", 
  datasheetSuggestions: ["Application areas (e.g., furniture industry, construction)", "Species-specific properties (e.g., density, moisture content)", "Available treatments (e.g., fungicide, heat treatment)"], 
  keywordSuggestions: ["timber", "log", "spruce", "pine", "construction wood", "sustainable", "quality wood"], 
  translationMock: "This product description highlights the key features and benefits. Seeking high-quality timber for structural purposes.",
  marketNews: [ 
    { id: 'news1', title: 'adminDashboard_mockData_news1_title', content: 'adminDashboard_mockData_news1_content', date: '2024-07-20' },
    { id: 'news2', title: 'adminDashboard_mockData_news2_title', content: 'adminDashboard_mockData_news2_content', date: '2024-07-18' },
  ] as MarketNewsItem[],
  marketInfoResponse: 'adminDashboard_mockData_marketInfoResponse' as TranslationKey, 
  faqForNewFeature: [ 
    { id: 'faq1', question: 'adminDashboard_mockData_faq1_question', answer: 'adminDashboard_mockData_faq1_answer' },
    { id: 'faq2', question: 'adminDashboard_mockData_faq2_question', answer: 'adminDashboard_mockData_faq2_answer' },
  ] as FaqItem[],
  faqAnswer: 'adminDashboard_mockData_faqAnswer' as TranslationKey, 
  feedbackAnalysis: { 
    positive: 75,
    neutral: 20,
    negative: 5,
    summary: "Most feedback is positive, highlighting fast delivery and product quality. Some neutral and a negligible number of negative comments were received, mainly regarding the mobile view of the website.",
    keyThemes: ["fast delivery", "good quality", "user-friendly interface", "mobile view"],
    improvementSuggestions: ["Develop a mobile application", "Introduce more detailed product filtering options"]
  } as FeedbackAnalysisData,
  demandForecast: { 
    region: 'Western Hungary', 
    productType: 'Oak Log',   
    forecastValue: 15,
    forecastUnit: '%',
    forecastDirection: 'increase',
    timePeriod: 'next 6 months',
    reason: 'Due to an upswing in furniture industry orders and seasonal growth in construction.'
  } as DemandForecast,
  communicationAssistantMessage: "Kedves [Partner Neve],\n\nSzeretnék érdeklődni a [Téma] kapcsán. Kérem, tájékoztasson az aktuális lehetőségekről és árakról.\n\nTisztelettel,\n[Az Ön Neve]\nPohi AI App", 
  contentPolicyCheck: "A megadott szöveg megfelel az irányelveknek. Javaslat: Érdemes lehet egy rövid bekezdést hozzáadni a fenntarthatósági gyakorlatokról a nagyobb átláthatóság érdekében.", 
  stockOptimizationTips: [ 
    { id: 'tip1', tip: 'Optimalizálja készleteit a keresleti előrejelzések alapján a felesleges készletek elkerülése érdekében.' },
    { id: 'tip2', tip: 'Fontolja meg a JIT (Just-In-Time) beszerzési modellt a népszerű termékeknél.' },
    { id: 'tip3', tip: 'Használjon készletkezelő szoftvert a pontos nyomon követéshez.'},
  ] as OptimizationTip[],
  productCategorizationSuggestion: "Javasolt kategóriák: Építőfa > Szerkezeti fa > Lucfenyő rönk; vagy Faalapanyag > Puhafa > Feldolgozásra váró rönk.", 
  sustainabilityAssessmentAdmin: "A termékleírás alapján a termék valószínűleg közepes szintű fenntarthatósági elvárásoknak felel meg. Javasolt további információk kérése a beszállítótól a pontosabb értékeléshez (pl. tanúsítványok, kitermelési módszerek).", 
  matchmakingSuggestions: [ 
    { id: 'match1', demandId: 'D001 (Vevő Kft.)', stockId: 'S005 (Erdészet Zrt.)', reason: 'Kiváló méret és minőség egyezés, közeli földrajzi elhelyezkedés.' },
    { id: 'match2', demandId: 'D002 (Asztalos Bt.)', stockId: 'S003 (Fűrészüzem Kft.)', reason: 'Megfelelő fafaj, rugalmas mennyiségi szállítási lehetőség.' },
  ] as MatchmakingSuggestion[],
  disputeResolutionSuggestions: [ 
    { id: 'dr1', suggestion: 'Javasoljon független minőségellenőrt a vita eldöntésére.' },
    { id: 'dr2', suggestion: 'Ajánljon fel részleges visszatérítést vagy kedvezményt a kompromisszum érdekében.' },
    { id: 'dr3', suggestion: 'Kezdeményezzen közvetlen megbeszélést a felek között a probléma tisztázására.'},
  ] as DisputeResolutionSuggestion[],
  optimalLoadingPlan: { id: 'plan1', planDetails: 'Optimális rakodási terv egy 24 tonnás kamionra.', items: '15m³ Lucfenyő rönk (A minőség), 8m³ Erdeifenyő fűrészáru (B minőség)', capacityUsed: '95%' } as LoadingPlan, 
  logisticsCostEstimation: { id: 'cost1', totalCost: 'Becsült költség: 350 EUR.', factors: ['Távolság: 250km', 'Üzemanyagár', 'Útdíjak', 'Rakodási idő'] } as CostEstimation, 
  freightOptimizationTips: [ 
    { id: 'fopt1', tip: 'Konszolidálja a szállítmányokat a költséghatékonyság növelése érdekében.' },
    { id: 'fopt2', tip: 'Használjon útvonaltervező szoftvert a legrövidebb és leggazdaságosabb útvonalak megtalálásához.' },
    { id: 'fopt3', tip: 'Tárgyaljon több fuvarozóval a legjobb ajánlatokért.'},
  ] as OptimizationTip[],
  emailDraft: "Kedves [Partner Neve],\n\nSzeretnénk tájékoztatni, hogy a(z) [Rendelésszám] számú rendelése készen áll a szállításra.\nA várható szállítási dátum és időpont: [Dátum], [Időpont].\n\nKérjük, erősítse meg a fogadást.\n\nÜdvözlettel,\nPohi AI App Csapata", 
  waybillCheckSuggestions: ["Ellenőrizze a feladó és címzett adatainak pontosságát.", "Győződjön meg arról, hogy a szállított áru mennyisége és típusa megegyezik a fuvarlevélen szereplőkkel.", "Ellenőrizze az aláírások és bélyegzők meglétét."], 
  anomalyDetectionResults: [ 
    "Szokatlanul magas ár a 'Tölgy rönk Prima A' terméknél az elmúlt 24 órában (Készlet ID: STK-12345).",
    "Jelentős csökkenés az új vevői igények számában a 'Nyugat-Magyarország' régióban az elmúlt héten.",
    "Egy felhasználó ('GyártóABC Kft.') szokatlanul nagy mennyiségű alacsony árú készletet töltött fel rövid idő alatt (5 tétel).",
    "A 'Lucfenyő fűrészáru B osztály' iránti kereslet hirtelen megugrott, ami potenciális készlethiányra utal.",
  ],
  noAnomaliesFoundMessage: 'adminDashboard_noAnomaliesFound' as TranslationKey, 
  userActivitySummary: { 
    newRegistrations: [
      { date: 'Júl 15', count: 5 }, { date: 'Júl 16', count: 8 }, { date: 'Júl 17', count: 3 },
      { date: 'Júl 18', count: 10 }, { date: 'Júl 19', count: 7 }, { date: 'Júl 20', count: 6 },
      { date: 'Júl 21', count: 9 },
    ] as UserActivityDataPoint[],
    activeByRole: [ 
      { role: UserRole.ADMIN, count: 2 },
      { role: UserRole.CUSTOMER, count: 45 }, 
      { role: UserRole.MANUFACTURER, count: 22 },
    ],
  } as UserActivitySummary,
  topPerformingProducts: [ 
    { id: 'prod1', productName: 'Spruce Log Prima A/B', metricValue: 152, unit: 'views' },
    { id: 'prod2', productName: 'Oak Lumber 1st Class', metricValue: 98, unit: 'demands' },
    { id: 'prod3', productName: 'Pine Board 2nd Class', metricValue: 75, unit: 'searches' },
    { id: 'prod4', productName: 'Beech Firewood Crated', metricValue: 60, unit: 'views' },
  ] as ProductPerformanceData[],
  systemHealthStatuses: [ 
    { id: 'sh1', componentName: 'Database Connection', status: 'OK' },
    { id: 'sh2', componentName: 'AI Service (Gemini)', status: 'OK' },
    { id: 'sh3', componentName: 'Server Response Time', status: 'Warning', details: 'Average response time 850ms (normal < 500ms)' },
    { id: 'sh4', componentName: 'Storage Capacity', status: 'OK', details: '75% free space' },
  ] as SystemHealthStatusItem[],
  orderStatusSummary: [
    { status: DemandStatus.RECEIVED, count: MOCK_ORDER_COUNTS[DemandStatus.RECEIVED], percentage: parseFloat(((MOCK_ORDER_COUNTS[DemandStatus.RECEIVED]/totalOrders)*100).toFixed(1)), colorClass: 'bg-sky-500' },
    { status: DemandStatus.PROCESSING, count: MOCK_ORDER_COUNTS[DemandStatus.PROCESSING], percentage: parseFloat(((MOCK_ORDER_COUNTS[DemandStatus.PROCESSING]/totalOrders)*100).toFixed(1)), colorClass: 'bg-amber-500' },
    { status: DemandStatus.COMPLETED, count: MOCK_ORDER_COUNTS[DemandStatus.COMPLETED], percentage: parseFloat(((MOCK_ORDER_COUNTS[DemandStatus.COMPLETED]/totalOrders)*100).toFixed(1)), colorClass: 'bg-green-500' },
    { status: DemandStatus.CANCELLED, count: MOCK_ORDER_COUNTS[DemandStatus.CANCELLED], percentage: parseFloat(((MOCK_ORDER_COUNTS[DemandStatus.CANCELLED]/totalOrders)*100).toFixed(1)), colorClass: 'bg-red-500' },
  ] as OrderStatusSummaryPoint[],
  stockStatusSummary: [
    { status: StockStatus.AVAILABLE, count: MOCK_STOCK_COUNTS[StockStatus.AVAILABLE], percentage: parseFloat(((MOCK_STOCK_COUNTS[StockStatus.AVAILABLE]/totalStockItems)*100).toFixed(1)), colorClass: 'bg-green-600' },
    { status: StockStatus.RESERVED, count: MOCK_STOCK_COUNTS[StockStatus.RESERVED], percentage: parseFloat(((MOCK_STOCK_COUNTS[StockStatus.RESERVED]/totalStockItems)*100).toFixed(1)), colorClass: 'bg-yellow-600' },
    { status: StockStatus.SOLD, count: MOCK_STOCK_COUNTS[StockStatus.SOLD], percentage: parseFloat(((MOCK_STOCK_COUNTS[StockStatus.SOLD]/totalStockItems)*100).toFixed(1)), colorClass: 'bg-red-600' },
  ] as StockStatusSummaryPoint[],
  keyProductPriceTrend: { 
    productName: 'Spruce Log Prima A/B',
    unit: 'EUR/m³',
    dataPoints: [
      { periodLabel: 'Apr', price: 115 },
      { periodLabel: 'May', price: 118 },
      { periodLabel: 'Jun', price: 122 },
      { periodLabel: 'Jul', price: 120 },
      { periodLabel: 'Aug (E)', price: 125 }, 
    ],
  } as KeyProductPriceTrend,
  monthlyPlatformSummary: { 
    month: 'July 2024 (Simulated)',
    newDemands: 125,
    newStockItems: 98,
    successfulMatches: 75,
    aiInterpretation: 'This month, demand (number of new requests) significantly exceeded the arrival of new stock items. The number of successful matches is encouraging, demonstrating the platform\'s effective intermediary role. It is recommended to incentivize the manufacturer side to increase supply.'
  } as MonthlyPlatformSummaryData
};
