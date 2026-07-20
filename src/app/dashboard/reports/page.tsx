"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  FileText,
  Download,
  Printer,
  Search,
  User,
  Car,
  Shield,
  Clock,
  AlertTriangle,
  Building,
  CheckCircle2,
  Calendar,
  X,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  manufacturer: string;
  model: string;
  year: number;
  engineNumber: string;
  chassisNumber: string;
  color?: string;
}

interface Policy {
  _id: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  startDate: string;
  expiryDate: string;
  comments?: string;
  isActive: boolean;
  customer?: Customer;
  vehicle?: Vehicle;
}

export default function ReportsPage() {
  const [reportTab, setReportTab] = useState<"excel" | "pdf">("excel");

  // Selection states for PDF Report
  const [pdfTemplate, setPdfTemplate] = useState<"customer" | "vehicle" | "policy">("customer");
  
  // Search state for autocomplete dropdowns
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);

  // PDF Preview Data container
  const [previewingReport, setPreviewingReport] = useState(false);
  const [reportDetails, setReportDetails] = useState<any | null>(null);

  // Excel generation loading
  const [exporting, setExporting] = useState<string | null>(null);

  // Auto-search logic when search query changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        let endpoint = "";
        if (pdfTemplate === "customer") {
          endpoint = `/api/customers?limit=6&search=${encodeURIComponent(searchQuery)}`;
        } else if (pdfTemplate === "vehicle") {
          endpoint = `/api/vehicles?limit=6&search=${encodeURIComponent(searchQuery)}`;
        } else if (pdfTemplate === "policy") {
          endpoint = `/api/policies?limit=6&search=${encodeURIComponent(searchQuery)}&includeInactive=true`;
        }

        const res = await fetch(endpoint);
        const result = await res.json();
        if (result.success) {
          if (pdfTemplate === "customer") {
            setSearchResults(result.data.customers || []);
          } else if (pdfTemplate === "vehicle") {
            setSearchResults(result.data.vehicles || []);
          } else if (pdfTemplate === "policy") {
            setSearchResults(result.data.policies || []);
          }
        }
      } catch (error) {
        console.error("Failed to query reports auto-complete:", error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, pdfTemplate]);

  // Reset selected entity when template tab shifts
  const handleTemplateChange = (tmpl: "customer" | "vehicle" | "policy") => {
    setPdfTemplate(tmpl);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedEntity(null);
  };

  // Trigger Excel download process
  const exportToExcel = async (filterType: "all" | "active" | "expired" | "expiring") => {
    setExporting(filterType);
    try {
      // Fetch matching policies from database
      const res = await fetch(`/api/policies?limit=100&includeInactive=true`);
      const result = await res.json();
      if (!result.success || !result.data?.policies) {
        toast.error("Could not fetch reports data.");
        setExporting(null);
        return;
      }

      const rawPolicies: Policy[] = result.data.policies;
      const now = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      // Apply in-memory client-side filter
      let filtered: Policy[] = [];
      if (filterType === "all") {
        filtered = rawPolicies;
      } else if (filterType === "active") {
        filtered = rawPolicies.filter((p) => new Date(p.expiryDate) > now && p.isActive);
      } else if (filterType === "expired") {
        filtered = rawPolicies.filter((p) => new Date(p.expiryDate) <= now && p.isActive);
      } else if (filterType === "expiring") {
        filtered = rawPolicies.filter((p) => {
          const exp = new Date(p.expiryDate);
          return exp > now && exp <= thirtyDays && p.isActive;
        });
      }

      if (filtered.length === 0) {
        toast.warning("No records found matching this report filter.");
        setExporting(null);
        return;
      }

      // Convert to structured CSV
      const headers = [
        "Policy ID",
        "Policy Number",
        "Insurance Company",
        "Policy Type",
        "Premium Amount (INR)",
        "Start Date",
        "Expiry Date",
        "Status",
        "Customer Name",
        "Customer Phone",
        "Customer Email",
        "Vehicle Number",
        "Manufacturer",
        "Model",
        "Engine Number",
        "Chassis Number"
      ];

      const rows = filtered.map((p) => {
        const isExp = new Date(p.expiryDate) <= now;
        const statusStr = !p.isActive ? "Inactive" : isExp ? "Expired" : "Active";
        return [
          p._id,
          p.policyNumber,
          p.insuranceCompany,
          p.policyType,
          p.premiumAmount,
          p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "",
          p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "",
          statusStr,
          p.customer?.name || "N/A",
          p.customer?.phone || "N/A",
          p.customer?.email || "",
          p.vehicle?.vehicleNumber || "N/A",
          p.vehicle?.manufacturer || "",
          p.vehicle?.model || "",
          p.vehicle?.engineNumber || "",
          p.vehicle?.chassisNumber || ""
        ];
      });

      // Construct CSV content string
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

      // Trigger standard local browser file download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `PolicyFlow_${filterType}_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track log activity
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Report Downloads",
          details: `Downloaded Excel/CSV spreadsheet report for: ${filterType.toUpperCase()} policies.`
        })
      });

      toast.success("Spreadsheet export completed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Export execution failed.");
    } finally {
      setExporting(null);
    }
  };

  // Compile detailed statement and open the printable overlay modal
  const generatePdfReport = async () => {
    if (!selectedEntity) {
      toast.error("Please search and select a specific record first.");
      return;
    }

    setPreviewingReport(true);
    setReportDetails(null);

    try {
      if (pdfTemplate === "customer") {
        // Fetch all linked policies & vehicles for customer
        const res = await fetch(`/api/policies?customerId=${selectedEntity._id}&includeInactive=true`);
        const result = await res.json();
        setReportDetails({
          type: "Customer Profile & Policy Statement",
          subjectName: selectedEntity.name,
          metadata: {
            Phone: selectedEntity.phone,
            Email: selectedEntity.email || "Not specified",
            Address: selectedEntity.address || "Not specified",
            Registered: selectedEntity.createdAt ? new Date(selectedEntity.createdAt).toLocaleDateString() : "Active Customer"
          },
          items: result.success ? result.data.policies : []
        });
      } else if (pdfTemplate === "vehicle") {
        // Fetch all linked policies for vehicle
        const res = await fetch(`/api/policies?vehicleId=${selectedEntity._id}&includeInactive=true`);
        const result = await res.json();
        setReportDetails({
          type: "Vehicle History & Owner Ledger",
          subjectName: `${selectedEntity.manufacturer} ${selectedEntity.model}`,
          metadata: {
            "Vehicle Plate": selectedEntity.vehicleNumber,
            "Chassis Number": selectedEntity.chassisNumber,
            "Engine Number": selectedEntity.engineNumber,
            "Year Model": selectedEntity.year,
            Color: selectedEntity.color || "Standard",
          },
          items: result.success ? result.data.policies : []
        });
      } else if (pdfTemplate === "policy") {
        // Selected entity is already a policy object!
        setReportDetails({
          type: "Insurance Policy Certificate Statement",
          subjectName: `Policy #${selectedEntity.policyNumber}`,
          metadata: {
            "Insurance Provider": selectedEntity.insuranceCompany,
            "Policy Class": selectedEntity.policyType,
            Premium: `₹${selectedEntity.premiumAmount?.toLocaleString("en-IN")}`,
            "Coverage Period": `${new Date(selectedEntity.startDate).toLocaleDateString()} to ${new Date(selectedEntity.expiryDate).toLocaleDateString()}`,
            "Attached File": selectedEntity.attachmentUrl ? "Attached Certificate (PDF Available)" : "No files attached",
            Status: new Date(selectedEntity.expiryDate) > new Date() ? "Active Coverage" : "Expired Coverage"
          },
          additional: {
            comments: selectedEntity.comments || "No administrative comments registered.",
            customerName: selectedEntity.customer?.name,
            customerPhone: selectedEntity.customer?.phone,
            vehiclePlate: selectedEntity.vehicle?.vehicleNumber,
            vehicleModel: `${selectedEntity.vehicle?.manufacturer} ${selectedEntity.vehicle?.model}`
          }
        });
      }

      // Log download report activity
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "Report Downloads",
          details: `Generated PDF/Print Statement report for ${pdfTemplate}: ${selectedEntity.name || selectedEntity.policyNumber || selectedEntity.vehicleNumber}`
        })
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to compile statement details.");
      setPreviewingReport(false);
    }
  };

  // Builds an actual PDF document (not a screenshot of the page) using jsPDF,
  // so only the statement content ends up in the file - never the sidebar,
  // header, or on-screen controls.
  const downloadPdfReport = () => {
    if (!reportDetails) return;

    const INK: [number, number, number] = [23, 23, 23];
    const MUTED: [number, number, number] = [115, 115, 115];
    const LIGHT_BG: [number, number, number] = [248, 250, 252];
    const BORDER: [number, number, number] = [225, 225, 225];

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 48;
    const contentWidth = pageWidth - marginX * 2;
    const now = new Date();
    let y = 56;

    // --- Letterhead ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text("PolicyFlow Ltd.", marginX, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text("STANDARD OPERATIONS LEDGER", marginX, y + 16);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Broker Certificate & Database Statement", marginX, y + 29);

    const refNo = `PF-LE-${Date.now().toString().slice(6)}`;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(`DATE: ${now.toLocaleDateString("en-IN")}`, pageWidth - marginX, y - 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`REF NO: ${refNo}`, pageWidth - marginX, y + 7, { align: "right" });
    doc.text("OPERATOR ID: SYSTEM", pageWidth - marginX, y + 20, { align: "right" });

    y += 44;
    doc.setDrawColor(...INK);
    doc.setLineWidth(1.4);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 28;

    // --- Subject ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.text(`SUBJECT CLASSIFICATION: ${reportDetails.type.toUpperCase()}`, marginX, y);
    y += 20;
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(String(reportDetails.subjectName || ""), marginX, y);
    y += 18;

    // --- Metadata card (2-column label/value grid) ---
    const metaEntries = Object.entries(reportDetails.metadata || {});
    if (metaEntries.length > 0) {
      const colGap = 24;
      const colWidth = (contentWidth - colGap) / 2;
      const rowHeight = 34;
      const rows = Math.ceil(metaEntries.length / 2);
      const boxHeight = rows * rowHeight + 20;

      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(marginX, y, contentWidth, boxHeight, 6, 6, "FD");

      metaEntries.forEach(([label, value], idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cellX = marginX + 16 + col * (colWidth + colGap);
        const cellY = y + 20 + row * rowHeight;

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...MUTED);
        doc.text(String(label).toUpperCase(), cellX, cellY);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...INK);
        doc.text(doc.splitTextToSize(String(value ?? ""), colWidth - 16), cellX, cellY + 13);
      });

      y += boxHeight + 26;
    }

    // --- Additional (policy template): owner linkages + comments ---
    if (reportDetails.additional) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text("ASSET OWNER LINKAGES", marginX, y);
      y += 16;

      const half = contentWidth / 2;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED);
      doc.text("LINKED CUSTOMER", marginX, y);
      doc.text("MAPPED VEHICLE", marginX + half, y);
      y += 13;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(String(reportDetails.additional.customerName || "N/A"), marginX, y);
      doc.text(String(reportDetails.additional.vehiclePlate || "N/A"), marginX + half, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(String(reportDetails.additional.customerPhone || ""), marginX, y);
      doc.text(String(reportDetails.additional.vehicleModel || ""), marginX + half, y);
      y += 24;

      doc.setDrawColor(...BORDER);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 18;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED);
      doc.text("COMMENTS", marginX, y);
      y += 14;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const commentLines = doc.splitTextToSize(String(reportDetails.additional.comments || ""), contentWidth);
      doc.text(commentLines, marginX, y);
      y += commentLines.length * 12 + 20;
    }

    // --- Linked Policy Register table ---
    if (reportDetails.items) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text("LINKED POLICY REGISTER", marginX, y);

      if (reportDetails.items.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text("No historical insurance records found matching this ledger.", marginX, y + 16);
      } else {
        autoTable(doc, {
          startY: y + 10,
          margin: { left: marginX, right: marginX },
          head: [["Policy Number", "Company / Type", "Validity", "Premium"]],
          body: reportDetails.items.map((p: any) => [
            `#${p.policyNumber}`,
            `${p.insuranceCompany}\n${p.policyType}`,
            `${new Date(p.startDate).toLocaleDateString()} - ${new Date(p.expiryDate).toLocaleDateString()}`,
            `Rs. ${p.premiumAmount?.toLocaleString("en-IN")}`,
          ]),
          styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK, lineColor: BORDER },
          headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          columnStyles: { 3: { halign: "right" } },
          theme: "grid",
        });
      }
    }

    // --- Footer + page numbers on every page ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 56;

      doc.setDrawColor(...BORDER);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(marginX, footerY, pageWidth - marginX, footerY);
      doc.setLineDashPattern([], 0);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED);
      doc.text("Security Signature Verification", marginX, footerY + 16);
      doc.setFont("helvetica", "normal");
      doc.text("PolicyFlow Database Verification Active", marginX, footerY + 28);

      doc.setDrawColor(...BORDER);
      doc.roundedRect(pageWidth - marginX - 140, footerY + 6, 140, 28, 4, 4);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text("POLICYFLOW SEAL", pageWidth - marginX - 70, footerY + 17, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text("Verified digitally (100% Secure)", pageWidth - marginX - 70, footerY + 27, { align: "center" });

      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 20, { align: "center" });
    }

    const safeName = String(reportDetails.subjectName || "Statement").replace(/[^a-z0-9]+/gi, "_");
    doc.save(`PolicyFlow_${safeName}_${now.toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div id="reports_module_panel" className="space-y-6 pb-12">
      
      {/* Header section */}
      <div id="reports_header" className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 shrink-0" />
            Audit & Reporting Engine
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Export structured database segments to standard CSV Excel spreadsheets, or generate print-ready PDF statements.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-neutral-100 rounded-xl p-1 border border-neutral-200 self-start md:self-auto shrink-0">
          <button
            onClick={() => setReportTab("excel")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              reportTab === "excel"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel Spreadsheets
          </button>
          <button
            onClick={() => setReportTab("pdf")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              reportTab === "pdf"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Print Statements (PDF)
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {reportTab === "excel" ? (
          /* EXCEL TEMPLATES LAYOUT */
          <motion.div
            key="excel_panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Card 1: All Policies */}
            <div id="report_all_policies" className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl inline-flex"><FileSpreadsheet className="h-5 w-5" /></span>
                <h3 className="text-sm font-bold text-neutral-800">All Registered Policies</h3>
                <p className="text-[11px] text-neutral-400">Exports all policies globally regardless of current date, provider, or state.</p>
              </div>
              <button
                disabled={!!exporting}
                onClick={() => exportToExcel("all")}
                className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:bg-neutral-300"
              >
                {exporting === "all" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export CSV
              </button>
            </div>

            {/* Card 2: Active Policies */}
            <div id="report_active_policies" className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl inline-flex"><CheckCircle2 className="h-5 w-5" /></span>
                <h3 className="text-sm font-bold text-neutral-800">Active Policies</h3>
                <p className="text-[11px] text-neutral-400">Exports active in-force insurance policies whose expiry date is strictly in the future.</p>
              </div>
              <button
                disabled={!!exporting}
                onClick={() => exportToExcel("active")}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:bg-neutral-300"
              >
                {exporting === "active" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export Active
              </button>
            </div>

            {/* Card 3: Expired Policies */}
            <div id="report_expired_policies" className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl inline-flex"><X className="h-5 w-5" /></span>
                <h3 className="text-sm font-bold text-neutral-800">Expired Policies</h3>
                <p className="text-[11px] text-neutral-400">Exports policies that have lapsed. Extremely useful for cold calling campaigns.</p>
              </div>
              <button
                disabled={!!exporting}
                onClick={() => exportToExcel("expired")}
                className="w-full py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:bg-neutral-300"
              >
                {exporting === "expired" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export Expired
              </button>
            </div>

            {/* Card 4: Expiring Soon */}
            <div id="report_expiring_soon" className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl inline-flex"><Clock className="h-5 w-5" /></span>
                <h3 className="text-sm font-bold text-neutral-800">Expiring (Next 30 Days)</h3>
                <p className="text-[11px] text-neutral-400">Exports high-priority targets expiring in the next 30 days to maximize renewal conversions.</p>
              </div>
              <button
                disabled={!!exporting}
                onClick={() => exportToExcel("expiring")}
                className="w-full py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:bg-neutral-300"
              >
                {exporting === "expiring" ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export Pipeline
              </button>
            </div>
          </motion.div>
        ) : (
          /* PDF / STATEMENT WORKFLOW */
          <motion.div
            key="pdf_panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left selector menu */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-neutral-800">1. Select Statement Template</h3>
                
                {/* Visual select buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleTemplateChange("customer")}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      pdfTemplate === "customer"
                        ? "border-blue-500 bg-blue-50/20 text-blue-800"
                        : "border-neutral-100 hover:border-neutral-200 text-neutral-600"
                    }`}
                  >
                    <User className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span>Customer Profile Summary</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Contact info, linked vehicles, full policy timeline</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTemplateChange("vehicle")}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      pdfTemplate === "vehicle"
                        ? "border-blue-500 bg-blue-50/20 text-blue-800"
                        : "border-neutral-100 hover:border-neutral-200 text-neutral-600"
                    }`}
                  >
                    <Car className="h-4 w-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span>Vehicle Asset History</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Specifications, chassis ledger, previous owners</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTemplateChange("policy")}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      pdfTemplate === "policy"
                        ? "border-blue-500 bg-blue-50/20 text-blue-800"
                        : "border-neutral-100 hover:border-neutral-200 text-neutral-600"
                    }`}
                  >
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span>Policy Certificate & Details</span>
                      <span className="text-[10px] text-neutral-400 font-normal">Terms, premium, attachments, administrative audit</span>
                    </div>
                  </button>
                </div>

                {/* Search lookup area */}
                <div className="space-y-2 pt-3 border-t border-neutral-50">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    2. Query Record
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder={`Search ${pdfTemplate} name, number...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 pl-9 pr-4 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Autocomplete dropdown list */}
                  {searching && (
                    <p className="text-[10px] text-blue-600 animate-pulse">Searching active inventory...</p>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className="border border-neutral-100 rounded-xl bg-white max-h-40 overflow-y-auto divide-y divide-neutral-50 shadow-sm">
                      {searchResults.map((item) => {
                        let mainText = item.name || item.vehicleNumber || item.policyNumber;
                        let subText = item.phone || `${item.manufacturer} ${item.model}` || item.insuranceCompany;
                        return (
                          <button
                            key={item._id}
                            onClick={() => {
                              setSelectedEntity(item);
                              setSearchResults([]);
                              setSearchQuery("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-neutral-50 text-[11px] transition-all flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-neutral-700">{mainText}</p>
                              <p className="text-neutral-400">{subText}</p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected active display widget */}
                {selectedEntity && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {selectedEntity.name || selectedEntity.vehicleNumber || selectedEntity.policyNumber}
                        </p>
                        <p className="text-[9px] text-emerald-600">Selected target loaded</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEntity(null)}
                      className="text-emerald-700 hover:bg-emerald-100 rounded-lg p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Submit Compilation */}
                <button
                  onClick={generatePdfReport}
                  disabled={!selectedEntity}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:bg-neutral-100 disabled:text-neutral-400 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate Statement
                </button>
              </div>
            </div>

            {/* Right statement preview frame */}
            <div id="print_area" className="lg:col-span-2">
              {previewingReport ? (
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-6">
                  {reportDetails ? (
                    <>
                      {/* Statement controls */}
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Compiled Successfully
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewingReport(false)}
                            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                          >
                            Close
                          </button>
                          <button
                            onClick={downloadPdfReport}
                            className="rounded-xl bg-blue-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" /> Download PDF
                          </button>
                        </div>
                      </div>

                      {/* STATEMENT SHEET */}
                      <div className="space-y-6 text-neutral-800">
                        {/* Title Header Block */}
                        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-5">
                          <div className="space-y-1">
                            <h2 className="text-xl font-black tracking-tight text-neutral-900">PolicyFlow Ltd.</h2>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Standard Operations Ledger</p>
                            <p className="text-[10px] text-neutral-500">Authorized Broker Certificate & Database statement.</p>
                          </div>
                          <div className="text-right text-[10px] text-neutral-400 space-y-0.5">
                            <p className="font-bold text-neutral-700">DATE: {new Date().toLocaleDateString("en-IN")}</p>
                            <p>REF NO: PF-LE-{Date.now().toString().substring(6)}</p>
                            <p>OPERATOR ID: SYSTEM</p>
                          </div>
                        </div>

                        {/* Statement Metadata */}
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Subject Classification: {reportDetails.type}</p>
                          <h3 className="text-base font-extrabold text-neutral-950 mb-3">{reportDetails.subjectName}</h3>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50/50 rounded-xl p-4 border border-neutral-100 text-xs">
                            {Object.entries(reportDetails.metadata).map(([key, val]: any) => (
                              <div key={key}>
                                <p className="text-[10px] text-neutral-400 uppercase font-semibold">{key}</p>
                                <p className="font-bold text-neutral-800 mt-0.5 break-all">{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Additional Policy-level info */}
                        {reportDetails.additional && (
                          <div className="space-y-4 border-t border-neutral-100 pt-4 text-xs">
                            <h4 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider">Asset Owner Linkages</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-neutral-400">Linked Customer</p>
                                <p className="font-bold text-neutral-800 mt-0.5">{reportDetails.additional.customerName || "N/A"}</p>
                                <p className="text-neutral-500 font-medium">{reportDetails.additional.customerPhone || ""}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-neutral-400">Mapped Vehicle</p>
                                <p className="font-bold text-neutral-800 mt-0.5">{reportDetails.additional.vehiclePlate || "N/A"}</p>
                                <p className="text-neutral-500 font-medium">{reportDetails.additional.vehicleModel || ""}</p>
                              </div>
                            </div>

                            <div className="border-t border-neutral-100 pt-4">
                              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Comments</p>
                              <p className="text-neutral-600 italic bg-neutral-50 p-3 rounded-lg border border-neutral-100 mt-1">{reportDetails.additional.comments}</p>
                            </div>
                          </div>
                        )}

                        {/* Historic table entries for Customers/Vehicles */}
                        {reportDetails.items && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-neutral-900 uppercase text-[10px] tracking-wider">Linked Policy Register</h4>
                            
                            {reportDetails.items.length === 0 ? (
                              <p className="text-xs text-neutral-400 italic">No historical insurance records found matching this ledger.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-neutral-900 text-[10px] font-bold text-neutral-400 uppercase">
                                      <th className="pb-2">Policy Number</th>
                                      <th className="pb-2">Company / Type</th>
                                      <th className="pb-2">Validity</th>
                                      <th className="pb-2 text-right">Premium</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-100">
                                    {reportDetails.items.map((p: any) => (
                                      <tr key={p._id}>
                                        <td className="py-2.5 font-mono font-bold text-neutral-950">#{p.policyNumber}</td>
                                        <td className="py-2.5">
                                          <p className="font-semibold text-neutral-800">{p.insuranceCompany}</p>
                                          <p className="text-[10px] text-neutral-400">{p.policyType}</p>
                                        </td>
                                        <td className="py-2.5 font-semibold text-neutral-600">
                                          {new Date(p.startDate).toLocaleDateString()} - {new Date(p.expiryDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-neutral-950">
                                          ₹{p.premiumAmount?.toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer and Stamps */}
                        <div className="border-t border-dashed border-neutral-200 pt-8 flex justify-between items-center text-[10px] text-neutral-400 mt-12">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-neutral-500">Security Signature Verification</p>
                            <p>PolicyFlow Database Verification Active</p>
                          </div>
                          <div className="text-right border border-neutral-200 rounded p-2 bg-neutral-50/50">
                            <p className="font-bold text-neutral-600">POLICYFLOW SEAL</p>
                            <p className="text-[9px]">Verified digitally (100% Secure)</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-96 flex items-center justify-center animate-pulse">
                      <div className="text-center space-y-2">
                        <Clock className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        <p className="text-xs text-neutral-400">Compiling statement records...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-200 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                  <Printer className="h-10 w-10 mb-3 text-neutral-300 stroke-1" />
                  <p className="text-xs font-bold text-neutral-700">Preview Area Ready</p>
                  <p className="text-[10px] text-neutral-400 mt-1 max-w-xs">Select a template, choose your target customer/vehicle, and click "Generate Statement" to preview the document.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
