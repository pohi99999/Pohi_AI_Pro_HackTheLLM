
// Import for local usage within this file
// Note: TranslationKey will be imported from the updated locales.ts
import type { TranslationKey as LocaleTranslationKey } from './locales'; 

// export { TranslationKey } from './locales'; // Old way, prefer 'export type' for types
export type { TranslationKey } from './locales'; // Re-export TranslationKey from locales for other modules


export enum UserRole {
  ADMIN = 'Administrator',
  CUSTOMER = 'Customer', // Updated from BUYER
  MANUFACTURER = 'Manufacturer',
}

export interface MenuItem {
  label: string; // Will hold the translated label
  labelKey: LocaleTranslationKey; // Holds the key for translation
  path: string;
  icon?: React.ReactNode; 
}

export interface ProductFeatures {
  diameterType: string;
  diameterFrom: string;
  diameterTo: string;
  length: string;
  quantity: string;
  cubicMeters?: number;
  notes?: string;
}

export enum DemandStatus {
  RECEIVED = 'Received',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface DemandItem extends ProductFeatures {
  id: string;
  productName?: string; // Added for general product specification
  submissionDate: string; 
  status: DemandStatus;
  submittedByCompanyId?: string; 
  submittedByCompanyName?: string; 
}

export enum StockStatus {
  AVAILABLE = 'Available',
  RESERVED = 'Reserved', 
  SOLD = 'Sold',
}

export interface StockItem extends ProductFeatures {
  id?: string; 
  productName?: string; // Added for consistency, can be used by manufacturer as well
  uploadDate?: string; 
  status?: StockStatus; 
  price?: string; // e.g. "120 EUR/m³" or "15 EUR/db"
  sustainabilityInfo?: string;
  uploadedByCompanyId?: string; 
  uploadedByCompanyName?: string; 
}

export interface MockCompany {
  id: string;
  companyName: string;
  role: UserRole.CUSTOMER | UserRole.MANUFACTURER; 
  contactPerson?: string; 
  email?: string; 
  address?: { // New address field
    street?: string;
    city?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface AlternativeProduct {
  id: string;
  name: string;
  specs: string;
}

export interface ComparisonData {
  original: { name: string; [key: string]: any };
  alternative: { name: string; [key: string]: any };
}

export interface GeminiComparisonItemDetails {
    name: string;
    dimensions_quantity_notes?: string; 
    pros?: string[];
    cons?: string[];
}

export interface GeminiComparisonResponse {
  original: GeminiComparisonItemDetails;
  alternative: GeminiComparisonItemDetails;
}


export interface MarketNewsItem {
  id: string;
  title: string | LocaleTranslationKey; 
  content: string | LocaleTranslationKey; 
  date: string;
}

export interface FaqItem {
  id: string;
  question: string | LocaleTranslationKey; 
  answer: string | LocaleTranslationKey; 
}

export interface DemandForecast {
  region: string;
  productType: string;
  forecastValue: number;
  forecastUnit: string; 
  forecastDirection: 'increase' | 'decrease' | 'stagnation'; 
  timePeriod: string; 
  reason?: string; 
}

export interface FeedbackAnalysisData {
  positive: number; 
  neutral: number;  
  negative: number; 
  summary: string;
  keyThemes?: string[];
  improvementSuggestions?: string[];
}


export interface OptimizationTip {
  id: string;
  tip: string;
}

export interface MatchmakingSuggestion {
  id: string; 
  demandId: string;
  stockId: string;
  reason: string;
  matchStrength?: string; 
  similarityScore?: number; 
}

export interface AiStockSuggestion {
  stockItemId: string;
  reason: string;
  matchStrength?: string;
  similarityScore?: number;
}

export interface DisputeResolutionSuggestion {
  id:string;
  suggestion: string;
}

export interface Waypoint {
  name: string; 
  type: 'pickup' | 'dropoff'; 
  order: number; 
}

export interface LoadingPlanItem {
  name: string; // e.g. "Acacia Posts - for Customer X, 3 crates"
  quality?: string; // e.g. "Debarked, sanded, Prima A"
  volumeM3?: string; // e.g. "8" or "8 m³"
  densityTonPerM3?: string; // Optional
  weightTon?: string; // Optional
  loadingSuggestion?: string; // e.g. "Place these crates closest to the truck door..."
  destinationName?: string; // e.g. "Customer X Ltd. warehouse"
  dropOffOrder?: number; // e.g. 1 (for first drop-off)
  notesOnItem?: string; // Optional, e.g. "3 crates, total 75 pcs 4m 14-18cm posts"
}

export interface LoadingPlanResponse {
  planDetails: string; // e.g. "Optimized multi-pickup and multi-drop loading plan..."
  items: LoadingPlanItem[] | string; // Array of items or a string summary for errors/simple plans
  capacityUsed: string; // e.g. "92%"
  waypoints?: Waypoint[]; // Array of pickup and drop-off locations in sequence
  optimizedRouteDescription?: string; // Textual description of the route
}

export interface LoadingPlan extends LoadingPlanResponse {
  id: string;
}


export interface CostEstimationResponse {
  totalCost: string;
  factors: string[];
}
export interface CostEstimation extends CostEstimationResponse {
  id: string;
}

export interface UserActivityDataPoint {
  date: string; 
  count: number;
}

export interface UserActivitySummary {
  newRegistrations: UserActivityDataPoint[];
  activeByRole: { role: UserRole; count: number }[];
}

export interface ProductPerformanceData {
  id: string;
  productName: string;
  metricValue: number;
  unit: string; 
}

export interface SystemHealthStatusItem {
  id: string;
  componentName: string;
  status: 'OK' | 'Warning' | 'Error';
  details?: string;
}

export interface OrderStatusSummaryPoint {
  status: DemandStatus;
  count: number;
  percentage: number;
  colorClass: string; 
}

export interface StockStatusSummaryPoint {
  status: StockStatus;
  count: number;
  percentage: number;
  colorClass: string; 
}

export interface PriceTrendDataPoint {
  periodLabel: string; 
  price: number;
}

export interface KeyProductPriceTrend {
  productName: string;
  dataPoints: PriceTrendDataPoint[];
  unit: string; 
}

export interface MonthlyPlatformSummaryData {
  month: string;
  newDemands: number;
  newStockItems: number;
  successfulMatches: number;
  aiInterpretation: string;
}

export interface GeneratedDataReport {
  newCustomers: number;
  newManufacturers: number;
  newDemands: number;
  newStockItems: number;
  productName: string;
  scenarioInfo?: string;
}

// ---- New Types for Billing & Commission ----
export interface ConfirmedMatch {
  id: string;
  demandId: string;
  demandDetails: DemandItem; // Snapshot of the demand item
  stockId: string;
  stockDetails: StockItem; // Snapshot of the stock item
  matchDate: string; // ISO date string
  commissionRate: number; // e.g., 0.05 for 5%
  commissionAmount: number; // Calculated commission
  billed: boolean;
  invoiceId?: string; // Optional: ID of the generated invoice
}

export interface SuccessfulMatchEntry { // For aggregated views, charts
    id: string; // Can be month, product type, etc.
    label: string;
    matchCount: number;
    totalCommission: number;
}

export interface AiGeneratedInvoice {
    companyName: string;
    billingPeriod: string;
    invoiceDraftText: string;
    relatedMatchIds: string[];
}

export interface CommissionSourceAnalysis {
    [productType: string]: number; // e.g., "Acacia Posts": 45 (percentage)
}

export interface MarketPriceCommissionAdvice {
    productType: string;
    marketPriceInsights: string;
    suggestedCommissionRate: string; // e.g., "5-7%"
    justification: string;
}
// ---- End of New Types ----
