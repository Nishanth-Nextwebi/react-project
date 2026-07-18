"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Building,
  Clock,
  MessageSquare,
  User,
  CheckCircle,
  Save,
  Key,
  Shield,
  HelpCircle,
  Smartphone,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const currentUser = session?.user;

  const [activeTab, setActiveTab] = useState<"company" | "reminder" | "whatsapp" | "profile">("company");
  const [submitting, setSubmitting] = useState(false);

  // 1. Company Information Fields
  const [companyName, setCompanyName] = useState("PolicyFlow Insurance Brokerage");
  const [companyAddress, setCompanyAddress] = useState("12, Mahatma Gandhi Road, Bangalore, KA, 560001");
  const [companyPhone, setCompanyPhone] = useState("+91 98765 43210");
  const [companyEmail, setCompanyEmail] = useState("support@policyflow.in");
  const [licenseNumber, setLicenseNumber] = useState("IRDAI/BRK/102/2026");

  // 2. Expiry Reminder Days
  const [reminderDays, setReminderDays] = useState(30);
  const [autoReminder, setAutoReminder] = useState(true);

  // 3. WhatsApp Reminder Template
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    "Dear {customer_name}, your insurance policy #{policy_number} with {insurance_company} for vehicle {vehicle_number} is expiring on {expiry_date}. To ensure continuous coverage, please contact us at {company_phone} or click here to renew immediately: https://renew.policyflow.in/{policy_id}"
  );

  // 4. User Profile Settings (Current User)
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  // Populate user info from session
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfileEmail(currentUser.email || "");
    }

    // Load configurations from localStorage if present
    const savedCompany = localStorage.getItem("pf_company_settings");
    if (savedCompany) {
      const parsed = JSON.parse(savedCompany);
      setCompanyName(parsed.companyName || "");
      setCompanyAddress(parsed.companyAddress || "");
      setCompanyPhone(parsed.companyPhone || "");
      setCompanyEmail(parsed.companyEmail || "");
      setLicenseNumber(parsed.licenseNumber || "");
    }

    const savedReminders = localStorage.getItem("pf_reminder_settings");
    if (savedReminders) {
      const parsed = JSON.parse(savedReminders);
      setReminderDays(parsed.reminderDays || 30);
      setAutoReminder(parsed.autoReminder !== false);
    }

    const savedWhatsApp = localStorage.getItem("pf_whatsapp_settings");
    if (savedWhatsApp) {
      const parsed = JSON.parse(savedWhatsApp);
      setWhatsappTemplate(parsed.whatsappTemplate || "");
    }
  }, [currentUser]);

  // Handle saving Company configurations
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const config = { companyName, companyAddress, companyPhone, companyEmail, licenseNumber };
      localStorage.setItem("pf_company_settings", JSON.stringify(config));
      toast.success("Company profile configurations saved to local node registry!");
    } catch (err) {
      toast.error("Failed to save local system config.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle saving Expiry Reminder engine
  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const config = { reminderDays, autoReminder };
      localStorage.setItem("pf_reminder_settings", JSON.stringify(config));
      toast.success("Notification reminder engine updated successfully.");
    } catch (err) {
      toast.error("Failed to save notification thresholds.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle saving WhatsApp notification template
  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      localStorage.setItem("pf_whatsapp_settings", JSON.stringify({ whatsappTemplate }));
      toast.success("WhatsApp template stored and synchronized with engine!");
    } catch (err) {
      toast.error("Failed to compile custom template tokens.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle editing user profile (Credential Reset)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileEmail || !currentUser?.id) {
      toast.error("Name and email are mandatory profile fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: profileName,
        email: profileEmail,
      };
      if (profilePassword && profilePassword.trim().length >= 6) {
        payload.password = profilePassword;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Profile credentials updated successfully!");
        setProfilePassword("");
        // Trigger next-auth session updates
        await updateSession();
      } else {
        toast.error(result.message || "Credential update failed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send updates to user database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="settings_panel" className="space-y-6 pb-12">
      
      {/* Header Panel */}
      <div id="settings_header" className="border-b border-neutral-100 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600 shrink-0" />
          Settings & Configurations
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Adjust agency profile credentials, modify dynamic reminder threshold triggers, and alter system-wide notification templates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Tabs (Col 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-neutral-100 p-4 space-y-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab("company")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-bold transition-all ${
              activeTab === "company"
                ? "bg-blue-50 text-blue-800 shadow-xs border border-blue-100"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 border border-transparent"
            }`}
          >
            <Building className="h-4 w-4" />
            Company Information
          </button>

          <button
            onClick={() => setActiveTab("reminder")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-bold transition-all ${
              activeTab === "reminder"
                ? "bg-blue-50 text-blue-800 shadow-xs border border-blue-100"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 border border-transparent"
            }`}
          >
            <Clock className="h-4 w-4" />
            Expiry Reminder Days
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-bold transition-all ${
              activeTab === "whatsapp"
                ? "bg-blue-50 text-blue-800 shadow-xs border border-blue-100"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 border border-transparent"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Notification Templates
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-blue-50 text-blue-800 shadow-xs border border-blue-100"
                : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 border border-transparent"
            }`}
          >
            <User className="h-4 w-4" />
            Profile Settings
          </button>
        </div>

        {/* Content sheet panels (Col 8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: Company Info */}
            {activeTab === "company" && (
              <motion.form
                key="company_form"
                onSubmit={handleSaveCompany}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.12 }}
                className="space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">Company Information</h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Define corporate details rendered on statement sheets and bills.</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-neutral-50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Agency Legal Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">License Number (IRDAI / Broker ID)</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Corporate Phone</label>
                      <input
                        type="tel"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Corporate Email</label>
                      <input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Registered Corporate Address</label>
                    <textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    <Save className="h-4 w-4" /> Save Configurations
                  </button>
                </div>
              </motion.form>
            )}

            {/* Tab 2: Expiry Reminder Days */}
            {activeTab === "reminder" && (
              <motion.form
                key="reminder_form"
                onSubmit={handleSaveReminder}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.12 }}
                className="space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">Expiry Reminder Schedule</h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Determine the pre-expiry window timeline for automated notification alerts.</p>
                </div>

                <div className="space-y-4 pt-3 border-t border-neutral-50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Reminder Offset Threshold (Days)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        required
                        value={reminderDays}
                        onChange={(e) => setReminderDays(Number(e.target.value))}
                        className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-center"
                      />
                      <span className="text-neutral-500 font-semibold">Days prior to policy coverage expiration</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div>
                      <h4 className="font-bold text-neutral-800">Enable Daily Cron Engine Reminders</h4>
                      <p className="text-[10px] text-neutral-400">Allows PolicyFlow reminder cron workers to auto-detect expiring agreements at 8:00 AM daily.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoReminder(!autoReminder)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoReminder ? "bg-emerald-500" : "bg-neutral-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoReminder ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    <Save className="h-4 w-4" /> Save Schedule Threshold
                  </button>
                </div>
              </motion.form>
            )}

            {/* Tab 3: WhatsApp Templates */}
            {activeTab === "whatsapp" && (
              <motion.form
                key="whatsapp_form"
                onSubmit={handleSaveWhatsApp}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.12 }}
                className="space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">WhatsApp Notification Template</h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Customize default text templates with database replacement tokens.</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-neutral-50">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-2 text-[11px] text-blue-800 leading-relaxed">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Replacement Tokens Guide:</p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{customer_name}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{policy_number}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{insurance_company}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{vehicle_number}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{expiry_date}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{company_phone}"}</span>
                        <span className="font-mono bg-white px-1 py-0.5 border border-blue-200 rounded">{"{policy_id}"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Template Text String</label>
                    <textarea
                      required
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    <Save className="h-4 w-4" /> Sync Template Layout
                  </button>
                </div>
              </motion.form>
            )}

            {/* Tab 4: User Profile Credential Management */}
            {activeTab === "profile" && (
              <motion.form
                key="profile_form"
                onSubmit={handleSaveProfile}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.12 }}
                className="space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">My Profile Settings</h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Manage credentials and authorization passwords for your active session.</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-neutral-50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Account Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Change Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      placeholder="Enter at least 6 characters"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-neutral-700"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-50 text-right">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    <Save className="h-4 w-4" /> Save Profile details
                  </button>
                </div>
              </motion.form>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
