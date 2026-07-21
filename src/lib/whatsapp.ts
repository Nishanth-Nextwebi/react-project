import { toWhatsAppNumber } from "@/lib/utils";

const GRAPH_API_BASE = "https://graph.facebook.com";

export interface WhatsAppSendResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a freeform WhatsApp text message via the Meta WhatsApp Cloud API.
 * Token/phone-number-id/API version are all read from env at call time -
 * nothing here is hardcoded per deployment.
 *
 * Important caveat (not something this code can work around): Meta only
 * allows freeform "text" messages for business-initiated conversations
 * within a 24-hour window after the customer last messaged this number.
 * Outside that window - which is the normal case for a cold expiry
 * reminder - Meta requires a pre-approved Message Template instead, or
 * this call will fail with an error like "re-engagement message" /
 * error code 131047/131026. If that happens consistently, the fix is to
 * register an approved template in Meta Business Manager and switch this
 * function to send a `template` payload instead of `text`.
 */
export async function sendWhatsAppTextMessage(phone: string, message: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v22.0";

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp is not configured (missing WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  }

  const to = toWhatsAppNumber(phone);
  if (!to) {
    return { success: false, error: "No valid phone number." };
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const apiError = data?.error?.message || `WhatsApp API returned ${res.status}`;
      return { success: false, error: apiError };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Network error calling the WhatsApp API." };
  }
}
