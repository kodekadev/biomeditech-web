// Local types used within the CRM component tree
// API types are re-exported from @/lib/api

export type ModuleId = "dashboard" | "leads" | "clientes" | "productos" | "cotizaciones" | "historial" | "protocolos" | "historial-protocolos";
export type LeadStatus = "cotizado" | "no-cotizado" | "aprobado" | "rechazado";
export type LeadChannel = "wsp" | "email";
export type QuoteService = "diagnostico" | "reparacion" | "mantencion" | "instalacion" | "mixto" | "";

// ── Protocolos types ──────────────────────────────────────────────────────────
export type ProtoSubItem = { id: string; label: string };
export type ProtoItem = { id: string; label: string; subItems: ProtoSubItem[] };
export type ProtoTemplate = { id: string; label: string; items: ProtoItem[]; conclusions: string[] };
export type SubFill = { pasa: "si" | "no" | ""; obs: string };
export type CalibEquipo = { id: string; equipo: string; marca: string; modelo: string; sn: string };

// ── Products types ────────────────────────────────────────────────────────────
export type ServiceTypeEntry = { id: string; label: string; defaultPrice: number };
