// Input validation shared by server and browser code.

export function parseId(value: unknown): number | null {
  const id = typeof value === "string" ? Number(value) : value;

  return typeof id === "number" && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

// Returns the name with extra whitespace removed, or null if it is invalid.
export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 60) return null;
  if (/[\p{C}<>]/u.test(name)) return null;

  return name;
}

// Accepts Indian mobile numbers with or without +91 / 0 prefixes and
// returns the 10-digit number, or null if it is invalid.
export function normalizeIndianPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let digits = value.replace(/[\s\-().]/g, "");

  if (digits.startsWith("+91")) {
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
