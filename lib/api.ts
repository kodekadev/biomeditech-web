const BASE = process.env.NEXT_PUBLIC_CRM_API_URL ?? "http://127.0.0.1:4000";

// --- Auth helpers ---

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("crm_token");
}

export function saveToken(token: string): void {
  localStorage.setItem("crm_token", token);
  localStorage.setItem("crm_session", "1");
}

export function clearToken(): void {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_session");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email: string, password: string): Promise<{ token: string; user: { email: string; rol: string } } | { error: string } | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  } catch {
    return null;
  }
}

// --- UI-facing types (match the component's data model) ---

export interface Lead {
  id: string;
  nombre: string;
  empresa: string;
  tel: string;
  email: string;
  canal: "wsp" | "email";
  estado: "gestionado" | "no-gestionado";
  servicio: string;
  tiempo: string;
  equipo: string;
}

export interface Cliente {
  id: string;
  rut: string;
  nombre: string;
  contacto: string;
  correo: string;
  rubro: string;
  estado: string;
}

export interface Producto {
  id: string;
  nombre: string;
  cat: string;
  diag: number;
  rep: number;
  mant: number;
  inst: number;
}

export interface Cotizacion {
  id: string;
  nro: string;
  cliente: string;
  monto: number;
  estado: string;
  fecha: string;
}

export interface DashboardStats {
  leadsPendientes: number;
  clientesActivos: number;
  cotizacionesAbiertas: number;
  ventasAprobadas: number;
  actividadReciente: { tipo: string; titulo: string; descripcion: string; creado_en: string }[];
}

// --- Form types ---

export type LeadForm = {
  nombre: string;
  empresa: string;
  tel: string;
  email: string;
  canal: string;
  servicio: string;
  equipo: string;
};

export type ClienteForm = {
  rut: string;
  nombre: string;
  contacto: string;
  cargo: string;
  tel: string;
  correo: string;
  rubro: string;
};

export type ProductoForm = {
  nombre: string;
  cat: string;
  marca: string;
  diag: string;
  rep: string;
  mant: string;
  inst: string;
};

// --- Field mappers: backend schema → frontend UI model ---

function relativeTime(iso: string): string {
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

type RawRecord = Record<string, unknown>;

function str(v: unknown): string {
  if (v == null) return "";
  // BigQuery returns timestamps/dates as { value: "..." } objects
  if (typeof v === "object" && "value" in (v as object)) {
    return String((v as { value: unknown }).value);
  }
  return String(v);
}

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "value" in (v as object)) {
    return Number((v as { value: unknown }).value ?? 0);
  }
  return Number(v);
}

function mapLead(value: unknown): Lead {
  const raw = value as RawRecord;
  const estado = str(raw.estado);
  return {
    id: str(raw.id),
    nombre: str(raw.nombre),
    empresa: str(raw.empresa),
    tel: str(raw.telefono),
    email: str(raw.email),
    canal: raw.canal === "email" ? "email" : "wsp",
    estado: estado === "gestionado" ? "gestionado" : "no-gestionado",
    servicio: str(raw.servicio_interes),
    tiempo: raw.creado_en ? relativeTime(str(raw.creado_en)) : "",
    equipo: str(raw.notas),
  };
}

function mapCliente(value: unknown): Cliente {
  const raw = value as RawRecord;
  return {
    id: str(raw.id),
    rut: str(raw.rut),
    nombre: str(raw.nombre_empresa),
    contacto: str(raw.contacto_nombre),
    correo: str(raw.email),
    rubro: str(raw.rubro),
    estado: str(raw.estado),
  };
}

function mapProducto(value: unknown): Producto {
  const raw = value as RawRecord;
  return {
    id: str(raw.id),
    nombre: str(raw.nombre),
    cat: str(raw.categoria),
    diag: num(raw.precio_diagnostico),
    rep: num(raw.precio_reparacion),
    mant: num(raw.precio_mantencion),
    inst: num(raw.precio_instalacion),
  };
}

function mapCotizacion(value: unknown): Cotizacion {
  const raw = value as RawRecord;
  const estado = str(raw.estado);
  const estadoLabel =
    estado === "aprobada" ? "Aprobada" : estado === "en_revision" ? "En revisión" : "Pendiente";
  return {
    id: str(raw.id),
    nro: str(raw.numero || raw.id),
    cliente: str(raw.cliente_id),
    monto: num((raw.total_con_iva ?? raw.subtotal_neto) as unknown),
    estado: estadoLabel,
    fecha: raw.creado_en ? str(raw.creado_en).slice(0, 10) : "",
  };
}

// --- HTTP helpers ---

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    if (res.status === 401) { clearToken(); return null; }
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function apiMutate<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { clearToken(); return null; }
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// --- Public API functions ---

export async function fetchLeads(): Promise<Lead[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/leads?limit=100");
  return (r?.data ?? []).map(mapLead);
}

export async function createLead(form: LeadForm): Promise<Lead | null> {
  const r = await apiMutate<{ data: unknown }>("POST", "/api/leads", {
    nombre: form.nombre,
    empresa: form.empresa,
    email: form.email,
    telefono: form.tel,
    canal: form.canal,
    estado: "nuevo",
    servicio_interes: form.servicio,
    notas: form.equipo,
  });
  return r?.data ? mapLead(r.data) : null;
}

