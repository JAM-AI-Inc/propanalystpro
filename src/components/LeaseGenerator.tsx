import React, { useState } from "react";
import { FileText, Download, Loader2, AlertCircle, ChevronRight, User, MapPin, DollarSign, Calendar, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { generateLeaseAgreement } from "../services/geminiService";
import { LeaseData } from "../types";
import { cn } from "../lib/utils";

export function LeaseGenerator() {
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LeaseData>({
    landlordName: "",
    tenantName: "",
    propertyAddress: "",
    rentAmount: 2000,
    leaseDuration: "12 months",
    securityDeposit: 2000,
    startDate: "",
    specificClauses: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "rentAmount" || name === "securityDeposit" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await generateLeaseAgreement(formData);
      setAgreement(result);
    } catch (err) {
      console.error(err);
      setError("Failed to generate lease agreement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!agreement) return;
    const element = document.createElement("a");
    const file = new Blob([agreement], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "Lease_Agreement.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zillow-border p-6 md:p-8 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 mb-8 text-center sm:text-left">
          <div className="p-3 bg-zillow-blue-light rounded-2xl">
            <FileText className="w-6 h-6 text-zillow-blue" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zillow-dark">Lease Agreement Generator</h3>
            <p className="text-xs text-zillow-gray">Create professional, customizable lease documents in seconds</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-zillow-blue" />
                Landlord Full Name
              </label>
              <input 
                type="text" 
                name="landlordName"
                value={formData.landlordName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-zillow-blue" />
                Tenant Full Name
              </label>
              <input 
                type="text" 
                name="tenantName"
                value={formData.tenantName}
                onChange={handleInputChange}
                placeholder="Jane Smith"
                className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-zillow-blue" />
                Property Address
              </label>
              <input 
                type="text" 
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleInputChange}
                placeholder="123 Rental Ave, City, State"
                className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3 text-zillow-blue" />
                  Monthly Rent ($)
                </label>
                <input 
                  type="number" 
                  name="rentAmount"
                  value={formData.rentAmount}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3 text-zillow-blue" />
                  Security Deposit ($)
                </label>
                <input 
                  type="number" 
                  name="securityDeposit"
                  value={formData.securityDeposit}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-zillow-blue" />
                  Lease Duration
                </label>
                <input 
                  type="text" 
                  name="leaseDuration"
                  value={formData.leaseDuration}
                  onChange={handleInputChange}
                  placeholder="e.g. 12 months"
                  className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-zillow-blue" />
                  Start Date
                </label>
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-zillow-dark mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-zillow-blue" />
                Specific Clauses or Notes
              </label>
              <textarea 
                name="specificClauses"
                value={formData.specificClauses}
                onChange={handleInputChange}
                placeholder="e.g. No pets allowed, No smoking, Tenant pays utilities..."
                rows={3}
                className="w-full bg-white border border-zillow-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zillow-blue/20 focus:border-zillow-blue transition-all resize-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-zillow-blue text-white py-4 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-zillow-blue-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-zillow-blue/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Agreement...
                </>
              ) : (
                <>
                  Generate Lease Agreement
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 bg-red-50 border border-zillow-error/20 rounded-xl p-4 text-zillow-error text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {agreement && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zillow-border rounded-2xl shadow-md overflow-hidden"
          >
            <div className="bg-zillow-dark px-6 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zillow-blue" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Generated Document</span>
              </div>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 text-[10px] font-bold text-zillow-blue hover:text-white transition-colors uppercase tracking-widest"
              >
                <Download className="w-3.5 h-3.5" />
                Download .md
              </button>
            </div>
            <div className="p-6 md:p-8 max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
              <div className="markdown-body">
                <Markdown>{agreement}</Markdown>
              </div>
            </div>
            <div className="bg-zillow-bg px-6 md:px-8 py-4 border-t border-zillow-border">
              <p className="text-[10px] text-zillow-gray italic text-center">
                Note: This document is a template. Always review with a legal professional before execution.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
