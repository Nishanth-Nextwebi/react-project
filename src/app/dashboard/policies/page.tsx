"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Shield,
  User,
  Car,
  FileText,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  Building,
  Layers,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType: "Two-Wheeler" | "Four-Wheeler" | "Commercial" | "Other";
  manufacturer: string;
  model: string;
  year: number;
  engineNumber: string;
  chassisNumber: string;
  color?: string;
  isActive: boolean;
}

interface Policy {
  _id: string;
  customer: Customer;
  vehicle: Vehicle;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  startDate: string;
  expiryDate: string;
  extraField1?: string;
  extraField2?: string;
  extraField3?: string;
  comments?: string;
  attachmentUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function PoliciesPage() {
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");

  // Form State
  const [phone, setPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"Two-Wheeler" | "Four-Wheeler" | "Commercial" | "Other">("Four-Wheeler");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [engineNumber, setEngineNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [color, setColor] = useState("");
  const [isExistingVehicle, setIsExistingVehicle] = useState(false);
  const [searchingVehicle, setSearchingVehicle] = useState(false);

  const [policyNumber, setPolicyNumber] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [extraField1, setExtraField1] = useState("");
  const [extraField2, setExtraField2] = useState("");
  const [extraField3, setExtraField3] = useState("");
  const [comments, setComments] = useState("");

  // Form Submission/Processing
  const [saving, setSaving] = useState(false);

  // Policy List State
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // View Details Drawer
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Deactivate Policy modal
  const [policyToDeactivate, setPolicyToDeactivate] = useState<Policy | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Field-level validation/error state shown inline on the Add Insurance form.
  // RequiredField are blocked client-side pre-submit; FormField additionally
  // covers fields that can only fail server-side (e.g. duplicate engine/
  // chassis number), so those responses can still highlight the right input.
  type RequiredField =
    | "phone"
    | "custName"
    | "vehicleNumber"
    | "insuranceCompany"
    | "policyNumber"
    | "policyType"
    | "premiumAmount"
    | "startDate"
    | "expiryDate";
  type FormField = RequiredField | "engineNumber" | "chassisNumber";
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});

  const clearFieldError = (field: FormField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const errorInputClass = (field: FormField) =>
    fieldErrors[field]
      ? "border-red-400 focus:ring-red-500 focus:border-red-500"
      : "border-neutral-200 focus:ring-blue-500 focus:border-blue-500";

  const FieldError = ({ field }: { field: FormField }) =>
    fieldErrors[field] ? (
      <p className="text-[10px] font-semibold text-red-600">{fieldErrors[field]}</p>
    ) : null;

  // 1. Load policies list
  const fetchPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const res = await fetch(
        `/api/policies?page=${page}&limit=8&search=${encodeURIComponent(
          searchQuery
        )}&sortBy=${sortBy}&sortOrder=${sortOrder}&includeInactive=true`
      );
      const result = await res.json();
      if (result.success) {
        setPolicies(result.data.policies || []);
        setTotalPages(result.data.pagination.pages || 1);
        setTotalCount(result.data.pagination.total || 0);
      } else {
        toast.error(result.message || "Failed to load policies list.");
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
      toast.error("Network error while loading policies.");
    } finally {
      setLoadingPolicies(false);
    }
  }, [page, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (activeTab === "list") {
      fetchPolicies();
    }
  }, [activeTab, fetchPolicies]);

