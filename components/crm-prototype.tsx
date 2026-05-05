"use client";

import {
  Activity,
  Bell,
  BriefcaseMedical,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  FileArchive,
  FileText,
  Filter,
  LayoutDashboard,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  Trash2,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import type { Lead, Cliente, Producto, Cotizacion, DashboardStats, LeadForm, ClienteForm, ProductoForm } from "@/lib/api";

type ModuleId = "dashboard" | "leads" | "clientes" | "productos" | "cotizaciones" | "protocolos";
type LeadStatus = "gestionado" | "no-gestionado";
type LeadChannel = "wsp" | "email";
type QuoteService = "diagnostico" | "reparacion" | "mantencion" | "instalacion" | "mixto" | "";

const NAV_ITEMS: Array<{ id: ModuleId; label: string; icon: React.ElementType; group: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { id: "leads", label: "Leads", icon: Activity, group: "Gestión" },
  { id: "clientes", label: "Clientes", icon: BriefcaseMedical, group: "Gestión" },
  { id: "productos", label: "Productos / Servicios", icon: Wrench, group: "Gestión" },
  { id: "cotizaciones", label: "Cotizaciones", icon: ClipboardList, group: "Operaciones" },
  { id: "protocolos", label: "Protocolos Mantención", icon: FileArchive, group: "Operaciones" },
];

const INITIAL_LEADS: Lead[] = [
  { id: "1", nombre: "María González", empresa: "Clínica Las Condes", tel: "+56 9 8765 4321", email: "maria@clinica.cl", canal: "wsp", estado: "no-gestionado", servicio: "Reparación", tiempo: "Hace 12 min", equipo: "Monitor de signos vitales" },
  { id: "2", nombre: "Carlos Herrera", empresa: "Centro Dental Norte", tel: "+56 9 7654 3210", email: "carlos@dental.cl", canal: "email", estado: "no-gestionado", servicio: "Diagnóstico", tiempo: "Hace 1 hora", equipo: "Autoclave" },
  { id: "3", nombre: "Ana Ramírez", empresa: "Lab. Providencia", tel: "+56 9 6543 2109", email: "ana@lab.cl", canal: "wsp", estado: "no-gestionado", servicio: "Mantención", tiempo: "Hace 2 horas", equipo: "Centrífuga" },
  { id: "4", nombre: "Pedro Soto", empresa: "Clínica Estética Sur", tel: "+56 9 5432 1098", email: "pedro@estetica.cl", canal: "email", estado: "gestionado", servicio: "Instalación", tiempo: "Ayer", equipo: "Unidad dental" },
  { id: "5", nombre: "Valentina Cruz", empresa: "Hospital Regional", tel: "+56 9 4321 0987", email: "vcruz@hospital.cl", canal: "wsp", estado: "no-gestionado", servicio: "Reparación", tiempo: "Hace 3 horas", equipo: "Ecógrafo" },
  { id: "6", nombre: "Roberto Mora", empresa: "UnoSalud", tel: "+56 9 3210 9876", email: "rmora@unosalud.cl", canal: "email", estado: "gestionado", servicio: "Diagnóstico", tiempo: "Hace 2 días", equipo: "Autoclave" },
  { id: "7", nombre: "Daniela Vega", empresa: "Vetlab", tel: "+56 9 2109 8765", email: "dvega@vetlab.cl", canal: "wsp", estado: "no-gestionado", servicio: "Mantención", tiempo: "Hace 4 horas", equipo: "Centrífuga" },
  { id: "8", nombre: "Sebastián Ríos", empresa: "U. Mayor", tel: "+56 9 1098 7654", email: "srios@umayor.cl", canal: "email", estado: "gestionado", servicio: "Instalación", tiempo: "Hace 3 días", equipo: "Máquina de anestesia" },
];

const INITIAL_CLIENTES: Cliente[] = [
  { id: "C-001", rut: "61.608.023-8", nombre: "Clínica Las Condes", contacto: "Felipe Morales", correo: "felipe@clc.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-002", rut: "60.503.000-1", nombre: "Universidad de Chile", contacto: "Claudia Torres", correo: "claudia@uchile.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-003", rut: "76.543.210-K", nombre: "Centro Médico Providencia", contacto: "Andrea Silva", correo: "andrea@cmp.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-004", rut: "78.123.456-3", nombre: "Neovida", contacto: "Rodrigo Pinto", correo: "rodrigo@neovida.cl", rubro: "Estético", estado: "Activo" },
  { id: "C-005", rut: "77.654.321-5", nombre: "UnoSalud", contacto: "Patricia Muñoz", correo: "patricia@unosalud.cl", rubro: "Dental", estado: "Inactivo" },
  { id: "C-006", rut: "76.111.222-4", nombre: "Vetlab", contacto: "Jorge Espinoza", correo: "jorge@vetlab.cl", rubro: "Laboratorio", estado: "Activo" },
];

const INITIAL_PRODUCTOS: Producto[] = [
  { id: "P-001", nombre: "Monitor de Signos Vitales", cat: "Equipos médicos", diag: 45000, rep: 120000, mant: 85000, inst: 95000 },
  { id: "P-002", nombre: "Autoclave", cat: "Equipos médicos", diag: 35000, rep: 185000, mant: 90000, inst: 110000 },
  { id: "P-003", nombre: "Ecógrafo", cat: "Equipos médicos", diag: 55000, rep: 250000, mant: 0, inst: 130000 },
  { id: "P-004", nombre: "Centrífuga", cat: "Laboratorio", diag: 30000, rep: 75000, mant: 50000, inst: 60000 },
  { id: "P-005", nombre: "Unidad Dental", cat: "Equipos dentales", diag: 40000, rep: 95000, mant: 70000, inst: 120000 },
  { id: "P-006", nombre: "Máquina de Anestesia", cat: "Equipos médicos", diag: 60000, rep: 320000, mant: 150000, inst: 200000 },
];

const INITIAL_COTIZACIONES: Cotizacion[] = [
  { id: "COT-001", nro: "COT-2026-012", cliente: "U. de Chile", monto: 320000, estado: "Pendiente", fecha: "2026-05-03" },
  { id: "COT-002", nro: "COT-2026-011", cliente: "Neovida", monto: 540000, estado: "Aprobada", fecha: "2026-05-02" },
  { id: "COT-003", nro: "COT-2026-010", cliente: "UnoSalud", monto: 210000, estado: "En revisión", fecha: "2026-05-01" },
];

const SERVICE_LABELS: Record<Exclude<QuoteService, "">, string> = {
  diagnostico: "Diagnóstico",
  reparacion: "Reparación",
  mantencion: "Mantención preventiva",
  instalacion: "Instalación",
  mixto: "Mixto",
};

const SERVICE_MAP: Record<string, QuoteService> = {
  diagnóstico: "diagnostico", diagnostico: "diagnostico",
  reparación: "reparacion", reparacion: "reparacion",
  mantención: "mantencion", mantencion: "mantencion",
  instalación: "instalacion", instalacion: "instalacion",
};

function money(value: number) {
  return value ? `$${value.toLocaleString("es-CL")}` : "—";
}

function getPrice(productId: string, service: QuoteService, productos: Producto[]) {
  const product = productos.find((item) => item.id === productId);
  if (!product) return 0;
  if (service === "diagnostico") return product.diag;
  if (service === "reparacion") return product.rep;
  if (service === "mantencion") return product.mant;
  if (service === "instalacion") return product.inst;
  if (service === "mixto") return product.diag + product.mant;
  return 0;
}

function incrementNro(nro: string): string {
  const match = nro.match(/^(COT-\d{4}-)(\d+)$/);
  if (!match) return nro;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(3, "0")}`;
}

function isActivo(estado: string) {
  return estado.toLowerCase() === "activo" || estado.toLowerCase() === "active";
}

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${dv}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fmtActivityDate(raw: unknown): string {
  if (!raw) return "";
  const s = typeof raw === "object" && raw !== null && "value" in raw
    ? String((raw as { value: unknown }).value)
    : String(raw);
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

const LEAD_FORM_INIT: LeadForm = { nombre: "", empresa: "", tel: "+56 ", email: "", canal: "wsp", servicio: "Diagnóstico", equipo: "" };
const CLIENTE_FORM_INIT: ClienteForm = { rut: "", nombre: "", contacto: "", cargo: "", tel: "+56 ", correo: "", rubro: "Médico" };
const PRODUCTO_FORM_INIT: ProductoForm = { nombre: "", cat: "Equipos médicos", marca: "", diag: "", rep: "", mant: "", inst: "" };

// ── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !isValidEmail(email)) { setError("Ingresa un correo válido"); return; }
    if (!password) { setError("Ingresa tu contraseña"); return; }
    setLoading(true);
    setError("");
    const result = await api.login(email, password);
    setLoading(false);
    if (!result) { setError("No se pudo conectar con el servidor"); return; }
    if ("error" in result) { setError(result.error); return; }
    onLogin(result.token);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" className="login-logo" />
        <h1>Sistema CRM</h1>
        <p>Ingresa tus credenciales para continuar</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@biomeditech.cl"
              maxLength={100}
              autoFocus
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={50}
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="primary" disabled={loading}>
            <Lock size={16} /> {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main CRM ─────────────────────────────────────────────────────────────────

export default function CRMPrototype() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== "undefined") return !!localStorage.getItem("crm_token");
    return false;
  });

  const [active, setActive] = useState<ModuleId>("dashboard");
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);
  const [productos, setProductos] = useState<Producto[]>(INITIAL_PRODUCTOS);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(INITIAL_COTIZACIONES);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<"todos" | LeadStatus>("todos");
  const [clientQuery, setClientQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [modal, setModal] = useState<"lead" | "cliente" | "producto" | "cotizacion" | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [toast, setToast] = useState("");
  const [quote, setQuote] = useState({
    cliente: "Clínica Las Condes",
    email: "felipe@clc.cl",
    nro: "COT-2026-013",
    service: "reparacion" as QuoteService,
    productId: "P-001",
    valor: "",
    notas: "Incluye diagnóstico inicial, reparación y pruebas de funcionamiento.",
  });

  useEffect(() => {
    if (!loggedIn) return;
    Promise.all([
      api.fetchLeads(),
      api.fetchClientes(),
      api.fetchProductos(),
      api.fetchCotizaciones(),
      api.fetchDashboard(),
    ]).then(([l, c, p, cot, s]) => {
      if (l.length > 0) setLeads(l);
      if (c.length > 0) setClientes(c);
      if (p.length > 0) setProductos(p);
      if (cot.length > 0) setCotizaciones(cot);
      if (s) setStats(s);
      setIsLoading(false);
    });
  }, [loggedIn]);

  if (!loggedIn) {
    return <LoginScreen onLogin={(token) => { api.saveToken(token); setLoggedIn(true); }} />;
  }

  const noGestionados = leads.filter((l) => l.estado === "no-gestionado");
  const visibleLeads = leadFilter === "todos" ? leads : leads.filter((l) => l.estado === leadFilter);
  const filteredClients = clientes.filter((c) => JSON.stringify(c).toLowerCase().includes(clientQuery.toLowerCase()));
  const filteredProducts = productos.filter((p) => JSON.stringify(p).toLowerCase().includes(productQuery.toLowerCase()));
  const selectedProduct = productos.find((p) => p.id === quote.productId);
  const computedValue = Number(quote.valor) || getPrice(quote.productId, quote.service, productos);
  const fecha = useMemo(
    () => new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );
  const activeTitle = NAV_ITEMS.find((item) => item.id === active)?.label ?? "Dashboard";

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function goTo(id: ModuleId) {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeModal() {
    setModal(null);
    setEditingLead(null);
    setEditingCliente(null);
    setEditingProducto(null);
  }

  // --- Lead actions ---
  async function handleToggleGestionar(id: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const newEstado = lead.estado === "gestionado" ? "no-gestionado" : "gestionado";
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado: newEstado } : l)));
    await api.updateLead(id, { estado: newEstado });
    if (newEstado === "gestionado") {
      api.logActivity("gestion", "Lead gestionado", `${lead.nombre} (${lead.empresa}) marcado como gestionado`, id, "lead");
    }
    notify(newEstado === "gestionado" ? "Lead marcado como gestionado" : "Lead desmarcado");
  }

  async function handleDeleteLead(id: string) {
    const lead = leads.find((l) => l.id === id);
    if (!window.confirm(`¿Eliminar el lead de ${lead?.nombre ?? "este registro"}?`)) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await api.deleteLead(id);
    notify("Lead eliminado");
  }

  function handleEditLead(lead: Lead) {
    setEditingLead(lead);
    setModal("lead");
  }

  function handleCotizarLead(lead: Lead) {
    const match = clientes.find((c) =>
      c.nombre.toLowerCase().includes(lead.empresa.toLowerCase()) ||
      lead.empresa.toLowerCase().includes(c.nombre.toLowerCase())
    );
    const mappedService: QuoteService = SERVICE_MAP[lead.servicio.toLowerCase()] ?? "";
    setQuote((prev) => ({
      ...prev,
      cliente: match?.nombre ?? lead.empresa,
      email: match?.correo ?? lead.email,
      notas: lead.equipo ? `Equipo: ${lead.equipo}.` : prev.notas,
      service: mappedService,
    }));
    goTo("cotizaciones");
  }

  async function handleSaveLead(form: LeadForm) {
    const newLead = await api.createLead(form);
    const lead: Lead = newLead ?? {
      id: String(Date.now()),
      ...form,
      canal: form.canal as LeadChannel,
      estado: "no-gestionado",
      tiempo: "Justo ahora",
    };
    setLeads((prev) => [lead, ...prev]);
    api.logActivity("nuevo_lead", "Nuevo lead registrado", `${form.nombre} (${form.empresa}) — ${form.servicio}`, lead.id, "lead");
    notify("Lead agregado correctamente");
    closeModal();
  }

  async function handleUpdateLead(id: string, form: LeadForm) {
    const updated = await api.saveLead(id, form);
    if (updated) {
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } else {
      setLeads((prev) => prev.map((l) =>
        l.id === id ? { ...l, ...form, canal: form.canal as LeadChannel } : l
      ));
    }
    notify("Lead actualizado");
    closeModal();
  }

  // --- Cliente actions ---
  async function handleDeleteCliente(id: string) {
    const cliente = clientes.find((c) => c.id === id);
    if (!window.confirm(`¿Eliminar el cliente ${cliente?.nombre ?? "este registro"}?`)) return;
    setClientes((prev) => prev.filter((c) => c.id !== id));
    await api.deleteCliente(id);
    notify("Cliente eliminado");
  }

  function handleEditCliente(cliente: Cliente) {
    setEditingCliente(cliente);
    setModal("cliente");
  }

  async function handleSaveCliente(form: ClienteForm) {
    const newCliente = await api.createCliente(form);
    const cliente: Cliente = newCliente ?? {
      id: `C-${String(clientes.length + 1).padStart(3, "0")}`,
      rut: form.rut,
      nombre: form.nombre,
      contacto: form.contacto,
      correo: form.correo,
      rubro: form.rubro,
      estado: "Activo",
    };
    setClientes((prev) => [cliente, ...prev]);
    api.logActivity("nuevo_cliente", "Nuevo cliente registrado", `${form.nombre}`, cliente.id, "cliente");
    notify("Cliente agregado correctamente");
    closeModal();
  }

  async function handleUpdateCliente(id: string, form: ClienteForm) {
    const updated = await api.saveCliente(id, form);
    if (updated) {
      setClientes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } else {
      setClientes((prev) => prev.map((c) =>
        c.id === id ? { ...c, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, rubro: form.rubro } : c
      ));
    }
    notify("Cliente actualizado");
    closeModal();
  }

  // --- Producto actions ---
  async function handleDeleteProducto(id: string) {
    const prod = productos.find((p) => p.id === id);
    if (!window.confirm(`¿Eliminar el producto "${prod?.nombre ?? "este registro"}"?`)) return;
    setProductos((prev) => prev.filter((p) => p.id !== id));
    await api.deleteProducto(id);
    notify("Producto eliminado");
  }

  function handleEditProducto(producto: Producto) {
    setEditingProducto(producto);
    setModal("producto");
  }

  async function handleSaveProducto(form: ProductoForm) {
    const newProd = await api.createProducto(form);
    const prod: Producto = newProd ?? {
      id: `P-${String(productos.length + 1).padStart(3, "0")}`,
      nombre: form.nombre,
      cat: form.cat,
      diag: Number(form.diag) || 0,
      rep: Number(form.rep) || 0,
      mant: Number(form.mant) || 0,
      inst: Number(form.inst) || 0,
    };
    setProductos((prev) => [...prev, prod]);
    notify("Producto agregado correctamente");
    closeModal();
  }

  async function handleUpdateProducto(id: string, form: ProductoForm) {
    const updated = await api.saveProducto(id, form);
    if (updated) {
      setProductos((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } else {
      setProductos((prev) => prev.map((p) =>
        p.id === id ? {
          ...p, nombre: form.nombre, cat: form.cat,
          diag: Number(form.diag) || 0, rep: Number(form.rep) || 0,
          mant: Number(form.mant) || 0, inst: Number(form.inst) || 0,
        } : p
      ));
    }
    notify("Producto actualizado");
    closeModal();
  }

  // --- Cotización actions ---
  async function handleEmitirCotizacion() {
    const clienteObj = clientes.find((c) => c.nombre === quote.cliente);
    const newCot = await api.createCotizacion({
      cliente_id: clienteObj?.id ?? quote.cliente,
      numero: quote.nro,
      subtotal_neto: computedValue,
      notas_cliente: quote.notas,
      servicio: quote.service,
      producto_id: quote.productId,
    });
    const cot: Cotizacion = newCot ?? {
      id: String(Date.now()),
      nro: quote.nro,
      cliente: quote.cliente,
      monto: computedValue,
      estado: "Pendiente",
      fecha: new Date().toISOString().slice(0, 10),
    };
    setCotizaciones((prev) => [cot, ...prev]);
    api.logActivity(
      "cotizacion_emitida",
      `Cotización ${quote.nro} emitida`,
      `${quote.cliente} — ${money(computedValue)} CLP`,
      cot.id,
      "cotizacion",
    );
    notify(`Cotización ${quote.nro} emitida y enviada`);
    setQuote((prev) => ({ ...prev, nro: incrementNro(prev.nro) }));
  }

  function handlePrintQuote() {
    const el = document.getElementById("quote-preview-content");
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización ${quote.nro}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,sans-serif;font-size:14px;color:#1e293b;padding:32px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0f172a}
      header img{height:36px;filter:invert(1) brightness(0)}
      header div:last-child{text-align:right}
      header strong{display:block;font-size:18px}
      h3{margin:20px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
      dl{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;margin-bottom:8px}
      dt{color:#64748b}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#0f172a;color:#fff;padding:8px 12px;text-align:left;font-size:13px}
      td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
      .total{display:flex;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:6px;font-weight:600}
      .note{margin-top:12px;padding:12px;background:#fff7ed;border-left:3px solid #f97316;font-size:13px}
      footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8}
    </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function handleLogout() {
    api.clearToken();
    setLoggedIn(false);
  }

  return (
    <div className="app-shell">
      {isLoading && <div className="loading-bar" />}

      <aside className="sidebar">
        <div className="brand">
          <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" />
          <span>Sistema CRM</span>
        </div>

        {["Principal", "Gestión", "Operaciones"].map((group) => (
          <div key={group} className="nav-group">
            <p>{group}</p>
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon;
              const count = item.id === "leads" ? noGestionados.length : undefined;
              return (
                <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => goTo(item.id)}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {count ? <b>{count}</b> : null}
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar">BM</div>
          <div>
            <strong>Biomeditech</strong>
            <span>Administrador</span>
          </div>
          <button className="icon-button" aria-label="Cerrar sesión" onClick={handleLogout} title="Cerrar sesión">
            <Settings size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{activeTitle}</h1>
            <p>Biomeditech CRM / {active === "dashboard" ? "Inicio" : activeTitle}</p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notificaciones">
              <Bell size={18} />
              <span className="notify-dot" />
            </button>
            <button className="primary small" onClick={() => setModal("cotizacion")}>
              <Plus size={16} />
              Nueva cotización
            </button>
          </div>
        </header>

        <section className="content">
          {active === "dashboard" && (
            <Dashboard noGestionados={noGestionados} goTo={goTo} notify={notify} stats={stats} />
          )}

          {active === "leads" && (
            <section className="stack">
              <div className="module-toolbar">
                <div className="segmented">
                  <button className={leadFilter === "todos" ? "selected" : ""} onClick={() => setLeadFilter("todos")}>
                    Todos mis leads <span>{leads.length}</span>
                  </button>
                  <button className={leadFilter === "gestionado" ? "selected" : ""} onClick={() => setLeadFilter("gestionado")}>
                    Gestionados <span>{leads.filter((l) => l.estado === "gestionado").length}</span>
                  </button>
                  <button className={leadFilter === "no-gestionado" ? "selected" : ""} onClick={() => setLeadFilter("no-gestionado")}>
                    Sin gestionar <span>{noGestionados.length}</span>
                  </button>
                </div>
                <button className="primary" onClick={() => setModal("lead")}>
                  <UserPlus size={16} />Agregar lead
                </button>
              </div>
              <div className="lead-grid">
                {visibleLeads.map((lead) => (
                  <article className={`lead-card ${lead.estado}`} key={lead.id}>
                    <div className="lead-card-head">
                      <div>
                        <h3>{lead.nombre}</h3>
                        <p>{lead.empresa}</p>
                      </div>
                      <div className="lead-badges">
                        <span className={lead.canal}>{lead.canal === "wsp" ? "WhatsApp" : "Correo"}</span>
                        <span className={lead.estado === "gestionado" ? "ok" : "pending"}>
                          {lead.estado === "gestionado" ? "Gestionado" : "Sin gestionar"}
                        </span>
                      </div>
                    </div>
                    <dl className="lead-meta">
                      <div><MessageCircle size={14} />{lead.tel}</div>
                      <div><Mail size={14} />{lead.email}</div>
                      <div><Wrench size={14} />{lead.servicio}{lead.equipo ? ` / ${lead.equipo}` : ""}</div>
                      <div><Clock3 size={14} />{lead.tiempo}</div>
                    </dl>
                    <div className="card-actions">
                      <button className="primary small" onClick={() => handleCotizarLead(lead)}>
                        <ClipboardList size={15} />Cotizar
                      </button>
                      <button className="ghost small" onClick={() => handleToggleGestionar(lead.id)}>
                        <Check size={15} />
                        {lead.estado === "gestionado" ? "Desmarcar" : "Gestionar"}
                      </button>
                      <button className="ghost small card-icon-btn" aria-label="Editar" onClick={() => handleEditLead(lead)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="ghost small card-icon-btn danger" aria-label="Eliminar" onClick={() => handleDeleteLead(lead.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {active === "clientes" && (
            <DataModule
              title="Clientes"
              search={clientQuery}
              setSearch={setClientQuery}
              searchPlaceholder="Buscar por ID, RUT, nombre, contacto o correo..."
              onAdd={() => setModal("cliente")}
            >
              <table>
                <thead>
                  <tr><th>ID</th><th>RUT</th><th>Nombre / Empresa</th><th>Contacto</th><th>Rubro</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td className="mono">{client.id}</td>
                      <td className="mono">{client.rut}</td>
                      <td><strong>{client.nombre}</strong><small>{client.correo}</small></td>
                      <td>{client.contacto}</td>
                      <td><span className="tag navy">{client.rubro}</span></td>
                      <td><span className={`tag ${isActivo(client.estado) ? "green" : "amber"}`}>{client.estado}</span></td>
                      <td>
                        <RowActions
                          notify={notify}
                          quote={() => goTo("cotizaciones")}
                          onEdit={() => handleEditCliente(client)}
                          onDelete={() => handleDeleteCliente(client.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataModule>
          )}

          {active === "productos" && (
            <DataModule
              title="Productos / Servicios"
              search={productQuery}
              setSearch={setProductQuery}
              searchPlaceholder="Buscar por ID, producto, categoría o precio..."
              onAdd={() => setModal("producto")}
            >
              <table>
                <thead>
                  <tr><th>ID</th><th>Producto / Servicio</th><th>Categoría</th><th>Diagnóstico</th><th>Reparación</th><th>Mantención</th><th>Instalación</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="mono">{product.id}</td>
                      <td><strong>{product.nombre}</strong></td>
                      <td><span className="tag navy">{product.cat}</span></td>
                      <td>{money(product.diag)}</td>
                      <td>{money(product.rep)}</td>
                      <td>{money(product.mant)}</td>
                      <td>{money(product.inst)}</td>
                      <td>
                        <RowActions
                          notify={notify}
                          onEdit={() => handleEditProducto(product)}
                          onDelete={() => handleDeleteProducto(product.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataModule>
          )}

          {active === "cotizaciones" && (
            <section className="quote-layout">
              <div className="stack">
                <div className="panel">
                  <div className="panel-title"><ClipboardList size={18} />Nueva cotización</div>
                  <QuoteForm
                    quote={quote}
                    setQuote={setQuote}
                    clientes={clientes}
                    productos={productos}
                    onEmitir={handleEmitirCotizacion}
                  />
                </div>
                <ProcessTimeline />
              </div>

              <div className="stack">
                <div className="preview-label-row">
                  <span className="preview-label">Previsualización en tiempo real</span>
                  <button className="ghost small" onClick={handlePrintQuote}>
                    <Printer size={15} />Descargar / Imprimir
                  </button>
                </div>
                <QuotePreview quote={quote} selectedProduct={selectedProduct} computedValue={computedValue} fecha={fecha} />
                <HistoryTable cotizaciones={cotizaciones} clientes={clientes} />
              </div>
            </section>
          )}

          {active === "protocolos" && <Protocols />}
        </section>
      </main>

      <Modal
        kind={modal}
        close={closeModal}
        notify={notify}
        goTo={goTo}
        clientes={clientes}
        editingLead={editingLead}
        editingCliente={editingCliente}
        editingProducto={editingProducto}
        onSaveLead={handleSaveLead}
        onSaveCliente={handleSaveCliente}
        onSaveProducto={handleSaveProducto}
        onUpdateLead={handleUpdateLead}
        onUpdateCliente={handleUpdateCliente}
        onUpdateProducto={handleUpdateProducto}
      />

      <div className={`toast ${toast ? "show" : ""}`}>
        <Check size={16} />
        <span>{toast}</span>
      </div>
    </div>
  );
}

function Dashboard({
  noGestionados,
  goTo,
  notify,
  stats,
}: {
  noGestionados: Lead[];
  goTo: (id: ModuleId) => void;
  notify: (message: string) => void;
  stats: DashboardStats | null;
}) {
  const leadsValue = stats ? String(stats.leadsPendientes) : "18";
  const clientesValue = stats ? String(stats.clientesActivos) : "47";
  const cotizacionesValue = stats ? String(stats.cotizacionesAbiertas) : "12";
  const ventasValue = stats
    ? `$${(stats.ventasAprobadas / 1000000).toFixed(1).replace(".", ",")}M`
    : "$4,2M";

  return (
    <section className="stack">
      <div className="kpi-row">
        <Kpi icon={Activity} label="Leads pendientes" value={leadsValue} delta="Sin gestionar" tone="amber" />
        <Kpi icon={BriefcaseMedical} label="Clientes activos" value={clientesValue} delta="En base de datos" tone="green" />
        <Kpi icon={ClipboardList} label="Cotizaciones abiertas" value={cotizacionesValue} delta="Emitidas / en revisión" tone="amber" />
        <Kpi icon={FileText} label="Ventas aprobadas" value={ventasValue} delta="CLP acumulado" tone="green" />
      </div>

      <div className="flow-strip">
        {["Lead recibido", "Consulta automática", "Cliente y producto", "Cotización", "Envío y seguimiento"].map((step, index) => (
          <div className="flow-step" key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title"><Clock3 size={18} />Actividad reciente</div>
            <button className="link-button" onClick={() => notify("Vista completa de actividad preparada para la versión final")}>Ver todo</button>
          </div>
          <div className="activity-list">
            {stats?.actividadReciente && stats.actividadReciente.length > 0 ? (
              stats.actividadReciente.slice(0, 5).map((item, i) => (
                <ActivityRow
                  key={i}
                  tone="green"
                  icon={Activity}
                  text={<><strong>{item.titulo}</strong>{item.descripcion ? ` — ${item.descripcion}` : ""}</>}
                  time={fmtActivityDate(item.creado_en)}
                />
              ))
            ) : (
              <>
                <ActivityRow tone="green" icon={Activity} text={<><strong>Nuevo lead vía WhatsApp</strong> - Clínica Las Condes solicitó reparación de monitor.</>} time="Hace 12 min" />
                <ActivityRow tone="navy" icon={ClipboardList} text={<><strong>Cotización COT-2026-012</strong> enviada a Universidad de Chile por $320.000 CLP.</>} time="Hace 1 hora" />
                <ActivityRow tone="green" icon={BriefcaseMedical} text={<><strong>Nuevo cliente registrado</strong> - Centro Médico Providencia.</>} time="Hace 3 horas" />
                <ActivityRow tone="amber" icon={Wrench} text={<><strong>Producto actualizado</strong> - Reparación Autoclave ajustada a $185.000.</>} time="Ayer 16:40" />
                <ActivityRow tone="navy" icon={Check} text={<><strong>Cotización COT-2026-011</strong> aprobada por Neovida.</>} time="Ayer 11:20" />
              </>
            )}
          </div>
        </div>
        <div className="panel pending-panel">
          <div className="panel-head">
            <div className="panel-title"><Bell size={18} />Leads sin gestionar</div>
            <span className="tag amber">{noGestionados.length} pendientes</span>
          </div>
          {noGestionados.slice(0, 4).map((lead) => (
            <button className="compact-lead" key={lead.id} onClick={() => goTo("leads")}>
              <span className={lead.canal} />
              <div>
                <strong>{lead.nombre}</strong>
                <small>{lead.empresa} · {lead.tiempo}</small>
              </div>
              <Eye size={15} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Kpi({ icon: Icon, label, value, delta, tone }: { icon: React.ElementType; label: string; value: string; delta: string; tone: "green" | "amber" }) {
  return (
    <article className="kpi-card">
      <Icon size={23} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{delta}</small>
    </article>
  );
}

function ActivityRow({ icon: Icon, text, time, tone }: { icon: React.ElementType; text: React.ReactNode; time: string; tone: string }) {
  return (
    <div className="activity-row">
      <div className={`activity-icon ${tone}`}><Icon size={16} /></div>
      <div><p>{text}</p><small>{time}</small></div>
    </div>
  );
}

function DataModule({ children, search, setSearch, searchPlaceholder, onAdd }: {
  children: React.ReactNode;
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  onAdd: () => void;
  title: string;
}) {
  return (
    <section className="stack">
      <div className="module-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
        </label>
        <button className="ghost"><Filter size={16} />Filtros</button>
        <button className="primary" onClick={onAdd}><Plus size={16} />Agregar</button>
      </div>
      <div className="table-card">{children}</div>
    </section>
  );
}

function RowActions({ notify, quote, onDelete, onEdit }: {
  notify: (message: string) => void;
  quote?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="row-actions">
      <button aria-label="Editar" onClick={() => onEdit ? onEdit() : notify("Modo edición abierto")}>
        <Edit3 size={15} />
      </button>
      {quote ? <button aria-label="Cotizar" onClick={quote}><ClipboardList size={15} /></button> : null}
      <button
        aria-label="Eliminar"
        className="danger"
        onClick={() => onDelete ? onDelete() : notify("Registro eliminado del prototipo")}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function QuoteForm({
  quote,
  setQuote,
  clientes,
  productos,
  onEmitir,
}: {
  quote: { cliente: string; email: string; nro: string; service: QuoteService; productId: string; valor: string; notas: string };
  setQuote: React.Dispatch<React.SetStateAction<{ cliente: string; email: string; nro: string; service: QuoteService; productId: string; valor: string; notas: string }>>;
  clientes: Cliente[];
  productos: Producto[];
  onEmitir: () => void;
}) {
  function update<K extends keyof typeof quote>(key: K, value: (typeof quote)[K]) {
    setQuote((current) => ({ ...current, [key]: value }));
  }

  function handleClienteChange(nombre: string) {
    const found = clientes.find((c) => c.nombre === nombre);
    update("cliente", nombre);
    if (found) update("email", found.correo);
  }

  return (
    <div className="form-stack">
      <label>
        Cliente
        <select value={quote.cliente} onChange={(e) => handleClienteChange(e.target.value)}>
          {clientes.map((c) => <option key={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      <label>Correo cliente<input value={quote.email} onChange={(e) => update("email", e.target.value)} maxLength={100} /></label>
      <label>N° Cotización<input value={quote.nro} onChange={(e) => update("nro", e.target.value)} maxLength={30} /></label>
      <label>
        Tipo de servicio
        <select value={quote.service} onChange={(e) => update("service", e.target.value as QuoteService)}>
          <option value="">Seleccionar</option>
          {Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>
        Producto / Equipo
        <select value={quote.productId} onChange={(e) => update("productId", e.target.value)}>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>
      <label>Valor del servicio (CLP)<input type="number" value={quote.valor} onChange={(e) => update("valor", e.target.value)} placeholder="Usar precio base automático" /></label>
      <label>Notas adicionales<textarea rows={3} value={quote.notas} onChange={(e) => update("notas", e.target.value)} maxLength={500} /></label>
      <div className="split-actions">
        <button className="ghost" onClick={() => update("valor", quote.valor)}><Eye size={16} />Actualizar vista</button>
        <button className="primary" onClick={onEmitir}><Send size={16} />Emitir y enviar</button>
      </div>
    </div>
  );
}

function ProcessTimeline() {
  return (
    <div className="panel">
      <div className="panel-title"><Activity size={18} />Estado del proceso</div>
      <div className="timeline">
        <TimelineItem state="done" title="Lead recibido" detail="Automático vía WhatsApp o landing" />
        <TimelineItem state="done" title="Cliente registrado" detail="Base de datos actualizada" />
        <TimelineItem state="current" title="Cotización en borrador" detail="Producto y servicio seleccionados" />
        <TimelineItem state="pending" title="Envío por correo" detail="Pendiente" />
        <TimelineItem state="pending" title="Aprobación cliente" detail="Seguimiento automático" />
      </div>
    </div>
  );
}

function TimelineItem({ state, title, detail }: { state: string; title: string; detail: string }) {
  return (
    <div className="timeline-item">
      <span className={state} />
      <div><strong>{title}</strong><small>{detail}</small></div>
    </div>
  );
}

function QuotePreview({
  quote,
  selectedProduct,
  computedValue,
  fecha,
}: {
  quote: { cliente: string; email: string; nro: string; service: QuoteService; notas: string };
  selectedProduct?: Producto;
  computedValue: number;
  fecha: string;
}) {
  return (
    <article className="quote-preview">
      <div id="quote-preview-content">
        <header>
          <div>
            <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" />
            <p>Reparación y mantención de equipos médicos</p>
          </div>
          <div><strong>{quote.nro}</strong><span>{fecha}</span><span>biomeditech.cl</span></div>
        </header>
        <section>
          <h3>Datos del cliente</h3>
          <dl className="quote-data">
            <dt>Empresa</dt><dd>{quote.cliente || "—"}</dd>
            <dt>Correo</dt><dd>{quote.email || "—"}</dd>
            <dt>Tipo servicio</dt><dd>{quote.service ? SERVICE_LABELS[quote.service] : "—"}</dd>
          </dl>
          <h3>Detalle del servicio</h3>
          <table className="quote-table">
            <thead><tr><th>Producto / Equipo</th><th>Servicio</th><th>Valor</th></tr></thead>
            <tbody>
              <tr>
                <td>{selectedProduct?.nombre ?? ""}</td>
                <td>{quote.service ? SERVICE_LABELS[quote.service] : "—"}</td>
                <td>{money(computedValue)}</td>
              </tr>
            </tbody>
          </table>
          <div className="total-bar"><span>Total estimado</span><strong>{money(computedValue)} CLP</strong></div>
          {quote.notas ? <p className="quote-note">{quote.notas}</p> : null}
          <h3>Condiciones</h3>
          <dl className="quote-data">
            <dt>Forma de pago</dt><dd>50% inicio - 50% entrega</dd>
            <dt>Validez</dt><dd>30 días desde emisión</dd>
            <dt>Diagnóstico</dt><dd>Gratis si acepta el presupuesto</dd>
          </dl>
        </section>
        <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por 30 días</footer>
      </div>
    </article>
  );
}

function HistoryTable({ cotizaciones, clientes }: { cotizaciones: Cotizacion[]; clientes: Cliente[] }) {
  function getClienteName(clienteId: string) {
    const found = clientes.find((c) => c.id === clienteId || c.nombre === clienteId);
    return found?.nombre ?? clienteId;
  }

  return (
    <div className="panel table-card compact">
      <div className="panel-title"><FileText size={18} />Historial reciente</div>
      <table>
        <thead><tr><th>N°</th><th>Cliente</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>
          {cotizaciones.slice(0, 10).map((cot) => (
            <tr key={cot.id}>
              <td>{cot.nro}</td>
              <td>{getClienteName(cot.cliente)}</td>
              <td>{money(cot.monto)}</td>
              <td>
                <span className={`tag ${cot.estado === "Aprobada" ? "green" : cot.estado === "En revisión" ? "navy" : "amber"}`}>
                  {cot.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Protocols() {
  return (
    <section className="stack">
      <div className="protocol-hero">
        <FileArchive size={52} />
        <h2>Protocolos de Mantención</h2>
        <p>Módulo reservado para programar mantenciones preventivas, asociar protocolos técnicos por equipo y generar informes de seguimiento.</p>
        <button><Bell size={16} />Notificar cuando esté listo</button>
      </div>
      <div className="protocol-grid">
        <article><CalendarDays size={30} /><strong>Agenda de mantenciones</strong><span>Próximamente</span></article>
        <article><FileText size={30} /><strong>Documentos técnicos</strong><span>Próximamente</span></article>
        <article><Activity size={30} /><strong>Informes de seguimiento</strong><span>Próximamente</span></article>
      </div>
    </section>
  );
}

function Modal({
  kind,
  close,
  notify,
  goTo,
  clientes,
  editingLead,
  editingCliente,
  editingProducto,
  onSaveLead,
  onSaveCliente,
  onSaveProducto,
  onUpdateLead,
  onUpdateCliente,
  onUpdateProducto,
}: {
  kind: "lead" | "cliente" | "producto" | "cotizacion" | null;
  close: () => void;
  notify: (message: string) => void;
  goTo: (id: ModuleId) => void;
  clientes: Cliente[];
  editingLead: Lead | null;
  editingCliente: Cliente | null;
  editingProducto: Producto | null;
  onSaveLead: (form: LeadForm) => void;
  onSaveCliente: (form: ClienteForm) => void;
  onSaveProducto: (form: ProductoForm) => void;
  onUpdateLead: (id: string, form: LeadForm) => void;
  onUpdateCliente: (id: string, form: ClienteForm) => void;
  onUpdateProducto: (id: string, form: ProductoForm) => void;
}) {
  const [leadForm, setLeadForm] = useState<LeadForm>(LEAD_FORM_INIT);
  const [clienteForm, setClienteForm] = useState<ClienteForm>(CLIENTE_FORM_INIT);
  const [productoForm, setProductoForm] = useState<ProductoForm>(PRODUCTO_FORM_INIT);

  useEffect(() => {
    if (kind === "lead" && editingLead) {
      setLeadForm({ nombre: editingLead.nombre, empresa: editingLead.empresa, tel: editingLead.tel, email: editingLead.email, canal: editingLead.canal, servicio: editingLead.servicio, equipo: editingLead.equipo });
    } else if (kind === "cliente" && editingCliente) {
      setClienteForm({ rut: editingCliente.rut, nombre: editingCliente.nombre, contacto: editingCliente.contacto, cargo: "", tel: "+56 ", correo: editingCliente.correo, rubro: editingCliente.rubro });
    } else if (kind === "producto" && editingProducto) {
      setProductoForm({ nombre: editingProducto.nombre, cat: editingProducto.cat, marca: "", diag: String(editingProducto.diag), rep: String(editingProducto.rep), mant: String(editingProducto.mant), inst: String(editingProducto.inst) });
    } else {
      setLeadForm(LEAD_FORM_INIT);
      setClienteForm(CLIENTE_FORM_INIT);
      setProductoForm(PRODUCTO_FORM_INIT);
    }
  }, [kind, editingLead, editingCliente, editingProducto]);

  if (!kind) return null;

  const isEditing =
    (kind === "lead" && !!editingLead) ||
    (kind === "cliente" && !!editingCliente) ||
    (kind === "producto" && !!editingProducto);

  const titles: Record<typeof kind, string> = {
    lead: isEditing ? "Editar Lead" : "Nuevo Lead",
    cliente: isEditing ? "Editar cliente" : "Agregar cliente",
    producto: isEditing ? "Editar producto / servicio" : "Agregar producto / servicio",
    cotizacion: "Nueva cotización rápida",
  };

  function handleSave() {
    if (kind === "lead") {
      if (!leadForm.nombre.trim()) { notify("El nombre es requerido"); return; }
      if (leadForm.email && !isValidEmail(leadForm.email)) { notify("El correo no tiene un formato válido"); return; }
      editingLead ? onUpdateLead(editingLead.id, leadForm) : onSaveLead(leadForm);
    } else if (kind === "cliente") {
      if (!clienteForm.nombre.trim()) { notify("El nombre de la empresa es requerido"); return; }
      if (clienteForm.correo && !isValidEmail(clienteForm.correo)) { notify("El correo no tiene un formato válido"); return; }
      editingCliente ? onUpdateCliente(editingCliente.id, clienteForm) : onSaveCliente(clienteForm);
    } else if (kind === "producto") {
      if (!productoForm.nombre.trim()) { notify("El nombre del producto es requerido"); return; }
      editingProducto ? onUpdateProducto(editingProducto.id, productoForm) : onSaveProducto(productoForm);
    } else if (kind === "cotizacion") {
      close();
      goTo("cotizaciones");
    }
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{titles[kind]}</h2>
          <button onClick={close} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="modal-grid">
          {kind === "lead" && (
            <>
              <label>Nombre contacto<input value={leadForm.nombre} onChange={(e) => setLeadForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: María González" maxLength={100} /></label>
              <label>Empresa<input value={leadForm.empresa} onChange={(e) => setLeadForm((f) => ({ ...f, empresa: e.target.value }))} placeholder="Ej: Clínica Santiago" maxLength={100} /></label>
              <label>Teléfono<input value={leadForm.tel} onChange={(e) => setLeadForm((f) => ({ ...f, tel: e.target.value }))} placeholder="+56 9 XXXX XXXX" maxLength={20} /></label>
              <label>
                Canal
                <select value={leadForm.canal} onChange={(e) => setLeadForm((f) => ({ ...f, canal: e.target.value }))}>
                  <option value="wsp">WhatsApp</option>
                  <option value="email">Correo</option>
                </select>
              </label>
              <label>Correo<input type="email" value={leadForm.email} onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@empresa.cl" maxLength={100} /></label>
              <label>
                Servicio
                <select value={leadForm.servicio} onChange={(e) => setLeadForm((f) => ({ ...f, servicio: e.target.value }))}>
                  <option>Diagnóstico</option>
                  <option>Reparación</option>
                  <option>Mantención</option>
                  <option>Instalación</option>
                </select>
              </label>
              <label className="wide">Equipo / Producto<input value={leadForm.equipo} onChange={(e) => setLeadForm((f) => ({ ...f, equipo: e.target.value }))} placeholder="Ej: Monitor de signos vitales" maxLength={200} /></label>
            </>
          )}
          {kind === "cliente" && (
            <>
              <label>RUT empresa
                <input
                  value={clienteForm.rut}
                  onChange={(e) => setClienteForm((f) => ({ ...f, rut: formatRut(e.target.value) }))}
                  placeholder="76.XXX.XXX-X"
                  maxLength={15}
                />
              </label>
              <label>Nombre empresa<input value={clienteForm.nombre} onChange={(e) => setClienteForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Clínica Las Condes" maxLength={100} /></label>
              <label>Contacto<input value={clienteForm.contacto} onChange={(e) => setClienteForm((f) => ({ ...f, contacto: e.target.value }))} placeholder="Nombre del contacto" maxLength={100} /></label>
              <label>Cargo<input value={clienteForm.cargo} onChange={(e) => setClienteForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Jefe de Mantención" maxLength={80} /></label>
              <label>Teléfono<input value={clienteForm.tel} onChange={(e) => setClienteForm((f) => ({ ...f, tel: e.target.value }))} placeholder="+56 9 XXXX XXXX" maxLength={20} /></label>
              <label>Correo<input type="email" value={clienteForm.correo} onChange={(e) => setClienteForm((f) => ({ ...f, correo: e.target.value }))} placeholder="contacto@empresa.cl" maxLength={100} /></label>
            </>
          )}
          {kind === "producto" && (
            <>
              <label className="wide">Nombre equipo / producto<input value={productoForm.nombre} onChange={(e) => setProductoForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Monitor de Signos Vitales" maxLength={150} /></label>
              <label>
                Categoría
                <select value={productoForm.cat} onChange={(e) => setProductoForm((f) => ({ ...f, cat: e.target.value }))}>
                  <option>Equipos médicos</option>
                  <option>Equipos dentales</option>
                  <option>Laboratorio</option>
                  <option>Equipos estéticos</option>
                </select>
              </label>
              <label>Marca / Modelo<input value={productoForm.marca} onChange={(e) => setProductoForm((f) => ({ ...f, marca: e.target.value }))} placeholder="Philips MP5" maxLength={100} /></label>
              <label>Precio diagnóstico<input type="number" value={productoForm.diag} onChange={(e) => setProductoForm((f) => ({ ...f, diag: e.target.value }))} placeholder="0" /></label>
              <label>Precio reparación<input type="number" value={productoForm.rep} onChange={(e) => setProductoForm((f) => ({ ...f, rep: e.target.value }))} placeholder="0" /></label>
              <label>Precio mantención<input type="number" value={productoForm.mant} onChange={(e) => setProductoForm((f) => ({ ...f, mant: e.target.value }))} placeholder="0" /></label>
              <label>Precio instalación<input type="number" value={productoForm.inst} onChange={(e) => setProductoForm((f) => ({ ...f, inst: e.target.value }))} placeholder="0" /></label>
            </>
          )}
          {kind === "cotizacion" && (
            <>
              <label>
                Cliente
                <select>
                  {clientes.map((c) => <option key={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label>
                Servicio
                <select>
                  <option>Diagnóstico</option>
                  <option>Reparación</option>
                  <option>Mantención</option>
                  <option>Instalación</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={close}>Cancelar</button>
          <button className="primary" onClick={handleSave}>
            {kind === "cotizacion" ? "Ir a cotizaciones" : isEditing ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
