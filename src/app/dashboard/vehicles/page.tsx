"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Eye,
  Edit,
  Car,
  User,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  Wrench,
  Hash,
  Palette,
  ChevronRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface Vehicle {
  _id: string;
  customer: string | Customer; // Can be ID or populated object
  vehicleNumber: string;
  vehicleType: "Two-Wheeler" | "Four-Wheeler" | "Commercial" | "Other";
  manufacturer: string;
  model: string;
  year: number;
  engineNumber: string;
  chassisNumber: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function VehicleListingPage() {
  // Query, filter and pagination state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active">("active");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Dynamic selector values loaded from API
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Deactivation confirmation modal state
  const [deactivatingVehicle, setDeactivatingVehicle] = useState<Vehicle | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<boolean>(false);

  // Drawers and Panel States
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    customer: "",
    vehicleNumber: "",
    vehicleType: "Four-Wheeler" as any,
    manufacturer: "",
    model: "",
    year: new Date().getFullYear(),
    engineNumber: "",
    chassisNumber: "",
    color: "",
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formServerActionError, setFormServerActionError] = useState<string | null>(null);

  // App notification state (Self-contained, elegant visual notifications)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Auto-clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
  };

  // Fetch all active customers for selection dropdown
  const fetchCustomersForSelector = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch("/api/customers?limit=100&includeInactive=false");
      const result = await response.json();
      if (response.ok && result.success) {
        setCustomersList(result.data.customers || []);
      }
    } catch (e) {
      console.error("Error loading customers for selection dropdown", e);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Fetch vehicles from API
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const includeInactive = statusFilter === "all" ? "true" : "false";
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        includeInactive,
      });

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (selectedCustomerId) {
        params.append("customerId", selectedCustomerId);
      }

      const response = await fetch(`/api/vehicles?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setVehicles(result.data.vehicles || []);
        setTotalPages(result.data.pagination.pages || 1);
        setTotalRecords(result.data.pagination.total || 0);
      } else {
        setError(result.message || "Failed to load vehicle directory.");
      }
    } catch (err: any) {
      setError(err.message || "A network error occurred while connecting to the database.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, sortOrder, searchQuery, statusFilter, selectedCustomerId]);

  // Initial loads
  useEffect(() => {
    fetchVehicles();
    fetchCustomersForSelector();
  }, [fetchVehicles, fetchCustomersForSelector]);

  // Reset pagination when filter or search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterToggle = (status: "all" | "active") => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleCustomerFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCustomerId(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Open Add Drawer
  const handleOpenAddDrawer = () => {
    setFormData({
      customer: customersList[0]?._id || "",
      vehicleNumber: "",
      vehicleType: "Four-Wheeler",
      manufacturer: "",
      model: "",
      year: new Date().getFullYear(),
      engineNumber: "",
      chassisNumber: "",
      color: "",
      isActive: true,
    });
    setFormErrors({});
    setFormServerActionError(null);
    setIsAddDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEditDrawer = (v: Vehicle) => {
    const custId = typeof v.customer === "string" ? v.customer : v.customer?._id || "";
    setFormData({
      customer: custId,
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      manufacturer: v.manufacturer,
      model: v.model,
      year: v.year,
      engineNumber: v.engineNumber,
      chassisNumber: v.chassisNumber,
      color: v.color || "",
      isActive: v.isActive,
    });
    setFormErrors({});
    setFormServerActionError(null);
    setEditingVehicle(v);
  };

  // Form Validations matching Zod Schema exactly
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.customer) {
      errors.customer = "Please select a customer for ownership allocation.";
    }

    const vNo = formData.vehicleNumber.trim().toUpperCase();
    if (!vNo) {
      errors.vehicleNumber = "Vehicle registration number is required.";
    } else if (vNo.length < 3 || vNo.length > 15) {
      errors.vehicleNumber = "Registration must be between 3 and 15 uppercase characters.";
    }

    if (!formData.manufacturer.trim()) {
      errors.manufacturer = "Manufacturer name is required.";
    } else if (formData.manufacturer.trim().length > 50) {
      errors.manufacturer = "Manufacturer name cannot exceed 50 characters.";
    }

    if (!formData.model.trim()) {
      errors.model = "Vehicle model details is required.";
    } else if (formData.model.trim().length > 50) {
      errors.model = "Model cannot exceed 50 characters.";
    }

    const currentYear = new Date().getFullYear();
    if (!formData.year || isNaN(formData.year)) {
      errors.year = "Please enter a valid production year.";
    } else if (formData.year < 1900 || formData.year > currentYear + 1) {
      errors.year = `Production year must be between 1900 and ${currentYear + 1}.`;
    }

    const engNo = formData.engineNumber.trim().toUpperCase();
    if (!engNo) {
      errors.engineNumber = "Engine reference number is required.";
    } else if (engNo.length < 4 || engNo.length > 30) {
      errors.engineNumber = "Engine number must be between 4 and 30 characters.";
    }

    const chNo = formData.chassisNumber.trim().toUpperCase();
    if (!chNo) {
      errors.chassisNumber = "Chassis reference number is required.";
    } else if (chNo.length < 4 || chNo.length > 30) {
      errors.chassisNumber = "Chassis number must be between 4 and 30 characters.";
    }

    if (formData.color.trim() && formData.color.trim().length > 30) {
      errors.color = "Color name is too long (max 30 characters).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Register Vehicle Action
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormServerActionError(null);

    // Capitalize numeric string fields as required by backend Zod Uppercase constraints
    const submissionPayload = {
      ...formData,
      vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      engineNumber: formData.engineNumber.trim().toUpperCase(),
      chassisNumber: formData.chassisNumber.trim().toUpperCase(),
    };

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showNotification("success", `Vehicle "${submissionPayload.vehicleNumber}" registered successfully.`);
        setIsAddDrawerOpen(false);
        fetchVehicles();
      } else {
        setFormServerActionError(result.message || result.errors?.join(", ") || "Registration failed.");
      }
    } catch (err: any) {
      setFormServerActionError(err.message || "Network error. Connection failed.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Update Vehicle Action
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormServerActionError(null);

    const submissionPayload = {
      ...formData,
      vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      engineNumber: formData.engineNumber.trim().toUpperCase(),
      chassisNumber: formData.chassisNumber.trim().toUpperCase(),
    };

    try {
      const response = await fetch(`/api/vehicles/${editingVehicle._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showNotification("success", `Vehicle "${submissionPayload.vehicleNumber}" successfully updated.`);
        setEditingVehicle(null);
        fetchVehicles();
      } else {
        setFormServerActionError(result.message || result.errors?.join(", ") || "Failed to update record.");
      }
    } catch (err: any) {
      setFormServerActionError(err.message || "Network error. Connection failed.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm soft delete / deactivation trigger
  const handleConfirmDeactivate = async () => {
    if (!deactivatingVehicle) return;
    setDeactivating(true);
    setDeactivateError(null);

    try {
      const response = await fetch(`/api/vehicles/${deactivatingVehicle._id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        showNotification("success", `Vehicle "${deactivatingVehicle.vehicleNumber}" deactivated.`);
        setDeactivatingVehicle(null);
        fetchVehicles();
      } else {
        setDeactivateError(result.message || "Deactivation rejected.");
        showNotification("error", result.message || "Deactivation rejected by system controls.");
      }
    } catch (err: any) {
      setDeactivateError(err.message || "Network connection error.");
      showNotification("error", "Network connection failed.");
    } finally {
      setDeactivating(false);
    }
  };

  // Safe Owner Name rendering helper
  const getOwnerName = (vehicle: Vehicle) => {
    if (!vehicle.customer) return "No Owner assigned";
    if (typeof vehicle.customer === "string") return `ID: ${vehicle.customer.substring(18)}`;
    return vehicle.customer.name;
  };

  const getOwnerPhone = (vehicle: Vehicle) => {
    if (!vehicle.customer || typeof vehicle.customer === "string") return "";
    return vehicle.customer.phone;
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div id="vehicle_listing_container" className="space-y-6 animate-fade-in relative">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            id="vehicle_notification_toast"
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-lg max-w-sm ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : notification.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
          >
            <CheckCircle className={`h-5 w-5 shrink-0 ${notification.type === "success" ? "text-emerald-500" : "text-rose-500"}`} />
            <div className="text-xs font-semibold leading-normal">{notification.message}</div>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Header Row */}
      <div id="vehicle_header" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="vehicle_page_title" className="text-2xl font-bold tracking-tight text-neutral-900">
            Vehicle Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Verify motor records, allocate active ownerships, and log engine or chassis specifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="register_vehicle_trigger"
            onClick={handleOpenAddDrawer}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Car className="h-4 w-4" /> Register Vehicle
          </button>
        </div>
      </div>

      {/* Control Panel: Filters, Search, Dropdowns */}
      <div id="vehicle_controls" className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Integrated Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              id="vehicle_search_input"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Reg, Manufacturer, Engine or Chassis..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Customer dropdown selection */}
            <div className="relative flex items-center">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mr-2.5 hidden sm:inline">Owner:</span>
              <select
                value={selectedCustomerId}
                onChange={handleCustomerFilterChange}
                className="rounded-xl border border-neutral-200 bg-white py-2 px-3 text-xs font-semibold text-neutral-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Customers</option>
                {customersList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Segmented Control */}
            <div className="inline-flex rounded-xl bg-neutral-100 p-1 border border-neutral-200/40 text-xs">
              <button
                id="vehicle_filter_active"
                onClick={() => handleStatusFilterToggle("active")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-white text-neutral-800 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Active Only
              </button>
              <button
                id="vehicle_filter_all"
                onClick={() => handleStatusFilterToggle("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-neutral-800 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Show All
              </button>
            </div>

            {/* Refresh list button */}
            <button
              onClick={fetchVehicles}
              title="Refresh Vehicle Directory"
              className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 transition-colors bg-white cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

        </div>
      </div>

      {/* Grid view / Table Frame */}
      <div id="vehicle_data_frame" className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
        
        {/* Error Callout */}
        {error && (
          <div id="vehicle_error_card" className="p-6 text-center border-b border-neutral-100 bg-rose-50/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-neutral-800">Connection Error</h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchVehicles}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-700 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Retry Connection
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div id="vehicle_skeleton_list" className="divide-y divide-neutral-50">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-neutral-200 rounded-md"></div>
                  <div className="h-3 w-48 bg-neutral-100 rounded-md"></div>
                </div>
                <div className="hidden md:block space-y-2">
                  <div className="h-3 w-28 bg-neutral-200 rounded-md"></div>
                  <div className="h-3 w-20 bg-neutral-100 rounded-md"></div>
                </div>
                <div className="h-6 w-16 bg-neutral-100 rounded-full"></div>
                <div className="h-8 w-24 bg-neutral-50 rounded-lg"></div>
              </div>
            ))}
          </div>
        )}

        {/* Data list view & table */}
        {!loading && !error && (
          <>
            {vehicles.length === 0 ? (
              // Empty State
              <div id="vehicle_empty_state" className="p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100">
                  <Car className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-neutral-800">No Vehicles Registered</h3>
                <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
                  We couldn't find any vehicle records matching your filters or search strings.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCustomerId("");
                      setStatusFilter("active");
                    }}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
                  >
                    Reset Search Parameters
                  </button>
                </div>
              </div>
            ) : (
              // Desktop Structured table
              <div className="overflow-x-auto">
                <table id="vehicle_data_table" className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      <th
                        onClick={() => handleSort("vehicleNumber")}
                        className="py-4 px-6 select-none cursor-pointer hover:text-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Registration Number <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-4 px-6">Classification</th>
                      <th className="py-4 px-6">Model Specs</th>
                      <th className="py-4 px-6">Owner Customer</th>
                      <th className="py-4 px-6">Engine ID</th>
                      <th className="py-4 px-6">Chassis ID</th>
                      <th
                        onClick={() => handleSort("isActive")}
                        className="py-4 px-6 select-none cursor-pointer hover:text-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Status <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 text-xs text-neutral-600">
                    {vehicles.map((v) => (
                      <tr
                        key={v._id}
                        id={`vehicle_row_${v._id}`}
                        className="hover:bg-neutral-50/50 transition-colors group"
                      >
                        {/* 1. Registration uppercase Badge */}
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center font-mono font-bold bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200/80 uppercase">
                            {v.vehicleNumber}
                          </span>
                        </td>

                        {/* 2. Classification type */}
                        <td className="py-4 px-6 font-medium text-neutral-700">
                          {v.vehicleType}
                        </td>

                        {/* 3. Model details with production year */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                              {v.manufacturer} {v.model}
                            </span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">
                              Mfg Year: {v.year} {v.color ? `• ${v.color}` : ""}
                            </span>
                          </div>
                        </td>

                        {/* 4. Owner */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-800">{getOwnerName(v)}</span>
                            {getOwnerPhone(v) && (
                              <span className="text-[10px] font-mono text-neutral-400 mt-0.5">{getOwnerPhone(v)}</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Engine ID */}
                        <td className="py-4 px-6 font-mono font-medium text-neutral-500">
                          {v.engineNumber}
                        </td>

                        {/* 6. Chassis ID */}
                        <td className="py-4 px-6 font-mono font-medium text-neutral-500">
                          {v.chassisNumber}
                        </td>

                        {/* 7. Status badge */}
                        <td className="py-4 px-6">
                          {v.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-500 border border-neutral-200/60">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions row */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              title="View Vehicle Specifications"
                              onClick={() => setViewingVehicle(v)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              title="Edit Details"
                              onClick={() => handleOpenEditDrawer(v)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {v.isActive ? (
                              <button
                                title="Deactivate Vehicle Record"
                                onClick={() => {
                                  setDeactivateError(null);
                                  setDeactivatingVehicle(v);
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                title="Reactivate Record"
                                onClick={() => handleOpenEditDrawer(v)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer info & pagination */}
        {!loading && !error && vehicles.length > 0 && (
          <div id="vehicle_pagination" className="border-t border-neutral-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-neutral-50/30 text-xs">
            <div className="text-neutral-500 font-medium text-center sm:text-left">
              Showing <span className="font-semibold text-neutral-800">{Math.min(totalRecords, (currentPage - 1) * limit + 1)}</span> to{" "}
              <span className="font-semibold text-neutral-800">{Math.min(totalRecords, currentPage * limit)}</span> of{" "}
              <span className="font-semibold text-neutral-800">{totalRecords}</span> vehicles
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-1.5">
              {/* Prev Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all font-semibold bg-white cursor-pointer"
              >
                Previous
              </button>

              {/* Dynamic Pages */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                    currentPage === p
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50 bg-white"
                  }`}
                >
                  {p}
                </button>
              ))}

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all font-semibold bg-white cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Slide-over Drawer for ADD VEHICLE */}
      <AnimatePresence>
        {isAddDrawerOpen && (
          <>
            <div
              onClick={() => setIsAddDrawerOpen(false)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 transition-opacity"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-neutral-100 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Register Vehicle</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Link a motor record with an active customer.</p>
                </div>
                <button
                  onClick={() => setIsAddDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {formServerActionError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
                    {formServerActionError}
                  </div>
                )}

                {/* Owner Customer Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Allocation Owner *</label>
                  {loadingCustomers ? (
                    <div className="h-10 rounded-xl border border-neutral-100 bg-neutral-50 animate-pulse"></div>
                  ) : customersList.length === 0 ? (
                    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-[11px] text-neutral-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      No active customers found! Please create a customer first.
                    </div>
                  ) : (
                    <select
                      value={formData.customer}
                      onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {customersList.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.customer && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.customer}</p>}
                </div>

                {/* Reg Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Registration number *</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g. MH12AB1234"
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase placeholder-neutral-400 focus:outline-none transition-all ${
                      formErrors.vehicleNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.vehicleNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.vehicleNumber}</p>}
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Classification Type *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full rounded-xl border border-neutral-200 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Four-Wheeler">Four-Wheeler</option>
                    <option value="Two-Wheeler">Two-Wheeler</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Manufacturer & Model row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Manufacturer *</label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g. Honda"
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.manufacturer
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.manufacturer && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.manufacturer}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Model *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g. Civic"
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.model
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.model && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.model}</p>}
                  </div>
                </div>

                {/* Year & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Mfg Year *</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || "" as any })}
                      placeholder="e.g. 2024"
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.year
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.year && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.year}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Color (Optional)</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g. White"
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium placeholder-neutral-400 focus:outline-none transition-all ${
                        formErrors.color
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.color && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.color}</p>}
                  </div>
                </div>

                {/* Engine & Chassis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Engine reference ID *</label>
                  <input
                    type="text"
                    value={formData.engineNumber}
                    onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                    placeholder="Engine ref identifier"
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase placeholder-neutral-400 focus:outline-none transition-all ${
                      formErrors.engineNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.engineNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.engineNumber}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Chassis reference ID *</label>
                  <input
                    type="text"
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    placeholder="Chassis ref identifier"
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase placeholder-neutral-400 focus:outline-none transition-all ${
                      formErrors.chassisNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.chassisNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.chassisNumber}</p>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddDrawerOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || customersList.length === 0}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {formSubmitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-over Drawer for EDIT VEHICLE */}
      <AnimatePresence>
        {editingVehicle && (
          <>
            <div
              onClick={() => setEditingVehicle(null)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 transition-opacity"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-neutral-100 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Edit Vehicle Specifications</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Modify parameters for active system entries.</p>
                </div>
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {formServerActionError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
                    {formServerActionError}
                  </div>
                )}

                {/* Manufacturer & Model row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Manufacturer *</label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium focus:outline-none transition-all ${
                        formErrors.manufacturer
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.manufacturer && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.manufacturer}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Model *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium focus:outline-none transition-all ${
                        formErrors.model
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.model && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.model}</p>}
                  </div>
                </div>

                {/* Reg Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Registration number *</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase focus:outline-none transition-all ${
                      formErrors.vehicleNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.vehicleNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.vehicleNumber}</p>}
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Classification Type *</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full rounded-xl border border-neutral-200 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Four-Wheeler">Four-Wheeler</option>
                    <option value="Two-Wheeler">Two-Wheeler</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Year & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Mfg Year *</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || "" as any })}
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium focus:outline-none transition-all ${
                        formErrors.year
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.year && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.year}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700">Color (Optional)</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className={`w-full rounded-xl border py-2.5 px-3.5 text-xs font-medium focus:outline-none transition-all ${
                        formErrors.color
                          ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {formErrors.color && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.color}</p>}
                  </div>
                </div>

                {/* Engine & Chassis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Engine reference ID *</label>
                  <input
                    type="text"
                    value={formData.engineNumber}
                    onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase focus:outline-none transition-all ${
                      formErrors.engineNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.engineNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.engineNumber}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Chassis reference ID *</label>
                  <input
                    type="text"
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    className={`w-full font-mono rounded-xl border py-2.5 px-3.5 text-xs font-bold uppercase focus:outline-none transition-all ${
                      formErrors.chassisNumber
                        ? "border-rose-300 bg-rose-50/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                  {formErrors.chassisNumber && <p className="text-[10px] font-semibold text-rose-600 mt-1">{formErrors.chassisNumber}</p>}
                </div>

                {/* Status Reactivation Switch */}
                <div className="space-y-3 pt-3 border-t border-neutral-100">
                  <label className="text-xs font-bold text-neutral-700">Asset Active Status Setting</label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-neutral-800">Vehicle Status</p>
                      <p className="text-[10px] text-neutral-400">Flag this vehicle as active or suspended in systems.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.isActive ? "bg-blue-600" : "bg-neutral-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          formData.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditingVehicle(null)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {formSubmitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-over Drawer for VEHICLE DETAILS SPECIFICATIONS VIEW */}
      <AnimatePresence>
        {viewingVehicle && (
          <>
            <div
              onClick={() => setViewingVehicle(null)}
              className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-40 transition-opacity"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-neutral-50/50 border-l border-neutral-100 shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-neutral-100">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Vehicle Specifications</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Comprehensive motor audit & ownership metrics.</p>
                </div>
                <button
                  onClick={() => setViewingVehicle(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Specs summary card */}
                <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center font-mono font-bold bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-100 uppercase text-xs">
                      {viewingVehicle.vehicleNumber}
                    </span>
                    {viewingVehicle.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                        Active Specs
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-500 border border-neutral-200/60">
                        Inactive Specs
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-neutral-900">{viewingVehicle.manufacturer} {viewingVehicle.model}</h3>
                    <p className="text-xs text-neutral-400">Classification: {viewingVehicle.vehicleType}</p>
                  </div>

                  <div className="h-px bg-neutral-50"></div>

                  {/* Engine details grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Engine Number</p>
                      <p className="font-mono font-bold text-neutral-800">{viewingVehicle.engineNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chassis Number</p>
                      <p className="font-mono font-bold text-neutral-800">{viewingVehicle.chassisNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mfg Year</p>
                      <p className="font-semibold text-neutral-800">{viewingVehicle.year}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Color Accent</p>
                      <p className="font-semibold text-neutral-800">{viewingVehicle.color || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Registered Owner card */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Allocation Owner</h4>
                  <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-xs">
                    {viewingVehicle.customer && typeof viewingVehicle.customer !== "string" ? (
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-600 shrink-0 font-bold">
                          {viewingVehicle.customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-neutral-800">{viewingVehicle.customer.name}</p>
                          <p className="font-mono text-neutral-500">{viewingVehicle.customer.phone}</p>
                          {viewingVehicle.customer.email && (
                            <p className="text-neutral-400">{viewingVehicle.customer.email}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-500">
                        No owner profile fetched or referenced by ID {String(viewingVehicle.customer)}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Database Sync Indicators */}
                <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 shadow-xs space-y-2">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-blue-800">
                      <p className="font-bold">Insurance Policies Linkage</p>
                      <p className="text-[11px] leading-relaxed text-blue-700">
                        This asset is ready for real-time risk evaluation. Insurance policies referencing this chassis ID can be allocated in the upcoming Insurance Module.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Log Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Database Audit Log</h4>
                  <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-xs text-xs space-y-2.5 text-neutral-500">
                    <div className="flex justify-between">
                      <span>Registered On:</span>
                      <span className="font-semibold text-neutral-700">{formatDate(viewingVehicle.createdAt)}</span>
                    </div>
                    {viewingVehicle.createdBy && (
                      <div className="flex justify-between">
                        <span>Staff Handler:</span>
                        <span className="font-semibold text-neutral-700">{viewingVehicle.createdBy.name}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Deactivation (Soft Delete) */}
      <AnimatePresence>
        {deactivatingVehicle && (
          <div id="vehicle_deactivate_backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              id="vehicle_deactivate_modal"
              className="bg-white rounded-2xl border border-neutral-100 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-900">Deactivate Vehicle Spec?</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    You are deactivating the registration specification for <strong className="text-neutral-800">{deactivatingVehicle.vehicleNumber}</strong>.
                    This flags the motor spec as inactive in Directory listings.
                  </p>
                </div>
              </div>

              {/* Show-stopper warning details */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3 text-[11px] text-neutral-500 leading-normal">
                ⚠️ <strong className="text-neutral-700">Database Consistency Check:</strong> The system automatically blocks deactivation of any vehicle record that is currently associated with an active insurance policy.
              </div>

              {/* API Fail Alerts */}
              {deactivateError && (
                <div id="vehicle_deactivate_api_error" className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-medium leading-normal animate-pulse">
                  {deactivateError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeactivatingVehicle(null);
                    setDeactivateError(null);
                  }}
                  disabled={deactivating}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  disabled={deactivating}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  {deactivating ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Deactivate Asset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
