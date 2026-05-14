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
  localStorage.removeItem("crm_user_email");
  localStorage.removeItem("crm_user_rol");
}

export function saveUser(email: string, rol: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("crm_user_email", email);
    localStorage.setItem("crm_user_rol", rol);
  }
}

export function getUser(): { email: string; rol: string } | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem("crm_user_email");
  if (!email) return null;
  return { email, rol: localStorage.getItem("crm_user_rol") ?? "usuario" };
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
  rut?: string;
  nombre: string;
  empresa: string;
  tel: string;
  email: string;
  canal: "wsp" | "email";
  estado: "cotizado" | "no-cotizado" | "aprobado" | "rechazado";
  servicio: string;
  tiempo: string;
  equipo: string;
  direccion?: string;
  creado_por?: string;
  creado_en?: string;
}

export interface Cliente {
  id: string;
  rut: string;
  nombre: string;
  contacto: string;
  correo: string;
  rubro: string;
  estado: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  comuna: string;
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
  lead_id?: string;
  monto: number;
  estado: string;
  fecha: string;
  pdfUrl?: string;
}

export interface CotizacionDetalle {
  id: string;
  numero: string;
  cliente_id: string;
  estado: string;
  subtotal_neto: number;
  iva: number;
  total_con_iva: number;
  moneda: string;
  forma_pago: string;
  validez_dias: number;
  notas_cliente: string;
  notas_internas?: string;
  emitida_en: string;
  pdf_url?: string;
  items: CotizacionItem[];
}

export interface CotizacionItem {
  id: string;
  linea_numero: number;
  descripcion: string;
  descripcion_larga: string;
  tipo_servicio: string;
  precio_unitario: number;
  cantidad: number;
  descuento_pct: number;
  subtotal: number;
  glosa?: string;
}

export interface CatalogoItem {
  id: string;
  codigo: string;
  categoria: string;
  servicio: string;
  equipo: string;
  unidad: string;
  precio_neto: number;
  grupo: string;
  texto_base_key: string;
  descripcion_larga: string;
}

export interface Plantilla {
  id: string;
  codigo: string;
  descripcion_larga: string;
}

export type CotizacionItemForm = {
  producto_id: string;
  codigo: string;
  descripcion: string;
  descripcion_larga: string;
  tipo_servicio: string;
  precio_unitario: number;
  cantidad: number;
  descuento_pct: number;
  glosa?: string;
};

export type CotizacionForm = {
  cliente_id: string;
  lead_id?: string;
  notas_cliente: string;
  forma_pago: string;
  validez_dias: number;
  notas_internas?: string;
  items: CotizacionItemForm[];
};

export interface DashboardStats {
  leadsPendientes: number;
  clientesActivos: number;
  cotizacionesAbiertas: number;
  ventasAprobadas: number;
  actividadReciente: { tipo: string; titulo: string; descripcion: string; creado_en: string }[];
}

// --- Form types ---

export type LeadForm = {
  rut?: string;
  nombre: string;
  empresa: string;
  tel: string;
  email: string;
  canal: string;
  servicio: string;
  equipo: string;
  direccion?: string;
};

export type ClienteForm = {
  rut: string;
  nombre: string;
  contacto: string;
  tel: string;
  correo: string;
  rubro: string;
  estado: string;
  direccion: string;
  ciudad: string;
  comuna: string;
};

