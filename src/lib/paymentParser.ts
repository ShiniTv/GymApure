/**
 * Utility to parse bank SMS, notifications and clipboard snippets (Pago Móvil / Transferencias)
 * commonly used in Venezuela / Latam to quickly populate payment reference and amount.
 */

export interface ParsedPaymentInfo {
  raw: string;
  reference?: string;
  amountBs?: string;
  bank?: string;
  phone?: string;
  date?: string;
}

const BANK_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: 'Banco de Venezuela',
    pattern: /\b(bdv|banco de venezuela|pagomovilbdv|pago movil bdv)\b/i,
  },
  { name: 'Banesco', pattern: /\b(banesco|pago movil banesco)\b/i },
  { name: 'Mercantil', pattern: /\b(mercantil|tpago)\b/i },
  { name: 'BNC', pattern: /\b(bnc|banco nacional de credito)\b/i },
  { name: 'Bancamiga', pattern: /\b(bancamiga)\b/i },
  { name: 'BBVA Provincial', pattern: /\b(provincial|bbva)\b/i },
  { name: 'Bancaribe', pattern: /\b(bancaribe)\b/i },
  { name: 'Banesco Panamá', pattern: /\b(banesco panama)\b/i },
];

export function parsePaymentSms(rawText: string): ParsedPaymentInfo {
  const text = rawText.trim();
  if (!text) {
    return { raw: '' };
  }

  const result: ParsedPaymentInfo = { raw: text };

  // 1. Detect Bank
  for (const { name, pattern } of BANK_PATTERNS) {
    if (pattern.test(text)) {
      result.bank = name;
      break;
    }
  }

  // 2. Extract Reference (typically 4 to 12 digits preceded by Ref, Referencia, No., Comprobante, etc.)
  const refMatch =
    /(?:ref(?:erencia)?\.?|n[ro|úm]\.?|comprobante:?)\s*[:#]?\s*([0-9]{4,14})\b/i.exec(text) ??
    /\b([0-9]{6,12})\b/.exec(text); // fallback to standalone 6-12 digit sequence

  if (refMatch?.[1]) {
    result.reference = refMatch[1].trim();
  }

  // 3. Extract Amount in Bs
  // Patterns like: "Bs. 1.250,50", "Bs 3500.00", "Bs.1500", "VES 800,00"
  const amountMatch = /(?:bs\.?|ves|bol[ií]vares)\s*[:]?\s*([0-9][0-9.,]*[0-9]|[0-9]+)/i.exec(text);

  if (amountMatch?.[1]) {
    let rawNum = amountMatch[1].trim();
    // Case 1: Both dots and commas present
    if (rawNum.includes('.') && rawNum.includes(',')) {
      if (rawNum.lastIndexOf(',') > rawNum.lastIndexOf('.')) {
        // e.g. 1.250,50 (European/Venezuelan standard)
        rawNum = rawNum.replace(/\./g, '').replace(',', '.');
      } else {
        // e.g. 1,250.50 (US standard)
        rawNum = rawNum.replace(/,/g, '');
      }
    } else if (rawNum.includes(',')) {
      // e.g. 1500,50 or 1,250
      const parts = rawNum.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        rawNum = rawNum.replace(',', '.');
      } else {
        rawNum = rawNum.replace(/,/g, '');
      }
    } else if (rawNum.includes('.')) {
      // e.g. 3500.00 or 1.250 (if thousand separator without decimal)
      const parts = rawNum.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        // likely 1.250 (thousand)
        rawNum = rawNum.replace(/\./g, '');
      }
    }
    const num = parseFloat(rawNum);
    if (!isNaN(num) && num > 0) {
      result.amountBs = num.toFixed(2);
    }
  }

  // 4. Extract phone if present (e.g. 04141234567, 0412-1234567)
  const phoneMatch = /\b(0414|0424|0412|0416|0426)[- ]?([0-9]{7})\b/.exec(text);
  if (phoneMatch) {
    result.phone = `${phoneMatch[1]}${phoneMatch[2]}`;
  }

  // 5. Extract date if present (DD/MM/YYYY or DD-MM-YYYY)
  const dateMatch = /\b([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})\b/.exec(text);
  if (dateMatch?.[1]) {
    result.date = dateMatch[1];
  }

  return result;
}
