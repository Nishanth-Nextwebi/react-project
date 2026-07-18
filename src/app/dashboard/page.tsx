"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  UserCheck,
  BarChart3,
  Plus,
  FileText,
  Users,
  Car,
  TrendingUp,
  Calendar,
  DollarSign,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Stats {
  totalPolicies: number;
  activePolicies: number;
  expiredPolicies: number;
  expiringSoon: number;
  todaysRenewals: number;
  newThisMonth: number;
}

interface ChartItem {
  month: string;
  policies: number;
  revenue: number;
}

interface CompanyItem {
  name: string;
  value: number;
  premium: number;
}

interface MiniPolicy {
  _id: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string;
  expiryDate: string;
  premiumAmount: number;
  customer: {
    name: string;
    phone: string;
  };
  vehicle: {
    vehicleNumber: string;
    model: string;
  };
}

interface MiniActivity {
  _id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<ChartItem[]>([]);
  const [companyChart, setCompanyChart] = useState<CompanyItem[]>([]);
  const [upcomingExpiries, setUpcomingExpiries] = useState<MiniPolicy[]>([]);
  const [recentPolicies, setRecentPolicies] = useState<MiniPolicy[]>([]);
  const [recentActivities, setRecentActivities] = useState<MiniActivity[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.success && result.data) {
        setStats(result.data.stats);
        setMonthlyChart(result.data.charts.monthlyPoliciesChart || []);
        setCompanyChart(result.data.charts.companyDistribution || []);
        setUpcomingExpiries(result.data.upcomingExpiries || []);
        setRecentPolicies(result.data.recentPolicies || []);
        setRecentActivities(result.data.recentActivities || []);
      } else {
        toast.error("Failed to load dashboard statistics.");
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      toast.error("Network error loading dashboard analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  if (!mounted) {
    return null;
  }

  // Visual Palette for Pie Charts
  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatDate(dateStr);
  };

