import React, { useMemo, useState } from "react";
import { 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  DollarSign, 
  Zap,
  Clock,
  Settings2,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { AnalysisResult, PropertyData } from "../types";

interface GrowthAnalysisProps {
  result: AnalysisResult;
  formData: PropertyData;
}

export const GrowthAnalysis: React.FC<GrowthAnalysisProps> = ({ result, formData }) => {
  // Scenario state
  const [scenario, setScenario] = useState({
    appreciationRate: result.marketData.appreciationRate * 100,
    rentGrowthRate: 3,
    expenseGrowthRate: 2,
    interestRate: formData.interestRate,
    payoffYear: 5, // Default to 5 as per user request
    taxRate: 35, // High income investor (>200k)
    buildingValuePercent: 80, // Standard land/building split
  });

  const resetScenario = () => {
    setScenario({
      appreciationRate: result.marketData.appreciationRate * 100,
      rentGrowthRate: 3,
      expenseGrowthRate: 2,
      interestRate: formData.interestRate,
      payoffYear: 5,
      taxRate: 35,
      buildingValuePercent: 80,
    });
  };

  const calculateMortgage = (principal: number, annualRate: number, years: number) => {
    if (annualRate === 0) return principal / (years * 12);
    const monthlyRate = annualRate / 100 / 12;
    const numberOfPayments = years * 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  };

  const calculateRemainingBalance = (principal: number, annualRate: number, termYears: number, yearsPassed: number) => {
    if (yearsPassed <= 0) return principal;
    if (yearsPassed >= termYears) return 0;
    const monthlyRate = annualRate / 100 / 12;
    const n = termYears * 12;
    const p = yearsPassed * 12;
    
    // Standard mortgage balance formula: B = P[(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    const balance = principal * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, p)) / (Math.pow(1 + monthlyRate, n) - 1);
    return Math.max(0, balance);
  };

  const projectionData = useMemo(() => {
    const years = 30;
    const data = [];
    
    let currentPropertyValue = formData.purchasePrice;
    let currentMonthlyRent = result.cashFlow.grossMonthlyIncome;
    let cumulativeCashFlow = -result.metrics.totalCashInvested;
    
    const appreciationRate = scenario.appreciationRate / 100;
    const rentGrowthRate = scenario.rentGrowthRate / 100;
    const expenseGrowthRate = scenario.expenseGrowthRate / 100;
    
    const monthlyFixedExclMortgage = result.cashFlow.fixedExpenses.taxes + 
                                     result.cashFlow.fixedExpenses.insurance + 
                                     result.cashFlow.fixedExpenses.hoa;
    const monthlyVariable = result.cashFlow.variableExpenses.maintenance + 
                            result.cashFlow.variableExpenses.vacancy + 
                            result.cashFlow.variableExpenses.capEx + 
                            result.cashFlow.variableExpenses.management;
    
    const principal = formData.purchasePrice * (1 - formData.downPaymentPercent / 100);
    const monthlyMortgage = calculateMortgage(principal, scenario.interestRate, formData.loanTermYears);
    
    // Depreciation: 27.5 years for residential
    const annualDepreciation = (formData.purchasePrice * (scenario.buildingValuePercent / 100)) / 27.5;

    // Calculate total extra principal needed to reach 0 balance by payoffYear
    const balanceAtPayoff = calculateRemainingBalance(principal, scenario.interestRate, formData.loanTermYears, scenario.payoffYear);
    const annualExtraPrincipal = scenario.payoffYear > 0 ? balanceAtPayoff / scenario.payoffYear : 0;

    for (let year = 0; year <= years; year++) {
      if (year > 0) {
        currentPropertyValue *= (1 + appreciationRate);
        currentMonthlyRent *= (1 + rentGrowthRate);
      }

      const mortgagePaidOff = year >= scenario.payoffYear;
      const annualMortgagePayment = mortgagePaidOff ? 0 : monthlyMortgage * 12;
      const extraPrincipalThisYear = (year > 0 && year <= scenario.payoffYear) ? annualExtraPrincipal : 0;
      
      const annualRent = currentMonthlyRent * 12;
      const annualExpenses = (monthlyFixedExclMortgage + monthlyVariable) * 12 * Math.pow(1 + expenseGrowthRate, year);
      
      // Calculate Interest for Tax Deduction
      const balanceStartOfYear = year === 0 ? principal : calculateRemainingBalance(principal, scenario.interestRate, formData.loanTermYears, year - 1);
      const balanceEndOfYear = calculateRemainingBalance(principal, scenario.interestRate, formData.loanTermYears, year);
      const principalPaidThisYear = mortgagePaidOff ? 0 : Math.max(0, balanceStartOfYear - balanceEndOfYear);
      const annualInterest = mortgagePaidOff ? 0 : Math.max(0, (monthlyMortgage * 12) - principalPaidThisYear);

      const preTaxCashFlow = annualRent - annualExpenses - annualMortgagePayment - extraPrincipalThisYear;
      
      // Taxable Income Calculation
      // Note: Extra principal is NOT deductible. Mortgage interest and expenses ARE.
      const taxableIncome = annualRent - annualExpenses - annualInterest - annualDepreciation;
      
      // Tax Savings: For >200k income, losses are suspended but offset rental income.
      // We'll show the potential tax shield benefit.
      const taxSavings = taxableIncome < 0 ? Math.abs(taxableIncome) * (scenario.taxRate / 100) : -(taxableIncome * (scenario.taxRate / 100));

      const afterTaxCashFlow = preTaxCashFlow + taxSavings;

      if (year > 0) {
        cumulativeCashFlow += afterTaxCashFlow;
      }

      // Calculate actual equity: Value - Remaining Balance
      const standardBalance = calculateRemainingBalance(principal, scenario.interestRate, formData.loanTermYears, year);
      const totalExtraPaidSoFar = Math.min(year, scenario.payoffYear) * annualExtraPrincipal;
      const remainingBalance = Math.max(0, standardBalance - totalExtraPaidSoFar);

      data.push({
        year: `Year ${year}`,
        propertyValue: Math.round(currentPropertyValue),
        equity: Math.round(currentPropertyValue - remainingBalance),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
        annualCashFlow: Math.round(afterTaxCashFlow),
        preTaxCashFlow: Math.round(preTaxCashFlow),
        taxSavings: Math.round(taxSavings),
        extraPrincipal: Math.round(extraPrincipalThisYear),
        annualRent: Math.round(annualRent),
        annualExpenses: Math.round(annualExpenses),
        annualInterest: Math.round(annualInterest),
        annualDepreciation: Math.round(annualDepreciation),
        taxableIncome: Math.round(taxableIncome),
      });
    }
    return data;
  }, [result, formData, scenario]);

  const breakEvenYear = useMemo(() => {
    const year = projectionData.findIndex(d => d.cumulativeCashFlow >= 0);
    return year === -1 ? "15+" : year;
  }, [projectionData]);

  const returnMetrics = useMemo(() => {
    const calculateForYear = (targetYear: number) => {
      const yearIndex = targetYear;
      const yearData = projectionData[yearIndex];
      if (!yearData) return { rate: 0, initial: 0, negative: 0, positive: 0, final: 0, adjustedInitial: 0, extraPrincipal: 0, totalTaxSavings: 0 };
      
      const initialInvestment = result.metrics.totalCashInvested;
      let totalNegativeCF = 0;
      let totalPositiveCF = 0;
      let totalExtraPrincipal = 0;
      let totalTaxSavings = 0;
      
      for (let i = 1; i <= targetYear; i++) {
        const annualCF = projectionData[i].annualCashFlow;
        const extraP = projectionData[i].extraPrincipal || 0;
        const taxS = projectionData[i].taxSavings || 0;
        
        totalExtraPrincipal += extraP;
        totalTaxSavings += taxS;
        
        // annualCashFlow already has extraPrincipal subtracted and taxSavings added.
        if (annualCF < 0) {
          totalNegativeCF += Math.abs(annualCF);
        } else {
          totalPositiveCF += annualCF;
        }
      }
      
      const adjustedInitial = initialInvestment + totalNegativeCF;
      const finalValue = yearData.equity + totalPositiveCF;
      
      const rate = adjustedInitial > 0 ? (Math.pow(finalValue / adjustedInitial, 1 / targetYear) - 1) * 100 : 0;
      
      return {
        rate,
        initial: initialInvestment,
        negative: totalNegativeCF,
        positive: totalPositiveCF,
        final: finalValue,
        adjustedInitial,
        extraPrincipal: totalExtraPrincipal,
        totalTaxSavings
      };
    };

    return {
      y10: calculateForYear(10),
      y15: calculateForYear(15),
      y20: calculateForYear(20),
      y25: calculateForYear(25),
      y30: calculateForYear(30)
    };
  }, [projectionData, result.metrics.totalCashInvested]);

  return (
    <div className="space-y-6">
      {/* Scenario Controls */}
      <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zillow-blue-light rounded-lg">
              <Settings2 className="w-4 h-4 text-zillow-blue" />
            </div>
            <h3 className="text-sm font-bold text-zillow-dark">
              "What-If" Scenario Analysis
            </h3>
          </div>
          <button 
            onClick={resetScenario}
            className="text-xs font-semibold text-zillow-blue flex items-center gap-1 hover:underline transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Reset to Baseline
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Interest Rate (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={scenario.interestRate}
                onChange={(e) => setScenario({...scenario, interestRate: parseFloat(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="0" 
              max="15" 
              step="0.1"
              value={scenario.interestRate}
              onChange={(e) => setScenario({...scenario, interestRate: parseFloat(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Appreciation (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={scenario.appreciationRate}
                onChange={(e) => setScenario({...scenario, appreciationRate: parseFloat(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="-5" 
              max="15" 
              step="0.1"
              value={scenario.appreciationRate}
              onChange={(e) => setScenario({...scenario, appreciationRate: parseFloat(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Rent Growth (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={scenario.rentGrowthRate}
                onChange={(e) => setScenario({...scenario, rentGrowthRate: parseFloat(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={scenario.rentGrowthRate}
              onChange={(e) => setScenario({...scenario, rentGrowthRate: parseFloat(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Expense Growth (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={scenario.expenseGrowthRate}
                onChange={(e) => setScenario({...scenario, expenseGrowthRate: parseFloat(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={scenario.expenseGrowthRate}
              onChange={(e) => setScenario({...scenario, expenseGrowthRate: parseFloat(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Payoff Year</label>
              <input 
                type="number" 
                min="1"
                max="30"
                value={scenario.payoffYear}
                onChange={(e) => setScenario({...scenario, payoffYear: parseInt(e.target.value) || 1})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="1" 
              max="30" 
              step="1"
              value={scenario.payoffYear}
              onChange={(e) => setScenario({...scenario, payoffYear: parseInt(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Tax Rate (%)</label>
              <input 
                type="number" 
                min="0"
                max="50"
                value={scenario.taxRate}
                onChange={(e) => setScenario({...scenario, taxRate: parseInt(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="0" 
              max="50" 
              step="1"
              value={scenario.taxRate}
              onChange={(e) => setScenario({...scenario, taxRate: parseInt(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zillow-gray-dark">Building (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={scenario.buildingValuePercent}
                onChange={(e) => setScenario({...scenario, buildingValuePercent: parseInt(e.target.value) || 0})}
                className="w-16 text-xs font-bold text-zillow-blue bg-zillow-blue-light px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-zillow-blue"
              />
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={scenario.buildingValuePercent}
              onChange={(e) => setScenario({...scenario, buildingValuePercent: parseInt(e.target.value)})}
              className="w-full h-1.5 bg-zillow-gray-light rounded-lg appearance-none cursor-pointer accent-zillow-blue"
            />
          </div>
        </div>
      </div>

      {/* Market Trends */}
      <div className="bg-zillow-dark text-white rounded-xl p-6 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-zillow-blue opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <h3 className="text-sm font-bold mb-6 flex items-center gap-2 relative z-10">
          <TrendingUp className="w-4 h-4 text-zillow-blue-light" />
          Growth Drivers & Market Trends
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {result.marketData.growthTrends.map((trend, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <Zap className="w-4 h-4 text-zillow-blue-light shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed text-zillow-gray-light">{trend}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Break-even Analysis & Returns Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-zillow-blue" />
            Break-even Point
          </div>
          <div className="text-2xl font-bold text-zillow-dark">
            {breakEvenYear} <span className="text-sm font-normal text-zillow-gray">Years</span>
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Time to recover initial investment including negative cash flow years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-zillow-blue" />
            Year 10 Equity
          </div>
          <div className="text-2xl font-bold text-zillow-dark truncate">
            ${projectionData[10]?.equity.toLocaleString()}
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Estimated property value minus remaining debt after 10 years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-zillow-success" />
            Post-Mortgage CF
          </div>
          <div className="text-2xl font-bold text-zillow-success truncate">
            +${(projectionData[scenario.payoffYear + 1]?.annualCashFlow / 12 || 0).toLocaleString()}
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Estimated monthly cash flow after mortgage payoff in Year {scenario.payoffYear}.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zillow-blue" />
            Return (10yr)
          </div>
          <div className="text-2xl font-bold text-zillow-blue">
            {returnMetrics.y10.rate.toFixed(1)}%
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Total after-tax return annualized over 10 years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zillow-blue" />
            Return (15yr)
          </div>
          <div className="text-2xl font-bold text-zillow-blue">
            {returnMetrics.y15.rate.toFixed(1)}%
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Total after-tax return annualized over 15 years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zillow-blue" />
            Return (20yr)
          </div>
          <div className="text-2xl font-bold text-zillow-blue">
            {returnMetrics.y20.rate.toFixed(1)}%
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Total after-tax return annualized over 20 years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zillow-blue" />
            Return (25yr)
          </div>
          <div className="text-2xl font-bold text-zillow-blue">
            {returnMetrics.y25.rate.toFixed(1)}%
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Total after-tax return annualized over 25 years.</p>
        </div>
        <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-xs font-semibold text-zillow-gray-dark mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zillow-blue" />
            Return (30yr)
          </div>
          <div className="text-2xl font-bold text-zillow-blue">
            {returnMetrics.y30.rate.toFixed(1)}%
          </div>
          <p className="text-[10px] mt-2 text-zillow-gray">Total after-tax return annualized over 30 years.</p>
        </div>
      </div>

      {/* Cumulative Cash Flow Chart */}
      <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-zillow-dark mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zillow-blue" />
          Cumulative Cash Flow Projection (30 Years)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#006aff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#006aff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#595959' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#595959' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Cumulative Cash Flow"]}
              />
              <Area 
                type="monotone" 
                dataKey="cumulativeCashFlow" 
                stroke="#006aff" 
                fillOpacity={1} 
                fill="url(#colorCash)" 
                strokeWidth={3}
              />
              {/* Zero line */}
              <Line type="monotone" dataKey={() => 0} stroke="#d1d1d1" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appreciation Chart */}
      <div className="bg-white border border-zillow-gray-light rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-zillow-dark mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-zillow-blue" />
          Property Value & Equity Growth
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#595959' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#595959' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e8e8e8', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="propertyValue" 
                stroke="#006aff" 
                strokeWidth={3} 
                dot={false}
                name="Property Value"
              />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="#002c5c" 
                strokeWidth={3} 
                dot={false}
                name="Equity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Deduction Explanation Section */}
      <div className="bg-white border border-zillow-gray-light rounded-xl p-8 shadow-sm">
        <h3 className="text-xs font-bold uppercase text-zillow-blue mb-6 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          How Tax Deduction Savings are Calculated
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-zillow-gray-dark leading-relaxed">
                Real estate offers powerful tax advantages through non-cash deductions. Even if your property is cash-flow positive, it may show a "loss" on paper, which can shield your rental income from taxes.
              </p>
              <div className="p-4 bg-zillow-blue-light/20 rounded-xl border border-zillow-blue/10">
                <h4 className="text-xs font-bold text-zillow-blue mb-2 uppercase">The High-Salary "Tax Shield"</h4>
                <p className="text-[11px] text-zillow-gray-dark leading-relaxed">
                  For investors with <span className="font-bold">$200k+ salaries</span>, the IRS generally classifies rental activity as "passive." While passive losses usually can't offset your salary directly (unless you're a Real Estate Professional), they <span className="font-bold">offset 100% of your rental income</span> first. Any excess loss is carried forward to future years or used to reduce capital gains when you sell.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zillow-blue-light flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-zillow-blue">1</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-zillow-dark">Depreciation (27.5 Years)</div>
                  <p className="text-[11px] text-zillow-gray">You can deduct {scenario.buildingValuePercent}% of the purchase price over 27.5 years. This is a "phantom expense" that doesn't cost you cash but reduces taxes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zillow-blue-light flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-zillow-blue">2</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-zillow-dark">Interest Deduction</div>
                  <p className="text-[11px] text-zillow-gray">The interest portion of your mortgage payment is fully deductible, unlike the principal portion.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zillow-gray-light">
                    <th className="py-3 text-[10px] font-bold text-zillow-gray uppercase">Calculation Step</th>
                    {[1, 2, 3, 4, 5].map(y => (
                      <th key={y} className="py-3 px-2 text-[10px] font-bold text-zillow-gray uppercase text-right">Year {y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-zillow-gray-light/50">
                    <td className="py-3 font-medium text-zillow-dark">Gross Annual Rent (+)</td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className="py-3 px-2 text-right text-zillow-success font-semibold">${projectionData[y]?.annualRent.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-zillow-gray-light/50">
                    <td className="py-3 font-medium text-zillow-dark">Operating Expenses (-)</td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className="py-3 px-2 text-right text-zillow-error">-${projectionData[y]?.annualExpenses.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-zillow-gray-light/50">
                    <td className="py-3 font-medium text-zillow-dark">Mortgage Interest (-)</td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className="py-3 px-2 text-right text-zillow-error">-${projectionData[y]?.annualInterest.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-zillow-blue/10">
                    <td className="py-3 font-medium text-zillow-dark">Depreciation (Non-Cash) (-)</td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className="py-3 px-2 text-right text-zillow-error">-${projectionData[y]?.annualDepreciation.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="bg-zillow-blue-light/10">
                    <td className="py-3 font-bold text-zillow-dark">Taxable Income (=)</td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className={`py-3 px-2 text-right font-bold ${projectionData[y]?.taxableIncome < 0 ? 'text-zillow-error' : 'text-zillow-success'}`}>
                        ${projectionData[y]?.taxableIncome.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zillow-success/5">
                    <td className="py-4 font-bold text-zillow-success flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Actual Tax Savings
                    </td>
                    {[1, 2, 3, 4, 5].map(y => (
                      <td key={y} className="py-4 px-2 text-right font-bold text-zillow-success text-sm">
                        ${Math.abs(projectionData[y]?.taxSavings).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zillow-gray mt-4 italic">
              *Calculated at a {scenario.taxRate}% marginal tax rate. Savings represent the reduction in taxes you would otherwise owe on this income or the value of the passive loss carryforward.
            </p>
          </div>
        </div>
      </div>

      {/* Annualized Return Explanation */}
      <div className="bg-zillow-blue-light/30 border border-zillow-blue/10 p-8 rounded-2xl">
        <h3 className="text-xs font-bold uppercase text-zillow-blue mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Understanding Your After-Tax Annualized Return (CAGR)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          <div className="space-y-4">
            <p className="text-[11px] text-zillow-gray-dark leading-relaxed">
              The <span className="font-bold">After-Tax Annualized Return</span> accounts for the "out-of-pocket" costs of negative cash flow and the benefits of tax depreciation. 
              <br /><br />
              For an investor with <span className="font-bold text-zillow-blue">$200k+ salaried income</span>, passive losses are generally suspended but can offset rental income or be used upon sale. This model includes the <span className="font-bold text-zillow-success">Tax Shield</span> benefit as an addition to cash flow.
            </p>
            <div className="bg-white p-4 rounded-xl border border-zillow-blue/10 space-y-2">
              <div className="text-[10px] uppercase font-bold text-zillow-gray">The Formula</div>
              <div className="font-mono text-xs text-zillow-blue py-2">
                ((Final Value / Adjusted Investment) ^ (1/n)) - 1
              </div>
            </div>
          </div>
          
          {/* Year 10 */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-zillow-gray mb-2">Year 10 Breakdown</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Initial Cash</span>
                <span className="font-bold text-zillow-dark">${returnMetrics.y10.initial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Extra Principal</span>
                <span className="font-bold text-zillow-blue">${returnMetrics.y10.extraPrincipal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Other Neg CF</span>
                <span className="font-bold text-zillow-error">${(returnMetrics.y10.negative - returnMetrics.y10.extraPrincipal > 0 ? returnMetrics.y10.negative - returnMetrics.y10.extraPrincipal : 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 font-bold">
                <span className="text-zillow-dark">Adj. Investment</span>
                <span className="text-zillow-dark">${returnMetrics.y10.adjustedInitial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 pt-2">
                <span className="text-zillow-gray-dark">Year 10 Equity</span>
                <span className="font-bold text-zillow-dark">${projectionData[10]?.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Total Tax Savings</span>
                <span className="font-bold text-zillow-success">${Math.round(returnMetrics.y10.totalTaxSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 font-bold">
                <span className="text-zillow-blue">Final Value</span>
                <span className="text-zillow-blue">${returnMetrics.y10.final.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Year 20 */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-zillow-gray mb-2">Year 20 Breakdown</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Initial Cash</span>
                <span className="font-bold text-zillow-dark">${returnMetrics.y20.initial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Extra Principal</span>
                <span className="font-bold text-zillow-blue">${returnMetrics.y20.extraPrincipal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Other Neg CF</span>
                <span className="font-bold text-zillow-error">${(returnMetrics.y20.negative - returnMetrics.y20.extraPrincipal > 0 ? returnMetrics.y20.negative - returnMetrics.y20.extraPrincipal : 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 font-bold">
                <span className="text-zillow-dark">Adj. Investment</span>
                <span className="text-zillow-dark">${returnMetrics.y20.adjustedInitial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 pt-2">
                <span className="text-zillow-gray-dark">Year 20 Equity</span>
                <span className="font-bold text-zillow-dark">${projectionData[20]?.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Total Tax Savings</span>
                <span className="font-bold text-zillow-success">${Math.round(returnMetrics.y20.totalTaxSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 font-bold">
                <span className="text-zillow-blue">Final Value</span>
                <span className="text-zillow-blue">${returnMetrics.y20.final.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Year 25 */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-zillow-gray mb-2">Year 25 Breakdown</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Initial Cash</span>
                <span className="font-bold text-zillow-dark">${returnMetrics.y25.initial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Extra Principal</span>
                <span className="font-bold text-zillow-blue">${returnMetrics.y25.extraPrincipal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Other Neg CF</span>
                <span className="font-bold text-zillow-error">${(returnMetrics.y25.negative - returnMetrics.y25.extraPrincipal > 0 ? returnMetrics.y25.negative - returnMetrics.y25.extraPrincipal : 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 font-bold">
                <span className="text-zillow-dark">Adj. Investment</span>
                <span className="text-zillow-dark">${returnMetrics.y25.adjustedInitial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 pt-2">
                <span className="text-zillow-gray-dark">Year 25 Equity</span>
                <span className="font-bold text-zillow-dark">${projectionData[25]?.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Total Tax Savings</span>
                <span className="font-bold text-zillow-success">${Math.round(returnMetrics.y25.totalTaxSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 font-bold">
                <span className="text-zillow-blue">Final Value</span>
                <span className="text-zillow-blue">${returnMetrics.y25.final.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Year 30 */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-zillow-gray mb-2">Year 30 Breakdown</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Initial Cash</span>
                <span className="font-bold text-zillow-dark">${returnMetrics.y30.initial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Extra Principal</span>
                <span className="font-bold text-zillow-blue">${returnMetrics.y30.extraPrincipal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Other Neg CF</span>
                <span className="font-bold text-zillow-error">${(returnMetrics.y30.negative - returnMetrics.y30.extraPrincipal > 0 ? returnMetrics.y30.negative - returnMetrics.y30.extraPrincipal : 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 font-bold">
                <span className="text-zillow-dark">Adj. Investment</span>
                <span className="text-zillow-dark">${returnMetrics.y30.adjustedInitial.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5 pt-2">
                <span className="text-zillow-gray-dark">Year 30 Equity</span>
                <span className="font-bold text-zillow-dark">${projectionData[30]?.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-zillow-blue/5 pb-1.5">
                <span className="text-zillow-gray-dark">Total Tax Savings</span>
                <span className="font-bold text-zillow-success">${Math.round(returnMetrics.y30.totalTaxSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 font-bold">
                <span className="text-zillow-blue">Final Value</span>
                <span className="text-zillow-blue">${returnMetrics.y30.final.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
