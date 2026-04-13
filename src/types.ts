export interface PropertyData {
  address: string;
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  hoaMonthly: number;
  maintenancePercent: number;
  vacancyPercent: number;
  capExPercent: number;
  managementPercent: number;
}

export interface AnalysisResult {
  propertySpecs: {
    sqft: number;
    beds: number;
    baths: number;
    yearBuilt: number;
    lotSize: string;
  };
  marketData: {
    medianRent: number;
    avgRent: number;
    taxRate: number;
    insurancePremium: number;
    vacancyRate: number;
    appreciationRate: number;
    growthTrends: string[];
  };
  metrics: {
    capRate: number;
    cashOnCash: number;
    grm: number;
    dscr: number;
    oer: number;
    noi: number;
    annualCashFlow: number;
    totalCashInvested: number;
  };
  cashFlow: {
    grossMonthlyIncome: number;
    fixedExpenses: {
      mortgage: number;
      taxes: number;
      insurance: number;
      hoa: number;
    };
    variableExpenses: {
      maintenance: number;
      vacancy: number;
      capEx: number;
      management: number;
    };
    netMonthlyCashFlow: number;
  };
  recommendation: {
    decision: "BUY" | "PASS";
    reasoning: string;
  };
  riskAnalysis: {
    redFlags: string[];
    opportunities: string[];
  };
  forecast: {
    appreciation: { year: number; rate: number }[];
    rentalDemand: { year: number; demandScore: number; sentiment: string }[];
    fiveYearOutlook: string;
  };
  comparables: {
    address: string;
    rent: number;
    type: string;
    features: string[];
    distance: string;
  }[];
}

export interface LeaseData {
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  rentAmount: number;
  leaseDuration: string;
  securityDeposit: number;
  startDate: string;
  specificClauses: string;
}
