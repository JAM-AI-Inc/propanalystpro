import React, { useState } from "react";
import { 
  Search, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Home, 
  Info,
  ChevronRight,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzeProperty } from "./services/geminiService";
import { AnalysisResult, PropertyData } from "./types";
import { cn } from "./lib/utils";
import { GrowthAnalysis } from "./components/GrowthAnalysis";
import { LeaseGenerator } from "./components/LeaseGenerator";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const COLORS = ["#006AFF", "#008A00", "#D93939", "#FFB200", "#595960", "#2A2A33"];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "growth" | "forecast" | "lease">("overview");
  const [formData, setFormData] = useState<PropertyData>({
    address: "",
    purchasePrice: 450000,
    downPaymentPercent: 25,
    interestRate: 6.5,
    loanTermYears: 30,
    hoaMonthly: 150,
    maintenancePercent: 10,
    vacancyPercent: 5,
    capExPercent: 5,
    managementPercent: 8,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name === "address" ? value : parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue,
    }));

    // Sync assumptions with current result if it exists
    if (result && typeof numValue === "number") {
      const assumptionMap: Record<string, string> = {
        maintenancePercent: "maintenance",
        vacancyPercent: "vacancy",
        capExPercent: "capEx",
        managementPercent: "management"
      };

      if (name in assumptionMap) {
        const field = assumptionMap[name];
        const dollarValue = Math.round(result.cashFlow.grossMonthlyIncome * (numValue / 100));
        handleCashFlowEdit("variableExpenses", field, dollarValue);
      }
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address) return;
    
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeProperty(formData);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashFlowEdit = (category: 'fixedExpenses' | 'variableExpenses' | 'grossMonthlyIncome', field: string, value: number) => {
    if (!result) return;

    setResult(prev => {
      if (!prev) return null;
      const newResult = { ...prev };
      
      if (category === 'grossMonthlyIncome') {
        newResult.cashFlow.grossMonthlyIncome = value;
      } else if (category === 'fixedExpenses') {
        newResult.cashFlow.fixedExpenses = {
          ...newResult.cashFlow.fixedExpenses,
          [field]: value
        };
      } else if (category === 'variableExpenses') {
        newResult.cashFlow.variableExpenses = {
          ...newResult.cashFlow.variableExpenses,
          [field]: value
        };
      }

      // Recalculate Net Cash Flow
      const totalFixed = Object.values(newResult.cashFlow.fixedExpenses).reduce((a, b) => a + b, 0);
      const totalVariable = Object.values(newResult.cashFlow.variableExpenses).reduce((a, b) => a + b, 0);
      newResult.cashFlow.netMonthlyCashFlow = newResult.cashFlow.grossMonthlyIncome - totalFixed - totalVariable;

      // Recalculate Metrics
      const annualGross = newResult.cashFlow.grossMonthlyIncome * 12;
      const annualExpensesExclDebt = (totalFixed - newResult.cashFlow.fixedExpenses.mortgage + totalVariable) * 12;
      const noi = annualGross - annualExpensesExclDebt;
      const annualDebtService = newResult.cashFlow.fixedExpenses.mortgage * 12;
      const annualCashFlow = newResult.cashFlow.netMonthlyCashFlow * 12;

      newResult.metrics = {
        ...newResult.metrics,
        noi,
        annualCashFlow,
        capRate: noi / formData.purchasePrice,
        cashOnCash: annualCashFlow / newResult.metrics.totalCashInvested,
        grm: formData.purchasePrice / annualGross,
        dscr: annualDebtService > 0 ? noi / annualDebtService : 0,
        oer: annualGross > 0 ? annualExpensesExclDebt / annualGross : 0,
      };

      return newResult;
    });
  };

  const expenseData = result ? [
    { name: "Mortgage", value: result.cashFlow.fixedExpenses.mortgage },
    { name: "Taxes", value: result.cashFlow.fixedExpenses.taxes },
    { name: "Insurance", value: result.cashFlow.fixedExpenses.insurance },
    { name: "HOA", value: result.cashFlow.fixedExpenses.hoa },
    { name: "Maintenance", value: result.cashFlow.variableExpenses.maintenance },
    { name: "Vacancy", value: result.cashFlow.variableExpenses.vacancy },
    { name: "CapEx", value: result.cashFlow.variableExpenses.capEx },
    { name: "Management", value: result.cashFlow.variableExpenses.management },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-zillow-bg text-zillow-dark font-sans selection:bg-zillow-blue selection:text-white">
      {/* Header */}
      <header className="border-b border-zillow-border px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-zillow-blue p-1.5 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zillow-blue">PropAnalyst Pro</h1>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-zillow-gray font-semibold">
          Market Intelligence v1.2
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <section className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zillow-border p-6 rounded-xl shadow-md"
          >
            <h2 className="text-sm font-bold uppercase text-zillow-gray mb-6 flex items-center gap-2">
              <Search className="w-4 h-4 text-zillow-blue" />
              Property Parameters
            </h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1">Property Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Investment St, Austin, TX"
                  className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1">Purchase Price ($)</label>
                  <input 
                    type="number" 
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1">Down Payment (%)</label>
                  <input 
                    type="number" 
                    name="downPaymentPercent"
                    value={formData.downPaymentPercent}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1">Interest Rate (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1">HOA Monthly ($)</label>
                  <input 
                    type="number" 
                    name="hoaMonthly"
                    value={formData.hoaMonthly}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-zillow-blue text-white py-3.5 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-zillow-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-zillow-blue/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Market...
                  </>
                ) : (
                  <>
                    Run Feasibility Report
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {error && (
            <div className="bg-red-50 border border-zillow-error/20 rounded-xl p-4 text-zillow-error text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-white border border-zillow-border p-6 rounded-xl shadow-md">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-4 text-zillow-gray">Standard Assumptions</h3>
            <div className="space-y-5 text-[11px] font-medium">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-zillow-dark">
                  <span>Maintenance & Repairs</span>
                  <span className="font-bold text-zillow-blue">{formData.maintenancePercent}%</span>
                </div>
                <input 
                  type="range" 
                  name="maintenancePercent"
                  min="0" max="20" step="1"
                  disabled={loading}
                  value={formData.maintenancePercent}
                  onChange={handleInputChange}
                  className="w-full h-1.5 bg-zillow-blue-light rounded-lg appearance-none cursor-pointer accent-zillow-blue disabled:opacity-30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-zillow-dark">
                  <span>Vacancy Allowance</span>
                  <span className="font-bold text-zillow-blue">{formData.vacancyPercent}%</span>
                </div>
                <input 
                  type="range" 
                  name="vacancyPercent"
                  min="0" max="15" step="1"
                  disabled={loading}
                  value={formData.vacancyPercent}
                  onChange={handleInputChange}
                  className="w-full h-1.5 bg-zillow-blue-light rounded-lg appearance-none cursor-pointer accent-zillow-blue disabled:opacity-30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-zillow-dark">
                  <span>Capital Expenditures</span>
                  <span className="font-bold text-zillow-blue">{formData.capExPercent}%</span>
                </div>
                <input 
                  type="range" 
                  name="capExPercent"
                  min="0" max="15" step="1"
                  disabled={loading}
                  value={formData.capExPercent}
                  onChange={handleInputChange}
                  className="w-full h-1.5 bg-zillow-blue-light rounded-lg appearance-none cursor-pointer accent-zillow-blue disabled:opacity-30"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-zillow-dark">
                  <span>Property Management</span>
                  <span className="font-bold text-zillow-blue">{formData.managementPercent}%</span>
                </div>
                <input 
                  type="range" 
                  name="managementPercent"
                  min="0" max="15" step="1"
                  disabled={loading}
                  value={formData.managementPercent}
                  onChange={handleInputChange}
                  className="w-full h-1.5 bg-zillow-blue-light rounded-lg appearance-none cursor-pointer accent-zillow-blue disabled:opacity-30"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[400px] bg-white border border-zillow-border border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-12"
              >
                <div className="bg-zillow-blue-light p-6 rounded-full mb-6">
                  <Home className="w-12 h-12 text-zillow-blue" />
                </div>
                <h3 className="text-xl font-bold text-zillow-dark mb-2">Ready to Analyze?</h3>
                <p className="text-sm text-zillow-gray max-w-xs">Enter property details to generate a comprehensive investment report with real-time market data.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Tabs */}
                <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-zillow-border shadow-sm w-fit">
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                      "text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-lg transition-all",
                      activeTab === "overview" ? "bg-zillow-blue text-white shadow-md shadow-zillow-blue/20" : "text-zillow-gray hover:bg-zillow-blue-light hover:text-zillow-blue"
                    )}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab("growth")}
                    className={cn(
                      "text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-lg transition-all",
                      activeTab === "growth" ? "bg-zillow-blue text-white shadow-md shadow-zillow-blue/20" : "text-zillow-gray hover:bg-zillow-blue-light hover:text-zillow-blue"
                    )}
                  >
                    Long-term Growth
                  </button>
                  <button 
                    onClick={() => setActiveTab("forecast")}
                    className={cn(
                      "text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-lg transition-all",
                      activeTab === "forecast" ? "bg-zillow-blue text-white shadow-md shadow-zillow-blue/20" : "text-zillow-gray hover:bg-zillow-blue-light hover:text-zillow-blue"
                    )}
                  >
                    Market Forecast
                  </button>
                  <button 
                    onClick={() => setActiveTab("lease")}
                    className={cn(
                      "text-[10px] uppercase tracking-widest font-bold px-6 py-2.5 rounded-lg transition-all",
                      activeTab === "lease" ? "bg-zillow-blue text-white shadow-md shadow-zillow-blue/20" : "text-zillow-gray hover:bg-zillow-blue-light hover:text-zillow-blue"
                    )}
                  >
                    Lease Tool
                  </button>
                </div>

                {activeTab === "overview" ? (
                  <>
                    {/* Executive Summary */}
                    <div className={cn(
                      "p-8 rounded-2xl border flex items-start gap-6 shadow-md transition-all",
                      result.recommendation.decision === "BUY" 
                        ? "bg-white border-zillow-success/20 shadow-zillow-success/5" 
                        : "bg-white border-zillow-error/20 shadow-zillow-error/5"
                    )}>
                      <div className={cn(
                        "p-4 rounded-2xl shrink-0",
                        result.recommendation.decision === "BUY" ? "bg-zillow-success text-white" : "bg-zillow-error text-white"
                      )}>
                        {result.recommendation.decision === "BUY" ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                      </div>
                      <div>
                        <div className={cn(
                          "text-[10px] uppercase tracking-[0.2em] font-bold mb-1",
                          result.recommendation.decision === "BUY" ? "text-zillow-success" : "text-zillow-error"
                        )}>
                          Investment Recommendation
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-zillow-dark mb-2">
                          {result.recommendation.decision}: {result.recommendation.decision === "BUY" ? "High Viability" : "Low Viability"}
                        </h2>
                        <p className="text-sm text-zillow-gray leading-relaxed mb-4">{result.recommendation.reasoning}</p>
                        <div className="bg-zillow-blue-light/50 p-4 rounded-xl border border-zillow-blue/10">
                          <div className="text-[10px] uppercase tracking-widest font-bold text-zillow-blue mb-1 flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            5-Year AI Outlook
                          </div>
                          <p className="text-xs text-zillow-dark leading-relaxed italic">"{result.forecast.fiveYearOutlook}"</p>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { 
                          label: "Cap Rate", 
                          value: `${(result.metrics.capRate * 100).toFixed(2)}%`, 
                          icon: Percent,
                          description: `Cap Rate = NOI ($${Math.round(result.metrics.noi).toLocaleString()}) / Price ($${formData.purchasePrice.toLocaleString()}). Significance: Measures the property's natural rate of return without financing. Higher is generally better but may indicate higher risk.`
                        },
                        { 
                          label: "Cash-on-Cash", 
                          value: `${(result.metrics.cashOnCash * 100).toFixed(2)}%`, 
                          icon: DollarSign,
                          description: `CoC = Annual Cash Flow ($${Math.round(result.metrics.annualCashFlow).toLocaleString()}) / Cash Invested ($${Math.round(result.metrics.totalCashInvested).toLocaleString()}). Significance: Measures actual return on your out-of-pocket cash. Crucial for evaluating leverage.`
                        },
                        { 
                          label: "GRM", 
                          value: result.metrics.grm.toFixed(2), 
                          icon: BarChart3,
                          description: `GRM = Purchase Price ($${formData.purchasePrice.toLocaleString()}) / Gross Annual Rent ($${Math.round(result.cashFlow.grossMonthlyIncome * 12).toLocaleString()}). Significance: Quick screening tool; a lower GRM generally indicates a better deal relative to income.`
                        },
                        { 
                          label: "DSCR", 
                          value: result.metrics.dscr.toFixed(2), 
                          icon: Info,
                          description: `DSCR = NOI ($${Math.round(result.metrics.noi).toLocaleString()}) / Annual Debt Service ($${Math.round(result.cashFlow.fixedExpenses.mortgage * 12).toLocaleString()}). Significance: Ability to cover mortgage. Lenders look for > 1.20 for loan approval.`
                        },
                      ].map((metric, i) => (
                        <div key={i} className="bg-white border border-zillow-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group relative">
                          <div className="text-[10px] uppercase tracking-widest text-zillow-gray font-bold mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <metric.icon className="w-3.5 h-3.5 text-zillow-blue group-hover:scale-110 transition-transform" />
                              {metric.label}
                            </div>
                            <div className="group/info relative">
                              <Info className="w-3 h-3 text-zillow-border hover:text-zillow-blue cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zillow-dark text-white text-[10px] rounded-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 shadow-2xl pointer-events-none leading-relaxed">
                                {metric.description}
                                <div className="absolute top-full right-2 border-4 border-transparent border-t-zillow-dark" />
                              </div>
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-zillow-dark">{metric.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Monthly Cash Flow (EDITABLE) */}
                      <div className="bg-white border border-zillow-border p-6 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-bold uppercase text-zillow-gray mb-6 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-zillow-blue" />
                          Monthly Cash Flow
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-3 border-b border-zillow-border">
                            <span className="text-xs font-bold text-zillow-dark">Gross Income</span>
                            <div className="flex items-center bg-zillow-blue-light rounded-lg px-2">
                              <span className="text-zillow-blue font-bold text-sm">$</span>
                              <input 
                                type="number"
                                value={result.cashFlow.grossMonthlyIncome}
                                onChange={(e) => handleCashFlowEdit('grossMonthlyIncome', '', parseFloat(e.target.value) || 0)}
                                className="font-bold text-zillow-blue bg-transparent border-none text-right focus:ring-0 w-24 py-1.5"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2.5">
                            <div className="text-[10px] uppercase tracking-widest text-zillow-gray font-bold">Fixed Expenses</div>
                            {Object.entries(result.cashFlow.fixedExpenses).map(([key, val]) => (
                              <div key={key} className="flex justify-between text-xs items-center group">
                                <span className="capitalize text-zillow-gray group-hover:text-zillow-dark transition-colors">{key}</span>
                                <div className="flex items-center border-b border-transparent hover:border-zillow-blue transition-all">
                                  <span className="text-zillow-gray text-[10px]">$</span>
                                  <input 
                                    type="number"
                                    value={val}
                                    onChange={(e) => handleCashFlowEdit('fixedExpenses', key, parseFloat(e.target.value) || 0)}
                                    className="font-medium text-zillow-dark bg-transparent border-none text-right focus:ring-0 w-20 py-0.5"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2.5">
                            <div className="text-[10px] uppercase tracking-widest text-zillow-gray font-bold">Variable Reserves</div>
                            {Object.entries(result.cashFlow.variableExpenses).map(([key, val]) => (
                              <div key={key} className="flex justify-between text-xs items-center group">
                                <span className="capitalize text-zillow-gray group-hover:text-zillow-dark transition-colors">{key}</span>
                                <div className="flex items-center border-b border-transparent hover:border-zillow-blue transition-all">
                                  <span className="text-zillow-gray text-[10px]">$</span>
                                  <input 
                                    type="number"
                                    value={val}
                                    onChange={(e) => handleCashFlowEdit('variableExpenses', key, parseFloat(e.target.value) || 0)}
                                    className="font-medium text-zillow-dark bg-transparent border-none text-right focus:ring-0 w-20 py-0.5"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className={cn(
                            "flex justify-between items-center pt-4 border-t border-zillow-border font-bold mt-2",
                            result.cashFlow.netMonthlyCashFlow > 0 ? "text-zillow-success" : "text-zillow-error"
                          )}>
                            <span className="text-xs uppercase tracking-wider">Net Cash Flow</span>
                            <span className="text-xl font-bold">${result.cashFlow.netMonthlyCashFlow.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expense Breakdown Chart */}
                      <div className="bg-white border border-zillow-border p-6 rounded-2xl shadow-sm flex flex-col">
                        <h3 className="text-sm font-bold uppercase text-zillow-gray mb-6 flex items-center gap-2">
                          <PieChartIcon className="w-4 h-4 text-zillow-blue" />
                          Expense Distribution
                        </h3>
                        <div className="flex-1 min-h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expenseData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {expenseData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #D1D1D7', 
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }} 
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                          {expenseData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-zillow-gray">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="truncate">{d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Comparable Rentals */}
                      <div className="bg-white border border-zillow-border p-8 rounded-2xl shadow-sm md:col-span-2">
                        <h3 className="text-sm font-bold uppercase text-zillow-gray mb-8 flex items-center gap-2">
                          <Search className="w-4 h-4 text-zillow-blue" />
                          Comparable Rental Properties
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {result.comparables.map((comp, i) => (
                            <div key={i} className="group border border-zillow-border rounded-2xl p-5 hover:border-zillow-blue hover:shadow-lg transition-all bg-white relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-zillow-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="text-[10px] uppercase tracking-widest font-bold mb-2 text-zillow-blue">{comp.distance} away</div>
                              <div className="text-sm font-bold mb-2 text-zillow-dark line-clamp-1">{comp.address}</div>
                              <div className="text-2xl font-bold text-zillow-success mb-3">${comp.rent.toLocaleString()}<span className="text-xs text-zillow-gray font-normal">/mo</span></div>
                              <div className="text-[9px] uppercase font-bold mb-4 px-2.5 py-1 bg-zillow-blue-light text-zillow-blue rounded-full inline-block">{comp.type}</div>
                              <div className="space-y-2">
                                {comp.features.map((feat, j) => (
                                  <div key={j} className="text-[10px] flex items-center gap-2 text-zillow-gray">
                                    <CheckCircle2 className="w-3 h-3 text-zillow-success shrink-0" />
                                    {feat}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Property Specs & Market Data */}
                      <div className="bg-zillow-dark text-white p-8 rounded-2xl shadow-xl">
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-8 text-zillow-blue">Property Intelligence</h3>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="text-[10px] uppercase font-bold text-zillow-gray">Specifications</div>
                            <ul className="space-y-3 text-xs">
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">SqFt</span>
                                <span className="font-bold">{result.propertySpecs.sqft.toLocaleString()}</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Beds/Baths</span>
                                <span className="font-bold">{result.propertySpecs.beds}/{result.propertySpecs.baths}</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Year Built</span>
                                <span className="font-bold">{result.propertySpecs.yearBuilt}</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Lot Size</span>
                                <span className="font-bold truncate max-w-[80px]">{result.propertySpecs.lotSize}</span>
                              </li>
                            </ul>
                          </div>
                          <div className="space-y-4">
                            <div className="text-[10px] uppercase font-bold text-zillow-gray">Market Context</div>
                            <ul className="space-y-3 text-xs">
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Median Rent</span>
                                <span className="font-bold text-zillow-success">${result.marketData.medianRent.toLocaleString()}</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Vacancy</span>
                                <span className="font-bold">{(result.marketData.vacancyRate * 100).toFixed(1)}%</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Appreciation</span>
                                <span className="font-bold text-zillow-blue">{(result.marketData.appreciationRate * 100).toFixed(1)}%</span>
                              </li>
                              <li className="flex justify-between border-b border-white/10 pb-2">
                                <span className="text-zillow-gray">Tax Rate</span>
                                <span className="font-bold">{(result.marketData.taxRate * 100).toFixed(2)}%</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Risk Analysis */}
                      <div className="bg-white border border-zillow-border p-8 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-bold uppercase text-zillow-gray mb-8 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-zillow-warning" />
                          Risk & Opportunities
                        </h3>
                        <div className="space-y-8">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-zillow-error mb-4 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-zillow-error" />
                              Red Flags
                            </div>
                            <ul className="space-y-3">
                              {result.riskAnalysis.redFlags.map((flag, i) => (
                                <li key={i} className="text-xs flex items-start gap-3 bg-red-50/50 p-3 rounded-xl text-zillow-dark">
                                  <AlertTriangle className="w-4 h-4 text-zillow-error shrink-0 mt-0.5" />
                                  {flag}
                                </li>
                              ))}
                              {result.forecast.appreciation.some(a => a.rate < 0) && (
                                <li className="text-xs flex items-start gap-3 bg-red-50/50 p-3 rounded-xl text-zillow-dark">
                                  <TrendingUp className="w-4 h-4 text-zillow-error shrink-0 mt-0.5" />
                                  AI Forecast predicts negative appreciation in the coming years.
                                </li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest font-bold text-zillow-success mb-4 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-zillow-success" />
                              Opportunities
                            </div>
                            <ul className="space-y-3">
                              {result.riskAnalysis.opportunities.map((opp, i) => (
                                <li key={i} className="text-xs flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl text-zillow-dark">
                                  <CheckCircle2 className="w-4 h-4 text-zillow-success shrink-0 mt-0.5" />
                                  {opp}
                                </li>
                              ))}
                              {result.forecast.rentalDemand.some(d => d.demandScore > 80) && (
                                <li className="text-xs flex items-start gap-3 bg-emerald-50/50 p-3 rounded-xl text-zillow-dark">
                                  <TrendingUp className="w-4 h-4 text-zillow-success shrink-0 mt-0.5" />
                                  AI Forecast predicts exceptionally high rental demand ({Math.max(...result.forecast.rentalDemand.map(d => d.demandScore))}+ score).
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Metric Glossary */}
                      <div className="bg-zillow-blue-light/30 border border-zillow-blue/10 p-8 rounded-2xl md:col-span-2">
                        <h3 className="text-xs font-bold uppercase text-zillow-blue mb-6 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Investment Metric Glossary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-zillow-dark mb-1">GRM (Gross Rent Multiplier)</h4>
                              <p className="text-[11px] text-zillow-gray leading-relaxed">
                                Calculated as <code className="bg-white px-1 rounded">Purchase Price / Gross Annual Rent</code>. 
                                It's a quick valuation metric that tells you how many years it would take for the property to pay for itself in gross received rent. 
                                <span className="font-bold text-zillow-blue"> Significance: Lower is better; it helps identify undervalued properties relative to their income potential.</span>
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-zillow-dark mb-1">DSCR (Debt Service Coverage Ratio)</h4>
                              <p className="text-[11px] text-zillow-gray leading-relaxed">
                                Calculated as <code className="bg-white px-1 rounded">Net Operating Income / Annual Debt Service</code>. 
                                This measures the property's ability to cover its own mortgage payments. 
                                <span className="font-bold text-zillow-blue"> Significance: A DSCR of 1.0 means break-even. Lenders typically look for 1.20 or higher to ensure a safety margin.</span>
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-bold text-zillow-dark mb-1">Cap Rate (Capitalization Rate)</h4>
                              <p className="text-[11px] text-zillow-gray leading-relaxed">
                                Calculated as <code className="bg-white px-1 rounded">Net Operating Income / Purchase Price</code>. 
                                It represents the expected annual rate of return on a real estate investment property if it were paid for in full with cash.
                                <span className="font-bold text-zillow-blue"> Significance: Used to compare the profitability and risk of different investment properties regardless of financing.</span>
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-zillow-dark mb-1">Cash-on-Cash Return</h4>
                              <p className="text-[11px] text-zillow-gray leading-relaxed">
                                Calculated as <code className="bg-white px-1 rounded">Annual Pre-tax Cash Flow / Total Cash Invested</code>. 
                                This is often considered the most important metric for rental investors as it measures the actual return on the literal cash you spent (down payment + closing costs).
                                <span className="font-bold text-zillow-blue"> Significance: Directly measures how hard your cash is working for you when using leverage.</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeTab === "growth" ? (
                  <GrowthAnalysis result={result} formData={formData} />
                ) : activeTab === "forecast" ? (
                  <div className="space-y-6">
                    {/* Market Forecast View */}
                    <div className="bg-white border border-zillow-border p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-zillow-blue-light rounded-2xl">
                          <TrendingUp className="w-6 h-6 text-zillow-blue" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-zillow-dark">AI Market Forecast</h3>
                          <p className="text-xs text-zillow-gray">Predictive neighborhood analysis for the next 5 years</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Appreciation Forecast Chart */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-zillow-dark flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-zillow-blue" />
                            Predicted Appreciation Rate (%)
                          </h4>
                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={result.forecast.appreciation}>
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
                                  tickFormatter={(value) => `${value}%`}
                                />
                                <RechartsTooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#ffffff', 
                                    border: '1px solid #e8e8e8', 
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                  }}
                                  formatter={(value: number) => [`${value}%`, "Appreciation Rate"]}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="rate" 
                                  stroke="#006aff" 
                                  strokeWidth={3} 
                                  dot={{ r: 4, fill: '#006aff' }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Rental Demand Forecast Chart */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-zillow-dark flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-zillow-success" />
                            Rental Demand Score (1-100)
                          </h4>
                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={result.forecast.rentalDemand}>
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
                                  domain={[0, 100]}
                                />
                                <RechartsTooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#ffffff', 
                                    border: '1px solid #e8e8e8', 
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                  }}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-white p-3 border border-zillow-border rounded-lg shadow-lg">
                                          <p className="font-bold text-zillow-dark mb-1">Year {data.year}</p>
                                          <p className="text-zillow-success font-bold">Demand Score: {data.demandScore}</p>
                                          <p className="text-zillow-gray text-[10px] mt-1 italic">Sentiment: {data.sentiment}</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="demandScore" 
                                  fill="#008A00" 
                                  radius={[4, 4, 0, 0]} 
                                  barSize={40}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="mt-12 p-6 bg-zillow-bg rounded-2xl border border-zillow-border">
                        <h4 className="text-sm font-bold text-zillow-dark mb-4 flex items-center gap-2">
                          <Info className="w-4 h-4 text-zillow-blue" />
                          5-Year Strategic Outlook
                        </h4>
                        <p className="text-sm text-zillow-gray leading-relaxed italic">
                          "{result.forecast.fiveYearOutlook}"
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <LeaseGenerator />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-12 mt-12 border-t border-zillow-border text-[10px] uppercase tracking-widest text-zillow-gray flex justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-zillow-dark">PropAnalyst Pro &copy; 2026</span>
          <span className="opacity-50">|</span>
          <span>Financial data for analysis purposes only</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-zillow-blue transition-colors">Terms</a>
          <a href="#" className="hover:text-zillow-blue transition-colors">Privacy</a>
          <a href="#" className="hover:text-zillow-blue transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