export type CatalogoItemForm = {
  codigo: string;
  categoria: string;
  servicio: string;
  equipo: string;
  unidad: string;
  precio_neto: string;
  texto_base_key: string;
  descripcion_larga: string;
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
    rut: str(raw.rut) || undefined,
    nombre: str(raw.nombre),
    empresa: str(raw.empresa),
    tel: str(raw.telefono),
    email: str(raw.email),
    canal: raw.canal === "email" ? "email" : "wsp",
    estado: ((): Lead["estado"] => {
      const n = estado.toLowerCase().replace(/[^a-z]/g, "");
      if (n === "cotizado") return "cotizado";
      if (n === "aprobado") return "aprobado";
      if (n === "rechazado") return "rechazado";
      if (n === "gestionado") return "cotizado";
      return "no-cotizado";
    })(),
    servicio: str(raw.servicio_interes),
    tiempo: raw.creado_en ? relativeTime(str(raw.creado_en)) : "",
    equipo: str(raw.notas),
    direccion: str(raw.direccion) || undefined,
    creado_en: raw.creado_en ? str(raw.creado_en).slice(0, 10) : undefined,
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
    telefono: str(raw.telefono),
    direccion: str(raw.direccion),
    ciudad: str(raw.ciudad),
    comuna: str(raw.comuna),
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
  const rawEstado = str(raw.estado);
  const norm = rawEstado.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
  const estadoLabel =
    norm === "aprobada" ? "Aprobada" :
    norm === "rechazada" ? "Rechazada" :
    norm === "en_revision" ? "En revisión" :
    (norm === "pendiente" || norm === "emitida") ? "Pendiente" :
    rawEstado || "Pendiente";
  return {
    id: str(raw.id),
    nro: str(raw.numero || raw.id),
    cliente: str(raw.cliente_id),
    lead_id: raw.lead_id ? str(raw.lead_id) : undefined,
    monto: num((raw.total_con_iva ?? raw.subtotal_neto) as unknown),
    estado: estadoLabel,
    fecha: raw.creado_en ? str(raw.creado_en).slice(0, 10) : "",
    pdfUrl: raw.pdf_url ? str(raw.pdf_url) : undefined,
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
  const creado_por = typeof window !== "undefined" ? localStorage.getItem("crm_user_email") ?? undefined : undefined;
  const r = await apiMutate<{ data: unknown }>("POST", "/api/leads", {
    nombre: form.nombre,
    empresa: form.empresa,
    email: form.email,
    telefono: form.tel,
    canal: form.canal,
    estado: "nuevo",
    servicio_interes: form.servicio,
    notas: form.equipo,
    rut: form.rut,
    direccion: form.direccion,
    creado_por,
  });
  return r?.data ? mapLead(r.data) : null;
}

export async function updateLead(id: string, patch: { estado: Lead["estado"] }): Promise<Lead | null> {
  const dbEstado = patch.estado.replace("-", "_");
  const body: Record<string, unknown> = { estado: dbEstado };
  if (patch.estado === "cotizado") body.gestionado_en = new Date().toISOString();
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
    telefono: form.tel,
    email: form.correo,
    rubro: form.rubro,
    estado: form.estado || "activo",
    direccion: form.direccion,
    ciudad: form.ciudad,
    comuna: form.comuna,
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
    rut: form.rut,
    direccion: form.direccion,
  });
  return r?.data ? mapLead(r.data) : null;
}

