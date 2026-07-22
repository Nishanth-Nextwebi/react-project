"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Search, RefreshCw, Clock, ShieldAlert, History } from "lucide-react";
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
  lastFollowUpAt?: string | null;
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TrackFollowUpPage() {
  const [activeTab, setActiveTab] = useState<ReminderWindow>("15");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPolicies = useCallback(async (window: ReminderWindow) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/policies/expiry-window?window=${window}`);
      const result = await res.json();
      if (result.success) {
        setPolicies(result.data?.policies || []);
      } else {
        toast.error(result.message || "Failed to load policies for this window.");
        setPolicies([]);
      }
    } catch (error) {
      console.error("Failed to fetch follow-up policies:", error);
      toast.error("Network error while loading policies.");
      setPolicies([]);
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

  // Clicking Call/WhatsApp in the phone popup records the follow-up and
  // updates this row's timestamp locally, without a full refetch.
  const recordFollowUp = async (policyId: string) => {
    try {
      const res = await fetch(`/api/policies/${policyId}/follow-up`, { method: "PATCH" });
      const result = await res.json();
      if (result.success) {
        setPolicies((prev) =>
          prev.map((p) => (p._id === policyId ? { ...p, lastFollowUpAt: result.data?.lastFollowUpAt } : p))
        );
      } else {
        toast.error(result.message || "Failed to record follow-up.");
      }
    } catch (error) {
      console.error("Record follow-up error:", error);
      toast.error("Network error while recording follow-up.");
    }
  };

  return (
    <div id="track_followup_page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 shrink-0" />
            Track FollowUp
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Customers approaching or past policy expiry - click a phone number to Call or WhatsApp and log the contact.
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

          <button
            onClick={() => fetchPolicies(activeTab)}
            className="rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 self-end md:self-auto shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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
              <Users className="h-6 w-6" />
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Policy</th>
                  <th className="py-4 px-6">Vehicle</th>
                  <th className="py-4 px-6">Expiry Date</th>
                  <th className="py-4 px-6 text-right">Last FollowUp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 text-xs text-neutral-600">
                {filteredPolicies.map((p) => (
                  <tr key={p._id} className="hover:bg-neutral-50/50 transition-all">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-neutral-800">{p.customer?.name || "N/A"}</div>
                      <PhoneActions
                        phone={p.customer?.phone}
                        className="text-[10px] text-neutral-400 font-normal"
                        onAction={() => recordFollowUp(p._id)}
                      />
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
                      {p.lastFollowUpAt ? (
                        <span className="font-semibold text-emerald-600">{p.lastFollowUpAt}</span>
                      ) : (
                        <span className="text-neutral-400">Not contacted yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
