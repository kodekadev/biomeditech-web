// Pure utility functions — no React, no side effects, fully testable

export function money(value: number): string {
  return value ? `$${value.toLocaleString("es-CL")}` : "—";
}

export function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${dv}`;
}

export function normalizeRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validates Chilean RUT check digit. Empty string returns true (optional field). */
export function validateRut(rut: string): boolean {
  const clean = normalizeRut(rut).toUpperCase();
  if (!clean) return true; // empty / whitespace → skip (optional field)
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  if (!body || !/^\d+$/.test(body)) return false;
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  const expected = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return dv === expected;
}

export function isActivo(estado: string): boolean {
  return estado.toLowerCase() === "activo" || estado.toLowerCase() === "active";
}

export function fmtActivityDate(raw: unknown): string {
  if (!raw) return "";
  const s =
    typeof raw === "object" && raw !== null && "value" in raw
      ? String((raw as { value: unknown }).value)
      : String(raw);
  const d = new Date(s);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function incrementNro(nro: string): string {
  const match = nro.match(/^(COT-\d{4}-)(\d+)$/);
  if (!match) return nro;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(3, "0")}`;
}

/** Returns relative time string in Spanish given an ISO timestamp. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "Justo ahora";
  if (mins < 60) return `Hace ${mins} min`;
  if (hours === 1) return "Hace 1 hora";
  if (hours < 24) return `Hace ${hours} horas`;
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}