  // 2. Real-time Customer Phone Lookup
  const lookupCustomerByPhone = async (phoneVal: string) => {
    const cleanPhone = phoneVal.trim();
    if (cleanPhone.length < 10) return;

    setSearchingCustomer(true);
    try {
      const res = await fetch(`/api/customers?limit=5&search=${encodeURIComponent(cleanPhone)}`);
      const result = await res.json();
      if (result.success && result.data?.customers?.length > 0) {
        // Find exact phone match
        const exactMatch = result.data.customers.find(
          (c: Customer) => c.phone.trim() === cleanPhone && c.isActive
        );
        if (exactMatch) {
          setCustName(exactMatch.name);
          setEmail(exactMatch.email || "");
          setAddress(exactMatch.address || "");
          setIsExistingCustomer(true);
          toast.success(`Found active customer: ${exactMatch.name}`);
        } else {
          setIsExistingCustomer(false);
        }
      } else {
        setIsExistingCustomer(false);
      }
    } catch (error) {
      console.error("Customer phone lookup error:", error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handlePhoneBlur = () => {
    lookupCustomerByPhone(phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    clearFieldError("phone");
    if (val.trim().length >= 10) {
      // Defer slightly or let blur trigger
    } else {
      setIsExistingCustomer(false);
    }
  };

  // 3. Real-time Vehicle Lookup (Vehicle Number OR Chassis Number)
  const lookupVehicle = async (searchVal: string) => {
    const cleanVal = searchVal.trim().toUpperCase();
    if (cleanVal.length < 5) return;

    setSearchingVehicle(true);
    try {
      const res = await fetch(`/api/vehicles?limit=5&search=${encodeURIComponent(cleanVal)}`);
      const result = await res.json();
      if (result.success && result.data?.vehicles?.length > 0) {
        // Find exact match on vehicle number or chassis number
        const exactMatch = result.data.vehicles.find(
          (v: Vehicle) =>
            (v.vehicleNumber.trim().toUpperCase() === cleanVal ||
              v.chassisNumber.trim().toUpperCase() === cleanVal) &&
            v.isActive
        );

        if (exactMatch) {
          setVehicleNumber(exactMatch.vehicleNumber);
          setVehicleType(exactMatch.vehicleType);
          setManufacturer(exactMatch.manufacturer);
          setModel(exactMatch.model);
          setYear(exactMatch.year);
          setEngineNumber(exactMatch.engineNumber);
          setChassisNumber(exactMatch.chassisNumber);
          setColor(exactMatch.color || "");
          setIsExistingVehicle(true);
          toast.success(`Found registered vehicle: ${exactMatch.manufacturer} ${exactMatch.model}`);
        } else {
          setIsExistingVehicle(false);
        }
      } else {
        setIsExistingVehicle(false);
      }
    } catch (error) {
      console.error("Vehicle lookup error:", error);
    } finally {
      setSearchingVehicle(false);
    }
  };

  const handleVehicleBlur = () => {
    lookupVehicle(vehicleNumber);
  };

  const handleChassisBlur = () => {
    lookupVehicle(chassisNumber);
  };

  // 5. Save Insurance (Smart Save)
  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Partial<Record<RequiredField, string>> = {};
    if (!phone.trim()) errors.phone = "Phone number is required.";
    if (!custName.trim()) errors.custName = "Full name is required.";
    if (!vehicleNumber.trim()) errors.vehicleNumber = "Vehicle number is required.";
    if (!insuranceCompany.trim()) errors.insuranceCompany = "Insurance company is required.";
    if (!policyNumber.trim()) errors.policyNumber = "Policy number is required.";
    if (!policyType.trim()) errors.policyType = "Policy type is required.";
    if (!premiumAmount) errors.premiumAmount = "Premium amount is required.";
    if (!startDate) errors.startDate = "Start date is required.";
    if (!expiryDate) errors.expiryDate = "Expiry date is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fill in the highlighted required fields.");
      const firstErrorField = (
        ["phone", "custName", "vehicleNumber", "insuranceCompany", "policyNumber", "policyType", "premiumAmount", "startDate", "expiryDate"] as RequiredField[]
      ).find((field) => errors[field]);
      if (firstErrorField) {
        document.getElementById(`field_${firstErrorField}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const payload = {
        customer: {
          name: custName,
          phone,
          email,
          address,
        },
        vehicle: {
          vehicleNumber,
          vehicleType,
          manufacturer,
          model,
          year,
          engineNumber,
          chassisNumber,
          color,
        },
        policy: {
          policyNumber,
          insuranceCompany,
          policyType,
          premiumAmount,
          startDate,
          expiryDate,
          extraField1,
          extraField2,
          extraField3,
          comments,
        },
      };

      const res = await fetch("/api/policies/smart-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Insurance policy successfully saved!");
        // Clear form
        resetForm();
        // Redirect/switch tab to list
        setActiveTab("list");
      } else {
        const serverErrors: string[] = result.errors || [];
        const combinedText = [result.message, ...serverErrors].filter(Boolean).join(" ").toLowerCase();

        // Map known duplicate/lookup failures back onto the offending field
        // so the user sees a highlighted input, not just a toast.
        const fieldMatch: FormField | null = combinedText.includes("engine number")
          ? "engineNumber"
          : combinedText.includes("chassis number")
          ? "chassisNumber"
          : combinedText.includes("registration number")
          ? "vehicleNumber"
          : combinedText.includes("policy number")
          ? "policyNumber"
          : null;

        if (fieldMatch) {
          setFieldErrors((prev) => ({ ...prev, [fieldMatch]: serverErrors[0] || result.message }));
          document.getElementById(`field_${fieldMatch}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        toast.error(result.message || "Failed to save insurance.", {
          description: serverErrors.length > 0 ? serverErrors.join(" ") : undefined,
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Smart Save error:", error);
      toast.error("An error occurred while saving policy.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPhone("");
    setCustName("");
    setEmail("");
    setAddress("");
    setIsExistingCustomer(false);

    setVehicleNumber("");
    setVehicleType("Four-Wheeler");
    setManufacturer("");
    setModel("");
    setYear(new Date().getFullYear());
    setEngineNumber("");
    setChassisNumber("");
    setColor("");
    setIsExistingVehicle(false);

    setPolicyNumber("");
    setInsuranceCompany("");
    setPolicyType("");
    setPremiumAmount("");
    setStartDate("");
    setExpiryDate("");
    setExtraField1("");
    setExtraField2("");
    setExtraField3("");
    setComments("");
    setFieldErrors({});
  };

  // 6. Renewal copying
  const handleRenewClick = (policy: Policy) => {
    // Fill customer info
    setPhone(policy.customer.phone);
    setCustName(policy.customer.name);
    setEmail(policy.customer.email || "");
    setAddress(policy.customer.address || "");
    setIsExistingCustomer(true);

    // Fill vehicle info
    setVehicleNumber(policy.vehicle.vehicleNumber);
    setVehicleType(policy.vehicle.vehicleType);
    setManufacturer(policy.vehicle.manufacturer);
    setModel(policy.vehicle.model);
    setYear(policy.vehicle.year);
    setEngineNumber(policy.vehicle.engineNumber);
    setChassisNumber(policy.vehicle.chassisNumber);
    setColor(policy.vehicle.color || "");
    setIsExistingVehicle(true);

    // Fill policy info to renew (updating only the critical fields requested, but prepopulated with history)
    setInsuranceCompany(policy.insuranceCompany);
    setPolicyType(policy.policyType);
    setPremiumAmount(policy.premiumAmount.toString());
    
    // Clear the policy number and dates for fresh entry
    setPolicyNumber("");
    setStartDate("");
    setExpiryDate("");
    setComments(`Renewal of Policy #${policy.policyNumber}`);
    setExtraField1(policy.extraField1 || "");
    setExtraField2(policy.extraField2 || "");
    setExtraField3(policy.extraField3 || "");

    // Set tab to form
    setActiveTab("form");
    setIsDetailDrawerOpen(false);

    toast.info("Transferred details to form! Please enter the New Policy Number & coverage dates.");
  };

  // 7. Toggle Policy Activity (Soft Delete)
  const confirmDeactivate = async () => {
    if (!policyToDeactivate) return;

    try {
      const res = await fetch(`/api/policies/${policyToDeactivate._id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Policy status updated successfully.");
        fetchPolicies();
      } else {
        toast.error(result.message || "Failed to update policy status.");
      }
    } catch (error) {
      console.error("Deactivate policy error:", error);
      toast.error("Network error updating policy.");
    } finally {
      setIsDeactivateModalOpen(false);
      setPolicyToDeactivate(null);
    }
  };

  // Sort helper
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div id="policies_page_header" className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600 shrink-0" />
            Insurance Operations
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Standard unified workflow for customer profiles, physical asset mapping, and automated policy issuance.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-neutral-100 rounded-xl p-1 border border-neutral-200 self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "form"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Insurance
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "list"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Active Policies ({totalCount || "..."})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "form" ? (
          /* Form tab layout */
          <motion.form
            id="unified_insurance_form"
            noValidate
            onSubmit={handleSaveInsurance}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left and Middle panels (Sections 1, 2, 3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Customer Info */}
              <div id="section_customer_info" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">1</span>
                    Customer Information
                  </h3>
                  {searchingCustomer && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Lookup phone...
                    </span>
                  )}
                  {isExistingCustomer && !searchingCustomer && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="h-3 w-3" /> Existing Customer Found
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Phone Number *</label>
                    <input
                      id="field_phone"
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 ${errorInputClass("phone")}`}
                    />
                    <FieldError field="phone" />
                    <p className="text-[10px] text-neutral-400">lookup triggers instantly on blur or 10-digit enter</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Full Name *</label>
                    <input
                      id="field_custName"
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={custName}
                      onChange={(e) => {
                        setCustName(e.target.value);
                        clearFieldError("custName");
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 ${errorInputClass("custName")}`}
                    />
                    <FieldError field="custName" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Physical Address</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Flat 302, Green Meadows, Sector 4, Mumbai"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Vehicle Info */}
              <div id="section_vehicle_info" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                  <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">2</span>
                    Vehicle Specifications
                  </h3>
                  {searchingVehicle && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Checking inventory...
                    </span>
                  )}
                  {isExistingVehicle && !searchingVehicle && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="h-3 w-3" /> Registered Asset Found
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Vehicle Number *</label>
                    <input
                      id="field_vehicleNumber"
                      type="text"
                      required
                      placeholder="e.g. MH12AB1234"
                      value={vehicleNumber}
                      onChange={(e) => {
                        setVehicleNumber(e.target.value.toUpperCase());
                        clearFieldError("vehicleNumber");
                      }}
                      onBlur={handleVehicleBlur}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 font-mono ${errorInputClass("vehicleNumber")}`}
                    />
                    <FieldError field="vehicleNumber" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Chassis Number (Optional)</label>
                    <input
                      id="field_chassisNumber"
                      type="text"
                      placeholder="e.g. 17-digit frame number"
                      value={chassisNumber}
                      onChange={(e) => {
                        setChassisNumber(e.target.value.toUpperCase());
                        clearFieldError("chassisNumber");
                      }}
                      onBlur={handleChassisBlur}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 font-mono ${errorInputClass("chassisNumber")}`}
                    />
                    <FieldError field="chassisNumber" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Engine Number (Optional)</label>
                    <input
                      id="field_engineNumber"
                      type="text"
                      placeholder="e.g. ENG99988877"
                      value={engineNumber}
                      onChange={(e) => {
                        setEngineNumber(e.target.value.toUpperCase());
                        clearFieldError("engineNumber");
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 font-mono ${errorInputClass("engineNumber")}`}
                    />
                    <FieldError field="engineNumber" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as any)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Two-Wheeler">Two-Wheeler</option>
                      <option value="Four-Wheeler">Four-Wheeler</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Manufacturer (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Honda, Suzuki"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Model (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Activa, City"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Year (Optional)</label>
                    <input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Color (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Silver Metallic"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel (Section 3: Policy parameters) */}
            <div className="space-y-6">
              {/* Section 3: Policy Information */}
              <div id="section_policy_info" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2 border-b border-neutral-50 pb-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">3</span>
                  Policy Details
                </h3>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Insurance Company *</label>
                    <input
                      id="field_insuranceCompany"
                      type="text"
                      required
                      placeholder="e.g. Tata AIG, HDFC Ergo"
                      value={insuranceCompany}
                      onChange={(e) => {
                        setInsuranceCompany(e.target.value);
                        clearFieldError("insuranceCompany");
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 ${errorInputClass("insuranceCompany")}`}
                    />
                    <FieldError field="insuranceCompany" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Policy Number *</label>
                    <input
                      id="field_policyNumber"
                      type="text"
                      required
                      placeholder="e.g. POL-12345678"
                      value={policyNumber}
                      onChange={(e) => {
                        setPolicyNumber(e.target.value.toUpperCase());
                        clearFieldError("policyNumber");
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 font-mono ${errorInputClass("policyNumber")}`}
                    />
                    <FieldError field="policyNumber" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Policy Type *</label>
                      <input
                        id="field_policyType"
                        type="text"
                        required
                        placeholder="e.g. Comprehensive"
                        value={policyType}
                        onChange={(e) => {
                          setPolicyType(e.target.value);
                          clearFieldError("policyType");
                        }}
                        className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 ${errorInputClass("policyType")}`}
                      />
                      <FieldError field="policyType" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Premium Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold text-xs">₹</span>
                        <input
                          id="field_premiumAmount"
                          type="number"
                          required
                          placeholder="Amount"
                          value={premiumAmount}
                          onChange={(e) => {
                            setPremiumAmount(e.target.value);
                            clearFieldError("premiumAmount");
                          }}
                          className={`w-full rounded-xl border pl-7 pr-3.5 py-2 text-xs font-medium text-neutral-700 bg-white focus:outline-none focus:ring-1 ${errorInputClass("premiumAmount")}`}
                        />
                      </div>
                      <FieldError field="premiumAmount" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Start Date *</label>
                      <input
                        id="field_startDate"
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          clearFieldError("startDate");
                        }}
                        className={`w-full rounded-xl border px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:ring-1 ${errorInputClass("startDate")}`}
                      />
                      <FieldError field="startDate" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Expiry Date *</label>
                      <input
                        id="field_expiryDate"
                        type="date"
                        required
                        value={expiryDate}
                        onChange={(e) => {
                          setExpiryDate(e.target.value);
                          clearFieldError("expiryDate");
                        }}
                        className={`w-full rounded-xl border px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:ring-1 ${errorInputClass("expiryDate")}`}
                      />
                      <FieldError field="expiryDate" />
                    </div>
                  </div>

                  {/* Accordion / Optional Extra Fields */}
                  <div className="pt-2 border-t border-neutral-50 space-y-3">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Custom Policy Attributes</p>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Agent Commission"
                        value={extraField1}
                        onChange={(e) => setExtraField1(e.target.value)}
                        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Deductibles"
                        value={extraField2}
                        onChange={(e) => setExtraField2(e.target.value)}
                        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="NCB Discount %"
                        value={extraField3}
                        onChange={(e) => setExtraField3(e.target.value)}
                        className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Administrative internal comments..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit panel */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:bg-blue-400"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Saving policy...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Save Insurance
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.form>
        ) : (
          /* List tab layout */
          <motion.div
            id="policies_list_view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden"
          >
            {/* Filter controls */}
            <div className="p-5 border-b border-neutral-100 bg-neutral-50/30 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search policy number, company, or type..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Reset List
                </button>
                <button
                  onClick={fetchPolicies}
                  className="rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* List Skeleton Loader */}
            {loadingPolicies && (
              <div className="divide-y divide-neutral-50 animate-pulse">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="p-5 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-neutral-200 rounded-md"></div>
                      <div className="h-3 w-32 bg-neutral-100 rounded-md"></div>
                    </div>
                    <div className="h-3 w-28 bg-neutral-200 rounded-md"></div>
                    <div className="h-6 w-16 bg-neutral-100 rounded-full"></div>
                    <div className="h-8 w-24 bg-neutral-50 rounded-lg"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Actual Table / Cards list */}
            {!loadingPolicies && (
              <>
                {policies.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100">
                      <Search className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-neutral-800">No Policies Found</h3>
                    <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
                      We couldn't find any insurance policy records matching the search query.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                          <th className="py-4 px-6 cursor-pointer select-none" onClick={() => handleSort("policyNumber")}>
                            <div className="flex items-center gap-1">Policy ID <ArrowUpDown className="h-3 w-3" /></div>
                          </th>
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Vehicle Asset</th>
                          <th className="py-4 px-6" onClick={() => handleSort("insuranceCompany")}>
                            <div className="flex items-center gap-1">Company <ArrowUpDown className="h-3 w-3" /></div>
                          </th>
                          <th className="py-4 px-6" onClick={() => handleSort("expiryDate")}>
                            <div className="flex items-center gap-1">Expiry Date <ArrowUpDown className="h-3 w-3" /></div>
                          </th>
                          <th className="py-4 px-6" onClick={() => handleSort("premiumAmount")}>
                            <div className="flex items-center gap-1">Premium <ArrowUpDown className="h-3 w-3" /></div>
                          </th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50 text-xs text-neutral-600">
                        {policies.map((pol) => {
                          const isExpired = new Date(pol.expiryDate) < new Date();
                          return (
                            <tr key={pol._id} className="hover:bg-neutral-50/50 transition-all group">
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors font-mono">
                                    {pol.policyNumber}
                                  </span>
                                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                    ID: {pol._id.substring(18)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-semibold text-neutral-800">
                                {pol.customer?.name || "N/A"}
                                <div className="text-[10px] text-neutral-400 font-normal mt-0.5">{pol.customer?.phone}</div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="font-medium text-neutral-800">{pol.vehicle?.manufacturer} {pol.vehicle?.model}</span>
                                  <span className="text-[10px] text-neutral-400 mt-0.5 font-mono">{pol.vehicle?.vehicleNumber}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                                  {pol.insuranceCompany}
                                </span>
                                <div className="text-[10px] text-neutral-400 mt-0.5">{pol.policyType}</div>
                              </td>
                              <td className="py-4 px-6 font-semibold text-neutral-700">
                                {new Date(pol.expiryDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-4 px-6 font-bold text-neutral-800">
                                ₹{pol.premiumAmount?.toLocaleString("en-IN")}
                              </td>
                              <td className="py-4 px-6">
                                {!pol.isActive ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 border border-neutral-200">
                                    Suspended
                                  </span>
                                ) : isExpired ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-100">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setSelectedPolicy(pol);
                                      setIsDetailDrawerOpen(true);
                                    }}
                                    title="View specifications"
                                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRenewClick(pol)}
                                    title="Process copy renewal"
                                    className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer flex items-center gap-0.5 transition-all"
                                  >
                                    <RefreshCw className="h-3 w-3 animate-spin-hover" />
                                    Renew
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPolicyToDeactivate(pol);
                                      setIsDeactivateModalOpen(true);
                                    }}
                                    title="Toggle activity"
                                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-5 border-t border-neutral-50 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      Showing page <strong className="text-neutral-700 font-semibold">{page}</strong> of{" "}
                      <strong className="text-neutral-700 font-semibold">{totalPages}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail View side-drawer panel */}
      <AnimatePresence>
        {isDetailDrawerOpen && selectedPolicy && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black"
            />

            {/* Slide over container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl border-l border-neutral-100"
            >
              {/* Header drawer info */}
              <div className="flex h-16 items-center justify-between border-b border-neutral-100 px-6">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                    <Shield className="h-4.5 w-4.5 text-blue-600" /> Policy Specification Spec
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5">Policy Number: {selectedPolicy.policyNumber}</span>
                </div>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body details list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Customer Coordinate Card */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3 w-3" /> Customer Coordinates
                  </h4>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Name</span>
                      <strong className="text-neutral-800 font-semibold">{selectedPolicy.customer?.name}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Phone</span>
                      <strong className="text-neutral-800 font-mono">{selectedPolicy.customer?.phone}</strong>
                    </div>
                    {selectedPolicy.customer?.email && (
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Email</span>
                        <strong className="text-neutral-800">{selectedPolicy.customer.email}</strong>
                      </div>
                    )}
                    {selectedPolicy.customer?.address && (
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Address</span>
                        <strong className="text-neutral-800 text-right max-w-[200px] font-normal truncate" title={selectedPolicy.customer.address}>
                          {selectedPolicy.customer.address}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Physical Asset Spec */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Car className="h-3 w-3" /> Physical Asset Spec
                  </h4>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400">Manufacturer / Model</span>
                      <strong className="text-neutral-800 font-semibold mt-0.5">{selectedPolicy.vehicle?.manufacturer} {selectedPolicy.vehicle?.model}</strong>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400">Registration Plate</span>
                      <strong className="text-neutral-800 font-mono mt-0.5">{selectedPolicy.vehicle?.vehicleNumber}</strong>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-neutral-50/50">
                      <span className="text-[10px] text-neutral-400">Chassis Number</span>
                      <strong className="text-neutral-800 font-mono mt-0.5">{selectedPolicy.vehicle?.chassisNumber}</strong>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-neutral-50/50">
                      <span className="text-[10px] text-neutral-400">Engine Number</span>
                      <strong className="text-neutral-800 font-mono mt-0.5">{selectedPolicy.vehicle?.engineNumber}</strong>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-neutral-50/50">
                      <span className="text-[10px] text-neutral-400">Type / Year</span>
                      <strong className="text-neutral-800 font-semibold mt-0.5">{selectedPolicy.vehicle?.vehicleType} ({selectedPolicy.vehicle?.year})</strong>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-neutral-50/50">
                      <span className="text-[10px] text-neutral-400">Asset Color</span>
                      <strong className="text-neutral-800 mt-0.5">{selectedPolicy.vehicle?.color || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Coverage parameters */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Coverage Parameters
                  </h4>
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Underwriting Company</span>
                      <strong className="text-neutral-800 font-semibold">{selectedPolicy.insuranceCompany}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Coverage Classification</span>
                      <strong className="text-neutral-800 font-semibold">{selectedPolicy.policyType}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Premium Underwritten</span>
                      <strong className="text-neutral-800 font-bold text-blue-600">₹{selectedPolicy.premiumAmount?.toLocaleString("en-IN")}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Duration Range</span>
                      <strong className="text-neutral-800 font-semibold">
                        {new Date(selectedPolicy.startDate).toLocaleDateString()} to {new Date(selectedPolicy.expiryDate).toLocaleDateString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Extra Custom Fields */}
                {(selectedPolicy.extraField1 || selectedPolicy.extraField2 || selectedPolicy.extraField3 || selectedPolicy.comments) && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Custom Fields & Notes</h4>
                    <div className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-4 space-y-2.5 text-xs">
                      {selectedPolicy.extraField1 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Commission Rate</span>
                          <strong className="text-neutral-800">{selectedPolicy.extraField1}</strong>
                        </div>
                      )}
                      {selectedPolicy.extraField2 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Deductibles</span>
                          <strong className="text-neutral-800">{selectedPolicy.extraField2}</strong>
                        </div>
                      )}
                      {selectedPolicy.extraField3 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">NCB Discount</span>
                          <strong className="text-neutral-800">{selectedPolicy.extraField3}</strong>
                        </div>
                      )}
                      {selectedPolicy.comments && (
                        <div className="pt-2 border-t border-neutral-100 flex flex-col gap-1 text-left">
                          <span className="text-[10px] text-neutral-400">Comments & Remarks</span>
                          <p className="text-neutral-600 italic leading-normal bg-white p-2.5 rounded-lg border border-neutral-50">
                            {selectedPolicy.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Document Attachments */}
                {selectedPolicy.attachmentUrl && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Documents Attached</h4>
                    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-neutral-800 truncate">
                          {selectedPolicy.attachmentUrl.split("/").pop() || "Policy_PDF_Copy.pdf"}
                        </span>
                      </div>
                      <a
                        href={selectedPolicy.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer footer containing actions */}
              <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-4 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="flex-1 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Close Panel
                </button>
                <button
                  onClick={() => handleRenewClick(selectedPolicy)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" />
                  Renew Policy
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Deactivate Policy */}
      <AnimatePresence>
        {isDeactivateModalOpen && policyToDeactivate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeactivateModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-100 z-10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-neutral-800">
                Toggle Policy Status
              </h3>
              <p className="mt-2 text-xs text-neutral-500 leading-normal">
                Are you sure you want to toggle the status of Policy <strong className="font-bold text-neutral-700">#{policyToDeactivate.policyNumber}</strong>? 
                Suspended policies are excluded from live active tracking calculations, alerts and reports.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeactivate}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer"
                >
                  Proceed Toggle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
