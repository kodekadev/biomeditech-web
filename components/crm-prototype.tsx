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
import type { Lead, Cliente, Producto, Cotizacion, DashboardStats, LeadForm, ClienteForm, ProductoForm, CatalogoItem, CatalogoItemForm, Plantilla, CotizacionItemForm } from "@/lib/api";

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
  { id: "C-001", rut: "61.608.023-8", nombre: "Clínica Las Condes", contacto: "Felipe Morales", correo: "felipe@clc.cl", rubro: "Médico", estado: "Activo", telefono: "", direccion: "", ciudad: "", comuna: "" },
  { id: "C-002", rut: "60.503.000-1", nombre: "Universidad de Chile", contacto: "Claudia Torres", correo: "claudia@uchile.cl", rubro: "Médico", estado: "Activo", telefono: "", direccion: "", ciudad: "", comuna: "" },
  { id: "C-003", rut: "76.543.210-K", nombre: "Centro Médico Providencia", contacto: "Andrea Silva", correo: "andrea@cmp.cl", rubro: "Médico", estado: "Activo", telefono: "", direccion: "", ciudad: "", comuna: "" },
  { id: "C-004", rut: "78.123.456-3", nombre: "Neovida", contacto: "Rodrigo Pinto", correo: "rodrigo@neovida.cl", rubro: "Estético", estado: "Activo", telefono: "", direccion: "", ciudad: "", comuna: "" },
  { id: "C-005", rut: "77.654.321-5", nombre: "UnoSalud", contacto: "Patricia Muñoz", correo: "patricia@unosalud.cl", rubro: "Dental", estado: "Inactivo", telefono: "", direccion: "", ciudad: "", comuna: "" },
  { id: "C-006", rut: "76.111.222-4", nombre: "Vetlab", contacto: "Jorge Espinoza", correo: "jorge@vetlab.cl", rubro: "Laboratorio", estado: "Activo", telefono: "", direccion: "", ciudad: "", comuna: "" },
];

const INITIAL_PRODUCTOS: Producto[] = [
  { id: "P-001", nombre: "Monitor de Signos Vitales", cat: "Equipos médicos", diag: 45000, rep: 120000, mant: 85000, inst: 95000 },
  { id: "P-002", nombre: "Autoclave", cat: "Equipos médicos", diag: 35000, rep: 185000, mant: 90000, inst: 110000 },
  { id: "P-003", nombre: "Ecógrafo", cat: "Equipos médicos", diag: 55000, rep: 250000, mant: 0, inst: 130000 },
  { id: "P-004", nombre: "Centrífuga", cat: "Laboratorio", diag: 30000, rep: 75000, mant: 50000, inst: 60000 },
  { id: "P-005", nombre: "Unidad Dental", cat: "Equipos dentales", diag: 40000, rep: 95000, mant: 70000, inst: 120000 },
  { id: "P-006", nombre: "Máquina de Anestesia", cat: "Equipos médicos", diag: 60000, rep: 320000, mant: 150000, inst: 200000 },
];

