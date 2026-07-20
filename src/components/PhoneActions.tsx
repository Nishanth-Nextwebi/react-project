"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PhoneCall, MessageCircle } from "lucide-react";
import { toWhatsAppNumber } from "@/lib/utils";

interface PhoneActionsProps {
  phone: string | undefined | null;
  className?: string;
  menuAlign?: "left" | "right";
}

/** Clickable phone number that opens a small Call / WhatsApp menu. Used
 * anywhere a customer phone number is displayed (customer detail panel,
 * policy list table, policy detail drawer). */
export default function PhoneActions({ phone, className = "", menuAlign = "left" }: PhoneActionsProps) {
  const [open, setOpen] = useState(false);

  if (!phone) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`hover:text-blue-600 transition-colors cursor-pointer underline decoration-dotted decoration-neutral-300 underline-offset-2 ${className}`}
      >
        {phone}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <span
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className={`absolute top-full z-50 mt-1 w-36 rounded-xl border border-neutral-100 bg-white shadow-lg overflow-hidden ${
                menuAlign === "right" ? "right-0" : "left-0"
              }`}
            >
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <PhoneCall className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Call
              </a>
              <a
                href={`https://wa.me/${toWhatsAppNumber(phone)}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-t border-neutral-50"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> WhatsApp
              </a>
            </motion.span>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}