  return (
    <div id="dashboard_panel" className="space-y-6 animate-fade-in pb-12">
      {/* Upper header action area */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800">
            Performance Dashboard
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time analytics for policy metrics, portfolio distributions, and expiring coverages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-all cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <Link
            href="/dashboard/policies"
            id="quick_add_insurance"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Insurance
          </Link>
        </div>
      </div>

      {loading ? (
        /* SKELETON LOADING STATE */
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white border border-neutral-100 rounded-2xl p-5 animate-pulse space-y-3">
                <div className="h-3 w-16 bg-neutral-100 rounded"></div>
                <div className="h-6 w-24 bg-neutral-100 rounded"></div>
                <div className="h-3 w-12 bg-neutral-100 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-96 bg-white border border-neutral-100 rounded-2xl animate-pulse"></div>
            <div className="h-96 bg-white border border-neutral-100 rounded-2xl animate-pulse"></div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 bg-white border border-neutral-100 rounded-2xl animate-pulse"></div>
            <div className="h-80 bg-white border border-neutral-100 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      ) : (
        <>
          {/* STATS CARDS GRID */}
          <div id="stats_cards_grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            
            {/* CARD 1: Total Policies */}
            <div id="stat_total_policies" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Policies</span>
                <span className="p-1.5 bg-neutral-50 rounded-lg text-neutral-400"><FileText className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-neutral-800">{stats?.totalPolicies}</h3>
                <p className="text-[10px] text-neutral-400 mt-1">Global active/inactive log</p>
              </div>
            </div>

            {/* CARD 2: Active Policies */}
            <div id="stat_active_policies" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Cover</span>
                <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-500"><ShieldCheck className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-emerald-600">{stats?.activePolicies}</h3>
                <p className="text-[10px] text-emerald-500 mt-1 font-semibold">In force policy contracts</p>
              </div>
            </div>

            {/* CARD 3: Expired Policies */}
            <div id="stat_expired_policies" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Expired Cover</span>
                <span className="p-1.5 bg-rose-50 rounded-lg text-rose-500"><ShieldAlert className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-rose-600">{stats?.expiredPolicies}</h3>
                <p className="text-[10px] text-neutral-400 mt-1">Requires renewal touchpoint</p>
              </div>
            </div>

            {/* CARD 4: Expiring Soon */}
            <div id="stat_expiring_soon" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Expiring 30d</span>
                <span className="p-1.5 bg-amber-50 rounded-lg text-amber-500"><Clock className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-amber-600">{stats?.expiringSoon}</h3>
                <p className="text-[10px] text-amber-500 mt-1 font-semibold">Immediate pipeline danger</p>
              </div>
            </div>

            {/* CARD 5: Today's Renewals */}
            <div id="stat_todays_renewals" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Today's Expiry</span>
                <span className="p-1.5 bg-blue-50 rounded-lg text-blue-500"><Calendar className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-blue-600">{stats?.todaysRenewals}</h3>
                <p className="text-[10px] text-neutral-400 mt-1">Expiring within 24 hours</p>
              </div>
            </div>

            {/* CARD 6: Monthly Addition */}
            <div id="stat_monthly_additions" className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">New This Month</span>
                <span className="p-1.5 bg-purple-50 rounded-lg text-purple-500"><TrendingUp className="h-3.5 w-3.5" /></span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-purple-600">{stats?.newThisMonth}</h3>
                <p className="text-[10px] text-neutral-400 mt-1">Onboarded this calendar month</p>
              </div>
            </div>

          </div>

          {/* ACTION HUB & QUICK ACTIONS */}
          <div id="action_hub_row" className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-800">Quick Operations Hub</h4>
                <p className="text-[11px] text-neutral-400">Trigger standard workflows directly without digging through sidebars.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/policies"
                className="rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" /> New Insurance
              </Link>
              <Link
                href="/dashboard/customers"
                className="rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-purple-600" /> Customers Profile
              </Link>
              <Link
                href="/dashboard/reports"
                className="rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5 text-amber-600" /> Excel & PDF Reports
              </Link>
            </div>
          </div>

          {/* CHARTS GRAPHICS AREA */}
          <div id="charts_analytics_row" className="grid gap-6 lg:grid-cols-3">
            
            {/* Chart Column 1: Monthly registration trends */}
            <div id="chart_monthly_trends" className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Monthly Policy Registrations & Volume
                </h3>
                <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md">6m History</span>
              </div>
              {monthlyChart.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-neutral-400">
                  <BarChart3 className="h-8 w-8 mb-2 stroke-1" />
                  <p className="text-xs">No historical volume data on record</p>
                </div>
              ) : (
                <div className="h-72 w-full text-xs font-medium">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPolicies" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" stroke="#9ca3af" tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend iconType="circle" />
                      <Area name="Policy Issued" type="monotone" dataKey="policies" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPolicies)" />
                      <Area name="Premium Volume" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart Column 2: Provider Market Share */}
            <div id="chart_company_share" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-purple-600" />
                  Provider Market Share
                </h3>
              </div>
              {companyChart.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-neutral-400">
                  <BarChart3 className="h-8 w-8 mb-2 stroke-1" />
                  <p className="text-xs">No insurance providers registered yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={companyChart}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {companyChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} Policies`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend distribution mapping */}
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {companyChart.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <span className="text-neutral-400 font-medium">
                          {item.value} ({formatCurrency(item.premium)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* TABLES & LOG DATA FEED */}
          <div id="tables_data_grid" className="grid gap-6 lg:grid-cols-2">
            
            {/* Table block 1: Impending Policy Expirations */}
            <div id="table_impending_expiries" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Impending Expirations (30 Days)
                </h3>
                <Link href="/dashboard/policies" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              
              {upcomingExpiries.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-neutral-400 text-center">
                  <ShieldCheck className="h-8 w-8 mb-2 text-emerald-500 stroke-1" />
                  <p className="text-xs font-bold text-neutral-700">All clear!</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">No policy expires scheduled in the next 30 days.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        <th className="pb-2">Customer & Policy</th>
                        <th className="pb-2">Asset</th>
                        <th className="pb-2">Expiry Date</th>
                        <th className="pb-2 text-right">Premium</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {upcomingExpiries.map((pol) => {
                        const isDanger = new Date(pol.expiryDate).getTime() - new Date().getTime() < 7 * 86400000;
                        return (
                          <tr key={pol._id} className="hover:bg-neutral-50/50">
                            <td className="py-3">
                              <p className="font-bold text-neutral-800">{pol.customer?.name || "Unknown"}</p>
                              <p className="font-mono text-[10px] text-neutral-400 mt-0.5">#{pol.policyNumber}</p>
                            </td>
                            <td className="py-3">
                              <p className="font-medium text-neutral-700">{pol.vehicle?.vehicleNumber || "No plate"}</p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">{pol.vehicle?.model || "Asset Map"}</p>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                isDanger ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {formatDate(pol.expiryDate)}
                              </span>
                            </td>
                            <td className="py-3 text-right font-bold text-neutral-800">
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

            {/* Table block 2: System Activity Logs Feed */}
            <div id="table_system_activities" className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-violet-500" />
                  System Activity Logs
                </h3>
                <span className="text-[10px] text-neutral-400 font-medium">Audit Trail</span>
              </div>

              {recentActivities.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-neutral-400 text-center">
                  <Activity className="h-8 w-8 mb-2 stroke-1" />
                  <p className="text-xs">No recent administrative logs logged</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                  {recentActivities.map((act) => {
                    // Decide background highlight by action verb
                    let iconBg = "bg-neutral-50 border-neutral-200 text-neutral-600";
                    if (act.action.includes("Policy")) {
                      iconBg = "bg-blue-50 border-blue-100 text-blue-700";
                    } else if (act.action.includes("Customer")) {
                      iconBg = "bg-purple-50 border-purple-100 text-purple-700";
                    } else if (act.action.includes("Vehicle")) {
                      iconBg = "bg-indigo-50 border-indigo-100 text-indigo-700";
                    } else if (act.action.includes("Login")) {
                      iconBg = "bg-emerald-50 border-emerald-100 text-emerald-700";
                    }
                    return (
                      <div key={act._id} className="flex gap-3 items-start p-2.5 rounded-xl hover:bg-neutral-50/50 border border-transparent hover:border-neutral-50 transition-all">
                        <span className={`inline-flex items-center justify-center rounded-xl p-2 text-[10px] font-bold border ${iconBg} shrink-0`}>
                          {act.action.substring(0, 2).toUpperCase()}
                        </span>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[11px] font-bold text-neutral-800 leading-none">{act.action}</h4>
                            <span className="text-[9px] text-neutral-400 font-medium">{formatTimeAgo(act.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-snug break-words">{act.details}</p>
                          <p className="text-[9px] text-neutral-400 mt-0.5">By {act.userName || "System"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
