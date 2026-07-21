"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageCircle,
  Search,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  History,
} from "lucide-react";
import { toast } from "sonner";
import PhoneActions from "@/components/PhoneActions";

interface Customer {
  _id: string;
  name: string;
  phone: string;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  manufacturer: string;
  model: string;
}

interface Policy {
  _id: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  premiumAmount: number;
  expiryDate: string;
  customer?: Customer;
  vehicle?: Vehicle;
}

type ReminderWindow = "15" | "10" | "5" | "expired";

const TABS: { value: ReminderWindow; label: string; icon: typeof Clock }[] = [
  { value: "15", label: "Expiring in 15 Days", icon: Clock },
  { value: "10", label: "Expiring in 10 Days", icon: Clock },
  { value: "5", label: "Expiring in 5 Days", icon: ShieldAlert },
  { value: "expired", label: "Expired (Last 15 Days)", icon: History },
];

const DEFAULT_TEMPLATE =
  "Dear {customer_name}, your insurance policy #{policy_number} with {insurance_company} for vehicle {vehicle_number} is expiring on {expiry_date}. To ensure continuous coverage, please contact us at {company_phone} or renew soon.";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Settings page stores these in localStorage (see /dashboard/settings) - reused
// here so the message text stays in sync with whatever the agency has customized.
function loadWhatsAppTemplate(): string {
  try {
    const saved = localStorage.getItem("pf_whatsapp_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.whatsappTemplate) return parsed.whatsappTemplate;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_TEMPLATE;
}

function loadCompanyPhone(): string {
  try {
    const saved = localStorage.getItem("pf_company_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.companyPhone) return parsed.companyPhone;
    }
  } catch {
    // fall through to empty
  }
  return "";
}

function resolveMessage(template: string, policy: Policy, companyPhone: string) {
  return template
    .replace(/{customer_name}/g, policy.customer?.name || "Customer")
    .replace(/{policy_number}/g, policy.policyNumber)
    .replace(/{insurance_company}/g, policy.insuranceCompany)
    .replace(/{vehicle_number}/g, policy.vehicle?.vehicleNumber || "your vehicle")
    .replace(/{expiry_date}/g, formatDate(policy.expiryDate))
    .replace(/{company_phone}/g, companyPhone || "us")
    .replace(/{policy_id}/g, policy._id);
}

export default function SendMessagePage() {
  const [activeTab, setActiveTab] = useState<ReminderWindow>("15");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [lastResults, setLastResults] = useState<Record<string, "Sent" | "Failed">>({});

  const fetchPolicies = useCallback(async (window: ReminderWindow) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders/whatsapp?window=${window}`);
      const result = await res.json();
      if (result.success) {
        const list: Policy[] = result.data?.policies || [];
        setPolicies(list);
        // Everything starts checked - staff deselects who they don't want to message.
        setSelectedIds(new Set(list.map((p) => p._id)));
        setLastResults({});
      } else {
        toast.error(result.message || "Failed to load policies for this window.");
        setPolicies([]);
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error("Failed to fetch reminder policies:", error);
      toast.error("Network error while loading policies.");
      setPolicies([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies(activeTab);
  }, [activeTab, fetchPolicies]);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => (p.customer?.name || "").toLowerCase().includes(q));
  }, [policies, searchQuery]);

  const allFilteredSelected = filteredPolicies.length > 0 && filteredPolicies.every((p) => selectedIds.has(p._id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredPolicies.forEach((p) => next.delete(p._id));
      } else {
        filteredPolicies.forEach((p) => next.add(p._id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendMessages = async () => {
    const targets = policies.filter((p) => selectedIds.has(p._id));

    if (targets.length === 0) {
      toast.warning("No data available", { description: "Select at least one customer to message." });
      return;
    }

    const template = loadWhatsAppTemplate();
    const companyPhone = loadCompanyPhone();

    const recipients = targets.map((p) => ({
      policyId: p._id,
      phone: p.customer?.phone || "",
      message: resolveMessage(template, p, companyPhone),
    }));

    setSending(true);
    try {
      const res = await fetch("/api/reminders/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients }),
      });
      const result = await res.json();

      if (result.success) {
        const statusMap: Record<string, "Sent" | "Failed"> = {};
        (result.data?.results || []).forEach((r: any) => {
          statusMap[r.policyId] = r.status;
        });
        setLastResults(statusMap);

        if (result.data?.failedCount > 0) {
          toast.warning(result.message, {
            description: "Some messages failed - see the status column below for details.",
          });
        } else {
          toast.success(result.message);
        }
      } else {
        toast.error(result.message || "Failed to send messages.", {
          description: (result.errors || []).join(" ") || undefined,
        });
      }
    } catch (error) {
      console.error("Send WhatsApp messages error:", error);
      toast.error("Network error while sending messages.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="send_message_page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-600 shrink-0" />
            Send Message
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Bulk WhatsApp renewal reminders for policies approaching or past their expiry date.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-neutral-100 rounded-xl p-1 border border-neutral-200 self-start w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === tab.value ? "bg-white text-blue-700 shadow-xs" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={() => fetchPolicies(activeTab)}
              className="rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleSendMessages}
              disabled={sending || selectedIds.size === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Messages ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-neutral-50 animate-pulse">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-neutral-200 rounded-md"></div>
                  <div className="h-3 w-28 bg-neutral-100 rounded-md"></div>
                </div>
                <div className="h-3 w-24 bg-neutral-100 rounded-md"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredPolicies.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 border border-neutral-100">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-neutral-800">No Data Available</h3>
            <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
              {searchQuery
                ? "No customers in this window match your search."
                : "No policies fall into this expiry window right now."}
            </p>
          </div>
        )}

        {/* List */}
        {!loading && filteredPolicies.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-4 px-6 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Policy</th>
                  <th className="py-4 px-6">Vehicle</th>
                  <th className="py-4 px-6">Expiry Date</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs text-neutral-600">
                {filteredPolicies.map((p) => {
                  const status = lastResults[p._id];
                  return (
                    <tr key={p._id} className="hover:bg-neutral-50/50 transition-all">
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p._id)}
                          onChange={() => toggleSelect(p._id)}
                          className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-neutral-800">{p.customer?.name || "N/A"}</div>
                        <PhoneActions phone={p.customer?.phone} className="text-[10px] text-neutral-400 font-normal" />
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-neutral-800">#{p.policyNumber}</span>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{p.insuranceCompany}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-neutral-700">{p.vehicle?.vehicleNumber || "N/A"}</span>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {p.vehicle?.manufacturer} {p.vehicle?.model}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-neutral-700">{formatDate(p.expiryDate)}</td>
                      <td className="py-4 px-6 text-right">
                        {status === "Sent" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </span>
                        )}
                        {status === "Failed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-100">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                        {!status && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500 border border-neutral-200">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note about WhatsApp's business-initiated message rules */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          WhatsApp only allows freeform messages like these to customers who messaged you within the last 24 hours.
          For customers outside that window, Meta requires a pre-approved message template - if sends start failing at
          scale, that's the likely cause and the fix is to register a template in Meta Business Manager.
        </p>
      </div>
    </div>
  );
}
