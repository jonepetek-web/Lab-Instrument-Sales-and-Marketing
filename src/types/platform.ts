export type UserRole =
  | 'admin'
  | 'sales_manager'
  | 'sales_rep'
  | 'marketing'
  | 'procurement'
  | 'service_engineer';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  territory: string;
  avatarInitials: string;
}

export const PRODUCT_CATEGORIES = [
  'Analytical Instruments',
  'Chromatography Systems (HPLC, UHPLC, GC)',
  'Mass Spectrometry (LC-MS/MS, GC-MS, ICP-MS)',
  'Spectroscopy (UV-Vis, FTIR, Raman, AAS, ICP-OES)',
  'Molecular Biology Equipment',
  'PCR and Real-Time PCR Systems',
  'Microbiology Equipment',
  'Clinical Laboratory Equipment',
  'Life Science Instruments',
  'Laboratory Centrifuges',
  'Laboratory Balances',
  'Water Purification Systems',
  'Laboratory Incubators and Ovens',
  'Autoclaves and Sterilization Systems',
  'Laboratory Refrigerators and Freezers',
  'General Laboratory Equipment',
  'Consumables, Reagents, and Accessories',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  brand: string;
  modelNumber: string;
  category: ProductCategory;
  imageUrl: string;
  specs: Record<string, string>;
  description: string;
  applications: string[];
  features: string[];
  datasheetCode: string;
  brochureCode: string;
  videoUrl: string;
  sellingPrice: number;
  costPrice?: number; // Strictly restricted to admin and sales_manager
  stockQty: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Made to Order';
  warranty: string;
  leadTimeDays: number;
  installationReqs: string;
  maintenanceReqs: string;
  regulatoryCerts: string[];
}

export const CUSTOMER_TYPES = [
  'Hospitals',
  'Universities',
  'Research Institutions',
  'Government Laboratories',
  'Pharmaceutical Companies',
  'Food and Beverage Laboratories',
  'Environmental Testing Laboratories',
  'Oil and Gas Laboratories',
  'Industrial Laboratories',
  'Private Testing Laboratories',
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Qualified Lead',
  'Technical Discussion',
  'Product Demonstration',
  'Quotation Submitted',
  'Negotiation',
  'Purchase Order Received',
  'Won',
  'Lost',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface ContactPerson {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface FollowUpReminder {
  id: string;
  dueDate: string;
  note: string;
  completed: boolean;
  ownerName: string;
}

export interface Customer {
  id: string;
  institutionName: string;
  type: CustomerType;
  country: string;
  city: string;
  department: string;
  contacts: ContactPerson[];
  researchInterests: string;
  instrumentRequirements: string;
  existingInstruments: string[];
  purchasingHistory: { date: string; orderRef: string; amount: number; itemsSummary: string }[];
  potentialValue: number;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  followUps: FollowUpReminder[];
}

export interface Opportunity {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  stage: PipelineStage;
  value: number;
  probability: number;
  expectedCloseDate: string;
  assignedSalespersonId: string;
  assignedSalespersonName: string;
  interestedProductIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationTemplate =
  | 'Laboratory Instruments'
  | 'Complete Laboratory Project'
  | 'Turnkey Laboratory Solution'
  | 'Consumables and Reagents'
  | 'Service Contract';

export type QuotationStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Accepted'
  | 'Rejected';

export interface QuotationLineItem {
  productId: string;
  productName: string;
  modelNumber: string;
  manufacturer: string;
  specsSummary: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  templateType: QuotationTemplate;
  customerId: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  customerLocation: string;
  items: QuotationLineItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  deliveryTerms: string;
  paymentTerms: string;
  warrantyTerms: string;
  installationTraining: string;
  validityDays: number;
  termsAndConditions: string;
  status: QuotationStatus;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

export type MarketingChannel =
  | 'LinkedIn'
  | 'Email'
  | 'Webinar'
  | 'Conference'
  | 'Facebook'
  | 'Instagram'
  | 'SEO Content';

export type MarketingApprovalStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Published'
  | 'Completed';

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: MarketingChannel;
  campaignType: string;
  status: MarketingApprovalStatus;
  contentTitle: string;
  contentBody: string;
  targetAudience: string;
  scheduledDate: string;
  reach: number;
  impressions: number;
  clicks: number;
  leadsGenerated: number;
  conversionRate: number;
  cost: number;
  revenueAttributed: number;
  roi: number;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface InventoryUnit {
  id: string;
  productId: string;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  batchNumber: string;
  warehouseLocation: string;
  status: 'Available' | 'Reserved' | 'In Transit' | 'Installed';
  receivedDate: string;
  assignedCustomer?: string;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contactEmail: string;
  leadTimeAvgDays: number;
  categories: string[];
  rating: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  type: 'Purchase Request' | 'Purchase Order';
  supplierId: string;
  supplierName: string;
  itemsSummary: string;
  quantity: number;
  totalCost: number;
  status: 'Requested' | 'Approved' | 'Ordered' | 'Goods Received';
  expectedDeliveryDate: string;
  receivedDate?: string;
  createdAt: string;
}

export interface DeliveryRecord {
  id: string;
  deliveryNumber: string;
  customerName: string;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  carrier: string;
  scheduledDate: string;
  status: 'Scheduled' | 'In Transit' | 'Delivered';
}

export interface InstallationRecord {
  id: string;
  installNumber: string;
  customerName: string;
  productName: string;
  serialNumber: string;
  assignedEngineer: string;
  scheduledDate: string;
  checklistCompleted: string[];
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  customerName: string;
  productName: string;
  serialNumber: string;
  requestType: 'Preventive Maintenance' | 'Calibration' | 'Repair' | 'Application Support';
  priority: 'Routine' | 'Urgent' | 'Critical';
  assignedEngineer: string;
  status: 'Open' | 'Dispatched' | 'Resolved';
  scheduledDate: string;
  notes: string;
}

export interface PublicInquiry {
  id: string;
  type: 'RFQ' | 'Contact' | 'WhatsApp';
  institutionName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  productInterest: string;
  message: string;
  status: 'New' | 'Converted to CRM' | 'Responded';
  createdAt: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  category: 'Product Launch' | 'Conference' | 'Application Note' | 'Webinar';
  date: string;
  location: string;
  summary: string;
}

export interface HistoricalSalesPoint {
  month: string;
  actualRevenue: number;
  targetRevenue: number;
  quotationsCount: number;
  ordersWon: number;
}

export interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: 'Current' | 'Due Soon' | 'Overdue';
}