export async function updateLead(id: string, patch: { estado: "gestionado" | "no-gestionado" }): Promise<Lead | null> {
  const backendEstado = patch.estado === "gestionado" ? "gestionado" : "no_gestionado";
  const body: Record<string, unknown> = { estado: backendEstado };
  if (patch.estado === "gestionado") body.gestionado_en = new Date().toISOString();
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/leads/${id}`, body);
  return r?.data ? mapLead(r.data) : null;
}

export async function deleteLead(id: string): Promise<void> {
  await apiMutate("DELETE", `/api/leads/${id}`);
}

export async function fetchClientes(): Promise<Cliente[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/clientes?limit=100");
  return (r?.data ?? []).map(mapCliente);
}

export async function createCliente(form: ClienteForm): Promise<Cliente | null> {
  const r = await apiMutate<{ data: unknown }>("POST", "/api/clientes", {
    rut: form.rut,
    nombre_empresa: form.nombre,
    contacto_nombre: form.contacto,
    contacto_cargo: form.cargo,
    telefono: form.tel,
    email: form.correo,
    rubro: form.rubro,
    estado: "activo",
  });
  return r?.data ? mapCliente(r.data) : null;
}

export async function deleteCliente(id: string): Promise<void> {
  await apiMutate("DELETE", `/api/clientes/${id}`);
}

export async function fetchProductos(): Promise<Producto[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/productos?limit=100");
  return (r?.data ?? []).map(mapProducto);
}

export async function createProducto(form: ProductoForm): Promise<Producto | null> {
  const r = await apiMutate<{ data: unknown }>("POST", "/api/productos", {
    nombre: form.nombre,
    categoria: form.cat,
    marca: form.marca,
    precio_diagnostico: Number(form.diag) || 0,
    precio_reparacion: Number(form.rep) || 0,
    precio_mantencion: Number(form.mant) || 0,
    precio_instalacion: Number(form.inst) || 0,
    activo: true,
  });
  return r?.data ? mapProducto(r.data) : null;
}

export async function deleteProducto(id: string): Promise<void> {
  await apiMutate("DELETE", `/api/productos/${id}`);
}

export async function fetchCotizaciones(): Promise<Cotizacion[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/cotizaciones?limit=50");
  return (r?.data ?? []).map(mapCotizacion);
}

export async function createCotizacion(args: {
  cliente_id: string;
  numero: string;
  subtotal_neto: number;
  notas_cliente: string;
  servicio?: string;
  producto_id?: string;
}): Promise<Cotizacion | null> {
  const iva = Math.round(args.subtotal_neto * 0.19);
  const r = await apiMutate<{ data: Record<string, unknown> }>("POST", "/api/cotizaciones", {
    numero: args.numero,
    cliente_id: args.cliente_id,
    estado: "emitida",
    subtotal_neto: args.subtotal_neto,
    iva,
    total_con_iva: args.subtotal_neto + iva,
    moneda: "CLP",
    forma_pago: "50% inicio - 50% entrega",
    validez_dias: 30,
    diagnostico_incluido: true,
    notas_cliente: args.notas_cliente,
    emitida_en: new Date().toISOString(),
  });
  if (!r?.data) return null;

  if (args.servicio && args.producto_id) {
    await apiMutate("POST", "/api/servicios-cotizacion", {
      cotizacion_id: String(r.data.id),
      producto_id: args.producto_id,
      linea_numero: 1,
      descripcion: args.servicio,
      tipo_servicio: args.servicio,
      precio_unitario: args.subtotal_neto,
      cantidad: 1,
      descuento_pct: 0,
      subtotal: args.subtotal_neto,
    });
  }

  return mapCotizacion(r.data);
}

export async function saveLead(id: string, form: LeadForm): Promise<Lead | null> {
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/leads/${id}`, {
    nombre: form.nombre,
    empresa: form.empresa,
    email: form.email,
    telefono: form.tel,
    canal: form.canal,
    servicio_interes: form.servicio,
    notas: form.equipo,
  });
  return r?.data ? mapLead(r.data) : null;
}

export async function saveCliente(id: string, form: ClienteForm): Promise<Cliente | null> {
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/clientes/${id}`, {
    rut: form.rut,
    nombre_empresa: form.nombre,
    contacto_nombre: form.contacto,
    contacto_cargo: form.cargo,
    telefono: form.tel,
    email: form.correo,
    rubro: form.rubro,
  });
  return r?.data ? mapCliente(r.data) : null;
}

export async function saveProducto(id: string, form: ProductoForm): Promise<Producto | null> {
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/productos/${id}`, {
    nombre: form.nombre,
    categoria: form.cat,
    marca: form.marca,
    precio_diagnostico: Number(form.diag) || 0,
    precio_reparacion: Number(form.rep) || 0,
    precio_mantencion: Number(form.mant) || 0,
    precio_instalacion: Number(form.inst) || 0,
  });
  return r?.data ? mapProducto(r.data) : null;
}

export async function logActivity(
  tipo: string,
  titulo: string,
  descripcion: string,
  refId?: string,
  refTipo?: string,
): Promise<void> {
  await apiMutate("POST", "/api/actividad-dashboard", {
    tipo,
    titulo,
    descripcion,
    referencia_id: refId,
    referencia_tipo: refTipo,
  });
}

export async function fetchDashboard(): Promise<DashboardStats | null> {
  const r = await apiGet<{
    data: {
      leads_pendientes: number;
      clientes_activos: number;
      cotizaciones_abiertas: number;
      ventas_aprobadas: number;
      actividad_reciente: { tipo: string; titulo: string; descripcion: string; creado_en: string }[];
    };
  }>("/api/dashboard/resumen");
  if (!r?.data) return null;
  return {
    leadsPendientes: r.data.leads_pendientes ?? 0,
    clientesActivos: r.data.clientes_activos ?? 0,
    cotizacionesAbiertas: r.data.cotizaciones_abiertas ?? 0,
    ventasAprobadas: r.data.ventas_aprobadas ?? 0,
    actividadReciente: r.data.actividad_reciente ?? [],
  };
}
