"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Search,
  Plus,
  Phone,
  PhoneCall,
  MessageCircle,
  Mail,
  MapPin,
  Car,
  Shield,
  Trash2,
  Edit2,
  X,
  User,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  RefreshCw,
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
  createdAt: string;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType: string;
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
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
}

const CUSTOMERS_PAGE_SIZE = 30;

// wa.me needs the full international number with no symbols/spaces; a bare
// 10-digit number is assumed to be a local Indian mobile missing its country code.
const toWhatsAppNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

export default function CustomersPage() {
  const { data: session } = useSession();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [customerPolicies, setCustomerPolicies] = useState<Policy[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Sub-tabs in Details
  const [detailTab, setDetailTab] = useState<"vehicles" | "policies" | "stats">("vehicles");
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<"add" | "edit">("add");
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<"add" | "edit">("add");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [isConfirmDeleteCustomer, setIsConfirmDeleteCustomer] = useState(false);
  const [isConfirmDeleteVehicle, setIsConfirmDeleteVehicle] = useState(false);

  // Form Fields - Customer
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custAddress, setCustAddress] = useState("");

  // Form Fields - Vehicle
  const [vehPlate, setVehPlate] = useState("");
  const [vehType, setVehType] = useState("Four Wheeler");
  const [vehMake, setVehMake] = useState("");
  const [vehModel, setVehModel] = useState("");
  const [vehYear, setVehYear] = useState(new Date().getFullYear());
  const [vehEngine, setVehEngine] = useState("");
  const [vehChassis, setVehChassis] = useState("");
  const [vehColor, setVehColor] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Load Customer List
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: String(CUSTOMERS_PAGE_SIZE),
        sortBy: "createdAt",
        sortOrder: "desc",
        includeInactive: "true",
      });
      if (searchQuery.trim()) {
        queryParams.set("search", searchQuery);
      }

      const res = await fetch(`/api/customers?${queryParams.toString()}`);
      const result = await res.json();
      if (result.success && result.data) {
        setCustomers(result.data.customers || []);
        setTotalPages(result.data.pagination?.pages || 1);
        setTotalRecords(result.data.pagination?.total || 0);

        // Auto-select first customer if none selected
        if (result.data.customers?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(result.data.customers[0]._id);
        }
      } else {
        toast.error("Could not fetch customer registry.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error fetching customer database.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search with delay
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchCustomers();
    }, 450);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  // Load detailed portfolios whenever selectedCustomer shifts
  const fetchCustomerDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const [custRes, vehRes, polRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/vehicles?customerId=${id}&includeInactive=true`),
        fetch(`/api/policies?customerId=${id}&includeInactive=true`),
      ]);

      const custResult = await custRes.json();
      const vehResult = await vehRes.json();
      const polResult = await polRes.json();

      if (custResult.success) setSelectedCustomer(custResult.data);
      if (vehResult.success) setCustomerVehicles(vehResult.data?.vehicles || []);
      if (polResult.success) setCustomerPolicies(polResult.data?.policies || []);
    } catch (error) {
      console.error(error);
      toast.error("Error loading profile detail worksheets.");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    setPhoneMenuOpen(false);
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // Open Add Customer Dialog
  const openAddCustomer = () => {
    setCustomerModalMode("add");
    setCustName("");
    setCustPhone("");
    setCustEmail("");
    setCustAddress("");
    setIsCustomerModalOpen(true);
  };

  // Open Edit Customer Dialog
  const openEditCustomer = () => {
    if (!selectedCustomer) return;
    setCustomerModalMode("edit");
    setCustName(selectedCustomer.name);
    setCustPhone(selectedCustomer.phone);
    setCustEmail(selectedCustomer.email || "");
    setCustAddress(selectedCustomer.address || "");
    setIsCustomerModalOpen(true);
  };

  // Save/Edit Customer action
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      toast.error("Name and Phone are strictly required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim() || undefined,
        address: custAddress.trim() || undefined,
      };

      let endpoint = "/api/customers";
      let method = "POST";

      if (customerModalMode === "edit" && selectedCustomerId) {
        endpoint = `/api/customers/${selectedCustomerId}`;
        method = "PUT";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(
          customerModalMode === "add"
            ? "New Customer added successfully!"
            : "Customer profile details saved."
        );
        setIsCustomerModalOpen(false);
        fetchCustomers();
        if (customerModalMode === "edit" && selectedCustomerId) {
          fetchCustomerDetails(selectedCustomerId);
        }
      } else {
        toast.error(result.message || "Operation failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network communication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete Customer
  const handleDeleteCustomer = async () => {
    if (!selectedCustomerId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${selectedCustomerId}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Customer profile successfully soft-deleted (deactivated).");
        setIsConfirmDeleteCustomer(false);
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
        fetchCustomers();
      } else {
        toast.error(result.message || "Failed to delete customer.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete customer.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Add Vehicle dialog
  const openAddVehicle = () => {
    setVehicleModalMode("add");
    setVehPlate("");
    setVehType("Four Wheeler");
    setVehMake("");
    setVehModel("");
    setVehYear(new Date().getFullYear());
    setVehEngine("");
    setVehChassis("");
    setVehColor("");
    setIsVehicleModalOpen(true);
  };

  // Open Edit Vehicle dialog
  const openEditVehicle = (veh: Vehicle) => {
    setVehicleModalMode("edit");
    setSelectedVehicle(veh);
    setVehPlate(veh.vehicleNumber);
    setVehType(veh.vehicleType || "Four Wheeler");
    setVehMake(veh.manufacturer);
    setVehModel(veh.model);
    setVehYear(veh.year);
    setVehEngine(veh.engineNumber);
    setVehChassis(veh.chassisNumber);
    setVehColor(veh.color || "");
    setIsVehicleModalOpen(true);
  };

  // Save/Edit Vehicle asset
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlate || !vehMake || !vehModel || !selectedCustomerId) {
      toast.error("Plate Number, Manufacturer, and Model are required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        vehicleNumber: vehPlate.trim().toUpperCase(),
        vehicleType: vehType,
        manufacturer: vehMake.trim(),
        model: vehModel.trim(),
        year: Number(vehYear),
        engineNumber: vehEngine.trim(),
        chassisNumber: vehChassis.trim(),
        color: vehColor.trim() || undefined,
        customer: selectedCustomerId,
      };

      let endpoint = "/api/vehicles";
      let method = "POST";

      if (vehicleModalMode === "edit" && selectedVehicle) {
        endpoint = `/api/vehicles/${selectedVehicle._id}`;
        method = "PUT";
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(
          vehicleModalMode === "add"
            ? "Vehicle registered to profile!"
            : "Vehicle asset specs updated."
        );
        setIsVehicleModalOpen(false);
        fetchCustomerDetails(selectedCustomerId);
      } else {
        toast.error(result.message || "Vehicle action failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network communication error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Soft delete / deactivate Vehicle
  const handleDeleteVehicle = async () => {
    if (!selectedVehicle || !selectedCustomerId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${selectedVehicle._id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Vehicle registered state soft-deleted (deactivated).");
        setIsConfirmDeleteVehicle(false);
        setSelectedVehicle(null);
        fetchCustomerDetails(selectedCustomerId);
      } else {
        toast.error(result.message || "Failed to deactivate vehicle.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network communication error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Currency utility
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div id="customers_module_workspace" className="space-y-6 pb-12">
      
      {/* Upper header controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 shrink-0" />
            Client Directory & Assets
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Query client profiles, inspect mapped vehicle hardware models, and analyze active premiums.
          </p>
        </div>

        <button
          onClick={openAddCustomer}
          id="add_customer_trigger"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Customer Profile
        </button>
      </div>

      {/* Two panel workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* PANEL 1: Search & Customer list (Cols 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          
          {/* Search box header */}
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/20 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search name, phone or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchCustomers}
              className="p-2 border border-neutral-200 bg-white rounded-xl text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Customer results listing */}
          {loading ? (
            <div className="divide-y divide-neutral-50 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                    <div className="h-3 w-20 bg-neutral-100 rounded"></div>
                  </div>
                  <div className="h-4 w-12 bg-neutral-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <Users className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-700">No customers registered</p>
              <p className="text-[10px] text-neutral-400 mt-1">Onboard a client using the "Create Customer Profile" button.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 max-h-[580px] overflow-y-auto">
              {customers.map((cust) => {
                const isSelected = selectedCustomerId === cust._id;
                return (
                  <div
                    key={cust._id}
                    onClick={() => setSelectedCustomerId(cust._id)}
                    className={`p-4 transition-all cursor-pointer flex items-center justify-between text-left ${
                      isSelected ? "bg-blue-50/30 border-l-4 border-blue-500" : "hover:bg-neutral-50/40"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5 truncate">
                        {cust.name}
                        {!cust.isActive && (
                          <span className="bg-rose-50 border border-rose-100 text-rose-600 rounded-md px-1.5 py-0.5 text-[8px] font-bold">
                            Deactivated
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {cust.phone}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "text-blue-500 translate-x-0.5" : "text-neutral-300"}`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          {totalRecords > 0 && (
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] font-semibold text-neutral-400">
                Showing{" "}
                <strong className="text-neutral-700 font-bold">
                  {Math.min(totalRecords, (page - 1) * CUSTOMERS_PAGE_SIZE + 1)}
                </strong>
                {" "}to{" "}
                <strong className="text-neutral-700 font-bold">{Math.min(totalRecords, page * CUSTOMERS_PAGE_SIZE)}</strong>
                {" "}of <strong className="text-neutral-700 font-bold">{totalRecords}</strong> customers
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 bg-white border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-600 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Page {page} of {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 bg-white border border-neutral-200 rounded-lg text-[11px] font-bold text-neutral-600 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PANEL 2: Detailed slate (Cols 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-6">
              
              {/* Profile Card Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-50 pb-5">
                <div className="flex gap-4 items-center">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center font-bold text-blue-600 border border-blue-100 shrink-0">
                    {selectedCustomer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-neutral-800 flex items-center gap-1.5">
                      {selectedCustomer.name}
                      {selectedCustomer.isActive ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[9px] font-bold">
                          ● Active Profile
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 text-[9px] font-bold">
                          ● Soft-Deleted
                        </span>
                      )}
                    </h2>
                    <p className="text-[10px] text-neutral-400 mt-1">Unique Database Entry: {selectedCustomer._id}</p>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openEditCustomer}
                    className="p-1.5 border border-neutral-200 hover:border-neutral-300 rounded-xl bg-white hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer"
                    title="Edit contact info"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {selectedCustomer.isActive && (
                    <button
                      onClick={() => setIsConfirmDeleteCustomer(true)}
                      className="p-1.5 border border-rose-100 hover:bg-rose-50 rounded-xl text-neutral-300 hover:text-rose-600 transition-all cursor-pointer"
                      title="Deactivate customer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Core contact spec grids */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="relative">
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Primary Phone</p>
                    <button
                      type="button"
                      onClick={() => setPhoneMenuOpen((v) => !v)}
                      className="font-bold text-neutral-800 mt-0.5 hover:text-blue-600 transition-colors cursor-pointer underline decoration-dotted decoration-neutral-300 underline-offset-2"
                    >
                      {selectedCustomer.phone}
                    </button>

                    <AnimatePresence>
                      {phoneMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setPhoneMenuOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.1 }}
                            className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-neutral-100 bg-white shadow-lg overflow-hidden"
                          >
                            <a
                              href={`tel:${selectedCustomer.phone.replace(/\s+/g, "")}`}
                              onClick={() => setPhoneMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              <PhoneCall className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Call
                            </a>
                            <a
                              href={`https://wa.me/${toWhatsAppNumber(selectedCustomer.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setPhoneMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-t border-neutral-50"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> WhatsApp
                            </a>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Email Address</p>
                    <p className="font-semibold text-neutral-800 mt-0.5 truncate">{selectedCustomer.email || "None Specified"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Postal Location</p>
                    <p className="font-semibold text-neutral-800 mt-0.5 truncate">{selectedCustomer.address || "None Specified"}</p>
                  </div>
                </div>
              </div>

              {/* Sub tabs selectors */}
              <div className="flex border-b border-neutral-100 pb-px">
                <button
                  onClick={() => setDetailTab("vehicles")}
                  className={`border-b-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                    detailTab === "vehicles"
                      ? "border-blue-500 text-blue-700 font-bold"
                      : "border-transparent text-neutral-400 hover:text-neutral-800"
                  }`}
                >
                  Asset Ledger ({customerVehicles.length})
                </button>
                <button
                  onClick={() => setDetailTab("policies")}
                  className={`border-b-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                    detailTab === "policies"
                      ? "border-blue-500 text-blue-700 font-bold"
                      : "border-transparent text-neutral-400 hover:text-neutral-800"
                  }`}
                >
                  Policies & Covers ({customerPolicies.length})
                </button>
                <button
                  onClick={() => setDetailTab("stats")}
                  className={`border-b-2 px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                    detailTab === "stats"
                      ? "border-blue-500 text-blue-700 font-bold"
                      : "border-transparent text-neutral-400 hover:text-neutral-800"
                  }`}
                >
                  Portfolio Statistics
                </button>
              </div>

              {/* DETAILS CONTENT */}
              {detailsLoading ? (
                <div className="h-40 flex items-center justify-center animate-pulse">
                  <Clock className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* TAB A: Vehicles Asset List */}
                  {detailTab === "vehicles" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Registered Assets</h3>
                        <button
                          onClick={openAddVehicle}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="h-3 w-3" /> Register Asset
                        </button>
                      </div>

                      {customerVehicles.length === 0 ? (
                        <div className="text-center p-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-neutral-400">
                          <Car className="h-8 w-8 text-neutral-200 mx-auto mb-1 stroke-1" />
                          <p className="text-xs">No active vehicle specifications linked to this profile.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {customerVehicles.map((veh) => (
                            <div key={veh._id} className="border border-neutral-100 rounded-xl p-4 bg-white hover:bg-neutral-50/20 transition-all flex flex-col justify-between space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="bg-neutral-900 text-white rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wide font-mono">
                                    {veh.vehicleNumber}
                                  </span>
                                  <h4 className="text-xs font-bold text-neutral-800 mt-1.5">
                                    {veh.manufacturer} {veh.model}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditVehicle(veh)}
                                    className="p-1 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 rounded"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  {veh.isActive && (
                                    <button
                                      onClick={() => {
                                        setSelectedVehicle(veh);
                                        setIsConfirmDeleteVehicle(true);
                                      }}
                                      className="p-1 hover:bg-rose-50 text-neutral-300 hover:text-rose-600 rounded"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-neutral-500 border-t border-neutral-50 pt-2">
                                <p>Engine: <span className="text-neutral-700 font-bold">{veh.engineNumber}</span></p>
                                <p>Chassis: <span className="text-neutral-700 font-bold">{veh.chassisNumber}</span></p>
                                <p>Year: <span className="text-neutral-700 font-bold">{veh.year}</span></p>
                                <p>Color: <span className="text-neutral-700 font-bold">{veh.color || "-"}</span></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB B: Policies Register */}
                  {detailTab === "policies" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Policy Timeline</h3>
                      </div>

                      {customerPolicies.length === 0 ? (
                        <div className="text-center p-8 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-neutral-400">
                          <Shield className="h-8 w-8 text-neutral-200 mx-auto mb-1 stroke-1" />
                          <p className="text-xs">No insurance contracts exist for this customer yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                <th className="pb-2">Policy Number</th>
                                <th className="pb-2">Company / Line</th>
                                <th className="pb-2">Validity</th>
                                <th className="pb-2 text-right">Premium</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                              {customerPolicies.map((pol) => {
                                const isExpired = new Date(pol.expiryDate) <= new Date();
                                return (
                                  <tr key={pol._id} className="hover:bg-neutral-50/50">
                                    <td className="py-2.5 font-mono font-bold text-neutral-800">#{pol.policyNumber}</td>
                                    <td className="py-2.5">
                                      <p className="font-bold text-neutral-700">{pol.insuranceCompany}</p>
                                      <p className="text-[10px] text-neutral-400">{pol.policyType}</p>
                                    </td>
                                    <td className="py-2.5">
                                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                        isExpired
                                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      }`}>
                                        {isExpired ? "Expired" : "Active"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-right font-bold text-neutral-800">
                                      {formatCurrency(pol.premiumAmount)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB C: Portfolio stats breakdown */}
                  {detailTab === "stats" && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-xl border border-neutral-100 shadow-xs text-center space-y-1 bg-neutral-50/40">
                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg inline-flex mb-1"><Car className="h-4 w-4" /></span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Connected Vehicles</p>
                        <h4 className="text-xl font-extrabold text-neutral-800">{customerVehicles.length}</h4>
                      </div>

                      <div className="p-4 rounded-xl border border-neutral-100 shadow-xs text-center space-y-1 bg-neutral-50/40">
                        <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg inline-flex mb-1"><Shield className="h-4 w-4" /></span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Policy Folders</p>
                        <h4 className="text-xl font-extrabold text-neutral-800">{customerPolicies.length}</h4>
                      </div>

                      <div className="p-4 rounded-xl border border-neutral-100 shadow-xs text-center space-y-1 bg-neutral-50/40">
                        <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg inline-flex mb-1"><TrendingUp className="h-4 w-4" /></span>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Premium Volume</p>
                        <h4 className="text-xl font-extrabold text-emerald-600">
                          {formatCurrency(
                            customerPolicies
                              .filter((p) => new Date(p.expiryDate) > new Date() && p.isActive)
                              .reduce((acc, curr) => acc + curr.premiumAmount, 0)
                          )}
                        </h4>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          ) : (
            <div className="border-2 border-dashed border-neutral-200 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-6 text-neutral-400 bg-white">
              <Users className="h-10 w-10 mb-2 stroke-1" />
              <p className="text-xs font-bold text-neutral-700">Detailed Panel Ready</p>
              <p className="text-[10px] text-neutral-400 mt-1 max-w-xs">Select any customer from the side registry list to view mapped vehicles, linked policies, and portfolio stats.</p>
            </div>
          )}

        </div>

      </div>

      {/* -------------------- MODALS -------------------- */}

      {/* 1. CUSTOMER PROFILE DIALOG (ADD / EDIT) */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.form
              onSubmit={handleSaveCustomer}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-800">
                  {customerModalMode === "add" ? "Create Customer Profile" : "Edit Customer Info"}
                </h3>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Client Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@gmail.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Permanent/Billing Address</label>
                  <textarea
                    placeholder="Postal location specs"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-blue-300">
                  {submitting ? "Processing..." : "Save Customer"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 2. VEHICLE PROFILE DIALOG (ADD / EDIT) */}
      <AnimatePresence>
        {isVehicleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.form
              onSubmit={handleSaveVehicle}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-800">
                  {vehicleModalMode === "add" ? "Register Vehicle Asset" : "Edit Vehicle Details"}
                </h3>
                <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto p-1">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Vehicle Plate Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH12AA1234"
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Vehicle Type</label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none bg-white"
                  >
                    <option value="Four Wheeler">Four Wheeler</option>
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Manufacturer (Make) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maruti Suzuki"
                    value={vehMake}
                    onChange={(e) => setVehMake(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swift"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Manufacturing Year</label>
                  <input
                    type="number"
                    value={vehYear}
                    onChange={(e) => setVehYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Engine Number</label>
                  <input
                    type="text"
                    placeholder="e.g. K12M123456"
                    value={vehEngine}
                    onChange={(e) => setVehEngine(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chassis Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MBH321..."
                    value={vehChassis}
                    onChange={(e) => setVehChassis(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Vehicle Paint Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Metallic Red"
                    value={vehColor}
                    onChange={(e) => setVehColor(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-blue-300">
                  {submitting ? "Processing..." : "Save Asset"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 3. CONFIRM DELETE CUSTOMER DIALOG */}
      <AnimatePresence>
        {isConfirmDeleteCustomer && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-sm w-full shadow-xl space-y-4 text-center"
            >
              <div className="mx-auto h-12 w-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black text-neutral-800">Confirm Deactivation</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Are you sure you want to soft-delete (deactivate) **{selectedCustomer.name}**?
                </p>
                <p className="text-rose-600 font-bold text-[10px] uppercase tracking-wider">
                  Important: This fails if they have active vehicles linked in the ledger.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-50">
                <button type="button" onClick={() => setIsConfirmDeleteCustomer(false)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleDeleteCustomer} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                  Confirm Deactivate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CONFIRM DELETE VEHICLE DIALOG */}
      <AnimatePresence>
        {isConfirmDeleteVehicle && selectedVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-sm w-full shadow-xl space-y-4 text-center"
            >
              <div className="mx-auto h-12 w-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black text-neutral-800">Confirm Vehicle Deactivation</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Are you sure you want to soft-delete (deactivate) the vehicle **{selectedVehicle.vehicleNumber}** ({selectedVehicle.manufacturer} {selectedVehicle.model})?
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-50">
                <button type="button" onClick={() => setIsConfirmDeleteVehicle(false)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleDeleteVehicle} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                  Confirm Deactivate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