const INITIAL_CATALOGO: CatalogoItem[] = [
  { id: "CAT-MP-001", codigo: "MP-001", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 85000, grupo: "MP", texto_base_key: "MP" },
  { id: "CAT-MP-002", codigo: "MP-002", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 90000, grupo: "MP", texto_base_key: "MP" },
  { id: "CAT-MC-001", codigo: "MC-001", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 120000, grupo: "MC", texto_base_key: "MC" },
  { id: "CAT-MC-002", codigo: "MC-002", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 185000, grupo: "MC", texto_base_key: "MC" },
  { id: "CAT-BS-001", codigo: "BS-001", categoria: "BS", servicio: "Bloque servicio tecnico", equipo: "Atencion en terreno", unidad: "Bloque", precio_neto: 65000, grupo: "BS", texto_base_key: "BS" },
  { id: "CAT-VS-001", codigo: "VS-001", categoria: "VS", servicio: "Visita tecnica", equipo: "Evaluacion inicial", unidad: "Visita", precio_neto: 45000, grupo: "VS", texto_base_key: "VS" },
  { id: "CAT-EV-001", codigo: "EV-001", categoria: "EV", servicio: "Evaluacion diagnostica", equipo: "Equipo biomedico", unidad: "Servicio", precio_neto: 55000, grupo: "EV", texto_base_key: "EV" },
  { id: "CAT-RS-001", codigo: "RS-001", categoria: "RS", servicio: "Repuesto / Insumo", equipo: "Kit de repuestos", unidad: "Unidad", precio_neto: 0, grupo: "RS", texto_base_key: "RS" },
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

function normalizeRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toLowerCase();
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

const LEAD_FORM_INIT: LeadForm = { rut: "", nombre: "", empresa: "", tel: "+56 ", email: "", canal: "wsp", servicio: "", equipo: "" };
const CLIENTE_FORM_INIT: ClienteForm = { rut: "", nombre: "", contacto: "", tel: "+56 ", correo: "", rubro: "Médico", estado: "activo", direccion: "", ciudad: "", comuna: "" };
const CATALOGO_FORM_INIT: CatalogoItemForm = { codigo: "", categoria: "MP", servicio: "", equipo: "", unidad: "Servicio", precio_neto: "", texto_base_key: "", descripcion_larga: "" };
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
  const [clientSearchField, setClientSearchField] = useState<"todos" | "rut" | "nombre" | "contacto" | "correo">("todos");
  const [productQuery, setProductQuery] = useState("");
  const [modal, setModal] = useState<"lead" | "cliente" | "producto" | "cotizacion" | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingCatalogo, setEditingCatalogo] = useState<CatalogoItem | null>(null);
  const [leadView, setLeadView] = useState<"iconos" | "lista" | "detalle">("iconos");
  const [leadPreItems, setLeadPreItems] = useState<Record<string, CotizacionItemForm[]>>({});
  const [clientePrefill, setClientePrefill] = useState<Partial<ClienteForm> | null>(null);
  const [toast, setToast] = useState("");
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>(INITIAL_CATALOGO);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cotizClienteId, setCotizClienteId] = useState("");
  const [cotizNotas, setCotizNotas] = useState("");
  const [cotizFormaPago, setCotizFormaPago] = useState("50% inicio - 50% entrega");
  const [cotizItems, setCotizItems] = useState<CotizacionItemForm[]>([]);
  // legacy single-line state kept for backward compat with pre-fill from lead
  const [quote, setQuote] = useState({
    cliente: "",
    email: "",
    nro: "",
    service: "" as QuoteService,
    productId: "",
    valor: "",
    notas: "",
  });

  const fecha = useMemo(
    () => new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );

  useEffect(() => {
    if (!loggedIn) return;
    Promise.all([
      api.fetchLeads(),
      api.fetchClientes(),
      api.fetchProductos(),
      api.fetchCotizaciones(),
      api.fetchDashboard(),
      api.fetchCatalogo(),
      api.fetchPlantillas(),
    ]).then(([l, c, p, cot, s, cat, plt]) => {
      if (l.length > 0) setLeads(l);
      if (c.length > 0) setClientes(c);
      if (p.length > 0) setProductos(p);
      if (cot.length > 0) setCotizaciones(cot);
      if (s) setStats(s);
      if (cat.length > 0) setCatalogo(cat);
      if (plt.length > 0) setPlantillas(plt);
      setIsLoading(false);
    });
  }, [loggedIn]);

  if (!loggedIn) {
    return <LoginScreen onLogin={(token) => { api.saveToken(token); setLoggedIn(true); }} />;
  }

  const noGestionados = leads.filter((l) => l.estado === "no-gestionado");
  const visibleLeads = leadFilter === "todos" ? leads : leads.filter((l) => l.estado === leadFilter);
  const filteredClients = clientes.filter((c) => {
    if (!clientQuery) return true;
    const q = clientQuery.toLowerCase();
    const qNorm = normalizeRut(clientQuery);
    if (clientSearchField === "rut") return normalizeRut(c.rut).includes(qNorm);
    if (clientSearchField === "nombre") return c.nombre.toLowerCase().includes(q);
    if (clientSearchField === "contacto") return c.contacto.toLowerCase().includes(q);
    if (clientSearchField === "correo") return c.correo.toLowerCase().includes(q);
    return normalizeRut(c.rut).includes(qNorm) || c.nombre.toLowerCase().includes(q) || c.contacto.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q) || (c.ciudad ?? "").toLowerCase().includes(q);
  });
  const filteredProducts = productos.filter((p) => JSON.stringify(p).toLowerCase().includes(productQuery.toLowerCase()));
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
    setClientePrefill(null);
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

  function handleCotizarCliente(cliente: Cliente) {
    setCotizClienteId(cliente.id);
    goTo("cotizaciones");
  }

  function handleCotizarLead(lead: Lead) {
    const match = clientes.find((c) =>
      c.nombre.toLowerCase().includes(lead.empresa.toLowerCase()) ||
      lead.empresa.toLowerCase().includes(c.nombre.toLowerCase())
    );

    setCotizClienteId(match?.id ?? "");

    const preItems = leadPreItems[lead.id];
    if (preItems && preItems.length > 0) {
      setCotizItems(preItems);
    } else {
      const q = `${lead.servicio} ${lead.equipo}`.toLowerCase();
      const inferred = catalogo.find((c) =>
        (c.categoria && lead.servicio === c.categoria) ||
        q.includes(c.equipo.toLowerCase()) ||
        q.includes(c.servicio.toLowerCase())
      );
      if (inferred) setCotizItems([catalogoToCotizacionItem(inferred, plantillas)]);
      else setCotizItems([]);
    }
    setCotizNotas([
      `Origen lead: ${lead.nombre}`,
      lead.empresa ? `Empresa: ${lead.empresa}` : "",
      lead.tel ? `Tel: ${lead.tel}` : "",
      lead.email ? `Correo: ${lead.email}` : "",
      lead.equipo ? `Equipo/producto: ${lead.equipo}` : "",
      lead.servicio ? `Servicio solicitado: ${serviceLabel(lead.servicio)}` : "",
    ].filter(Boolean).join(" | "));
    if (!match) notify("Cliente no encontrado — selecciona o crea uno antes de emitir");
    goTo("cotizaciones");
  }

  async function handleSaveLead(form: LeadForm, items: CotizacionItemForm[] = []) {
    const newLead = await api.createLead(form);
    const lead: Lead = newLead ?? {
      id: String(Date.now()),
      ...form,
      canal: form.canal as LeadChannel,
      estado: "no-gestionado",
      tiempo: "Justo ahora",
    };
    setLeads((prev) => [lead, ...prev]);
    if (items.length > 0) {
      setLeadPreItems((prev) => ({ ...prev, [lead.id]: items }));
    }
    api.logActivity("nuevo_lead", "Nuevo lead registrado", `${form.nombre} (${form.empresa}) — ${form.servicio}`, lead.id, "lead");

    // Auto-create client if not yet registered (leads come with client data from Google Ads)
    const rutNorm = normalizeRut(form.rut ?? "");
    const clienteExiste = clientes.some((c) =>
      (rutNorm.length > 4 && normalizeRut(c.rut) === rutNorm) ||
      c.nombre.toLowerCase().trim() === (form.empresa || form.nombre).toLowerCase().trim()
    );
    if (!clienteExiste && (form.rut || form.empresa)) {
      const clienteForm: ClienteForm = {
        rut: form.rut ?? "",
        nombre: form.empresa || form.nombre,
        contacto: form.nombre,
        tel: form.tel,
        correo: form.email,
        rubro: "Médico",
        estado: "activo",
        direccion: "",
        ciudad: "",
        comuna: "",
      };
      const newCliente = await api.createCliente(clienteForm);
      const cliente: Cliente = newCliente ?? {
        id: `C-${String(Date.now())}`,
        rut: clienteForm.rut,
        nombre: clienteForm.nombre,
        contacto: clienteForm.contacto,
        correo: clienteForm.correo,
        rubro: clienteForm.rubro,
        estado: clienteForm.estado,
        telefono: clienteForm.tel,
        direccion: "",
        ciudad: "",
        comuna: "",
      };
      setClientes((prev) => [cliente, ...prev]);
      notify("Lead registrado y cliente creado automáticamente");
    } else {
      notify("Lead agregado correctamente");
    }
    closeModal();
  }

  async function handleUpdateLead(id: string, form: LeadForm, items: CotizacionItemForm[] = []) {
    const updated = await api.saveLead(id, form);
    if (updated) {
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } else {
      setLeads((prev) => prev.map((l) =>
        l.id === id ? { ...l, ...form, canal: form.canal as LeadChannel } : l
      ));
    }
    setLeadPreItems((prev) => ({ ...prev, [id]: items }));
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
      estado: form.estado || "activo",
      telefono: form.tel,
      direccion: form.direccion,
      ciudad: form.ciudad,
      comuna: form.comuna,
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
        c.id === id ? { ...c, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, rubro: form.rubro, estado: form.estado, telefono: form.tel, direccion: form.direccion, ciudad: form.ciudad, comuna: form.comuna } : c
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
    if (!cotizClienteId) { notify("Selecciona un cliente"); return; }
    if (cotizItems.length === 0) { notify("Agrega al menos un ítem"); return; }
    const result = await api.createCotizacionMulti({
      cliente_id: cotizClienteId,
      notas_cliente: cotizNotas,
      forma_pago: cotizFormaPago,
      validez_dias: 30,
      items: cotizItems,
    });
    const clienteObj = clientes.find((c) => c.id === cotizClienteId);
    const total = result?.total_con_iva ?? cotizItems.reduce((s, it) => {
      const sub = Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100));
      return s + sub;
    }, 0);
    const cot: Cotizacion = {
      id: result?.id ?? String(Date.now()),
      nro: result?.numero ?? "",
      cliente: clienteObj?.id ?? cotizClienteId,
      monto: total,
      estado: "Pendiente",
      fecha: new Date().toISOString().slice(0, 10),
      pdfUrl: result?.pdf_url ?? undefined,
    };
    setCotizaciones((prev) => [cot, ...prev]);
    api.logActivity(
      "cotizacion_emitida",
      `Cotización ${cot.nro} emitida`,
      `${clienteObj?.nombre ?? cotizClienteId} — ${money(total)} CLP`,
      cot.id,
      "cotizacion",
    );
    notify(`Cotización ${cot.nro} emitida`);
    setCotizItems([]);
    setCotizNotas("");
    // open print window with the latest emitted cotizacion
    if (result) handlePrintDetalle(result);
  }

  function handlePrintDetalle(det: import("@/lib/api").CotizacionDetalle) {
    const clienteObj = clientes.find((c) => c.id === det.cliente_id);
    const fechaStr = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
    const rowsHtml = det.items.map((it, i) => {
      const disc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${it.descripcion}${disc}</td>
        <td>${it.cantidad}</td>
        <td>${money(it.precio_unitario)}</td>
        <td><strong>${money(it.subtotal)}</strong></td>
      </tr>
      ${it.descripcion_larga ? `<tr><td></td><td colspan="4" style="color:#64748b;font-size:12px;white-space:pre-line;padding:4px 12px 12px">${it.descripcion_larga}</td></tr>` : ""}`;
    }).join("");
    const win = window.open("", "_blank", "width=920,height=750");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización ${det.numero}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0f172a}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#0f172a}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .client-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:16px}
      .client-grid dt{color:#64748b;font-size:12px}
      .client-grid dd{font-size:13px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#0f172a;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #0f172a}
      .conditions{font-size:12px;color:#475569;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .conditions strong{display:block;margin-bottom:4px}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
    </style></head><body>
    <header>
      <div><img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" style="filter:brightness(0)"/><p style="margin-top:4px;color:#64748b;font-size:12px">Reparación y mantención de equipos médicos</p></div>
      <div class="right"><strong>${det.numero}</strong><span>${fechaStr}</span><br/><span style="color:#64748b">biomeditech.cl</span></div>
    </header>
    <h3>Datos del cliente</h3>
    <dl class="client-grid">
      <dt>Empresa</dt><dd>${clienteObj?.nombre ?? det.cliente_id}</dd>
      <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
      <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
      <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
      <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
    </dl>
    <h3>Detalle del servicio</h3>
    <table>
      <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unitario</th><th>Subtotal</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <table class="totals">
      <tr><td>Neto</td><td>${money(det.subtotal_neto)} CLP</td></tr>
      <tr><td>IVA (19%)</td><td>${money(det.iva)} CLP</td></tr>
      <tr><td>Total</td><td>${money(det.total_con_iva)} CLP</td></tr>
    </table>
    <div class="conditions">
      <strong>Condiciones</strong>
      Forma de pago: ${det.forma_pago} · Validez: ${det.validez_dias} días · Diagnóstico incluido en servicio aceptado
    </div>
    ${det.notas_cliente ? `<p style="font-size:12px;color:#475569;margin-bottom:12px"><em>${det.notas_cliente}</em></p>` : ""}
    <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por ${det.validez_dias} días desde emisión</footer>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function handlePrintQuote() {
    if (cotizItems.length === 0) { notify("Agrega al menos un ítem antes de descargar"); return; }
    const clienteObj = clientes.find((c) => c.id === cotizClienteId);
    const fechaStr = new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
    const subtotal = cotizItems.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const rowsHtml = cotizItems.map((it, i) => {
      const sub = Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100));
      const disc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${it.descripcion}${disc}</td>
        <td>${it.cantidad}</td>
        <td>${money(it.precio_unitario)}</td>
        <td><strong>${money(sub)}</strong></td>
      </tr>
      ${it.descripcion_larga ? `<tr><td></td><td colspan="4" style="color:#64748b;font-size:12px;white-space:pre-line;padding:4px 12px 12px">${it.descripcion_larga}</td></tr>` : ""}`;
    }).join("");
    const win = window.open("", "_blank", "width=920,height=750");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización BORRADOR</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0f172a}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#0f172a}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .client-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:16px}
      .client-grid dt{color:#64748b;font-size:12px}
      .client-grid dd{font-size:13px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#0f172a;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #0f172a}
      .conditions{font-size:12px;color:#475569;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .conditions strong{display:block;margin-bottom:4px}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
      .draft-badge{display:inline-block;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.06em;margin-bottom:4px}
    </style></head><body>
    <header>
      <div><img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" style="filter:brightness(0)"/><p style="margin-top:4px;color:#64748b;font-size:12px">Reparación y mantención de equipos médicos</p></div>
      <div class="right"><span class="draft-badge">BORRADOR</span><strong style="font-size:16px;color:#64748b">Sin número</strong><span>${fechaStr}</span><br/><span style="color:#64748b">biomeditech.cl</span></div>
    </header>
    <h3>Datos del cliente</h3>
    <dl class="client-grid">
      <dt>Empresa</dt><dd>${clienteObj?.nombre ?? "—"}</dd>
      <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
      <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
      <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
      <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
    </dl>
    <h3>Detalle del servicio</h3>
    <table>
      <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unitario</th><th>Subtotal</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <table class="totals">
      <tr><td>Neto</td><td>${money(subtotal)} CLP</td></tr>
      <tr><td>IVA (19%)</td><td>${money(iva)} CLP</td></tr>
      <tr><td>Total</td><td>${money(total)} CLP</td></tr>
    </table>
    <div class="conditions">
      <strong>Condiciones</strong>
      Forma de pago: ${cotizFormaPago} · Validez: 30 días · Diagnóstico incluido en servicio aceptado
    </div>
    ${cotizNotas ? `<p style="font-size:12px;color:#475569;margin-bottom:12px"><em>${cotizNotas}</em></p>` : ""}
    <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por 30 días desde emisión</footer>
    </body></html>`);
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
                    Todos <span>{leads.length}</span>
                  </button>
                  <button className={leadFilter === "gestionado" ? "selected" : ""} onClick={() => setLeadFilter("gestionado")}>
                    Gestionados <span>{leads.filter((l) => l.estado === "gestionado").length}</span>
                  </button>
                  <button className={leadFilter === "no-gestionado" ? "selected" : ""} onClick={() => setLeadFilter("no-gestionado")}>
                    Sin gestionar <span>{noGestionados.length}</span>
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                  <div className="segmented">
                    <button className={leadView === "iconos" ? "selected" : ""} onClick={() => setLeadView("iconos")} title="Vista tarjetas">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor"/></svg>
                    </button>
                    <button className={leadView === "lista" ? "selected" : ""} onClick={() => setLeadView("lista")} title="Vista lista">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2" width="13" height="2" rx="1" fill="currentColor"/><rect x="1" y="6.5" width="13" height="2" rx="1" fill="currentColor"/><rect x="1" y="11" width="13" height="2" rx="1" fill="currentColor"/></svg>
                    </button>
                    <button className={leadView === "detalle" ? "selected" : ""} onClick={() => setLeadView("detalle")} title="Vista detalle">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="13" height="4" rx="1" fill="currentColor"/><rect x="1" y="7" width="13" height="4" rx="1" fill="currentColor"/></svg>
                    </button>
                  </div>
                  <button className="primary" onClick={() => setModal("lead")}>
                    <UserPlus size={16} />Agregar lead
                  </button>
                </div>
              </div>

              {leadView === "iconos" && (
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
                        <div><Wrench size={14} />{serviceLabel(lead.servicio)}{lead.equipo ? ` / ${lead.equipo}` : ""}</div>
                        <div><Clock3 size={14} />{lead.tiempo}</div>
                      </dl>
                      <div className="card-actions">
                        <button className="primary small" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} />Cotizar</button>
        <button className="ghost small" onClick={() => handleToggleGestionar(lead.id)}><Check size={15} />{lead.estado === "gestionado" ? "Desmarcar" : "Gestionar"}</button>
                        <button className="ghost small card-icon-btn" aria-label="Editar" onClick={() => handleEditLead(lead)}><Edit3 size={14} /></button>
                        <button className="ghost small card-icon-btn danger" aria-label="Eliminar" onClick={() => handleDeleteLead(lead.id)}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {leadView === "lista" && (
                <div className="table-card">
                  <table>
                    <thead>
                      <tr><th>Nombre</th><th>Empresa</th><th>Canal</th><th>Servicio</th><th>Estado</th><th>Tiempo</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {visibleLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td><strong>{lead.nombre}</strong></td>
                          <td>{lead.empresa}</td>
                          <td><span className={`tag ${lead.canal === "wsp" ? "green" : "navy"}`}>{lead.canal === "wsp" ? "WhatsApp" : "Correo"}</span></td>
                          <td>{serviceLabel(lead.servicio)}</td>
                          <td><span className={`tag ${lead.estado === "gestionado" ? "green" : "amber"}`}>{lead.estado === "gestionado" ? "Gestionado" : "Sin gestionar"}</span></td>
                          <td style={{ color: "#64748b", fontSize: 12 }}>{lead.tiempo}</td>
                          <td>
                            <div className="row-actions">
                              <button aria-label="Cotizar" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} /></button>
                              <button aria-label="Gestionar" onClick={() => handleToggleGestionar(lead.id)}><Check size={15} /></button>
                              <button aria-label="Editar" onClick={() => handleEditLead(lead)}><Edit3 size={15} /></button>
                              <button aria-label="Eliminar" className="danger" onClick={() => handleDeleteLead(lead.id)}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {leadView === "detalle" && (
                <div className="stack" style={{ gap: 10 }}>
                  {visibleLeads.map((lead) => (
                    <div key={lead.id} className={`panel lead-detalle ${lead.estado}`} style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <strong style={{ fontSize: 15 }}>{lead.nombre}</strong>
                            <span style={{ color: "#64748b", fontSize: 13 }}>— {lead.empresa}</span>
                            <span className={`tag ${lead.canal === "wsp" ? "green" : "navy"}`} style={{ fontSize: 11 }}>{lead.canal === "wsp" ? "WhatsApp" : "Correo"}</span>
                            <span className={`tag ${lead.estado === "gestionado" ? "green" : "amber"}`} style={{ fontSize: 11 }}>{lead.estado === "gestionado" ? "Gestionado" : "Sin gestionar"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
                            <span><MessageCircle size={12} style={{ display: "inline", marginRight: 4 }} />{lead.tel}</span>
                            <span><Mail size={12} style={{ display: "inline", marginRight: 4 }} />{lead.email}</span>
                            <span><Wrench size={12} style={{ display: "inline", marginRight: 4 }} />{serviceLabel(lead.servicio)}{lead.equipo ? ` — ${lead.equipo}` : ""}</span>
                            <span><Clock3 size={12} style={{ display: "inline", marginRight: 4 }} />{lead.tiempo}</span>
                          </div>
                        </div>
                        <div className="card-actions" style={{ flexShrink: 0 }}>
                          <button className="primary small" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} />Cotizar</button>
                          <button className="ghost small" onClick={() => handleToggleGestionar(lead.id)}><Check size={15} />{lead.estado === "gestionado" ? "Desmarcar" : "Gestionar"}</button>
                          <button className="ghost small card-icon-btn" aria-label="Editar" onClick={() => handleEditLead(lead)}><Edit3 size={14} /></button>
                          <button className="ghost small card-icon-btn danger" aria-label="Eliminar" onClick={() => handleDeleteLead(lead.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {active === "clientes" && (
            <DataModule
              title="Clientes"
              search={clientQuery}
              setSearch={setClientQuery}
              searchPlaceholder="Buscar clientes..."
              onAdd={() => setModal("cliente")}
              filterEl={
                <select
                  value={clientSearchField}
                  onChange={(e) => setClientSearchField(e.target.value as typeof clientSearchField)}
                  style={{ minHeight: 38, fontSize: 13, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }}
                >
                  <option value="todos">Todos los campos</option>
                  <option value="rut">RUT</option>
                  <option value="nombre">Empresa</option>
                  <option value="contacto">Contacto</option>
                  <option value="correo">Correo</option>
                </select>
              }
            >
              <table>
                <thead>
                  <tr><th>RUT</th><th>Nombre / Empresa</th><th>Contacto</th><th>Teléfono</th><th>Ciudad</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{client.rut}</td>
                      <td><strong>{client.nombre}</strong><small>{client.correo}</small></td>
                      <td>{client.contacto}</td>
                      <td style={{ fontSize: 12, color: "#64748b" }}>{client.telefono || "—"}</td>
                      <td style={{ fontSize: 12 }}>{client.ciudad || (client.comuna ? client.comuna : "—")}</td>
                      <td><span className={`tag ${isActivo(client.estado) ? "green" : "amber"}`}>{client.estado}</span></td>
                      <td>
                        <RowActions
                          notify={notify}
                          quote={() => handleCotizarCliente(client)}
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
            <CatalogoModule
              catalogo={catalogo}
              setCatalogo={setCatalogo}
              productos={productos}
              filteredProducts={filteredProducts}
              productQuery={productQuery}
              setProductQuery={setProductQuery}
              onEdit={(p) => handleEditProducto(p)}
              onDelete={async (id) => {
                setProductos((prev) => prev.filter((p) => p.id !== id));
                await api.deleteProducto(id);
                notify("Producto eliminado");
              }}
              onAdd={() => setModal("producto")}
              notify={notify}
            />
          )}

          {(false as boolean) && active === "productos" && (
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
                  <CotizadorForm
                    clientes={clientes}
                    catalogo={catalogo}
                    plantillas={plantillas}
                    clienteId={cotizClienteId}
                    setClienteId={setCotizClienteId}
                    notas={cotizNotas}
                    setNotas={setCotizNotas}
                    formaPago={cotizFormaPago}
                    setFormaPago={setCotizFormaPago}
                    items={cotizItems}
                    setItems={setCotizItems}
                    onEmitir={handleEmitirCotizacion}
                    onDescargarPDF={handlePrintQuote}
                  />
                </div>
                <ProcessTimeline />
              </div>

              <div className="stack">
                {noGestionados.length > 0 && (
                <div className="panel">
                  <div className="panel-head">
                    <div className="panel-title"><Activity size={18} />Leads por cotizar</div>
                    <span className="tag amber">{noGestionados.length} pendiente{noGestionados.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                    {noGestionados.slice(0, 6).map((lead) => (
                      <div key={lead.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2340", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.empresa || lead.nombre}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {serviceLabel(lead.servicio)}{lead.equipo ? ` · ${lead.equipo}` : ""}
                          </div>
                        </div>
                        <button className="primary small" style={{ flexShrink: 0 }} onClick={() => handleCotizarLead(lead)}>
                          <ClipboardList size={13} />Cotizar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="preview-label-row">
                  <span className="preview-label">Vista previa</span>
                </div>
                <CotizadorPreview
                  clientes={clientes}
                  clienteId={cotizClienteId}
                  items={cotizItems}
                  notas={cotizNotas}
                  formaPago={cotizFormaPago}
                  fecha={fecha}
                />
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
        catalogo={catalogo}
        setCatalogo={setCatalogo}
        plantillas={plantillas}
        editingLead={editingLead}
        editingCliente={editingCliente}
        editingProducto={editingProducto}
        clientePrefill={clientePrefill}
        leadPreItems={leadPreItems}
        setLeadPreItems={setLeadPreItems}
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

function DataModule({ children, search, setSearch, searchPlaceholder, onAdd, hideHeader, filterEl }: {
  children: React.ReactNode;
  search: string;
  setSearch: (value: string) => void;
  searchPlaceholder: string;
  onAdd: () => void;
  title: string;
  hideHeader?: boolean;
  filterEl?: React.ReactNode;
}) {
  return (
    <section className="stack">
      {!hideHeader && (
        <div className="module-toolbar">
          <label className="search-box">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
          </label>
          {filterEl}
          <button className="primary" onClick={onAdd}><Plus size={16} />Agregar</button>
        </div>
      )}
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

const CAT_LABELS: Record<string, string> = {
  VS: "Visita técnica",
  MP: "Mantención preventiva",
  MC: "Mantención correctiva",
  BS: "Bloque servicio",
  EV: "Evaluación diagnóstica",
  RS: "Repuesto / Insumo",
};

function serviceLabel(value: string): string {
  return CAT_LABELS[value] ? `${value} - ${CAT_LABELS[value]}` : value;
}

function catalogoDescription(item: CatalogoItem): string {
  return `${item.servicio} - ${item.equipo}`.trim().replace(/\s*-\s*$/, "");
}

function catalogoToCotizacionItem(item: CatalogoItem, plantillas: Plantilla[]): CotizacionItemForm {
  const plantilla = plantillas.find((p) => p.codigo === item.texto_base_key);
  return {
    producto_id: item.id,
    codigo: item.codigo,
    descripcion: catalogoDescription(item),
    descripcion_larga: plantilla?.descripcion_larga ?? "",
    tipo_servicio: item.texto_base_key || item.categoria,
    precio_unitario: item.precio_neto,
    cantidad: 1,
    descuento_pct: 0,
  };
}

function CotizadorForm({
  clientes, catalogo, plantillas,
  clienteId, setClienteId,
  notas, setNotas,
  formaPago, setFormaPago,
  items, setItems,
  onEmitir, onDescargarPDF,
}: {
  clientes: Cliente[];
  catalogo: CatalogoItem[];
  plantillas: Plantilla[];
  clienteId: string;
  setClienteId: (v: string) => void;
  notas: string;
  setNotas: (v: string) => void;
  formaPago: string;
  setFormaPago: (v: string) => void;
  items: CotizacionItemForm[];
  setItems: React.Dispatch<React.SetStateAction<CotizacionItemForm[]>>;
  onEmitir: () => void;
  onDescargarPDF: () => void;
}) {
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = catalogo.filter((c) => {
    if (catFilter && c.categoria !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.codigo.toLowerCase().includes(q) || c.equipo.toLowerCase().includes(q) || c.servicio.toLowerCase().includes(q);
    }
    return true;
  });

  function addItem(cat: CatalogoItem) {
    const plantilla = plantillas.find((p) => p.codigo === cat.texto_base_key);
    setItems((prev) => [
      ...prev,
      {
        producto_id: cat.id,
        codigo: cat.codigo,
        descripcion: `${cat.servicio} — ${cat.equipo}`.trim().replace(/\s*—\s*$/, ""),
        descripcion_larga: plantilla?.descripcion_larga ?? "",
        tipo_servicio: cat.texto_base_key,
        precio_unitario: cat.precio_neto,
        cantidad: 1,
        descuento_pct: 0,
      },
    ]);
  }

  function updateItem(idx: number, patch: Partial<CotizacionItemForm>) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);

  return (
    <div className="form-stack">
      <label>
        Cliente *
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">— Seleccionar cliente —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>

      <label>Forma de pago
        <input value={formaPago} onChange={(e) => setFormaPago(e.target.value)} maxLength={80} />
      </label>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
        <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Agregar ítems del catálogo</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select style={{ flex: "0 0 160px" }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input placeholder="Buscar equipo o código..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={{ maxHeight: 180, overflowY: "auto", fontSize: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Código</th>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Descripción</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Precio neto</th>
                <th style={{ padding: "4px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "4px 8px", color: "#64748b" }}>{c.codigo}</td>
                  <td style={{ padding: "4px 8px" }}>{c.equipo || c.servicio}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>{money(c.precio_neto)}</td>
                  <td style={{ padding: "4px 8px" }}>
                    <button
                      style={{ padding: "2px 8px", fontSize: 11, background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                      onClick={() => addItem(c)}
                    >+ Agregar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} style={{ padding: 8, color: "#94a3b8" }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, overflowX: "auto" }}>
          <div style={{ minWidth: 360, display: "grid", gridTemplateColumns: "1fr 48px 90px 58px 24px", gap: "4px 6px", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>DESCRIPCIÓN</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textAlign: "center" }}>CANT.</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>PRECIO NETO</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>DSCTO%</span>
            <span />
          </div>
          {items.map((it, idx) => (
            <div key={idx} style={{ minWidth: 360, display: "grid", gridTemplateColumns: "1fr 48px 90px 58px 24px", gap: "4px 6px", alignItems: "center", marginBottom: 6, fontSize: 12 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingTop: 2 }} title={it.descripcion}>{it.descripcion}</span>
              <input type="number" min={1} value={it.cantidad} onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })} style={{ textAlign: "center", padding: "4px 4px", minHeight: 30 }} />
              <input type="number" min={0} value={it.precio_unitario} onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })} style={{ padding: "4px 6px", minHeight: 30 }} />
              <input type="number" min={0} max={100} value={it.descuento_pct} onChange={(e) => updateItem(idx, { descuento_pct: Number(e.target.value) })} style={{ textAlign: "center", padding: "4px 4px", minHeight: 30 }} />
              <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "flex", alignItems: "center" }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            Neto: {money(subtotal)} · IVA: {money(Math.round(subtotal * 0.19))} · <span style={{ fontSize: 15 }}>Total: {money(subtotal + Math.round(subtotal * 0.19))} CLP</span>
          </div>
        </div>
      )}

      <label>Notas / Observaciones<textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} /></label>

      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
        <button className="ghost" style={{ flex: "1 1 80px" }} onClick={() => setItems([])}>
          <X size={15} />Limpiar
        </button>
        <button className="ghost" style={{ flex: "2 1 120px" }} onClick={onDescargarPDF} disabled={items.length === 0}>
          <Printer size={16} />Descargar PDF
        </button>
        <button className="primary" style={{ flex: "2 1 140px" }} onClick={onEmitir} disabled={!clienteId || items.length === 0}>
          <Send size={16} />Emitir cotización
        </button>
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

function CotizadorPreview({
  clientes, clienteId, items, notas, formaPago, fecha,
}: {
  clientes: Cliente[];
  clienteId: string;
  items: CotizacionItemForm[];
  notas: string;
  formaPago: string;
  fecha: string;
}) {
  const clienteObj = clientes.find((c) => c.id === clienteId);
  const subtotal = items.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return (
    <article className="quote-preview">
      <div id="quote-preview-content">
        <header>
          <div>
            <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" />
            <p>Reparación y mantención de equipos médicos</p>
          </div>
          <div><strong>BORRADOR</strong><span>{fecha}</span><span>biomeditech.cl</span></div>
        </header>
        <section>
          <h3>Datos del cliente</h3>
          <dl className="quote-data">
            <dt>Empresa</dt><dd>{clienteObj?.nombre ?? "—"}</dd>
            <dt>RUT</dt><dd>{clienteObj?.rut ?? "—"}</dd>
            <dt>Contacto</dt><dd>{clienteObj?.contacto ?? "—"}</dd>
            <dt>Teléfono</dt><dd>{clienteObj?.telefono || "—"}</dd>
          </dl>
          <h3>Detalle del servicio</h3>
          <table className="quote-table">
            <thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8", padding: "16px" }}>Agrega ítems desde el catálogo</td></tr>
              )}
              {items.map((it, i) => {
                const sub = Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100));
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.descripcion}{it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : ""}</td>
                    <td>{it.cantidad}</td>
                    <td>{money(it.precio_unitario)}</td>
                    <td><strong>{money(sub)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length > 0 && (
            <div className="total-bar">
              <span>Neto {money(subtotal)} · IVA {money(iva)}</span>
              <strong>Total {money(total)} CLP</strong>
            </div>
          )}
          {notas ? <p className="quote-note">{notas}</p> : null}
          <h3>Condiciones</h3>
          <dl className="quote-data">
            <dt>Forma de pago</dt><dd>{formaPago}</dd>
            <dt>Validez</dt><dd>30 días desde emisión</dd>
            <dt>Diagnóstico</dt><dd>Incluido si acepta el presupuesto</dd>
          </dl>
        </section>
        <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por 30 días</footer>
      </div>
    </article>
  );
}

function CatalogoModule({
  catalogo, setCatalogo, productos, filteredProducts, productQuery, setProductQuery,
  onEdit, onDelete, onAdd, notify,
}: {
  catalogo: CatalogoItem[];
  setCatalogo: React.Dispatch<React.SetStateAction<CatalogoItem[]>>;
  productos: Producto[];
  filteredProducts: Producto[];
  productQuery: string;
  setProductQuery: (v: string) => void;
  onEdit: (p: Producto) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  notify: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"catalogo" | "personalizados">("catalogo");
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingCat, setEditingCat] = useState<CatalogoItem | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState<CatalogoItemForm>(CATALOGO_FORM_INIT);
  const [saving, setSaving] = useState(false);
  const [catPrices, setCatPrices] = useState<Record<string, string>>({});

  const catLabels: Record<string, string> = {
    VS: "Visita técnica", MP: "Mant. preventiva", MC: "Mant. correctiva",
    BS: "Bloque servicio", EV: "Evaluación diag.", RS: "Repuesto / Insumo",
  };

  const filteredCat = catalogo.filter((c) => {
    if (catFilter && c.categoria !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.codigo.toLowerCase().includes(q) || c.equipo.toLowerCase().includes(q) || c.servicio.toLowerCase().includes(q);
    }
    return true;
  });

  function nextCodeForCat(cat: string): string {
    const nums = catalogo
      .filter((c) => c.categoria === cat && /^[A-Z]+-\d+$/.test(c.codigo))
      .map((c) => parseInt(c.codigo.split("-")[1], 10))
      .filter((n) => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${cat}-${String(next).padStart(3, "0")}`;
  }

  function openAdd() {
    setEditingCat(null);
    setCatForm({ ...CATALOGO_FORM_INIT, categoria: "", codigo: "" });
    setCatPrices({});
    setCatModal(true);
  }

  function openEdit(item: CatalogoItem) {
    setEditingCat(item);
    setCatForm({ codigo: item.codigo, categoria: item.categoria, servicio: item.servicio, equipo: item.equipo, unidad: item.unidad, precio_neto: String(item.precio_neto), texto_base_key: item.texto_base_key, descripcion_larga: "" });
    setCatModal(true);
  }

  async function handleDeleteCat(item: CatalogoItem) {
    if (!window.confirm(`¿Eliminar "${item.equipo || item.servicio}"?`)) return;
    setCatalogo((prev) => prev.filter((c) => c.id !== item.id));
    await api.deleteCatalogoItem(item.id);
    notify("Ítem eliminado del catálogo");
  }

  async function handleSaveCat() {
    if (!catForm.equipo.trim()) { notify("Ingresa el nombre del equipo o servicio"); return; }
    setSaving(true);
    if (editingCat) {
      const updated = await api.updateCatalogoItem(editingCat.id, catForm);
      if (updated) setCatalogo((prev) => prev.map((c) => c.id === editingCat.id ? updated : c));
      notify("Ítem actualizado");
    } else {
      const selectedCats = Object.keys(catPrices);
      if (selectedCats.length === 0) { notify("Selecciona al menos una categoría"); setSaving(false); return; }
      let count = 0;
      for (const cat of selectedCats) {
        const itemForm = {
          ...catForm,
          categoria: cat,
          codigo: nextCodeForCat(cat),
          precio_neto: catPrices[cat] || "0",
          servicio: catLabels[cat] ?? cat,
          texto_base_key: cat,
        };
        const created = await api.createCatalogoItem(itemForm);
        if (created) { setCatalogo((prev) => [...prev, created]); count++; }
      }
      notify(`${count} ítem${count !== 1 ? "s" : ""} agregado${count !== 1 ? "s" : ""} al catálogo`);
    }
    setSaving(false);
    setCatModal(false);
  }

  return (
    <section className="stack">
      <div className="module-toolbar">
        <div className="segmented">
          <button className={tab === "catalogo" ? "selected" : ""} onClick={() => setTab("catalogo")}>
            Catálogo Biomeditech <span>{catalogo.length}</span>
          </button>
          <button className={tab === "personalizados" ? "selected" : ""} onClick={() => setTab("personalizados")}>
            Personalizados <span>{productos.length}</span>
          </button>
        </div>
        {tab === "catalogo" && (
          <button className="primary" onClick={openAdd}><Plus size={16} />Agregar ítem</button>
        )}
        {tab === "personalizados" && (
          <button className="primary" onClick={onAdd}><Plus size={16} />Agregar producto</button>
        )}
      </div>

      {catModal && (
        <div className="modal-backdrop" onClick={() => setCatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingCat ? "Editar ítem catálogo" : "Nuevo ítem catálogo"}</h2>
              <button onClick={() => setCatModal(false)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            <div className="modal-grid">
              {editingCat ? (
                <>
                  <label>
                    Categoría
                    <select value={catForm.categoria} onChange={(e) => setCatForm((f) => ({ ...f, categoria: e.target.value }))}>
                      {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </label>
                  <label>Código<input value={catForm.codigo} onChange={(e) => setCatForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="MP-001" maxLength={30} /></label>
                  <label>Precio neto (CLP)<input type="number" min={0} value={catForm.precio_neto} onChange={(e) => setCatForm((f) => ({ ...f, precio_neto: e.target.value }))} placeholder="85000" /></label>
                  <label>Unidad<input value={catForm.unidad} onChange={(e) => setCatForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="Servicio" maxLength={40} /></label>
                </>
              ) : (
                <label className="wide">
                  Categorías — selecciona una o más *
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                    {Object.entries(catLabels).map(([k, v]) => (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={k in catPrices}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCatPrices((prev) => ({ ...prev, [k]: "" }));
                            } else {
                              setCatPrices((prev) => { const n = { ...prev }; delete n[k]; return n; });
                            }
                          }}
                          style={{ minHeight: 0, height: 15, width: 15, padding: 0, margin: 0 }}
                        />
                        {k} — {v}
                      </label>
                    ))}
                  </div>
                </label>
              )}
              <label className="wide">Equipo / descripción<input value={catForm.equipo} onChange={(e) => setCatForm((f) => ({ ...f, equipo: e.target.value }))} placeholder="Monitor de signos vitales" maxLength={120} /></label>
              {!editingCat && (
                <label>Unidad <span style={{ fontWeight: 400, color: "#94a3b8" }}>(aplica a todas)</span>
                  <input value={catForm.unidad} onChange={(e) => setCatForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="Servicio" maxLength={40} />
                </label>
              )}
              {!editingCat && Object.keys(catPrices).map((cat) => (
                <label key={cat}>
                  Precio {cat} — {catLabels[cat]} (CLP)
                  <input type="number" min={0} value={catPrices[cat]} onChange={(e) => setCatPrices((prev) => ({ ...prev, [cat]: e.target.value }))} placeholder="85000" />
                </label>
              ))}
              <label className="wide">Descripción larga<textarea rows={3} value={catForm.descripcion_larga} onChange={(e) => setCatForm((f) => ({ ...f, descripcion_larga: e.target.value }))} maxLength={800} /></label>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setCatModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleSaveCat} disabled={saving}>{saving ? "Guardando..." : editingCat ? "Actualizar" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {tab === "catalogo" && (
        <div className="panel table-card">
          <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
            <select style={{ width: 180 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">Todas las categorías</option>
              {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Buscar código, equipo o servicio..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
          </div>
          <table>
            <thead>
              <tr><th>Código</th><th>Categoría</th><th>Equipo / Servicio</th><th>Unidad</th><th>Precio neto</th><th>Plantilla texto</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filteredCat.slice(0, 100).map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{c.codigo}</td>
                  <td><span className="tag navy">{catLabels[c.categoria] ?? c.categoria}</span></td>
                  <td><strong>{c.equipo}</strong>{c.servicio ? <small style={{ display: "block", color: "#64748b" }}>{c.servicio}</small> : null}</td>
                  <td style={{ color: "#64748b", fontSize: 12 }}>{c.unidad}</td>
                  <td style={{ fontWeight: 600 }}>{money(c.precio_neto)} CLP</td>
                  <td style={{ color: "#64748b", fontSize: 11 }}>{c.texto_base_key}</td>
                  <td>
                    <div className="row-actions">
                      <button aria-label="Editar" onClick={() => openEdit(c)}><Edit3 size={15} /></button>
                      <button aria-label="Eliminar" className="danger" onClick={() => handleDeleteCat(c)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCat.length > 100 && <p style={{ padding: "8px 16px", fontSize: 12, color: "#94a3b8" }}>Mostrando 100 de {filteredCat.length} ítems. Usa el buscador para filtrar.</p>}
        </div>
      )}

      {tab === "personalizados" && (
        <DataModule
          title=""
          search={productQuery}
          setSearch={setProductQuery}
          searchPlaceholder="Buscar por ID, producto, categoría o precio..."
          onAdd={onAdd}
          hideHeader
        >
          <table>
            <thead>
              <tr><th>ID</th><th>Producto</th><th>Categoría</th><th>Diagnóstico</th><th>Reparación</th><th>Mantención</th><th>Instalación</th><th>Acciones</th></tr>
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
                      onEdit={() => onEdit(product)}
                      onDelete={() => onDelete(product.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataModule>
      )}
    </section>
  );
}

function HistoryTable({ cotizaciones, clientes }: { cotizaciones: Cotizacion[]; clientes: Cliente[] }) {
  const [clienteFilter, setClienteFilter] = useState("");

  function getClienteName(clienteId: string) {
    const found = clientes.find((c) => c.id === clienteId || c.nombre === clienteId);
    return found?.nombre ?? clienteId;
  }

  const visible = cotizaciones.filter((cot) => {
    if (!clienteFilter) return true;
    const nombre = getClienteName(cot.cliente).toLowerCase();
    return nombre.includes(clienteFilter.toLowerCase());
  }).slice(0, 15);

  return (
    <div className="panel table-card compact">
      <div className="panel-title"><FileText size={18} />Historial de cotizaciones</div>
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 8, alignItems: "center" }}>
        <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
        <input
          placeholder="Filtrar por cliente..."
          value={clienteFilter}
          onChange={(e) => setClienteFilter(e.target.value)}
          style={{ flex: 1, minHeight: 32, fontSize: 12 }}
        />
        {clienteFilter && (
          <button onClick={() => setClienteFilter("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
            <X size={14} />
          </button>
        )}
      </div>
      <table>
        <thead><tr><th>N° Cotización</th><th>Cliente</th><th>Monto total</th><th>Estado</th><th>Fecha</th><th>PDF</th></tr></thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Sin resultados</td></tr>
          )}
          {visible.map((cot) => (
            <tr key={cot.id}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{cot.nro}</td>
              <td>{getClienteName(cot.cliente)}</td>
              <td>{money(cot.monto)} CLP</td>
              <td>
                <span className={`tag ${cot.estado === "Aprobada" ? "green" : cot.estado === "En revisión" ? "navy" : "amber"}`}>
                  {cot.estado}
                </span>
              </td>
              <td style={{ color: "#64748b", fontSize: 12 }}>{cot.fecha}</td>
              <td>
                {cot.pdfUrl
                  ? <a href={cot.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0f2340", fontWeight: 600, textDecoration: "none" }}>
                      <FileText size={13} />Ver PDF
                    </a>
                  : <span style={{ color: "#cbd5e0", fontSize: 12 }}>—</span>
                }
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
  kind, close, notify, goTo, clientes, catalogo, setCatalogo, plantillas,
  editingLead, editingCliente, editingProducto,
  clientePrefill, leadPreItems, setLeadPreItems,
  onSaveLead, onSaveCliente, onSaveProducto,
  onUpdateLead, onUpdateCliente, onUpdateProducto,
}: {
  kind: "lead" | "cliente" | "producto" | "cotizacion" | null;
  close: () => void;
  notify: (message: string) => void;
  goTo: (id: ModuleId) => void;
  clientes: Cliente[];
  catalogo: CatalogoItem[];
  setCatalogo: React.Dispatch<React.SetStateAction<CatalogoItem[]>>;
  plantillas: Plantilla[];
  editingLead: Lead | null;
  editingCliente: Cliente | null;
  editingProducto: Producto | null;
  clientePrefill: Partial<ClienteForm> | null;
  leadPreItems: Record<string, CotizacionItemForm[]>;
  setLeadPreItems: React.Dispatch<React.SetStateAction<Record<string, CotizacionItemForm[]>>>;
  onSaveLead: (form: LeadForm, items?: CotizacionItemForm[]) => void;
  onSaveCliente: (form: ClienteForm) => void;
  onSaveProducto: (form: ProductoForm) => void;
  onUpdateLead: (id: string, form: LeadForm, items?: CotizacionItemForm[]) => void;
  onUpdateCliente: (id: string, form: ClienteForm) => void;
  onUpdateProducto: (id: string, form: ProductoForm) => void;
}) {
  const [leadForm, setLeadForm] = useState<LeadForm>(LEAD_FORM_INIT);
  const [clienteForm, setClienteForm] = useState<ClienteForm>(CLIENTE_FORM_INIT);
  const [productoForm, setProductoForm] = useState<ProductoForm>(PRODUCTO_FORM_INIT);
  const [leadCatFilter, setLeadCatFilter] = useState("");
  const [leadCatSearch, setLeadCatSearch] = useState("");
  const [leadItems, setLeadItems] = useState<CotizacionItemForm[]>([]);

  const effectiveLeadCat = leadCatFilter || (CAT_LABELS[leadForm.servicio] ? leadForm.servicio : "");
  const leadCatalogResults = catalogo.filter((c) => {
    if (effectiveLeadCat && c.categoria !== effectiveLeadCat) return false;
    if (leadCatSearch) {
      const q = leadCatSearch.toLowerCase();
      return c.codigo.toLowerCase().includes(q) || c.equipo.toLowerCase().includes(q) || c.servicio.toLowerCase().includes(q);
    }
    return true;
  });
  const canCreateLeadCatalogItem = leadCatSearch.trim().length > 1 && !leadCatalogResults.some((c) => {
    const q = leadCatSearch.trim().toLowerCase();
    return c.equipo.toLowerCase() === q || c.servicio.toLowerCase() === q || c.codigo.toLowerCase() === q;
  });

  useEffect(() => {
    if (kind === "lead" && editingLead) {
      setLeadForm({ rut: "", nombre: editingLead.nombre, empresa: editingLead.empresa, tel: editingLead.tel, email: editingLead.email, canal: editingLead.canal, servicio: editingLead.servicio, equipo: editingLead.equipo });
      setLeadItems(leadPreItems[editingLead.id] ?? []);
    } else if (kind === "cliente" && editingCliente) {
      setClienteForm({ rut: editingCliente.rut, nombre: editingCliente.nombre, contacto: editingCliente.contacto, tel: editingCliente.telefono || "+56 ", correo: editingCliente.correo, rubro: editingCliente.rubro, estado: editingCliente.estado || "activo", direccion: editingCliente.direccion || "", ciudad: editingCliente.ciudad || "", comuna: editingCliente.comuna || "" });
    } else if (kind === "cliente" && clientePrefill) {
      setClienteForm({ ...CLIENTE_FORM_INIT, ...clientePrefill });
    } else if (kind === "producto" && editingProducto) {
      setProductoForm({ nombre: editingProducto.nombre, cat: editingProducto.cat, marca: "", diag: String(editingProducto.diag), rep: String(editingProducto.rep), mant: String(editingProducto.mant), inst: String(editingProducto.inst) });
    } else {
      setLeadForm(LEAD_FORM_INIT);
      setLeadItems([]);
      setClienteForm(CLIENTE_FORM_INIT);
      setProductoForm(PRODUCTO_FORM_INIT);
    }
  }, [kind, editingLead, editingCliente, editingProducto, clientePrefill]);

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
      editingLead ? onUpdateLead(editingLead.id, leadForm, leadItems) : onSaveLead(leadForm, leadItems);
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

  async function handleCreateLeadCatalogItem() {
    const name = leadCatSearch.trim() || leadForm.equipo.trim();
    if (!name) { notify("Busca o ingresa un producto primero"); return; }
    const categoria = effectiveLeadCat || "MP";
    const created = await api.createCatalogoItem({
      ...CATALOGO_FORM_INIT,
      codigo: `${categoria}-${String(catalogo.filter((c) => c.categoria === categoria).length + 1).padStart(3, "0")}`,
      categoria,
      servicio: CAT_LABELS[categoria] ?? leadForm.servicio,
      equipo: name,
      texto_base_key: categoria,
    });
    const item = created ?? {
      id: `CAT-${Date.now()}`,
      codigo: `${categoria}-${String(catalogo.filter((c) => c.categoria === categoria).length + 1).padStart(3, "0")}`,
      categoria,
      servicio: CAT_LABELS[categoria] ?? leadForm.servicio,
      equipo: name,
      unidad: "Servicio",
      precio_neto: 0,
      grupo: categoria,
      texto_base_key: categoria,
    };
    setCatalogo((prev) => [...prev, item]);
    setLeadItems((prev) => [...prev, catalogoToCotizacionItem(item, plantillas)]);
    setLeadForm((prev) => ({ ...prev, equipo: prev.equipo || name }));
    notify("Producto creado y agregado al lead");
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
              <label>RUT empresa / cliente
                <input value={leadForm.rut ?? ""} onChange={(e) => setLeadForm((f) => ({ ...f, rut: formatRut(e.target.value) }))} placeholder="76.XXX.XXX-X" maxLength={15} />
              </label>
              <label>Empresa<input value={leadForm.empresa} onChange={(e) => setLeadForm((f) => ({ ...f, empresa: e.target.value }))} placeholder="Ej: Clínica Santiago" maxLength={100} /></label>
              <label>Nombre contacto<input value={leadForm.nombre} onChange={(e) => setLeadForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: María González" maxLength={100} /></label>
              <label>Teléfono<input value={leadForm.tel} onChange={(e) => setLeadForm((f) => ({ ...f, tel: e.target.value }))} placeholder="+56 9 XXXX XXXX" maxLength={20} /></label>
              <label>Correo<input type="email" value={leadForm.email} onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@empresa.cl" maxLength={100} /></label>
              <label>
                Canal
                <select value={leadForm.canal} onChange={(e) => setLeadForm((f) => ({ ...f, canal: e.target.value }))}>
                  <option value="wsp">WhatsApp</option>
                  <option value="email">Correo</option>
                </select>
              </label>
              <label>
                Servicio de interés
                <select value={leadForm.servicio} onChange={(e) => {
                  const value = e.target.value;
                  setLeadForm((f) => ({ ...f, servicio: value }));
                  setLeadCatFilter(value);
                }}>
                  <option value="">— Todos los servicios —</option>
                  {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}
                </select>
              </label>
              <label className="wide">
                Equipo / Producto
                <input
                  value={leadForm.equipo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLeadForm((f) => ({ ...f, equipo: v }));
                    setLeadCatSearch(v);
                  }}
                  placeholder="Ej: Monitor de signos vitales — escribe para buscar en catálogo"
                  maxLength={200}
                />
              </label>
              {(leadCatalogResults.length > 0 || canCreateLeadCatalogItem || leadItems.length > 0) && (
                <div className="wide" style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ maxHeight: 160, overflowY: "auto", fontSize: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {leadCatalogResults.slice(0, 40).map((c) => (
                          <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "4px 8px", color: "#64748b", fontSize: 11, width: 70 }}>{c.codigo}</td>
                            <td style={{ padding: "4px 8px" }}>{c.equipo || c.servicio}</td>
                            <td style={{ padding: "4px 8px", textAlign: "right", color: "#64748b" }}>{money(c.precio_neto)}</td>
                            <td style={{ padding: "4px 8px" }}>
                              <button
                                style={{ padding: "2px 8px", fontSize: 11, background: leadItems.some(i => i.producto_id === c.id) ? "#00a86b" : "#0f172a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
                                onClick={() => {
                                  if (leadItems.some(i => i.producto_id === c.id)) {
                                    setLeadItems((prev) => prev.filter(i => i.producto_id !== c.id));
                                  } else {
                                    const plantilla = plantillas.find((p) => p.codigo === c.texto_base_key);
                                    setLeadItems((prev) => [...prev, { producto_id: c.id, codigo: c.codigo, descripcion: `${c.servicio} — ${c.equipo}`.trim().replace(/\s*—\s*$/, ""), descripcion_larga: plantilla?.descripcion_larga ?? "", tipo_servicio: c.texto_base_key, precio_unitario: c.precio_neto, cantidad: 1, descuento_pct: 0 }]);
                                  }
                                }}
                              >{leadItems.some(i => i.producto_id === c.id) ? "✓ Quitar" : "+ Agregar"}</button>
                            </td>
                          </tr>
                        ))}
                        {leadCatalogResults.length === 0 && !canCreateLeadCatalogItem && (
                          <tr><td colSpan={4} style={{ padding: 8, color: "#94a3b8" }}>Sin resultados — escribe para buscar</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {canCreateLeadCatalogItem && (
                    <div style={{ padding: "6px 8px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
                      <button className="ghost small" onClick={handleCreateLeadCatalogItem} style={{ width: "100%" }}>
                        <Plus size={14} />Crear &quot;{leadCatSearch.trim()}&quot; como nuevo ítem de catálogo
                      </button>
                    </div>
                  )}
                  {leadItems.length > 0 && (
                    <p style={{ padding: "6px 10px", fontSize: 12, color: "#00a86b", fontWeight: 600, borderTop: "1px solid #e2e8f0", margin: 0 }}>
                      {leadItems.length} ítem{leadItems.length > 1 ? "s" : ""} seleccionado{leadItems.length > 1 ? "s" : ""} — se pre-cargarán al cotizar
                    </p>
                  )}
                </div>
              )}
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
              <label>Teléfono<input value={clienteForm.tel} onChange={(e) => setClienteForm((f) => ({ ...f, tel: e.target.value }))} placeholder="+56 9 XXXX XXXX" maxLength={20} /></label>
              <label>Correo<input type="email" value={clienteForm.correo} onChange={(e) => setClienteForm((f) => ({ ...f, correo: e.target.value }))} placeholder="contacto@empresa.cl" maxLength={100} /></label>
              <label>
                Rubro
                <select value={clienteForm.rubro} onChange={(e) => setClienteForm((f) => ({ ...f, rubro: e.target.value }))}>
                  <option>Médico</option>
                  <option>Dental</option>
                  <option>Laboratorio</option>
                  <option>Estético</option>
                  <option>Veterinario</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Estado
                <select value={clienteForm.estado} onChange={(e) => setClienteForm((f) => ({ ...f, estado: e.target.value }))}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
              <label className="wide">Dirección<input value={clienteForm.direccion} onChange={(e) => setClienteForm((f) => ({ ...f, direccion: e.target.value }))} placeholder="Av. Providencia 1234" maxLength={150} /></label>
              <label>Ciudad<input value={clienteForm.ciudad} onChange={(e) => setClienteForm((f) => ({ ...f, ciudad: e.target.value }))} placeholder="Santiago" maxLength={80} /></label>
              <label>Comuna<input value={clienteForm.comuna} onChange={(e) => setClienteForm((f) => ({ ...f, comuna: e.target.value }))} placeholder="Providencia" maxLength={80} /></label>
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