export async function saveCliente(id: string, form: ClienteForm): Promise<Cliente | null> {
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/clientes/${id}`, {
    rut: form.rut,
    nombre_empresa: form.nombre,
    contacto_nombre: form.contacto,
    telefono: form.tel,
    email: form.correo,
    rubro: form.rubro,
    estado: form.estado,
    direccion: form.direccion,
    ciudad: form.ciudad,
    comuna: form.comuna,
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
  creadoPor?: string,
): Promise<void> {
  await apiMutate("POST", "/api/actividad-dashboard", {
    tipo,
    titulo,
    descripcion,
    referencia_id: refId,
    referencia_tipo: refTipo,
    creado_por: creadoPor,
  });
}

export async function updateCotizacion(id: string, patch: { estado: string }): Promise<void> {
  await apiMutate("PATCH", `/api/cotizaciones/${id}`, patch);
}

export async function upsertPlantilla(existingId: string | null, codigo: string, descripcion_larga: string): Promise<string | null> {
  if (existingId) {
    await apiMutate("PATCH", `/api/plantillas/${existingId}`, { descripcion_larga });
    return existingId;
  }
  const r = await apiMutate<{ data: Record<string, unknown> }>("POST", "/api/plantillas", { codigo, descripcion_larga });
  return r?.data ? str(r.data.id) : null;
}

export async function fetchCatalogo(): Promise<CatalogoItem[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/catalogo?limit=200");
  return (r?.data ?? []).map((v) => {
    const raw = v as Record<string, unknown>;
    return {
      id: str(raw.id),
      codigo: str(raw.codigo),
      categoria: str(raw.categoria),
      servicio: str(raw.servicio),
      equipo: str(raw.equipo),
      unidad: str(raw.unidad),
      precio_neto: num(raw.precio_neto),
      grupo: str(raw.grupo),
      texto_base_key: str(raw.texto_base_key),
      descripcion_larga: str(raw.descripcion_larga),
    };
  });
}

export async function fetchPlantillas(): Promise<Plantilla[]> {
  const r = await apiGet<{ data: unknown[] }>("/api/plantillas?limit=50");
  return (r?.data ?? []).map((v) => {
    const raw = v as Record<string, unknown>;
    return {
      id: str(raw.id),
      codigo: str(raw.codigo),
      descripcion_larga: str(raw.descripcion_larga),
    };
  });
}

export async function fetchCotizacionDetalle(id: string): Promise<CotizacionDetalle | null> {
  const r = await apiGet<{ data: unknown }>(`/api/cotizaciones/${id}`);
  if (!r?.data) return null;
  const raw = r.data as Record<string, unknown>;
  const items = ((raw.items as unknown[]) ?? []).map((it) => {
    const i = it as Record<string, unknown>;
    return {
      id: str(i.id),
      linea_numero: num(i.linea_numero),
      descripcion: str(i.descripcion),
      descripcion_larga: str(i.descripcion_larga),
      tipo_servicio: str(i.tipo_servicio),
      precio_unitario: num(i.precio_unitario),
      cantidad: num(i.cantidad) || 1,
      descuento_pct: num(i.descuento_pct),
      subtotal: num(i.subtotal),
    };
  });
  return {
    id: str(raw.id),
    numero: str(raw.numero),
    cliente_id: str(raw.cliente_id),
    estado: str(raw.estado),
    subtotal_neto: num(raw.subtotal_neto),
    iva: num(raw.iva),
    total_con_iva: num(raw.total_con_iva),
    moneda: str(raw.moneda) || "CLP",
    forma_pago: str(raw.forma_pago),
    validez_dias: num(raw.validez_dias) || 30,
    notas_cliente: str(raw.notas_cliente),
    notas_internas: str(raw.notas_internas),
    emitida_en: str(raw.emitida_en),
    pdf_url: raw.pdf_url ? str(raw.pdf_url) : undefined,
    items,
  };
}

export async function createCotizacionMulti(form: CotizacionForm): Promise<CotizacionDetalle | null> {
  const subtotal = form.items.reduce((sum, it) => {
    return sum + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100));
  }, 0);
  const iva = Math.round(subtotal * 0.19);
  const numero = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const r = await apiMutate<{ data: unknown }>("POST", "/api/cotizaciones", {
    numero,
    cliente_id: form.cliente_id,
    lead_id: form.lead_id ?? null,
    estado: "emitida",
    subtotal_neto: subtotal,
    iva,
    total_con_iva: subtotal + iva,
    moneda: "CLP",
    notas_cliente: form.notas_cliente,
    notas_internas: form.notas_internas ?? "",
    forma_pago: form.forma_pago,
    validez_dias: form.validez_dias,
    diagnostico_incluido: true,
    emitida_en: new Date().toISOString(),
  });
  if (!r?.data) return null;

  const raw = r.data as Record<string, unknown>;
  const createdItems = await Promise.all(form.items.map((it, idx) =>
    apiMutate<{ data: unknown }>("POST", "/api/servicios-cotizacion", {
      cotizacion_id: str(raw.id),
      producto_id: it.producto_id,
      linea_numero: idx + 1,
      descripcion: it.descripcion,
      descripcion_larga: it.descripcion_larga,
      tipo_servicio: it.tipo_servicio,
      precio_unitario: it.precio_unitario,
      cantidad: it.cantidad,
      descuento_pct: it.descuento_pct,
      subtotal: Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)),
    })
  ));

  const items = createdItems.map((created, idx) => {
    const fallback = form.items[idx];
    const row = created?.data as Record<string, unknown> | undefined;
    if (!row) {
      return {
        id: `${str(raw.id)}-${idx + 1}`,
        linea_numero: idx + 1,
        descripcion: fallback.descripcion,
        descripcion_larga: fallback.descripcion_larga,
        tipo_servicio: fallback.tipo_servicio,
        precio_unitario: fallback.precio_unitario,
        cantidad: fallback.cantidad,
        descuento_pct: fallback.descuento_pct,
        subtotal: Math.round(fallback.precio_unitario * fallback.cantidad * (1 - fallback.descuento_pct / 100)),
      };
    }
    return {
      id: str(row.id),
      linea_numero: num(row.linea_numero),
      descripcion: str(row.descripcion),
      descripcion_larga: fallback.descripcion_larga,
      tipo_servicio: str(row.tipo_servicio),
      precio_unitario: num(row.precio_unitario),
      cantidad: num(row.cantidad) || 1,
      descuento_pct: num(row.descuento_pct),
      subtotal: num(row.subtotal),
    };
  });

  return {
    id: str(raw.id),
    numero: str(raw.numero) || numero,
    cliente_id: str(raw.cliente_id),
    estado: str(raw.estado),
    subtotal_neto: num(raw.subtotal_neto) || subtotal,
    iva: num(raw.iva) || iva,
    total_con_iva: num(raw.total_con_iva) || subtotal + iva,
    moneda: str(raw.moneda) || "CLP",
    forma_pago: str(raw.forma_pago) || form.forma_pago,
    validez_dias: num(raw.validez_dias) || form.validez_dias,
    notas_cliente: str(raw.notas_cliente),
    notas_internas: str(raw.notas_internas),
    emitida_en: str(raw.emitida_en),
    pdf_url: raw.pdf_url ? str(raw.pdf_url) : undefined,
    items,
  };
}

export async function createCatalogoItem(form: CatalogoItemForm): Promise<CatalogoItem | null> {
  const r = await apiMutate<{ data: unknown }>("POST", "/api/catalogo", {
    codigo: form.codigo,
    categoria: form.categoria,
    servicio: form.servicio,
    equipo: form.equipo,
    unidad: form.unidad || "Servicio",
    precio_neto: Number(form.precio_neto) || 0,
    grupo: form.categoria,
    texto_base_key: form.texto_base_key,
    descripcion_larga: form.descripcion_larga,
    activo: true,
  });
  if (!r?.data) return null;
  const raw = r.data as Record<string, unknown>;
  return {
    id: str(raw.id),
    codigo: str(raw.codigo),
    categoria: str(raw.categoria),
    servicio: str(raw.servicio),
    equipo: str(raw.equipo),
    unidad: str(raw.unidad),
    precio_neto: num(raw.precio_neto),
    grupo: str(raw.grupo),
    texto_base_key: str(raw.texto_base_key),
    descripcion_larga: str(raw.descripcion_larga),
  };
}

export async function updateCatalogoItem(id: string, form: CatalogoItemForm): Promise<CatalogoItem | null> {
  const r = await apiMutate<{ data: unknown }>("PATCH", `/api/catalogo/${id}`, {
    codigo: form.codigo,
    categoria: form.categoria,
    servicio: form.servicio,
    equipo: form.equipo,
    unidad: form.unidad || "Servicio",
    precio_neto: Number(form.precio_neto) || 0,
    texto_base_key: form.texto_base_key,
    descripcion_larga: form.descripcion_larga,
  });
  if (!r?.data) return null;
  const raw = r.data as Record<string, unknown>;
  return {
    id: str(raw.id),
    codigo: str(raw.codigo),
    categoria: str(raw.categoria),
    servicio: str(raw.servicio),
    equipo: str(raw.equipo),
    unidad: str(raw.unidad),
    precio_neto: num(raw.precio_neto),
    grupo: str(raw.grupo),
    texto_base_key: str(raw.texto_base_key),
    descripcion_larga: str(raw.descripcion_larga),
  };
}

export async function deleteCatalogoItem(id: string): Promise<void> {
  await apiMutate("DELETE", `/api/catalogo/${id}`);
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
