// French amounts in words for pay slips ("trois cent quarante-sept mille cent onze").
// Traditional spelling: hyphens below 100, "et un" for 21–71, and the plural "s" on vingt/cent
// only when they end the number or precede "millions"/"milliards" (nouns), never before "mille".

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function below100(n: number, plural: boolean): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens <= 6) {
    if (unit === 0) return TENS[tens];
    return unit === 1 ? `${TENS[tens]} et un` : `${TENS[tens]}-${UNITS[unit]}`;
  }
  if (tens === 7) return unit === 1 ? "soixante et onze" : `soixante-${below100(10 + unit, false)}`;
  if (n === 80) return plural ? "quatre-vingts" : "quatre-vingt";
  return `quatre-vingt-${below100(n - 80, false)}`;
}

function below1000(n: number, plural: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (hundreds > 0) {
    out = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
    if (rest === 0 && hundreds > 1 && plural) out += "s";
  }
  if (rest > 0) out += (out ? " " : "") + below100(rest, plural);
  return out;
}

/** 347111 → "trois cent quarante-sept mille cent onze". Whole, non-negative numbers only. */
export function amountInWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`amountInWords expects a whole non-negative number, got ${n}`);
  if (n === 0) return "zéro";

  const billions = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const thousands = Math.floor(n / 1e3) % 1000;
  const rest = n % 1000;

  const parts: string[] = [];
  if (billions) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${below1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ");
}
