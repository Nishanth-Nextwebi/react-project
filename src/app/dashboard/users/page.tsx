"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  UserCheck,
  Plus,
  Search,
  Key,
  Trash2,
  ShieldAlert,
  Mail,
  User,
  Check,
  X,
  RefreshCw,
  MoreVertical,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "employee">("employee");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const result = await res.json();
      if (result.success) {
        setUsers(result.users || []);
      } else {
        toast.error(result.message || "Failed to load users list.");
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Network error loading users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
    }
  }, [currentUser]);

  // Handle Employee Access Block
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div id="unauthorized_container" className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-neutral-100 shadow-xs max-w-2xl mx-auto my-12">
        <div className="h-12 w-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4 animate-bounce">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-black text-neutral-800 tracking-tight">Access Prohibited</h2>
        <p className="text-neutral-400 text-xs mt-1 max-w-sm leading-relaxed">
          The User Administration control plane is strictly restricted to accounts with **Admin** clearance. Contact your system supervisor if you require access.
        </p>
        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Filter users by search query
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("employee");
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`User "${formName}" successfully onboarded!`);
        setIsAddModalOpen(false);
        fetchUsers();
      } else {
        toast.error(result.message || "Could not onboard user.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error on user onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          isActive: formIsActive,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("User profile successfully updated.");
        setIsEditModalOpen(false);
        fetchUsers();
      } else {
        toast.error(result.message || "Failed to save profile changes.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error during update.");
    } finally {
      setSubmitting(false);
    }
  };

  const openResetModal = (user: UserProfile) => {
    setSelectedUser(user);
    setFormPassword("");
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !formPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: formPassword,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Password updated for ${selectedUser.name}!`);
        setIsResetModalOpen(false);
      } else {
        toast.error(result.message || "Failed to reset password.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error during reset.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser._id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("User successfully deleted from registry.");
        setIsDeleteModalOpen(false);
        fetchUsers();
      } else {
        toast.error(result.message || "Failed to remove user account.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error during deletion.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserActive = async (user: UserProfile) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`User status updated to ${!user.isActive ? "Active" : "Inactive"}`);
        fetchUsers();
      } else {
        toast.error(result.message || "Failed to update user status.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error.");
    }
  };

  return (
    <div id="users_module_panel" className="space-y-6 pb-12">
      
      {/* Header Panel */}
      <div id="users_header" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-blue-600 shrink-0" />
            User Administration
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage personnel, assign system privileges, reset passwords, and toggle active logins.
          </p>
        </div>

        <button
          onClick={openAddModal}
          id="add_new_user_button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Onboard User
        </button>
      </div>

      {/* Control panel & listing */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {/* Filters and search */}
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search user profiles by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 pl-10 pr-4 py-2 text-xs font-medium text-neutral-700 bg-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-500 hover:text-neutral-800 transition-all cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          /* Loader Skeleton */
          <div className="divide-y divide-neutral-50 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                  <div className="h-3 w-48 bg-neutral-100 rounded"></div>
                </div>
                <div className="h-4 w-16 bg-neutral-200 rounded-md"></div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <User className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-700">No users found</p>
            <p className="text-[10px] text-neutral-400 mt-1">Try modifying your query or onboarding a new user.</p>
          </div>
        ) : (
          /* User Listings Grid */
          <div className="divide-y divide-neutral-50">
            {filteredUsers.map((user) => (
              <div key={user._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/40 transition-all">
                <div className="flex gap-4 items-center">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border font-bold ${
                    user.role === "admin"
                      ? "bg-blue-50 border-blue-100 text-blue-700"
                      : "bg-purple-50 border-purple-100 text-purple-700"
                  }`}>
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      {user.name}
                      {user.role === "admin" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 text-[9px] font-bold">
                          <Shield className="h-2.5 w-2.5" /> Admin
                        </span>
                      )}
                      {user.role === "employee" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 px-2 py-0.5 text-[9px] font-bold">
                          User
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      {user.isActive ? "Active" : "Suspended"}
                    </span>
                    <button
                      onClick={() => toggleUserActive(user)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        user.isActive ? "bg-emerald-500" : "bg-neutral-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          user.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Operational Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 rounded-lg cursor-pointer transition-all text-xs font-semibold border border-transparent hover:border-neutral-100"
                      title="Edit privileges"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openResetModal(user)}
                      className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-blue-600 rounded-lg cursor-pointer transition-all"
                      title="Reset credentials"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    {currentUser?.id !== user._id && (
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-1.5 hover:bg-rose-50 text-neutral-300 hover:text-rose-600 rounded-lg cursor-pointer transition-all"
                        title="Delete user profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------------------- MODALS -------------------- */}
      
      {/* 1. ONBOARD USER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.form
              onSubmit={handleAddUser}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" /> Onboard New User
                </h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditi Roy"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aditi@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Role Designation</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="employee">User (Standard Access)</option>
                    <option value="admin">Admin (Full System Privileges)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-neutral-50">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-blue-300">
                  {submitting ? "Processing..." : "Create User"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EDIT USER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.form
              onSubmit={handleEditUser}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-800">Edit User Privileges</h3>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Role Designation</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="employee">User (Standard Access)</option>
                    <option value="admin">Admin (Full System Privileges)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-b border-neutral-50">
                  <div>
                    <p className="text-xs font-bold text-neutral-800">Login Status</p>
                    <p className="text-[10px] text-neutral-400">Suspend profile from signing in</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formIsActive ? "bg-emerald-500" : "bg-neutral-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formIsActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-blue-300">
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 3. RESET PASSWORD MODAL */}
      <AnimatePresence>
        {isResetModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.form
              onSubmit={handleResetPassword}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-sm w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-600" /> Reset Password
                </h3>
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-neutral-500">
                  Type a new temporary password for **{selectedUser.name}**.
                </p>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-neutral-50">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-blue-300">
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* 4. DELETE ACCOUNT MODAL */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 border border-neutral-100 max-w-sm w-full shadow-xl space-y-4 text-center"
            >
              <div className="mx-auto h-12 w-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black text-neutral-800">Confirm Account Deletion</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Are you absolutely sure you want to delete the user record for **{selectedUser.name}** ({selectedUser.email})? This action is permanent.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-neutral-50">
                <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleDeleteUser} disabled={submitting} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:bg-rose-300">
                  {submitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
