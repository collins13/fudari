/**
 * Platform WhatsApp booking bot number.
 * Customers message THIS number (not the artisan directly) — the bot
 * guides them through category → location → description → urgency → confirm.
 *
 * Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local to override.
 * Format: country code + number, no leading + or spaces (e.g. "254703954539").
 */
export const PLATFORM_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '254703954539';

/** Build a wa.me link that opens the bot with a pre-filled first message */
export function whatsappBotLink(prefillText?: string): string {
  const base = `https://wa.me/${PLATFORM_WHATSAPP_NUMBER}`;
  if (!prefillText) return base;
  return `${base}?text=${encodeURIComponent(prefillText)}`;
}
