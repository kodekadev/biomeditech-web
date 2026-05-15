"use client";

import {
  Activity,
  Bell,
  BriefcaseMedical,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileArchive,
  FileText,
  History,
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
import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { LOGO_B64 } from "@/lib/logo-b64";
import type { Lead, Cliente, Producto, Cotizacion, DashboardStats, LeadForm, ClienteForm, ProductoForm, CatalogoItem, CatalogoItemForm, Plantilla, CotizacionItemForm } from "@/lib/api";
import { money, formatRut, normalizeRut, isValidEmail, validateRut, isValidPhone, isActivo, fmtActivityDate } from "@/lib/utils";

type ModuleId = "dashboard" | "leads" | "clientes" | "productos" | "cotizaciones" | "historial" | "protocolos";
type LeadStatus = "cotizado" | "no-cotizado" | "aprobado" | "rechazado";
type LeadChannel = "wsp" | "email";
type QuoteService = "diagnostico" | "reparacion" | "mantencion" | "instalacion" | "mixto" | "";

const NAV_ITEMS: Array<{ id: ModuleId; label: string; icon: React.ElementType; group: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { id: "leads", label: "Leads", icon: Activity, group: "Gestión" },
  { id: "clientes", label: "Clientes", icon: BriefcaseMedical, group: "Gestión" },
  { id: "productos", label: "Productos / Servicios", icon: Wrench, group: "Gestión" },
  { id: "cotizaciones", label: "Cotizaciones", icon: ClipboardList, group: "Operaciones" },
  { id: "historial", label: "Historial de cotizaciones", icon: History, group: "Operaciones" },
  { id: "protocolos", label: "Protocolos Mantención", icon: FileArchive, group: "Operaciones" },
];

const INITIAL_LEADS: Lead[] = [];

const INITIAL_CLIENTES: Cliente[] = [];

const INITIAL_PRODUCTOS: Producto[] = [
  { id: "P-001", nombre: "Monitor de Signos Vitales", cat: "Equipos médicos", diag: 45000, rep: 120000, mant: 85000, inst: 95000 },
  { id: "P-002", nombre: "Autoclave", cat: "Equipos médicos", diag: 35000, rep: 185000, mant: 90000, inst: 110000 },
  { id: "P-003", nombre: "Ecógrafo", cat: "Equipos médicos", diag: 55000, rep: 250000, mant: 0, inst: 130000 },
  { id: "P-004", nombre: "Centrífuga", cat: "Laboratorio", diag: 30000, rep: 75000, mant: 50000, inst: 60000 },
  { id: "P-005", nombre: "Unidad Dental", cat: "Equipos dentales", diag: 40000, rep: 95000, mant: 70000, inst: 120000 },
  { id: "P-006", nombre: "Máquina de Anestesia", cat: "Equipos médicos", diag: 60000, rep: 320000, mant: 150000, inst: 200000 },
];

const INITIAL_CATALOGO: CatalogoItem[] = [
  { id: "CATMP001", codigo: "MP001", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 85000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CATMP002", codigo: "MP002", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 90000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CATMC001", codigo: "MC001", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 120000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CATMC002", codigo: "MC002", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 185000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CATBS001", codigo: "BS001", categoria: "BS", servicio: "Bloque servicio tecnico", equipo: "Atencion en terreno", unidad: "Bloque", precio_neto: 65000, grupo: "BS", texto_base_key: "BS", descripcion_larga: "" },
  { id: "CATVS001", codigo: "VS001", categoria: "VS", servicio: "Visita tecnica", equipo: "Evaluacion inicial", unidad: "Visita", precio_neto: 45000, grupo: "VS", texto_base_key: "VS", descripcion_larga: "" },
  { id: "CATEV001", codigo: "EV001", categoria: "EV", servicio: "Evaluacion diagnostica", equipo: "Equipo biomedico", unidad: "Servicio", precio_neto: 55000, grupo: "EV", texto_base_key: "EV", descripcion_larga: "" },
  { id: "CATRS001", codigo: "RS001", categoria: "RS", servicio: "Repuesto / Insumo", equipo: "Kit de repuestos", unidad: "Unidad", precio_neto: 0, grupo: "RS", texto_base_key: "RS", descripcion_larga: "" },
];

const INITIAL_COTIZACIONES: Cotizacion[] = [];

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

// Utility functions are imported from @/lib/utils

const LEAD_FORM_INIT: LeadForm = { rut: "", nombre: "", empresa: "", tel: "+56 ", email: "", canal: "wsp", servicio: "", equipo: "", direccion: "", tipo_entidad: "" };
const CLIENTE_FORM_INIT: ClienteForm = { rut: "", nombre: "", contacto: "", tel: "+56 ", correo: "", rubro: "Médico", estado: "activo", direccion: "", ciudad: "", comuna: "", tipo_entidad: "" };
const CATALOGO_FORM_INIT: CatalogoItemForm = { codigo: "", categoria: "MP", servicio: "", equipo: "", unidad: "Servicio", precio_neto: "", texto_base_key: "", descripcion_larga: "" };
const PRODUCTO_FORM_INIT: ProductoForm = { nombre: "", cat: "Equipos médicos", marca: "", diag: "", rep: "", mant: "", inst: "" };

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? "Ingresa un correo válido (ej: usuario@empresa.cl)"
    : null;
  const passwordError = emailTouched && password.length > 0 && password.length < 6
    ? "La contraseña debe tener al menos 6 caracteres"
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (!email || !isValidEmail(email)) { setError("Ingresa un correo válido"); return; }
    if (!password) { setError("Ingresa tu contraseña"); return; }
    setLoading(true);
    setError("");
    const result = await api.login(email, password);
    setLoading(false);
    if (!result) { setError("No se pudo conectar con el servidor"); return; }
    if ("error" in result) { setError(result.error); return; }
    api.saveUser(result.user.email, result.user.rol);
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
              onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); setError(""); }}
              placeholder="correo@biomeditech.cl"
              maxLength={100}
              autoFocus
              style={{ borderColor: emailError ? "#ef4444" : undefined }}
            />
            {emailError && <span className="field-error">{emailError}</span>}
          </label>
          <label style={{ position: "relative" }}>
            Contraseña
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                maxLength={50}
                style={{ width: "100%", paddingRight: 40, borderColor: passwordError ? "#ef4444" : undefined }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center" }}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && <span className="field-error">{passwordError}</span>}
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

  const [currentUser] = useState(() => api.getUser());
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);
  const [productos, setProductos] = useState<Producto[]>(INITIAL_PRODUCTOS);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(INITIAL_COTIZACIONES);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [leadSort, setLeadSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "tiempo", dir: "desc" });
  const [clientSort, setClientSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "nombre", dir: "asc" });
  const [isLoading, setIsLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<"todos" | LeadStatus>("todos");
  const [leadAnio, setLeadAnio] = useState(0);
  const [leadMes, setLeadMes] = useState(0);
  const [leadQuery, setLeadQuery] = useState("");
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
  const [cotizGarantia, setCotizGarantia] = useState("");
  const [cotizValidez, setCotizValidez] = useState(30);
  const [cotizItems, setCotizItems] = useState<CotizacionItemForm[]>([]);
  const DEFAULT_CONDICIONES = [
    "Valores expresados en pesos chilenos",
    "Servicio sujeto a coordinación previa con supervisor de sede",
    "El costo de la visita se cobrará separado en caso de detectarse desviaciones",
    "Informe técnico individual será emitido por cada equipo intervenido",
    "Validez de la cotización: 15 días",
    "Forma de pago: según condiciones acordadas con el cliente",
  ].join("\n");
  const [cotizCondiciones, setCotizCondiciones] = useState(() => {
    try { return localStorage.getItem("crm_condiciones") || DEFAULT_CONDICIONES; } catch { return DEFAULT_CONDICIONES; }
  });
  useEffect(() => { try { localStorage.setItem("crm_condiciones", cotizCondiciones); } catch {} }, [cotizCondiciones]);
  const [emitiendo, setEmitiendo] = useState(false);
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
    let cancelled = false;
    setFetchError(null);
    setIsLoading(true);
    Promise.all([
      api.fetchLeads(),
      api.fetchClientes(),
      api.fetchProductos(),
      api.fetchCotizaciones(),
      api.fetchDashboard(),
      api.fetchCatalogo(),
      api.fetchPlantillas(),
    ])
      .then(([l, c, p, cot, s, cat, plt]) => {
        if (cancelled) return;
        if (l.length > 0) setLeads(l);
        if (c.length > 0) setClientes(c);
        if (p.length > 0) setProductos(p);
        if (cot.length > 0) setCotizaciones(cot);
        if (s) setStats(s);
        if (cat.length > 0) setCatalogo(cat);
        if (plt.length > 0) setPlantillas(plt);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError("Error al cargar los datos. Verifica tu conexión.");
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [loggedIn]);

  // All hooks must be called before any conditional return
  const noCotizados = useMemo(() => leads.filter((l) => l.estado === "no-cotizado"), [leads]);
  const debouncedLeadQuery = useDebounce(leadQuery, 250);
  const visibleLeads = useMemo(() => {
    const q = debouncedLeadQuery.toLowerCase();
    const qRut = normalizeRut(debouncedLeadQuery);
    const list = leads.filter((l) => {
      if (leadFilter !== "todos" && l.estado !== leadFilter) return false;
      if ((leadAnio || leadMes) && l.creado_en) {
        const d = new Date(l.creado_en);
        if (leadAnio && d.getFullYear() !== leadAnio) return false;
        if (leadMes && d.getMonth() + 1 !== leadMes) return false;
      }
      if (q) {
        return (
          (qRut.length > 3 && normalizeRut(l.rut ?? "").includes(qRut)) ||
          l.nombre.toLowerCase().includes(q) ||
          l.empresa.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.tel.includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (leadSort.key === "tiempo") {
        const ai = leads.indexOf(a);
        const bi = leads.indexOf(b);
        return leadSort.dir === "desc" ? ai - bi : bi - ai;
      }
      const av = String((a as unknown as Record<string,unknown>)[leadSort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string,unknown>)[leadSort.key] ?? "").toLowerCase();
      return leadSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [leads, leadFilter, leadAnio, leadMes, leadSort, debouncedLeadQuery]);
  const debouncedClientQuery = useDebounce(clientQuery, 250);
  const debouncedProductQuery = useDebounce(productQuery, 250);
  const filteredClients = useMemo(() => {
    const list = clientes.filter((c) => {
      if (!debouncedClientQuery) return true;
      const q = debouncedClientQuery.toLowerCase();
      const qNorm = normalizeRut(debouncedClientQuery);
      if (clientSearchField === "rut") return normalizeRut(c.rut).includes(qNorm);
      if (clientSearchField === "nombre") return c.nombre.toLowerCase().includes(q);
      if (clientSearchField === "contacto") return c.contacto.toLowerCase().includes(q);
      if (clientSearchField === "correo") return c.correo.toLowerCase().includes(q);
      return normalizeRut(c.rut).includes(qNorm) || c.nombre.toLowerCase().includes(q) || c.contacto.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q) || (c.ciudad ?? "").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string,unknown>)[clientSort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string,unknown>)[clientSort.key] ?? "").toLowerCase();
      return clientSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [clientes, debouncedClientQuery, clientSearchField, clientSort]);
  const filteredProducts = useMemo(() =>
    productos.filter((p) => JSON.stringify(p).toLowerCase().includes(debouncedProductQuery.toLowerCase())),
    [productos, debouncedProductQuery]);
  const activeTitle = NAV_ITEMS.find((item) => item.id === active)?.label ?? "Dashboard";

  if (!loggedIn) {
    return <LoginScreen onLogin={(token) => { api.saveToken(token); setLoggedIn(true); }} />;
  }

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
  async function handleSetLeadEstado(id: string, estado: LeadStatus) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
    await api.updateLead(id, { estado });
    if (estado === "cotizado") {
      api.logActivity("gestion", "Lead cotizado", `${lead.nombre} (${lead.empresa}) marcado como cotizado`, id, "lead");
    }
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
    const rutNorm = normalizeRut(lead.rut ?? "");
    const match = clientes.find((c) => {
      if (rutNorm.length > 4 && normalizeRut(c.rut) === rutNorm) return true;
      return (
        c.nombre.toLowerCase().includes(lead.empresa.toLowerCase()) ||
        lead.empresa.toLowerCase().includes(c.nombre.toLowerCase())
      );
    });

    setCotizClienteId(match?.id ?? "");

    // Build base items list
    let finalItems: CotizacionItemForm[] = [];
    const preItems = leadPreItems[lead.id];
    if (preItems && preItems.length > 0) {
      finalItems = preItems;
    } else {
      const q = `${lead.servicio} ${lead.equipo}`.toLowerCase();
      const inferred = catalogo.find((c) =>
        (c.categoria && lead.servicio === c.categoria) ||
        q.includes(c.equipo.toLowerCase()) ||
        q.includes(c.servicio.toLowerCase())
      );
      if (inferred) finalItems = [catalogoToCotizacionItem(inferred, plantillas)];
    }

    const addr = lead.direccion || match?.ciudad || match?.direccion || "";
    const tel = (lead.tel && lead.tel.trim() !== "+56" && lead.tel.trim() !== "+56 ") ? lead.tel : (match?.telefono ?? "");
    const email = lead.email || match?.correo || "";
    setCotizItems(finalItems);
    setCotizNotas([
      `Origen lead: ${lead.nombre}`,
      (match?.nombre && match.nombre !== lead.empresa) ? `Empresa: ${match.nombre}` : (lead.empresa ? `Empresa: ${lead.empresa}` : ""),
      tel ? `Tel: ${tel}` : "",
      email ? `Correo: ${email}` : "",
      lead.equipo ? `Equipo/producto: ${lead.equipo}` : "",
      lead.servicio ? `Servicio solicitado: ${serviceLabel(lead.servicio)}` : "",
      addr ? `Dirección: ${addr}` : "",
    ].filter(Boolean).join(" | "));
    if (!match) notify("Cliente no encontrado por RUT ni nombre — selecciona o crea uno antes de emitir");
    goTo("cotizaciones");
  }

  async function handleSaveLead(form: LeadForm, items: CotizacionItemForm[] = []) {
    const tempId = `temp-${Date.now()}`;
    const tempLead: Lead = { id: tempId, ...form, canal: form.canal as LeadChannel, estado: "no-cotizado", tiempo: "Justo ahora" };
    setLeads((prev) => [tempLead, ...prev]);
    if (items.length > 0) setLeadPreItems((prev) => ({ ...prev, [tempId]: items }));
    closeModal();
    notify("Lead agregado correctamente");

    const newLead = await api.createLead(form);
    const lead = newLead ?? tempLead;
    if (newLead) {
      setLeads((prev) => prev.map((l) => l.id === tempId ? newLead : l));
      if (items.length > 0) setLeadPreItems((prev) => { const { [tempId]: v, ...rest } = prev; return { ...rest, [newLead.id]: v }; });
    }
    api.logActivity("nuevo_lead", "Nuevo lead registrado", `${form.nombre} (${form.empresa}) — ${form.servicio}`, lead.id, "lead", currentUser?.email);

    // Auto-create client if not yet registered
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
        direccion: form.direccion || "",
        ciudad: "",
        comuna: "",
      };
      const tempCId = `C-${String(Date.now())}`;
      const tempCliente: Cliente = { id: tempCId, rut: clienteForm.rut, nombre: clienteForm.nombre, contacto: clienteForm.contacto, correo: clienteForm.correo, rubro: clienteForm.rubro, estado: clienteForm.estado, telefono: clienteForm.tel, direccion: "", ciudad: "", comuna: "" };
      setClientes((prev) => [tempCliente, ...prev]);
      const newCliente = await api.createCliente(clienteForm);
      if (newCliente) setClientes((prev) => prev.map((c) => c.id === tempCId ? newCliente : c));
    }
  }

  async function handleUpdateLead(id: string, form: LeadForm, items: CotizacionItemForm[] = []) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...form, canal: form.canal as LeadChannel } : l));
    setLeadPreItems((prev) => ({ ...prev, [id]: items }));
    closeModal();
    notify("Lead actualizado");

    const updated = await api.saveLead(id, form);
    if (updated) setLeads((prev) => prev.map((l) => l.id === id ? updated : l));

    // Sync matching client if empresa or contact data changed
    const rutNorm = normalizeRut(form.rut ?? "");
    const matchingCliente = clientes.find((c) =>
      (rutNorm.length > 4 && normalizeRut(c.rut) === rutNorm) ||
      c.nombre.toLowerCase().trim() === (form.empresa || form.nombre).toLowerCase().trim()
    );
    if (matchingCliente) {
      const clienteForm: import("@/lib/api").ClienteForm = {
        rut: form.rut ?? matchingCliente.rut,
        nombre: form.empresa || matchingCliente.nombre,
        contacto: form.nombre || matchingCliente.contacto,
        tel: form.tel || matchingCliente.telefono,
        correo: form.email || matchingCliente.correo,
        rubro: matchingCliente.rubro,
        estado: matchingCliente.estado,
        direccion: matchingCliente.direccion,
        ciudad: matchingCliente.ciudad,
        comuna: matchingCliente.comuna,
      };
      const updatedCliente = await api.saveCliente(matchingCliente.id, clienteForm);
      if (updatedCliente) setClientes((prev) => prev.map((c) => c.id === matchingCliente.id ? updatedCliente : c));
    }
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
    const tempId = `C-temp-${Date.now()}`;
    const tempCliente: Cliente = { id: tempId, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, rubro: form.rubro, estado: form.estado || "activo", telefono: form.tel, direccion: form.direccion, ciudad: form.ciudad, comuna: form.comuna };
    setClientes((prev) => [tempCliente, ...prev]);
    closeModal();
    notify("Cliente agregado correctamente");

    const newCliente = await api.createCliente(form);
    if (newCliente) {
      setClientes((prev) => prev.map((c) => c.id === tempId ? newCliente : c));
      api.logActivity("nuevo_cliente", "Nuevo cliente registrado", `${form.nombre}`, newCliente.id, "cliente", currentUser?.email);
    }
  }

  async function handleUpdateCliente(id: string, form: ClienteForm) {
    setClientes((prev) => prev.map((c) => c.id === id ? { ...c, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, rubro: form.rubro, estado: form.estado, telefono: form.tel, direccion: form.direccion, ciudad: form.ciudad, comuna: form.comuna } : c));
    closeModal();
    notify("Cliente actualizado");

    const updated = await api.saveCliente(id, form);
    if (updated) setClientes((prev) => prev.map((c) => c.id === id ? updated : c));
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
    const tempId = `P-temp-${Date.now()}`;
    const tempProd: Producto = { id: tempId, nombre: form.nombre, cat: form.cat, diag: Number(form.diag) || 0, rep: Number(form.rep) || 0, mant: Number(form.mant) || 0, inst: Number(form.inst) || 0 };
    setProductos((prev) => [...prev, tempProd]);
    closeModal();
    notify("Producto agregado correctamente");

    const newProd = await api.createProducto(form);
    if (newProd) setProductos((prev) => prev.map((p) => p.id === tempId ? newProd : p));
  }

  async function handleUpdateProducto(id: string, form: ProductoForm) {
    setProductos((prev) => prev.map((p) => p.id === id ? { ...p, nombre: form.nombre, cat: form.cat, diag: Number(form.diag) || 0, rep: Number(form.rep) || 0, mant: Number(form.mant) || 0, inst: Number(form.inst) || 0 } : p));
    closeModal();
    notify("Producto actualizado");

    const updated = await api.saveProducto(id, form);
    if (updated) setProductos((prev) => prev.map((p) => p.id === id ? updated : p));
  }

  // --- Cotización actions ---
  async function handleEmitirCotizacion() {
    if (!cotizClienteId) { notify("Selecciona un cliente"); return; }
    if (cotizItems.length === 0) { notify("Agrega al menos un ítem"); return; }
    setEmitiendo(true);

    // Optimistic: add to historial immediately with estimated total
    const tempId = `cot-temp-${Date.now()}`;
    const clienteObj = clientes.find((c) => c.id === cotizClienteId);
    const tempSubtotal = cotizItems.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);
    const tempTotal = tempSubtotal + Math.round(tempSubtotal * 0.19);
    const tempCot: Cotizacion = { id: tempId, nro: "—", cliente: cotizClienteId, monto: tempTotal, estado: "Pendiente", fecha: new Date().toISOString().slice(0, 10) };
    setCotizaciones((prev) => [tempCot, ...prev]);

    // Find matching lead before creating cotizacion so we can pass lead_id
    const rutCliente = normalizeRut(clienteObj?.rut ?? "");
    const matchLead = leads.find((l) =>
      l.estado === "no-cotizado" && (
        (rutCliente.length > 4 && normalizeRut(l.rut ?? "") === rutCliente) ||
        clienteObj?.nombre.toLowerCase().trim() === l.empresa.toLowerCase().trim()
      )
    );

    const result = await api.createCotizacionMulti({
      cliente_id: cotizClienteId,
      lead_id: matchLead?.id,
      notas_cliente: cotizNotas,
      forma_pago: cotizFormaPago,
      notas_internas: cotizGarantia,
      validez_dias: cotizValidez,
      items: cotizItems,
    });
    const total = result?.total_con_iva ?? tempTotal;
    const cot: Cotizacion = {
      id: result?.id ?? String(Date.now()),
      nro: result?.numero ?? "",
      cliente: clienteObj?.id ?? cotizClienteId,
      lead_id: matchLead?.id,
      monto: total,
      estado: "Pendiente",
      fecha: new Date().toISOString().slice(0, 10),
      pdfUrl: result?.pdf_url ?? undefined,
    };
    setCotizaciones((prev) => prev.map((c) => c.id === tempId ? cot : c));
    api.logActivity("cotizacion_emitida", `Cotización ${cot.nro} emitida`, `${clienteObj?.nombre ?? cotizClienteId} — ${money(total)} CLP`, cot.id, "cotizacion", currentUser?.email);

    if (matchLead) {
      setLeads((prev) => prev.map((l) => l.id === matchLead.id ? { ...l, estado: "cotizado" } : l));
      api.updateLead(matchLead.id, { estado: "cotizado" });
    }

    setEmitiendo(false);
    setCotizItems([]);
    setCotizNotas("");
    notify(`Cotización ${cot.nro} emitida`);
    if (result) await downloadCotizacionAsPDF(result);
  }

  function buildCotizHtml(det: import("@/lib/api").CotizacionDetalle): string {
    const clienteObj = clientes.find((c) => c.id === det.cliente_id);
    const rowsHtml = det.items.map((it, i) => {
      const disc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : "";
      const glosaHtml = it.glosa ? `<br/><span style="font-size:11px;color:#64748b;white-space:pre-line">${it.glosa}</span>` : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${it.descripcion}${disc}${glosaHtml}</td>
        <td>${it.cantidad}</td>
        <td>${money(it.precio_unitario)}</td>
        <td><strong>${money(it.subtotal)}</strong></td>
      </tr>`;
    }).join("");
    const glossaryEntries: { label: string; desc: string }[] = [];
    const seenGloss = new Set<string>();
    det.items.forEach((it) => {
      const key = it.tipo_servicio || it.descripcion.split("—")[0].trim();
      const localTemplates: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem("crm_desc_templates") || "{}"); } catch { return {}; } })();
      const descLarga = it.descripcion_larga ||
        plantillas.find((p) => p.codigo === it.tipo_servicio)?.descripcion_larga ||
        plantillas.find((p) => p.codigo === `${it.tipo_servicio}_GENERAL`)?.descripcion_larga ||
        localTemplates[`${it.tipo_servicio}_GENERAL`] || "";
      if (descLarga && key && !seenGloss.has(key)) {
        seenGloss.add(key);
        glossaryEntries.push({ label: key, desc: descLarga });
      }
    });
    const glossaryHtml = glossaryEntries.length > 0
      ? `<div class="glossary">
          <h3>Descripción de servicios</h3>
          ${glossaryEntries.map((e) => `<div class="gloss-item"><p>${e.desc}</p></div>`).join("")}
        </div>`
      : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización ${det.numero}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @page{margin:0;size:A4}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0e948b}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#dc2626}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .data-block h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0e948b;margin-bottom:8px;font-weight:700}
      .data-block dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;align-items:baseline}
      .data-block dt{color:#64748b;font-size:12px;white-space:nowrap}
      .data-block dt::after{content:":"}
      .data-block dd{font-size:12px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#0e948b;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #0e948b}
      .conditions{font-size:12px;color:#475569;background:#f0faf5;padding:12px;border-radius:6px;margin-bottom:16px;border-left:3px solid #0e948b}
      .conditions strong{display:block;margin-bottom:4px;color:#0e948b}
      .transfer{font-size:12px;color:#1e293b;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .transfer strong{display:block;margin-bottom:6px;color:#0e948b;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
      .transfer dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px}
      .transfer dt{color:#64748b;white-space:nowrap}
      .transfer dt::after{content:":"}
      .transfer dd{font-weight:500}
      .glossary{margin-top:32px;padding-top:20px;border-top:2px solid #0e948b}
      .glossary h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:12px}
      .gloss-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;border-left:3px solid #0e948b}
      .gloss-item p{font-size:12px;color:#475569;white-space:pre-line;line-height:1.6}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
    </style></head><body>
    <header>
      <div><img src="${LOGO_B64}" alt="Biomeditech" style="height:48px;-webkit-print-color-adjust:exact;print-color-adjust:exact;forced-color-adjust:none"/></div>
      <div class="right"><strong>${det.numero}</strong><br/><span style="color:#64748b">Biomeditech.cl</span></div>
    </header>
    <div style="display:grid;grid-template-columns:max-content 1fr 1fr;gap:16px;margin-bottom:16px;align-items:start">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding-top:3px;border-right:2px solid #e2e8f0;padding-right:12px;white-space:nowrap">Información</div>
      <div class="data-block">
        <h4>Cliente</h4>
        <dl>
          <dt>Empresa</dt><dd>${clienteObj?.nombre ?? det.cliente_id}</dd>
          <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
          <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
          <dt>Correo</dt><dd>${clienteObj?.correo || "—"}</dd>
          <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
          <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
        </dl>
      </div>
      <div class="data-block">
        <h4>BIOMEDITECH</h4>
        <dl>
          <dt>Razón social</dt><dd>GVA SpA</dd>
          <dt>RUT</dt><dd>78.200.394-1</dd>
          <dt>Dirección</dt><dd>Pedro Torres 798, Ñuñoa</dd>
          <dt>Contacto</dt><dd>contacto@Biomeditech.cl</dd>
          <dt>Teléfono</dt><dd>+56 9 5989 0781</dd>
          <dt>Web</dt><dd>Biomeditech.cl</dd>
        </dl>
      </div>
    </div>
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
      <strong>Condiciones Comerciales</strong>
      ${det.forma_pago ? `<p style="margin:4px 0 6px;font-size:12px"><strong style="color:#0f2340">Forma de pago:</strong> ${det.forma_pago}</p>` : ""}
      <ul style="margin:4px 0 0 16px;padding:0">${
        (() => { try { return (localStorage.getItem("crm_condiciones") || "").split("\n").filter(Boolean).map((l: string) => `<li>${l}</li>`).join(""); } catch { return ""; } })()
      }</ul>
    </div>
    ${det.notas_internas ? `<div class="conditions" style="background:#fff7ed;border-left-color:#f97316"><strong style="color:#c2410c">Condiciones de Garantía</strong><p style="margin-top:6px;white-space:pre-line">${det.notas_internas}</p></div>` : ""}
    <div class="transfer">
      <strong>Datos de transferencia</strong>
      <dl>
        <dt>Banco</dt><dd>Banco Santander</dd>
        <dt>Tipo cuenta</dt><dd>Cuenta corriente</dd>
        <dt>N° cuenta</dt><dd>99275138</dd>
        <dt>RUT</dt><dd>78.200.394-1</dd>
        <dt>Nombre</dt><dd>GVA SpA</dd>
        <dt>Correo</dt><dd>contacto@biomeditech.cl</dd>
      </dl>
    </div>
    ${det.notas_cliente ? `<p style="font-size:12px;color:#475569;margin-bottom:12px"><em>${det.notas_cliente}</em></p>` : ""}
    ${glossaryHtml}
    <footer>contacto@biomeditech.cl · biomeditech.cl · WhatsApp: +56 9 5989 0781</footer>
    </body></html>`;
  }

  function handlePrintDetalle(det: import("@/lib/api").CotizacionDetalle) {
    const base = buildCotizHtml(det);
    const html = base.replace("</body></html>",
      `<style>.action-bar{position:fixed;top:0;left:0;right:0;background:#0f2340;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px}.action-bar span{font-weight:600;font-size:14px}.action-bar .btn-print{background:#0e948b;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}.action-bar .btn-close{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.3);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px}body{padding-top:72px!important}@media print{.action-bar{display:none}body{padding-top:36px!important}}</style>
      <div class="action-bar">
        <span>Cotización ${det.numero}</span>
        <div style="display:flex;gap:8px">
          <button class="btn-print" onclick="window.print()">🖨 Imprimir / Descargar PDF</button>
          <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
        </div>
      </div>
      </body></html>`
    );
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.title = `Cotización ${det.numero}`;
    win.focus();
  }

  async function downloadCotizacionAsPDF(det: import("@/lib/api").CotizacionDetalle) {
    notify("Generando PDF…");
    const html = buildCotizHtml(det);
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1122px;border:none;visibility:hidden;";
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) => { iframe.onload = () => resolve(); iframe.srcdoc = html; });
    await new Promise((r) => setTimeout(r, 500));
    const iDoc = iframe.contentDocument;
    if (!iDoc) { document.body.removeChild(iframe); return; }
    const canvas = await html2canvas(iDoc.body, { useCORS: true, scale: 2, backgroundColor: "#ffffff", windowWidth: 794 });
    document.body.removeChild(iframe);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const totalH = canvas.height * (pdfW / canvas.width);
    let pos = 0;
    let remaining = totalH;
    pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH);
    remaining -= pdfH;
    while (remaining > 0) {
      pos -= pdfH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH);
      remaining -= pdfH;
    }
    const clienteObj = clientes.find((c) => c.id === det.cliente_id);
    const fecha = new Date().toISOString().slice(0, 10);
    pdf.save(`cotizacion-${det.numero}-${(clienteObj?.nombre ?? "cliente").replace(/\s+/g, "-")}-${fecha}.pdf`);
  }

  function handlePrintQuote() {
    if (cotizItems.length === 0) { notify("Agrega al menos un ítem antes de previsualizar"); return; }
    const clienteObj = clientes.find((c) => c.id === cotizClienteId);
    const subtotal = cotizItems.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const rowsHtml = cotizItems.map((it, i) => {
      const sub = Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100));
      const disc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : "";
      const glosaHtml = it.glosa ? `<br/><span style="font-size:11px;color:#64748b;white-space:pre-line">${it.glosa}</span>` : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${it.descripcion}${disc}${glosaHtml}</td>
        <td>${it.cantidad}</td>
        <td>${money(it.precio_unitario)}</td>
        <td><strong>${money(sub)}</strong></td>
      </tr>`;
    }).join("");
    const glossaryEntries: { label: string; desc: string }[] = [];
    const seenGloss = new Set<string>();
    const localTemplates: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem("crm_desc_templates") || "{}"); } catch { return {}; } })();
    cotizItems.forEach((it) => {
      const key = it.tipo_servicio || it.descripcion.split("—")[0].trim();
      const descLarga = it.descripcion_larga ||
        plantillas.find((p) => p.codigo === it.tipo_servicio)?.descripcion_larga ||
        plantillas.find((p) => p.codigo === `${it.tipo_servicio}_GENERAL`)?.descripcion_larga ||
        localTemplates[`${it.tipo_servicio}_GENERAL`] || "";
      if (descLarga && key && !seenGloss.has(key)) {
        seenGloss.add(key);
        glossaryEntries.push({ label: key, desc: descLarga });
      }
    });
    const glossaryHtml = glossaryEntries.length > 0
      ? `<div class="glossary">
          <h3>Descripción de servicios</h3>
          ${glossaryEntries.map((e) => `<div class="gloss-item"><p>${e.desc}</p></div>`).join("")}
        </div>`
      : "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Borrador Cotización</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @page{margin:0;size:A4}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:72px 40px 36px}
      .action-bar{position:fixed;top:0;left:0;right:0;background:#0f2340;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px}
      .action-bar span{font-weight:600;font-size:14px}
      .action-bar .btn-print{background:#0e948b;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
      .action-bar .btn-close{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.3);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px}
      @media print{.action-bar{display:none}body{padding:36px 40px}}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0e948b}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#dc2626}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .data-block h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0e948b;margin-bottom:8px;font-weight:700}
      .data-block dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;align-items:baseline}
      .data-block dt{color:#64748b;font-size:12px;white-space:nowrap}
      .data-block dt::after{content:":"}
      .data-block dd{font-size:12px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#0e948b;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #0e948b}
      .conditions{font-size:12px;color:#475569;background:#f0faf5;padding:12px;border-radius:6px;margin-bottom:16px;border-left:3px solid #0e948b}
      .conditions strong{display:block;margin-bottom:4px;color:#0e948b}
      .transfer{font-size:12px;color:#1e293b;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .transfer strong{display:block;margin-bottom:6px;color:#0e948b;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
      .transfer dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px}
      .transfer dt{color:#64748b;white-space:nowrap}
      .transfer dt::after{content:":"}
      .transfer dd{font-weight:500}
      .glossary{margin-top:32px;padding-top:20px;border-top:2px solid #0e948b}
      .glossary h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:12px}
      @media print{.glossary{page-break-before:always;margin-top:0;padding-top:24px}}
      .gloss-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;border-left:3px solid #0e948b}
      .gloss-item strong{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#0e948b;margin-bottom:4px}
      .gloss-item p{font-size:12px;color:#475569;white-space:pre-line;line-height:1.6}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
      .draft-badge{display:inline-block;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.06em;margin-bottom:4px}
    </style></head><body>
    <header>
      <div><img src="${LOGO_B64}" alt="Biomeditech" style="height:48px;-webkit-print-color-adjust:exact;print-color-adjust:exact;forced-color-adjust:none"/></div>
      <div class="right"><span class="draft-badge">BORRADOR</span><strong style="font-size:16px;color:#64748b">Sin número</strong><br/><span style="color:#64748b">Biomeditech.cl</span></div>
    </header>
    <div style="display:grid;grid-template-columns:max-content 1fr 1fr;gap:16px;margin-bottom:16px;align-items:start">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding-top:3px;border-right:2px solid #e2e8f0;padding-right:12px;white-space:nowrap">Información</div>
      <div class="data-block">
        <h4>Cliente</h4>
        <dl>
          <dt>Empresa</dt><dd>${clienteObj?.nombre ?? "—"}</dd>
          <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
          <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
          <dt>Correo</dt><dd>${clienteObj?.correo || "—"}</dd>
          <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
          <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
        </dl>
      </div>
      <div class="data-block">
        <h4>BIOMEDITECH</h4>
        <dl>
          <dt>Razón social</dt><dd>GVA SpA</dd>
          <dt>RUT</dt><dd>78.200.394-1</dd>
          <dt>Dirección</dt><dd>Pedro Torres 798, Ñuñoa</dd>
          <dt>Contacto</dt><dd>contacto@Biomeditech.cl</dd>
          <dt>Teléfono</dt><dd>+56 9 5989 0781</dd>
          <dt>Web</dt><dd>Biomeditech.cl</dd>
        </dl>
      </div>
    </div>
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
      <strong>Condiciones Comerciales</strong>
      ${cotizFormaPago ? `<p style="margin:4px 0 6px;font-size:12px"><strong style="color:#0f2340">Forma de pago:</strong> ${cotizFormaPago}</p>` : ""}
      <ul style="margin:4px 0 0 16px;padding:0">${cotizCondiciones.split("\n").filter(Boolean).map((l) => `<li>${l}</li>`).join("")}</ul>
    </div>
    ${cotizGarantia ? `<div class="conditions" style="background:#fff7ed;border-left-color:#f97316"><strong style="color:#c2410c">Condiciones de Garantía</strong><p style="margin-top:6px;white-space:pre-line">${cotizGarantia}</p></div>` : ""}
    <div class="transfer">
      <strong>Datos de transferencia</strong>
      <dl>
        <dt>Banco</dt><dd>Banco Santander</dd>
        <dt>Tipo cuenta</dt><dd>Cuenta corriente</dd>
        <dt>N° cuenta</dt><dd>99275138</dd>
        <dt>RUT</dt><dd>78.200.394-1</dd>
        <dt>Nombre</dt><dd>GVA SpA</dd>
        <dt>Correo</dt><dd>contacto@biomeditech.cl</dd>
      </dl>
    </div>
    ${cotizNotas ? `<p style="font-size:12px;color:#475569;margin-bottom:12px"><em>${cotizNotas}</em></p>` : ""}
    ${glossaryHtml}
    <footer>contacto@biomeditech.cl · biomeditech.cl · WhatsApp: +56 9 5989 0781</footer>
    <div class="action-bar">
      <span>Borrador de Cotización</span>
      <div style="display:flex;gap:8px">
        <button class="btn-print" onclick="window.print()">🖨 Imprimir / Descargar PDF</button>
        <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
      </div>
    </div>
    </body></html>`);
    win.document.title = "Borrador Cotización";
    win.focus();
  }

  async function handleDownloadPreviewPDF() {
    if (cotizItems.length === 0) { notify("Agrega al menos un ítem antes de descargar"); return; }
    const el = document.getElementById("quote-preview-content");
    if (!el) return;
    notify("Generando PDF…");
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const totalH = canvas.height * (pdfW / canvas.width);
    let pos = 0;
    let remaining = totalH;
    pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH);
    remaining -= pdfH;
    while (remaining > 0) {
      pos -= pdfH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH);
      remaining -= pdfH;
    }
    const cliente = clientes.find((c) => c.id === cotizClienteId);
    const fecha = new Date().toISOString().slice(0, 10);
    pdf.save(`cotizacion-${(cliente?.nombre ?? "borrador").replace(/\s+/g, "-")}-${fecha}.pdf`);
  }

  async function handleVerCotizacion(id: string) {
    const det = await api.fetchCotizacionDetalle(id);
    if (!det) { notify("No se pudo cargar el detalle de la cotización"); return; }
    handlePrintDetalle(det);
  }

  async function handleDescargarCotizacion(id: string) {
    const det = await api.fetchCotizacionDetalle(id);
    if (!det) { notify("No se pudo cargar el detalle de la cotización"); return; }
    await downloadCotizacionAsPDF(det);
  }

  function handleUpdateCotizacionEstado(id: string, estado: string) {
    setCotizaciones((prev) => prev.map((c) => c.id === id ? { ...c, estado } : c));
    api.updateCotizacion(id, { estado });
    if (estado === "Aprobada") {
      const cot = cotizaciones.find((c) => c.id === id);
      if (cot?.lead_id) {
        setLeads((prev) => prev.map((l) => l.id === cot.lead_id ? { ...l, estado: "aprobado" } : l));
        api.updateLead(cot.lead_id, { estado: "aprobado" });
      }
    }
  }

  async function handleDeleteCotizacion(id: string) {
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
    await api.deleteCotizacion(id);
    notify("Cotización eliminada");
  }

  function handleUpsertPlantilla(existingId: string | null, codigo: string, descripcion: string) {
    setPlantillas((prev) => {
      const idx = prev.findIndex((p) => p.codigo === codigo);
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, descripcion_larga: descripcion } : p);
      return [...prev, { id: existingId || `tmp-${codigo}`, codigo, descripcion_larga: descripcion }];
    });
    api.upsertPlantilla(existingId, codigo, descripcion);
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
              const count = item.id === "leads" ? noCotizados.length : undefined;
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
          <div className="avatar">{currentUser ? currentUser.email.slice(0, 2).toUpperCase() : "BM"}</div>
          <div>
            <strong>{currentUser ? currentUser.email.split("@")[0] : "Biomeditech"}</strong>
            <span title={currentUser?.email}>{currentUser ? currentUser.rol : "Administrador"}</span>
          </div>
          <button className="icon-button" aria-label="Cerrar sesión" onClick={handleLogout} title="Cerrar sesión">
            <Settings size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        {fetchError && (
          <div style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca", color: "#dc2626", padding: "10px 24px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <X size={15} />
            {fetchError}
            <button onClick={() => setFetchError(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0 }}><X size={14} /></button>
          </div>
        )}
        <header className="topbar">
          <div>
            <h1>{activeTitle}</h1>
            <p>Biomeditech CRM / {active === "dashboard" ? "Inicio" : activeTitle}</p>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Actualizar"
              title="Actualizar datos"
              onClick={() => window.location.reload()}
              style={{ fontSize: 17, fontWeight: 700 }}
            >↺</button>
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
            <Dashboard noCotizados={noCotizados} goTo={goTo} notify={notify} stats={stats} cotizaciones={cotizaciones} />
          )}

          {active === "leads" && (
            <section className="stack">
              <div className="module-toolbar">
                <div className="segmented">
                  <button className={leadFilter === "todos" ? "selected" : ""} onClick={() => setLeadFilter("todos")}>
                    Todos <span>{leads.length}</span>
                  </button>
                  <button className={leadFilter === "no-cotizado" ? "selected" : ""} onClick={() => setLeadFilter("no-cotizado")}>
                    No cotizados <span>{noCotizados.length}</span>
                  </button>
                  <button className={leadFilter === "cotizado" ? "selected" : ""} onClick={() => setLeadFilter("cotizado")}>
                    Cotizados <span>{leads.filter((l) => l.estado === "cotizado").length}</span>
                  </button>
                  <button className={leadFilter === "aprobado" ? "selected" : ""} onClick={() => setLeadFilter("aprobado")}>
                    Aprobados <span>{leads.filter((l) => l.estado === "aprobado").length}</span>
                  </button>
                  <button className={leadFilter === "rechazado" ? "selected" : ""} onClick={() => setLeadFilter("rechazado")}>
                    Rechazados <span>{leads.filter((l) => l.estado === "rechazado").length}</span>
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", minWidth: 220 }}>
                    <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <input
                      placeholder="Buscar por RUT, nombre, empresa o correo..."
                      value={leadQuery}
                      onChange={(e) => setLeadQuery(e.target.value)}
                      style={{ flex: 1, minHeight: 26, fontSize: 13, border: "none", background: "transparent", outline: "none" }}
                    />
                    {leadQuery && <button onClick={() => setLeadQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}><X size={13} /></button>}
                  </div>
                  <PeriodoPicker anio={leadAnio} mes={leadMes} fechas={leads.map((l) => l.creado_en || "")} onAnio={setLeadAnio} onMes={setLeadMes} />
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
                          <span className={`tag ${leadEstadoMeta(lead.estado).tagClass}`} style={{ fontSize: 11 }}>
                            {leadEstadoMeta(lead.estado).label}
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
                        <button className="primary small" title="Crear cotización para este lead" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} />Cotizar</button>
                        <select
                          value={lead.estado}
                          onChange={(e) => handleSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                          style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", minHeight: 28 }}
                          title="Cambiar estado"
                        >
                          <option value="no-cotizado">No cotizado</option>
                          <option value="cotizado">Cotizado</option>
                          <option value="aprobado">Aprobado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>
                        <button className="ghost small card-icon-btn" aria-label="Editar" title="Editar lead" onClick={() => handleEditLead(lead)}><Edit3 size={14} /></button>
                        <button className="ghost small card-icon-btn danger" aria-label="Eliminar" title="Eliminar lead" onClick={() => handleDeleteLead(lead.id)}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {leadView === "lista" && (
                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <SortTh label="Nombre" sortKey="nombre" current={leadSort} onSort={(k) => setLeadSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                        <SortTh label="Empresa" sortKey="empresa" current={leadSort} onSort={(k) => setLeadSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                        <SortTh label="RUT" sortKey="rut" current={leadSort} onSort={(k) => setLeadSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                        <th>Canal</th>
                        <SortTh label="Servicio" sortKey="servicio" current={leadSort} onSort={(k) => setLeadSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                        <SortTh label="Estado" sortKey="estado" current={leadSort} onSort={(k) => setLeadSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                        <th>Tiempo</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td><strong>{lead.nombre}</strong></td>
                          <td>{lead.empresa}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{lead.rut || "—"}</td>
                          <td><span className={`tag ${lead.canal === "wsp" ? "green" : "navy"}`}>{lead.canal === "wsp" ? "WhatsApp" : "Correo"}</span></td>
                          <td>{serviceLabel(lead.servicio)}</td>
                          <td><span className={`tag ${leadEstadoMeta(lead.estado).tagClass}`}>{leadEstadoMeta(lead.estado).label}</span></td>
                          <td style={{ color: "#64748b", fontSize: 12 }}>{lead.tiempo}</td>
                          <td>
                            <div className="row-actions">
                              <button aria-label="Cotizar" title="Crear cotización" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} /></button>
                              <select
                                value={lead.estado}
                                onChange={(e) => handleSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                                style={{ fontSize: 11, padding: "2px 4px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}
                                title="Estado"
                              >
                                <option value="no-cotizado">No cotizado</option>
                                <option value="cotizado">Cotizado</option>
                                <option value="aprobado">Aprobado</option>
                                <option value="rechazado">Rechazado</option>
                              </select>
                              <button aria-label="Editar" title="Editar lead" onClick={() => handleEditLead(lead)}><Edit3 size={15} /></button>
                              <button aria-label="Eliminar" title="Eliminar lead" className="danger" onClick={() => handleDeleteLead(lead.id)}><Trash2 size={15} /></button>
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
                            <span className={`tag ${leadEstadoMeta(lead.estado).tagClass}`} style={{ fontSize: 11 }}>{leadEstadoMeta(lead.estado).label}</span>
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
                          <select
                            value={lead.estado}
                            onChange={(e) => handleSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                            style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", minHeight: 28 }}
                            title="Estado"
                          >
                            <option value="no-cotizado">No cotizado</option>
                            <option value="cotizado">Cotizado</option>
                            <option value="aprobado">Aprobado</option>
                            <option value="rechazado">Rechazado</option>
                          </select>
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
              searchPlaceholder="Buscar por RUT, nombre, contacto o correo..."
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
                  <tr>
                    <SortTh label="RUT" sortKey="rut" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                    <SortTh label="Nombre / Empresa" sortKey="nombre" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                    <SortTh label="Contacto" sortKey="contacto" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                    <th>Teléfono</th><th>Ciudad</th>
                    <SortTh label="Estado" sortKey="estado" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
                    <th>Acciones</th>
                  </tr>
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
            <ProductsModule
              catalogo={catalogo}
              setCatalogo={setCatalogo}
              plantillas={plantillas}
              onUpsertPlantilla={handleUpsertPlantilla}
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
                    condiciones={cotizCondiciones}
                    setCondiciones={setCotizCondiciones}
                    garantia={cotizGarantia}
                    setGarantia={setCotizGarantia}
                    validez={cotizValidez}
                    setValidez={setCotizValidez}
                    items={cotizItems}
                    setItems={setCotizItems}
                    onEmitir={handleEmitirCotizacion}
                    onDescargarPDF={handlePrintQuote}
                    emitiendo={emitiendo}
                  />
                </div>
                {noCotizados.length > 0 && (
                  <div className="panel">
                    <div className="panel-head">
                      <div className="panel-title"><Activity size={18} />Leads por cotizar</div>
                      <span className="tag amber">{noCotizados.length} pendiente{noCotizados.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                      {noCotizados.slice(0, 6).map((lead) => (
                        <div key={lead.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2340", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.empresa || lead.nombre}</div>
                            <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
              </div>

              <div className="stack">
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
                  validez={cotizValidez}
                  garantia={cotizGarantia}
                  condiciones={cotizCondiciones}
                />
              </div>
            </section>
          )}

          {active === "historial" && (
            <section className="stack">
              <HistorialModule cotizaciones={cotizaciones} clientes={clientes} onVerCotizacion={handleVerCotizacion} onUpdateEstado={handleUpdateCotizacionEstado} onDescargarCotizacion={handleDescargarCotizacion} onDeleteCotizacion={handleDeleteCotizacion} />
            </section>
          )}

          {active === "protocolos" && <ProtocolosModule clientes={clientes} notify={notify} />}
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
  noCotizados,
  goTo,
  notify,
  stats,
  cotizaciones,
}: {
  noCotizados: Lead[];
  goTo: (id: ModuleId) => void;
  notify: (message: string) => void;
  stats: DashboardStats | null;
  cotizaciones: Cotizacion[];
}) {
  const leadsValue = stats ? String(stats.leadsPendientes) : String(noCotizados.length);
  const clientesValue = stats ? String(stats.clientesActivos) : "—";
  const totalCotizaciones = cotizaciones.length;
  const totalMonto = cotizaciones.reduce((s, c) => s + (c.monto || 0), 0);
  const cotizacionesValue = totalCotizaciones > 0 ? String(totalCotizaciones) : (stats ? String(stats.cotizacionesAbiertas) : "—");
  const montoStr = totalMonto > 0
    ? `$${(totalMonto / 1000000).toFixed(1).replace(".", ",")}M`
    : (stats ? `$${(stats.ventasAprobadas / 1000000).toFixed(1).replace(".", ",")}M` : "—");

  return (
    <section className="stack">
      <div className="kpi-row">
        <Kpi icon={Activity} label="Leads pendientes" value={leadsValue} delta="No cotizados" tone="amber" />
        <Kpi icon={BriefcaseMedical} label="Clientes activos" value={clientesValue} delta="En base de datos" tone="green" />
        <Kpi icon={ClipboardList} label="Total cotizaciones" value={cotizacionesValue} delta={totalMonto > 0 ? `$${totalMonto.toLocaleString("es-CL")} CLP emitidos` : "Emitidas / en revisión"} tone="amber" />
        <Kpi icon={FileText} label="Monto total" value={montoStr} delta="CLP acumulado" tone="green" />
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
            <span className="tag amber">{noCotizados.length} pendientes</span>
          </div>
          {noCotizados.slice(0, 4).map((lead) => (
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

function SortTh({ label, sortKey, current, onSort }: {
  label: string;
  sortKey: string;
  current: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
}) {
  const active = current.key === sortKey;
  return (
    <th
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => onSort(sortKey)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {active
          ? (current.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronDown size={12} style={{ opacity: 0.25 }} />}
      </span>
    </th>
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
      <button aria-label="Editar" title="Editar registro" onClick={() => onEdit ? onEdit() : notify("Modo edición abierto")}>
        <Edit3 size={15} />
      </button>
      {quote ? <button aria-label="Cotizar" title="Crear cotización" onClick={quote}><ClipboardList size={15} /></button> : null}
      <button
        aria-label="Eliminar"
        title="Eliminar registro"
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
  return `${item.servicio} - ${item.equipo.toUpperCase()}`.trim().replace(/\s*-\s*$/, "");
}

function normCat(cat: string): string {
  return cat.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
}

function resolveDescLarga(item: CatalogoItem, plantillas: Plantilla[]): string {
  if (item.descripcion_larga) return item.descripcion_larga;
  const generalKey = `${item.categoria}_GENERAL`;
  const byGeneral = plantillas.find((p) => p.codigo === generalKey);
  if (byGeneral?.descripcion_larga) return byGeneral.descripcion_larga;
  try {
    const local = JSON.parse(localStorage.getItem("crm_desc_templates") || "{}") as Record<string, string>;
    return local[generalKey] || "";
  } catch { return ""; }
}

function catalogoToCotizacionItem(item: CatalogoItem, plantillas: Plantilla[]): CotizacionItemForm {
  return {
    producto_id: item.id,
    codigo: item.codigo,
    descripcion: catalogoDescription(item),
    descripcion_larga: resolveDescLarga(item, plantillas),
    tipo_servicio: item.categoria || item.texto_base_key,
    precio_unitario: item.precio_neto,
    cantidad: 1,
    descuento_pct: 0,
    glosa: "",
  };
}

function resolveCotizacionItemDesc(
  item: { producto_id?: string; tipo_servicio: string; descripcion_larga: string },
  catalogo: CatalogoItem[],
  plantillas: Plantilla[]
): string {
  if (item.descripcion_larga) return item.descripcion_larga;

  const catalogItem = catalogo.find((c) => c.id === item.producto_id);
  if (catalogItem?.descripcion_larga) return catalogItem.descripcion_larga;

  const serviceKey = item.tipo_servicio;
  const generalKey = `${serviceKey}_GENERAL`;
  return plantillas.find((p) => p.codigo === generalKey)?.descripcion_larga ?? "";
}

const FORMAS_PAGO = ["50% inicio - 50% entrega", "Crédito a 30 días", "Contra entrega"];

const LEAD_ESTADO_META: Record<string, { label: string; tagClass: string }> = {
  "no-cotizado": { label: "No cotizado", tagClass: "amber" },
  cotizado:      { label: "Cotizado",    tagClass: "navy"  },
  aprobado:      { label: "Aprobado",    tagClass: "green" },
  rechazado:     { label: "Rechazado",   tagClass: "red"   },
};
function leadEstadoMeta(estado: string) {
  return LEAD_ESTADO_META[estado] ?? { label: estado, tagClass: "amber" };
}

function CotizadorForm({
  clientes, catalogo, plantillas,
  clienteId, setClienteId,
  notas, setNotas,
  formaPago, setFormaPago,
  condiciones, setCondiciones,
  garantia, setGarantia,
  validez, setValidez,
  items, setItems,
  onEmitir, onDescargarPDF, emitiendo = false,
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
  condiciones: string;
  setCondiciones: (v: string) => void;
  garantia: string;
  setGarantia: (v: string) => void;
  validez: number;
  setValidez: (v: number) => void;
  items: CotizacionItemForm[];
  setItems: React.Dispatch<React.SetStateAction<CotizacionItemForm[]>>;
  onEmitir: () => void;
  onDescargarPDF: () => void;
  emitiendo?: boolean;
}) {
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [condOpen, setCondOpen] = useState(false);
  const [garantOpen, setGarantOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDrop, setShowClienteDrop] = useState(false);

  const selectedCliente = clientes.find((c) => c.id === clienteId);

  useEffect(() => { setClienteSearch(""); }, [clienteId]);

  const clientesDrop = useMemo(() => {
    if (!clienteSearch) return clientes.slice(0, 8);
    const q = clienteSearch.toLowerCase();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || (c.rut || "").includes(q)).slice(0, 8);
  }, [clientes, clienteSearch]);

  const filtered = catalogo.filter((c) => {
    if (catFilter && c.categoria !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.codigo.toLowerCase().includes(q) || c.equipo.toLowerCase().includes(q) || c.servicio.toLowerCase().includes(q);
    }
    return true;
  });

  function addItem(cat: CatalogoItem) {
    setItems((prev) => [...prev, catalogoToCotizacionItem(cat, plantillas)]);
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
        <div style={{ position: "relative" }}>
          {selectedCliente && !showClienteDrop ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", background: "#f8fafc" }}
              onClick={() => { setShowClienteDrop(true); setClienteSearch(""); }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#0f2340" }}>{selectedCliente.nombre}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{selectedCliente.rut}</span>
              <X size={13} style={{ color: "#94a3b8", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setClienteId(""); }} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #0e948b", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
              <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                autoFocus
                placeholder="Buscar cliente por nombre o RUT..."
                value={clienteSearch}
                onChange={(e) => { setClienteSearch(e.target.value); setShowClienteDrop(true); }}
                onFocus={() => setShowClienteDrop(true)}
                onBlur={() => setTimeout(() => setShowClienteDrop(false), 150)}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent" }}
              />
            </div>
          )}
          {showClienteDrop && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 50, maxHeight: 240, overflowY: "auto", marginTop: 2 }}>
              {clientesDrop.length === 0 && <div style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 13 }}>Sin resultados</div>}
              {clientesDrop.map((c) => (
                <div
                  key={c.id}
                  onMouseDown={() => { setClienteId(c.id); setShowClienteDrop(false); }}
                  style={{ padding: "9px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0f2340" }}>{c.nombre}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{c.rut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </label>
      <label>Forma de pago
        <select value={FORMAS_PAGO.includes(formaPago) ? formaPago : "otro"} onChange={(e) => setFormaPago(e.target.value)}>
          {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <span style={{ flex: "0 0 auto" }}>Validez (días)</span>
        <input type="number" min={1} max={365} value={validez} onChange={(e) => setValidez(Math.max(1, Number(e.target.value)))} style={{ width: 80 }} />
      </label>

      {/* Condiciones comerciales */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setCondOpen((v) => !v)}
          style={{ width: "100%", background: "#f8fafc", border: "none", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#0f2340" }}
        >
          <span>Condiciones comerciales</span>
          {condOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {condOpen && (
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Una condición por línea. Se muestran como lista con viñetas en el PDF.</p>
            <textarea
              rows={7}
              value={condiciones}
              onChange={(e) => setCondiciones(e.target.value)}
              style={{ width: "100%", fontSize: 12, lineHeight: 1.6, resize: "vertical", borderRadius: 6, border: "1px solid #e2e8f0", padding: "8px 10px" }}
            />
          </div>
        )}
      </div>

      {/* Condiciones de garantía */}
      <div style={{ border: "1px solid #fed7aa", borderRadius: 8, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setGarantOpen((v) => !v)}
          style={{ width: "100%", background: "#fff7ed", border: "none", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#9a3412" }}
        >
          <span>Condiciones de garantía</span>
          {garantOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {garantOpen && (
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Aparece como sección separada en el PDF si tiene contenido.</p>
            <textarea
              rows={4}
              value={garantia}
              onChange={(e) => setGarantia(e.target.value)}
              placeholder="Ej: Garantía de 3 meses por mano de obra. Repuestos con garantía de fábrica..."
              style={{ width: "100%", fontSize: 12, lineHeight: 1.6, resize: "vertical", borderRadius: 6, border: "1px solid #fed7aa", padding: "8px 10px" }}
            />
          </div>
        )}
      </div>

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
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 70 }} />
              <col />
              <col style={{ width: 76 }} />
              <col style={{ width: 76 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Código</th>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Descripción</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Precio</th>
                <th style={{ padding: "4px 8px" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "4px 8px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.codigo}</td>
                  <td style={{ padding: "4px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.equipo || c.servicio}>{c.equipo || c.servicio}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" }}>{money(c.precio_neto)}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>
                    <button
                      style={{ padding: "2px 8px", fontSize: 11, background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
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
            <div key={idx} style={{ minWidth: 360, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 90px 58px 24px", gap: "4px 6px", alignItems: "center", fontSize: 12 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingTop: 2 }} title={it.descripcion}>{it.descripcion}</span>
                <input type="number" min={1} value={it.cantidad} onChange={(e) => updateItem(idx, { cantidad: Number(e.target.value) })} style={{ textAlign: "center", padding: "4px 4px", minHeight: 30 }} />
                <input type="number" min={0} value={it.precio_unitario} onChange={(e) => updateItem(idx, { precio_unitario: Number(e.target.value) })} style={{ padding: "4px 6px", minHeight: 30 }} />
                <input type="number" min={0} max={100} value={it.descuento_pct} onChange={(e) => updateItem(idx, { descuento_pct: Number(e.target.value) })} style={{ textAlign: "center", padding: "4px 4px", minHeight: 30 }} />
                <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "flex", alignItems: "center" }}>
                  <X size={14} />
                </button>
              </div>
              <textarea
                placeholder="Glosa adicional (opcional)..."
                value={it.glosa ?? ""}
                onChange={(e) => updateItem(idx, { glosa: e.target.value })}
                rows={1}
                style={{ marginTop: 4, width: "100%", fontSize: 11, color: "#475569", resize: "vertical", borderRadius: 4, border: "1px solid #e2e8f0", padding: "4px 8px", lineHeight: 1.5, minHeight: 28 }}
              />
            </div>
          ))}
          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            Neto: {money(subtotal)} · IVA: {money(Math.round(subtotal * 0.19))} · <span style={{ fontSize: 15 }}>Total: {money(subtotal + Math.round(subtotal * 0.19))} CLP</span>
          </div>
        </div>
      )}

      <label>Notas / Observaciones<textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} /></label>

      {/* Email automático — placeholder Resend (no funcional aún) */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", padding: "8px 10px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "not-allowed", opacity: 0.7 }}>
        <input type="checkbox" disabled style={{ width: 15, height: 15, minHeight: 0, margin: 0, flexShrink: 0 }} />
        <span>Enviar correo automáticamente al cliente al emitir</span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>Próximamente</span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        <button className="ghost" onClick={() => setItems([])}>
          <X size={15} />Limpiar
        </button>
        <button className="ghost" onClick={onDescargarPDF} disabled={items.length === 0}>
          <Printer size={16} />PDF
        </button>
        <button className="primary" style={{ gridColumn: "1 / -1" }} onClick={onEmitir} disabled={!clienteId || items.length === 0 || emitiendo}>
          {emitiendo ? <><span className="btn-spinner" />Emitiendo…</> : <><Send size={16} />Emitir cotización</>}
        </button>
      </div>
    </div>
  );
}


function CotizadorPreview({
  clientes, clienteId, items, notas, formaPago, fecha, validez, garantia, condiciones,
}: {
  clientes: Cliente[];
  clienteId: string;
  items: CotizacionItemForm[];
  notas: string;
  formaPago: string;
  fecha: string;
  validez: number;
  garantia: string;
  condiciones: string;
}) {
  const clienteObj = clientes.find((c) => c.id === clienteId);
  const subtotal = items.reduce((s, it) => s + Math.round(it.precio_unitario * it.cantidad * (1 - it.descuento_pct / 100)), 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  const condLines = condiciones.split("\n").filter(Boolean);

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
            <dt>Correo</dt><dd>{clienteObj?.correo || "—"}</dd>
            <dt>Teléfono</dt><dd>{clienteObj?.telefono || "—"}</dd>
            <dt>Dirección</dt><dd>{clienteObj?.direccion || "—"}</dd>
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
                    <td>
                      {it.descripcion}{it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : ""}
                      {it.glosa && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, whiteSpace: "pre-wrap" }}>{it.glosa}</div>}
                    </td>
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
          <div className="quote-conditions">
            <strong>Condiciones Comerciales</strong>
            {formaPago && <p style={{ fontSize: 11, margin: "4px 0" }}><strong>Forma de pago:</strong> {formaPago}</p>}
            <p style={{ fontSize: 11, margin: "4px 0" }}><strong>Validez:</strong> {validez} días desde emisión</p>
            {condLines.length > 0 && (
              <ul style={{ margin: "4px 0 0 14px", padding: 0, fontSize: 11 }}>
                {condLines.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            )}
          </div>
          {garantia && (
            <div className="quote-garantia">
              <strong>Condiciones de Garantía</strong>
              <p style={{ marginTop: 4, fontSize: 11, whiteSpace: "pre-wrap" }}>{garantia}</p>
            </div>
          )}
        </section>
        <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por {validez} días</footer>
      </div>
    </article>
  );
}

type ServiceTypeEntry = { id: string; label: string; defaultPrice: number };
const SERVICE_TYPES_DEFAULTS: ServiceTypeEntry[] = [
  { id: "VS", label: "Visita técnica", defaultPrice: 45000 },
  { id: "MP", label: "Mantención preventiva", defaultPrice: 85000 },
  { id: "MC", label: "Mantención correctiva", defaultPrice: 120000 },
  { id: "BS", label: "Bloque servicio", defaultPrice: 65000 },
  { id: "EV", label: "Evaluación diagnóstica", defaultPrice: 55000 },
  { id: "RS", label: "Repuesto / Insumo", defaultPrice: 0 },
];
const EQUIP_CAT_DEFAULTS = ["Médico", "Dental", "Estético", "Otro"];

function DescripcionEditor({ codigo, label, value, plantillaId, onSave }: {
  codigo: string; label: string; value: string;
  plantillaId: string | null;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const hasContent = value.trim().length > 0;

  if (!editing) {
    return (
      <div style={{ display: "flex", gap: 12, padding: "10px 14px", background: hasContent ? "#f0faf5" : "#fafafa", borderRadius: 8, border: `1px solid ${hasContent ? "#bbf7d0" : "#e2e8f0"}`, alignItems: "flex-start" }}>
        <span className="tag navy" style={{ flexShrink: 0, minWidth: 44, textAlign: "center", fontSize: 11, marginTop: 2 }}>{codigo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2340", marginBottom: hasContent ? 4 : 0 }}>{label}</div>
          {hasContent
            ? <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{value}</p>
            : <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>Sin descripción — haz clic en Editar para agregar</span>
          }
        </div>
        <button onClick={() => { setDraft(value); setEditing(true); }} style={{ flexShrink: 0, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
          <Edit3 size={12} />Editar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 14px", background: "#fff", borderRadius: 8, border: "2px solid #0e948b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="tag navy" style={{ fontSize: 11 }}>{codigo}</span>
          <strong style={{ fontSize: 13, color: "#0f2340" }}>{label}</strong>
          {plantillaId && <span style={{ fontSize: 11, color: "#94a3b8" }}>guardado en API</span>}
        </div>
      </div>
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={800}
        placeholder={`Describe qué incluye el servicio de ${label.toLowerCase()}...`}
        style={{ width: "100%", fontSize: 13, lineHeight: 1.6, resize: "vertical", borderRadius: 6, border: "1px solid #e2e8f0", padding: "8px 10px" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setEditing(false)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", color: "#64748b" }}>Cancelar</button>
        <button className="primary small" onClick={() => { onSave(draft.trim()); setEditing(false); }}>Guardar</button>
      </div>
    </div>
  );
}

function AddCatDescRow({ svcId, equipCats, existing, onAdd }: {
  svcId: string;
  equipCats: string[];
  existing: string[];
  onAdd: (catKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const available = equipCats.filter((c) => {
    const key = `${svcId}_${normCat(c)}`;
    return !existing.includes(key);
  });

  if (!open) {
    return (
      <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 12px" }}>
        <button
          onClick={() => { setOpen(true); setSelected(available[0] || ""); }}
          style={{ background: "none", border: "1px dashed #cbd5e0", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}
        ><Plus size={12} />Agregar descripción por categoría de equipo</button>
      </div>
    );
  }

  return (
    <div style={{ borderTop: "1px solid #e2e8f0", padding: "10px 12px", background: "#fafafa", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#64748b" }}>Categoría:</span>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ fontSize: 13 }}>
        {available.map((c) => <option key={c} value={c}>{c} → {svcId}_{normCat(c)}</option>)}
      </select>
      <button
        className="primary small"
        disabled={!selected}
        onClick={() => { onAdd(`${svcId}_${normCat(selected)}`); setOpen(false); }}
      >Crear</button>
      <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12 }}>Cancelar</button>
    </div>
  );
}

function ProductsModule({
  catalogo, setCatalogo, plantillas, onUpsertPlantilla, notify,
}: {
  catalogo: CatalogoItem[];
  setCatalogo: React.Dispatch<React.SetStateAction<CatalogoItem[]>>;
  plantillas: Plantilla[];
  onUpsertPlantilla: (existingId: string | null, codigo: string, descripcion: string) => void;
  notify: (msg: string) => void;
}) {
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeEntry[]>(() => {
    try { const s = localStorage.getItem("crm_svc_types"); return s ? JSON.parse(s) : SERVICE_TYPES_DEFAULTS; } catch { return SERVICE_TYPES_DEFAULTS; }
  });
  const [equipCats, setEquipCats] = useState<string[]>(() => {
    try { const s = localStorage.getItem("crm_equip_cats"); return s ? JSON.parse(s) : EQUIP_CAT_DEFAULTS; } catch { return EQUIP_CAT_DEFAULTS; }
  });
  const [descTemplates, setDescTemplates] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem("crm_desc_templates"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("crm_svc_types", JSON.stringify(serviceTypes)); } catch {} }, [serviceTypes]);
  useEffect(() => { try { localStorage.setItem("crm_equip_cats", JSON.stringify(equipCats)); } catch {} }, [equipCats]);
  useEffect(() => { try { localStorage.setItem("crm_desc_templates", JSON.stringify(descTemplates)); } catch {} }, [descTemplates]);
  const [catServiceMap, setCatServiceMap] = useState<Record<string, string[]>>(() => {
    try { const s = localStorage.getItem("crm_cat_svc_map"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("crm_cat_svc_map", JSON.stringify(catServiceMap)); } catch {} }, [catServiceMap]);

  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState<"product" | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newEquipCat, setNewEquipCat] = useState("");
  const [newSvcId, setNewSvcId] = useState("");
  const [newSvcLabel, setNewSvcLabel] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [prodForm, setProdForm] = useState<{
    nombre: string;
    equipCat: string;
    servicios: { id: string; precio: string; descripcion: string; enabled: boolean }[];
  }>({ nombre: "", equipCat: EQUIP_CAT_DEFAULTS[0], servicios: [] });

  function getEquipCat(item: CatalogoItem): string {
    const key = item.texto_base_key;
    if (!key) return "Otro";
    // New format: SVC_EquipCat (e.g., "MP_Médico", "VS_Dental")
    const under = key.indexOf("_");
    if (under > 0) return key.slice(under + 1);
    // Legacy format: EQUIPCAT:SVC
    if (key.includes(":")) return key.split(":")[0];
    return "Otro";
  }

  function resolveDesc(equipCat: string, svcId: string): string {
    const genKey = `${svcId}_GENERAL`;
    const byGeneral = plantillas.find((p) => p.codigo === genKey);
    return byGeneral?.descripcion_larga || descTemplates[genKey] || "";
  }

  function getAllowedServices(cat: string): string[] {
    const mapped = catServiceMap[cat];
    if (!mapped || mapped.length === 0) return serviceTypes.map((st) => st.id);
    return mapped;
  }

  function nextCode(svcId: string): string {
    const nums = catalogo
      .filter((c) => c.categoria === svcId && new RegExp(`^${svcId}\\d+$`).test(c.codigo))
      .map((c) => parseInt(c.codigo.slice(svcId.length), 10))
      .filter((n) => !isNaN(n));
    return `${svcId}${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
  }

  const groups = useMemo(() => {
    const map: Record<string, { equipCat: string; items: CatalogoItem[] }> = {};
    for (const item of catalogo) {
      const ec = getEquipCat(item);
      if (catFilter && ec !== catFilter) continue;
      if (search && !item.equipo.toLowerCase().includes(search.toLowerCase()) && !item.codigo.toLowerCase().includes(search.toLowerCase())) continue;
      if (!map[item.equipo]) map[item.equipo] = { equipCat: ec, items: [] };
      map[item.equipo].items.push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [catalogo, catFilter, search]);

  function openAdd() {
    if (modal === "product" && !editingGroup) return;
    setEditingGroup(null);
    const cat = equipCats[0] || "Médico";
    const allowed = getAllowedServices(cat);
    setProdForm({ nombre: "", equipCat: cat, servicios: serviceTypes.filter((st) => allowed.includes(st.id)).map((st) => ({ id: st.id, precio: st.defaultPrice > 0 ? String(st.defaultPrice) : "", descripcion: "", enabled: false })) });
    setModal("product");
  }

  function openEdit(equipName: string, items: CatalogoItem[], equipCat: string) {
    setEditingGroup(equipName);
    const allowed = getAllowedServices(equipCat);
    setProdForm({
      nombre: equipName,
      equipCat,
      servicios: serviceTypes.filter((st) => allowed.includes(st.id)).map((st) => {
        const ex = items.find((i) => i.categoria === st.id);
        return { id: st.id, precio: ex ? String(ex.precio_neto) : "", descripcion: ex?.descripcion_larga || "", enabled: !!ex };
      }),
    });
    setModal("product");
  }

  async function handleDeleteGroup(items: CatalogoItem[]) {
    if (!window.confirm(`¿Eliminar "${items[0]?.equipo}" y sus ${items.length} servicio(s)?`)) return;
    const name = items[0]?.equipo;
    setCatalogo((prev) => prev.filter((c) => !items.some((i) => i.id === c.id)));
    await Promise.all(items.map((i) => api.deleteCatalogoItem(i.id)));
    notify(`Equipo "${name}" eliminado`);
  }

  async function handleSaveProd() {
    if (!prodForm.nombre.trim()) { notify("Ingresa el nombre del equipo"); return; }
    const enabled = prodForm.servicios.filter((s) => s.enabled && s.precio !== "");
    if (enabled.length === 0) { notify("Activa al menos un tipo de servicio con precio"); return; }
    setSaving(true);
    const svcLabel = Object.fromEntries(serviceTypes.map((st) => [st.id, st.label]));

    if (editingGroup) {
      const existing = catalogo.filter((c) => c.equipo === editingGroup);
      for (const s of enabled) {
        const ex = existing.find((c) => c.categoria === s.id);
        const form: CatalogoItemForm = {
          codigo: ex?.codigo || nextCode(s.id),
          categoria: s.id,
          servicio: svcLabel[s.id] || s.id,
          equipo: prodForm.nombre,
          unidad: "Servicio",
          precio_neto: s.precio,
          texto_base_key: `${s.id}_${prodForm.equipCat}`,
          descripcion_larga: s.descripcion,
        };
        if (ex) {
          const updated = await api.updateCatalogoItem(ex.id, form);
          if (updated) setCatalogo((prev) => prev.map((c) => c.id === ex.id ? updated : c));
        } else {
          const created = await api.createCatalogoItem(form);
          if (created) setCatalogo((prev) => [...prev, created]);
        }
      }
      const toDelete = existing.filter((c) => !enabled.some((s) => s.id === c.categoria));
      for (const item of toDelete) {
        setCatalogo((prev) => prev.filter((c) => c.id !== item.id));
        await api.deleteCatalogoItem(item.id);
      }
      notify(`Equipo "${prodForm.nombre}" actualizado`);
    } else {
      for (const s of enabled) {
        const form: CatalogoItemForm = {
          codigo: nextCode(s.id),
          categoria: s.id,
          servicio: svcLabel[s.id] || s.id,
          equipo: prodForm.nombre,
          unidad: "Servicio",
          precio_neto: s.precio,
          texto_base_key: `${s.id}_${prodForm.equipCat}`,
          descripcion_larga: s.descripcion,
        };
        const created = await api.createCatalogoItem(form);
        if (created) setCatalogo((prev) => [...prev, created]);
      }
      notify(`Equipo "${prodForm.nombre}" agregado con ${enabled.length} servicio(s)`);
    }
    setSaving(false);
    setModal(null);
  }

  return (
    <section className="stack">
      <div className="module-toolbar">
        <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
          <div className="segmented">
            <button className={!catFilter ? "selected" : ""} onClick={() => setCatFilter("")}>Todos <span>{groups.length}</span></button>
            {equipCats.map((cat) => {
              const count = groups.filter(([, g]) => g.equipCat === cat).length;
              return <button key={cat} className={catFilter === cat ? "selected" : ""} onClick={() => setCatFilter(cat)}>{cat} <span>{count}</span></button>;
            })}
          </div>
          <input placeholder="Buscar equipo..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ghost" onClick={() => setSettingsOpen((v) => !v)} title="Gestionar tipos de servicio y categorías"><Settings size={15} />Configurar</button>
          <button className="primary" onClick={openAdd}><Plus size={16} />Nuevo ítem</button>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <>
        <div className="panel" style={{ padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Categorías de equipo */}
            <div style={{ minWidth: 220, flex: "0 0 220px" }}>
              <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Categorías de equipo</strong>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {equipCats.map((cat) => (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ flex: 1, color: "#475569" }}>{cat}</span>
                    <button onClick={() => { if (window.confirm(`¿Eliminar categoría "${cat}"?`)) setEquipCats((p) => p.filter((c) => c !== cat)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}><Trash2 size={13} /></button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input placeholder="Nueva categoría" value={newEquipCat} onChange={(e) => setNewEquipCat(e.target.value)} style={{ flex: 1 }} maxLength={40} />
                  <button className="primary small" onClick={() => { if (!newEquipCat.trim()) { notify("Debe ingresar una categoría"); return; } if (equipCats.includes(newEquipCat.trim())) { notify("Ya existe"); return; } setEquipCats((p) => [...p, newEquipCat.trim()]); setNewEquipCat(""); }}><Plus size={14} /></button>
                </div>
              </div>
            </div>

            {/* Tipos de servicio */}
            <div style={{ flex: 1, minWidth: 360 }}>
              <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Tipos de servicio</strong>
              <div style={{ marginTop: 8, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase", borderRadius: "6px 0 0 6px" }}>Código</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Nombre</th>
                      <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#475569", fontSize: 11, textTransform: "uppercase" }}>Precio base</th>
                      <th style={{ width: 32, borderRadius: "0 6px 6px 0" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {serviceTypes.map((st) => (
                      <tr key={st.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 10px" }}><span className="tag navy" style={{ fontSize: 11 }}>{st.id}</span></td>
                        <td style={{ padding: "7px 10px", color: "#0f2340" }}>{st.label}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: "#475569" }}>{st.defaultPrice > 0 ? money(st.defaultPrice) : <span style={{ color: "#cbd5e0" }}>—</span>}</td>
                        <td style={{ padding: "7px 6px", textAlign: "center" }}>
                          <button
                            onClick={() => { if (window.confirm(`¿Eliminar tipo de servicio "${st.id}"?`)) setServiceTypes((p) => p.filter((s) => s.id !== st.id)); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2, display: "flex" }}
                          ><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Agregar nuevo tipo */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <input
                  placeholder="Código (ej: DX)"
                  value={newSvcId}
                  onChange={(e) => setNewSvcId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  style={{ width: 90 }}
                  maxLength={6}
                />
                <input
                  placeholder="Nombre del servicio"
                  value={newSvcLabel}
                  onChange={(e) => setNewSvcLabel(e.target.value)}
                  style={{ flex: 1, minWidth: 140 }}
                  maxLength={60}
                />
                <input
                  type="number"
                  placeholder="Precio base"
                  value={newSvcPrice}
                  onChange={(e) => setNewSvcPrice(e.target.value)}
                  style={{ width: 110 }}
                  min={0}
                />
                <button
                  className="primary small"
                  onClick={() => {
                    const id = newSvcId.trim();
                    const label = newSvcLabel.trim();
                    if (!id) { notify("Debe ingresar un código"); return; }
                    if (!label) { notify("Debe ingresar el nombre del servicio"); return; }
                    if (serviceTypes.some((s) => s.id === id)) { notify(`El código "${id}" ya existe`); return; }
                    setServiceTypes((p) => [...p, { id, label, defaultPrice: Number(newSvcPrice) || 0 }]);
                    setNewSvcId(""); setNewSvcLabel(""); setNewSvcPrice("");
                  }}
                ><Plus size={14} />Agregar</button>
              </div>
            </div>
          </div>

          {/* Servicios por categoría */}
          <div style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Servicios por categoría</strong>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 10px" }}>Define qué tipos de servicio aparecen al crear o editar un ítem de cada categoría</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {equipCats.map((cat) => {
                const catAllowed = catServiceMap[cat];
                return (
                  <div key={cat} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2340", marginBottom: 8 }}>{cat}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {serviceTypes.map((st) => {
                        const checked = !catAllowed || catAllowed.length === 0 || catAllowed.includes(st.id);
                        return (
                          <label key={st.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", padding: "3px 8px", borderRadius: 6, background: checked ? "#e6f4f3" : "#f8fafc", border: `1px solid ${checked ? "#0e948b" : "#e2e8f0"}`, userSelect: "none" as const }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              style={{ width: 13, height: 13, margin: 0, minHeight: 0 }}
                              onChange={(e) => {
                                setCatServiceMap((prev) => {
                                  const current = (prev[cat] && prev[cat].length > 0) ? prev[cat] : serviceTypes.map((s) => s.id);
                                  const updated = e.target.checked ? [...current.filter((id) => id !== st.id), st.id] : current.filter((id) => id !== st.id);
                                  return { ...prev, [cat]: updated.length === serviceTypes.length ? [] : updated };
                                });
                              }}
                            />
                            <span className="tag navy" style={{ fontSize: 10, padding: "1px 5px" }}>{st.id}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Descripciones de servicios */}
      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="panel-title" style={{ marginBottom: 0 }}><FileText size={16} />Descripciones de servicios</div>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Plantillas usadas en el glosario de cotización</span>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
          {serviceTypes.map((st) => {
            const genKey = `${st.id}_GENERAL`;
            const genPlantilla = plantillas.find((p) => p.codigo === genKey);
            const genVal = genPlantilla?.descripcion_larga || descTemplates[genKey] || "";
            // Category-specific keys: all descTemplates starting with "${st.id}_" except GENERAL
            const catKeys = Object.keys(descTemplates).filter((k) => k.startsWith(`${st.id}_`) && k !== genKey);
            return (
              <div key={st.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                {/* General */}
                <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: catKeys.length > 0 ? "1px solid #e2e8f0" : undefined, fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {st.id}_GENERAL — {st.label}
                </div>
                <div style={{ padding: 12 }}>
                  <DescripcionEditor
                    codigo={genKey}
                    label={`${st.label} (general)`}
                    value={genVal}
                    plantillaId={genPlantilla?.id || null}
                    onSave={(val) => {
                      setDescTemplates((p) => ({ ...p, [genKey]: val }));
                      onUpsertPlantilla(genPlantilla?.id || null, genKey, val);
                      notify(`Descripción ${genKey} guardada`);
                    }}
                  />
                </div>
                {/* Category-specific */}
                {catKeys.map((catKey) => {
                  const catPlantilla = plantillas.find((p) => p.codigo === catKey);
                  const catVal = catPlantilla?.descripcion_larga || descTemplates[catKey] || "";
                  return (
                    <div key={catKey}>
                      <div style={{ padding: "6px 12px", background: "#f0faf5", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#0e948b", textTransform: "uppercase", letterSpacing: ".06em" }}>{catKey}</span>
                        <button
                          onClick={() => { if (window.confirm(`¿Eliminar plantilla "${catKey}"?`)) setDescTemplates((p) => { const n = { ...p }; delete n[catKey]; return n; }); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}
                        ><Trash2 size={12} /></button>
                      </div>
                      <div style={{ padding: 12 }}>
                        <DescripcionEditor
                          codigo={catKey}
                          label={catKey}
                          value={catVal}
                          plantillaId={catPlantilla?.id || null}
                          onSave={(val) => {
                            setDescTemplates((p) => ({ ...p, [catKey]: val }));
                            onUpsertPlantilla(catPlantilla?.id || null, catKey, val);
                            notify(`Descripción ${catKey} guardada`);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {/* Add category-specific */}
                <AddCatDescRow
                  svcId={st.id}
                  equipCats={equipCats}
                  existing={catKeys}
                  onAdd={(catKey) => {
                    setDescTemplates((p) => ({ ...p, [catKey]: "" }));
                    notify(`Plantilla ${catKey} creada — agrega la descripción`);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

      {/* Unified products table */}
      <div className="panel table-card" style={{ overflowX: "auto" }}>
        <table style={{ tableLayout: "fixed", minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ width: "32%" }}>Equipo</th>
              <th style={{ width: "12%" }}>Categoría</th>
              {serviceTypes.map((st) => <th key={st.id} title={st.label} style={{ textAlign: "right", fontSize: 11 }}>{st.id}</th>)}
              <th style={{ width: 72 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={3 + serviceTypes.length} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                {search || catFilter ? "Sin resultados para este filtro." : "No hay equipos registrados. Haz clic en «Nuevo ítem» para agregar."}
              </td></tr>
            )}
            {groups.map(([equipName, { items, equipCat }]) => (
              <tr key={equipName}>
                <td><strong style={{ fontSize: 13 }}>{equipName}</strong></td>
                <td><span className="tag navy" style={{ fontSize: 11 }}>{equipCat}</span></td>
                {serviceTypes.map((st) => {
                  const item = items.find((i) => i.categoria === st.id);
                  return <td key={st.id} style={{ textAlign: "right", fontSize: 12 }}>{item ? <strong>{money(item.precio_neto)}</strong> : <span style={{ color: "#cbd5e0" }}>—</span>}</td>;
                })}
                <td>
                  <div className="row-actions">
                    <button aria-label="Editar" onClick={() => openEdit(equipName, items, equipCat)} title="Editar"><Edit3 size={14} /></button>
                    <button aria-label="Eliminar" className="danger" onClick={() => handleDeleteGroup(items)} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product add/edit modal */}
      {modal === "product" && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h2>{editingGroup ? `Editar: ${editingGroup}` : "Nuevo ítem"}</h2>
              <button onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            <div className="modal-grid">
              <label className="wide">
                Nombre del ítem *
                <input value={prodForm.nombre} onChange={(e) => setProdForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Autoclave clase B 23L" maxLength={120} />
              </label>
              <label>
                Categoría *
                <select value={prodForm.equipCat} onChange={(e) => {
                  const newCat = e.target.value;
                  const allowed = getAllowedServices(newCat);
                  setProdForm((f) => ({
                    ...f,
                    equipCat: newCat,
                    servicios: serviceTypes.filter((st) => allowed.includes(st.id)).map((st) => ({
                      id: st.id,
                      precio: st.defaultPrice > 0 ? String(st.defaultPrice) : "",
                      descripcion: "",
                      enabled: false,
                    })),
                  }));
                }}>
                  {equipCats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <div className="wide">
                <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Tipos de servicio</p>
                {prodForm.servicios.map((s, idx) => {
                  const stLabel = serviceTypes.find((st) => st.id === s.id)?.label ?? s.id;
                  const tplDesc = resolveDesc(prodForm.equipCat, s.id);
                  return (
                    <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: s.enabled ? "#fff" : "#f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                          <input type="checkbox" checked={s.enabled} onChange={(e) => setProdForm((f) => ({ ...f, servicios: f.servicios.map((sv, i) => i === idx ? { ...sv, enabled: e.target.checked } : sv) }))} style={{ width: 15, height: 15, minHeight: 0, margin: 0, flexShrink: 0 }} />
                          <span className="tag navy" style={{ fontSize: 11 }}>{s.id}</span>
                          <span style={{ color: "#475569", fontWeight: 400 }}>{stLabel}</span>
                        </label>
                        {s.enabled && (
                          <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", margin: 0 }}>
                            <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>Precio neto:</span>
                            <input type="number" min={0} value={s.precio} onChange={(e) => setProdForm((f) => ({ ...f, servicios: f.servicios.map((sv, i) => i === idx ? { ...sv, precio: e.target.value } : sv) }))} placeholder="85000" style={{ width: 110, minHeight: 32, fontSize: 13 }} />
                          </label>
                        )}
                      </div>
                      {s.enabled && (
                        <label style={{ marginTop: 8, display: "block" }}>
                          <span style={{ fontSize: 11, color: "#64748b" }}>Descripción en cotización (opcional)</span>
                          <textarea rows={2} value={s.descripcion} placeholder={tplDesc || `Descripción de ${stLabel}...`} onChange={(e) => setProdForm((f) => ({ ...f, servicios: f.servicios.map((sv, i) => i === idx ? { ...sv, descripcion: e.target.value } : sv) }))} style={{ fontSize: 12, marginTop: 2 }} maxLength={600} />
                          {tplDesc && !s.descripcion && <span style={{ fontSize: 11, color: "#94a3b8" }}>Dejando vacío se usará la plantilla de &quot;{prodForm.equipCat}:{s.id}&quot;</span>}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="primary" onClick={handleSaveProd} disabled={saving}>{saving ? "Guardando..." : editingGroup ? "Actualizar" : "Guardar ítem"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function PeriodoPicker({ anio, mes, fechas, onAnio, onMes }: {
  anio: number; mes: number; fechas: string[];
  onAnio: (v: number) => void; onMes: (v: number) => void;
}) {
  const anios = useMemo(() => {
    const set = new Set<number>();
    set.add(new Date().getFullYear());
    fechas.forEach((f) => { if (f) { const y = new Date(f).getFullYear(); if (y > 2000) set.add(y); } });
    return Array.from(set).sort((a, b) => b - a);
  }, [fechas]);

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
      <select
        value={anio || ""}
        onChange={(e) => { onAnio(e.target.value ? Number(e.target.value) : 0); onMes(0); }}
        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}
      >
        <option value="">Todos los años</option>
        {anios.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      {anio > 0 && (
        <select
          value={mes || ""}
          onChange={(e) => onMes(e.target.value ? Number(e.target.value) : 0)}
          style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}
        >
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      )}
    </div>
  );
}

const COT_ESTADOS = ["Pendiente", "En revisión", "Aprobada", "Rechazada"];

function HistorialModule({ cotizaciones, clientes, onVerCotizacion, onUpdateEstado, onDescargarCotizacion, onDeleteCotizacion }: {
  cotizaciones: Cotizacion[];
  clientes: Cliente[];
  onVerCotizacion: (id: string) => void;
  onUpdateEstado: (id: string, estado: string) => void;
  onDescargarCotizacion: (id: string) => void;
  onDeleteCotizacion: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [anioFilter, setAnioFilter] = useState(0);
  const [mesFilter, setMesFilter] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "fecha", dir: "desc" });

  function getCliente(clienteId: string) {
    return clientes.find((c) => c.id === clienteId || c.nombre === clienteId);
  }

  function getClienteName(clienteId: string) {
    return getCliente(clienteId)?.nombre ?? clienteId;
  }

  function toggleSort(key: string) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const qRut = search.replace(/[.\-\s]/g, "").toLowerCase();
    const list = cotizaciones.filter((cot) => {
      if (estadoFilter && cot.estado !== estadoFilter) return false;
      if ((anioFilter || mesFilter) && cot.fecha) {
        const d = new Date(cot.fecha);
        if (anioFilter && d.getFullYear() !== anioFilter) return false;
        if (mesFilter && d.getMonth() + 1 !== mesFilter) return false;
      }
      if (!q) return true;
      const c = getCliente(cot.cliente);
      return (
        cot.nro.toLowerCase().includes(q) ||
        (c?.nombre ?? "").toLowerCase().includes(q) ||
        (qRut.length > 3 && (c?.rut ?? "").replace(/[.\-\s]/g, "").toLowerCase().includes(qRut)) ||
        (c?.correo ?? "").toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sort.key === "monto") return sort.dir === "asc" ? a.monto - b.monto : b.monto - a.monto;
      if (sort.key === "cliente") {
        const av = getClienteName(a.cliente).toLowerCase();
        const bv = getClienteName(b.cliente).toLowerCase();
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = String((a as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [cotizaciones, search, estadoFilter, anioFilter, mesFilter, sort, clientes]);

  const estados = ["Pendiente", "Aprobada", "Rechazada", "En revisión"];

  return (
    <div className="panel table-card">
      <div className="panel-head">
        <div className="panel-title"><History size={18} />Historial de cotizaciones</div>
        <span className="tag navy">{visible.length} resultado{visible.length !== 1 ? "s" : ""}</span>
      </div>
      <div style={{ padding: "8px 16px 10px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px" }}>
          <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <input
            placeholder="Buscar por N° cotización, RUT, nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minHeight: 28, fontSize: 13, border: "none", background: "transparent", outline: "none" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}><X size={13} /></button>}
        </div>
        <PeriodoPicker anio={anioFilter} mes={mesFilter} fechas={cotizaciones.map((c) => c.fecha)} onAnio={setAnioFilter} onMes={setMesFilter} />
        <div className="segmented" style={{ flexShrink: 0 }}>
          <button className={!estadoFilter ? "selected" : ""} onClick={() => setEstadoFilter("")}>Todos <span>{cotizaciones.length}</span></button>
          {estados.map((e) => {
            const count = cotizaciones.filter((c) => c.estado === e).length;
            return (
              <button key={e} className={estadoFilter === e ? "selected" : ""} onClick={() => setEstadoFilter(e)}>
                {e} <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <SortTh label="N° Cotización" sortKey="nro" current={sort} onSort={toggleSort} />
            <SortTh label="Cliente" sortKey="cliente" current={sort} onSort={toggleSort} />
            <SortTh label="Monto total" sortKey="monto" current={sort} onSort={toggleSort} />
            <SortTh label="Estado" sortKey="estado" current={sort} onSort={toggleSort} />
            <SortTh label="Fecha" sortKey="fecha" current={sort} onSort={toggleSort} />
            <th>Ver</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Sin resultados</td></tr>
          )}
          {visible.map((cot) => (
            <tr key={cot.id}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{cot.nro}</td>
              <td style={{ fontWeight: 500 }}>{getClienteName(cot.cliente)}</td>
              <td>{money(cot.monto)} CLP</td>
              <td>
                {cot.id && !cot.id.startsWith("cot-temp-")
                  ? <select
                      value={cot.estado}
                      onChange={(e) => onUpdateEstado(cot.id, e.target.value)}
                      style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer", background: cot.estado === "Aprobada" ? "#f0fdf4" : cot.estado === "Rechazada" ? "#fef2f2" : cot.estado === "En revisión" ? "#eff6ff" : "#fffbeb", color: cot.estado === "Aprobada" ? "#166534" : cot.estado === "Rechazada" ? "#991b1b" : cot.estado === "En revisión" ? "#1e40af" : "#92400e", fontWeight: 600 }}
                    >
                      {COT_ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  : <span style={{ color: "#cbd5e0", fontSize: 12 }}>—</span>
                }
              </td>
              <td style={{ color: "#64748b", fontSize: 12 }}>{cot.fecha}</td>
              <td>
                {cot.id && !cot.id.startsWith("cot-temp-")
                  ? <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => onVerCotizacion(cot.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0e948b", fontWeight: 600, background: "none", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", padding: "4px 9px" }}>
                        <FileText size={13} />Ver
                      </button>
                      <button onClick={() => onDescargarCotizacion(cot.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0f2340", fontWeight: 600, background: "none", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: "4px 9px" }}>
                        <Download size={13} />Descargar
                      </button>
                      <button onClick={() => { if (!confirm(`¿Eliminar cotización ${cot.nro}? Esta acción no se puede deshacer.`)) return; onDeleteCotizacion(cot.id); }} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#dc2626", fontWeight: 600, background: "none", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", padding: "4px 9px" }}>
                        <Trash2 size={13} />Eliminar
                      </button>
                    </div>
                  : <span style={{ color: "#cbd5e0", fontSize: 12 }}>emitiendo…</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tipos Protocolos ──────────────────────────────────────────────────────────

type ProtoSubItem = { id: string; label: string };
type ProtoItem = { id: string; label: string; subItems: ProtoSubItem[] };
type ProtoTemplate = { id: string; label: string; items: ProtoItem[]; conclusions: string[] };
type SubFill = { pasa: "si" | "no" | ""; obs: string };
type CalibEquipo = { id: string; equipo: string; marca: string; modelo: string; sn: string };

function pId() { return Math.random().toString(36).slice(2, 9); }

const DEFAULT_PROTO_DATA: { id: string; label: string; sections: { label: string; subItems: string[] }[] }[] = [
  { id: "anestesia", label: "Máquina de Anestesia", sections: [
    { label: "VERIFICACIÓN DE COMPONENTES E INSPECCIÓN VISUAL", subItems: [
      "Estado general del equipo",
      "Limpieza externa",
      "Pantalla y panel de control",
      "Perillas y controles",
      "Conectores y mangueras",
      "Sistema de ruedas y frenos",
      "Cable de alimentación",
      "Etiquetas y señaléticas",
    ]},
    { label: "SISTEMA DE GASES", subItems: [
      "Conexión a red de gases (O₂, N₂O, Aire)",
      "Estado de mangueras de gases",
      "Fugas en conexiones",
      "Funcionamiento de manómetros",
      "Funcionamiento de flujómetros",
      "Sistema de seguridad de oxígeno (fail-safe)",
    ]},
    { label: "VAPORIZADORES", subItems: [
      "Instalación y fijación correcta",
      "Nivel de agente anestésico",
      "Funcionamiento del mecanismo de bloqueo",
      "Prueba de estanqueidad del vaporizador",
    ]},
    { label: "CIRCUITO PACIENTE", subItems: [
      "Estado de mangueras y conexiones",
      "Sistema de absorción de CO₂ (cal sodada)",
      "Bolsa reservorio",
      "Mascarilla facial",
    ]},
    { label: "VENTILACIÓN Y ALARMAS", subItems: [
      "Prueba de ventilación manual",
      "Prueba de ventilación mecánica",
      "Alarmas de alta y baja presión",
      "Alarmas de volumen tidal",
    ]},
    { label: "MONITORES Y PRUEBA FUNCIONAL", subItems: [
      "Revisión de monitores integrados (SpO₂, capnografía)",
      "Limpieza y desinfección del circuito paciente",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "monitor", label: "Monitor Multiparámetro", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, pantalla y carcasa",
      "Revisión de cables y electrodos ECG",
      "Limpieza de pantalla táctil y superficie del equipo",
    ]},
    { label: "MÓDULOS CLÍNICOS", subItems: [
      "Módulo SpO₂ (oximetría de pulso)",
      "Módulo NIBP (presión arterial no invasiva)",
      "Módulo de temperatura",
    ]},
    { label: "SISTEMA Y ALARMAS", subItems: [
      "Batería y sistema de carga",
      "Fecha y hora del sistema",
      "Prueba de alarmas sonoras y visuales",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba funcional completa con paciente simulado",
    ]},
  ]},
  { id: "impedancia", label: "Analizador Corporal por Impedancia", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios",
      "Revisión de electrodos y cables de medición",
      "Limpieza y desinfección de electrodos y superficie",
    ]},
    { label: "CALIBRACIÓN Y FUNCIONAMIENTO", subItems: [
      "Verificación de calibración interna",
      "Prueba de reproducibilidad de mediciones",
      "Revisión de la plataforma de pesaje integrada",
      "Actualización de software si corresponde",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "balanza", label: "Balanza", sections: [
    { label: "VERIFICACIÓN VISUAL Y NIVELACIÓN", subItems: [
      "Inspección visual del equipo y plataforma",
      "Verificación de nivelación (burbuja de nivel)",
      "Revisión del indicador digital y display",
    ]},
    { label: "CALIBRACIÓN", subItems: [
      "Encendido y período de calentamiento",
      "Prueba de cero / tara",
      "Calibración con pesas patrón certificadas",
      "Verificación de repetibilidad (3 pesadas con misma carga)",
      "Prueba con carga máxima",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de plataforma y estructura del equipo",
      "Prueba funcional general",
    ]},
  ]},
  { id: "ecg", label: "Electrocardiógrafo", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios",
      "Revisión de cables de derivaciones y electrodos",
      "Verificación de impresora y papel de registro",
      "Revisión de batería y sistema de carga",
    ]},
    { label: "CALIBRACIÓN Y SEÑAL", subItems: [
      "Verificación de calibración de señal (1 mV = 10 mm)",
      "Verificación de velocidad de papel (25 mm/s)",
      "Prueba de todas las derivaciones (I, II, III, aVR, aVL, aVF, V1–V6)",
      "Revisión de filtros (60 Hz, EMG)",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de electrodos y superficies del equipo",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "espirometro", label: "Espirómetro", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, turbina y accesorios",
      "Revisión del sensor de flujo / turbina",
      "Verificación de impresora o conectividad de exportación",
      "Revisión de batería y sistema de carga",
    ]},
    { label: "CALIBRACIÓN", subItems: [
      "Calibración con jeringa de 3 L (±3.5%)",
      "Verificación de prueba FVC (Capacidad Vital Forzada)",
      "Verificación de prueba FEV1",
      "Verificación de prueba PEF (Flujo espiratorio máximo)",
    ]},
    { label: "SOFTWARE Y PRUEBA FUNCIONAL", subItems: [
      "Revisión de software e interfaz de usuario",
      "Limpieza y desinfección de turbina y boquillas",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "calorico", label: "Estimulador Calórico", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios (cánulas, tubing)",
      "Revisión y limpieza del depósito de agua",
      "Revisión de alarmas y protecciones de seguridad",
    ]},
    { label: "SISTEMA TÉRMICO", subItems: [
      "Verificación del sistema de calentamiento (44°C)",
      "Verificación del sistema de enfriamiento (30°C)",
      "Control de presión y caudal de irrigación",
      "Calibración del temporizador de irrigación",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba de ciclo completo (caliente / frío / aire)",
      "Limpieza y desinfección de cánulas y accesorios",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "optotipos", label: "Proyector de Optotipos", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, lentes y espejo de proyección",
      "Revisión del motor y mecanismo de rotación de optotipos",
      "Revisión del panel de control / control remoto",
    ]},
    { label: "VERIFICACIÓN ÓPTICA", subItems: [
      "Verificación de uniformidad de iluminación en pantalla",
      "Prueba de todos los optotipos disponibles (letras, números, símbolos)",
      "Verificación de la distancia focal de proyección (5 o 6 metros)",
      "Control del nivel de contraste de imágenes proyectadas",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de lentes, espejo y superficie del equipo",
      "Prueba funcional general del equipo",
    ]},
  ]},
];

function defaultProtoTemplates(): ProtoTemplate[] {
  return DEFAULT_PROTO_DATA.map((p) => ({
    id: p.id,
    label: p.label,
    items: p.sections.map((s, si) => ({
      id: `${p.id}_s${si}`,
      label: s.label,
      subItems: s.subItems.map((label, j) => ({ id: `${p.id}_s${si}_${j}`, label })),
    })),
    conclusions: [],
  }));
}

const PROTO_KEY = "crm_proto_templates";

function loadTemplates(): ProtoTemplate[] {
  try {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem(PROTO_KEY);
      if (s) return JSON.parse(s);
    }
  } catch {}
  return defaultProtoTemplates();
}

function persistTemplates(t: ProtoTemplate[]) {
  try { localStorage.setItem(PROTO_KEY, JSON.stringify(t)); } catch {}
}

function initSubFill(tpl: ProtoTemplate): Record<string, SubFill> {
  const f: Record<string, SubFill> = {};
  tpl.items.forEach((item) => {
    item.subItems.forEach((s) => { f[s.id] = { pasa: "", obs: "" }; });
  });
  return f;
}

function initCFill(tpl: ProtoTemplate): Record<string, boolean> {
  const f: Record<string, boolean> = {};
  tpl.conclusions.forEach((c) => { f[c] = false; });
  return f;
}

function applyPageBreakFix(iDoc: Document) {
  const PAGE_H = 1122;
  const els = iDoc.querySelectorAll<HTMLElement>(".avoid-break");
  els.forEach((el) => {
    const top = el.offsetTop;
    const h = el.offsetHeight;
    if (h >= PAGE_H) return;
    const pageEnd = (Math.floor(top / PAGE_H) + 1) * PAGE_H;
    if (top + h > pageEnd) {
      el.style.marginTop = (parseFloat(el.style.marginTop || "0") + pageEnd - top) + "px";
    }
  });
}

function buildProtocolHtml(params: {
  template: ProtoTemplate;
  cliente: Cliente;
  marca: string; modelo: string; anio: string; serie: string; servicio: string; tecnico: string; fecha: string;
  subFill: Record<string, SubFill>;
  conclusionFill: Record<string, boolean>;
  observaciones: string;
  photos: string[];
  signature: string;
  signatureCliente: string;
  calibEquipos: CalibEquipo[];
}): string {
  const { template, cliente, marca, modelo, anio, serie, servicio, tecnico, fecha, subFill, conclusionFill, observaciones, photos, signature, signatureCliente, calibEquipos } = params;

  const W_NUM = "34px";
  const W_CHECK = "42px";
  const W_OBS = "27%";
  const borderC = "#d1d5db";
  const cell = `padding:5px 6px;border-right:1px solid ${borderC};border-bottom:1px solid ${borderC};font-size:11px;line-height:1.4;vertical-align:middle`;

  let rowNum = 0;
  const sectionsHtml = template.items.map((item) => {
    const rowsHtml = item.subItems.map((sub) => {
      rowNum++;
      const fill = subFill[sub.id] ?? { pasa: "", obs: "" };
      const checkSi = fill.pasa === "si"
        ? `<span style="color:#0e948b;font-weight:900;font-size:13px;line-height:1">&#10003;</span>` : "";
      const checkNo = fill.pasa === "no"
        ? `<span style="color:#dc2626;font-weight:900;font-size:13px;line-height:1">&#10003;</span>` : "";
      const bg = rowNum % 2 === 0 ? "#f9fafb" : "#ffffff";
      return `<div style="display:flex;align-items:stretch;background:${bg}!important;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <div style="${cell};width:${W_NUM};min-width:${W_NUM};flex-shrink:0;text-align:center;color:#94a3b8;font-size:10px">${rowNum}</div>
        <div style="${cell};flex:1">${sub.label}</div>
        <div style="${cell};width:${W_CHECK};min-width:${W_CHECK};flex-shrink:0;text-align:center">${checkSi}</div>
        <div style="${cell};width:${W_CHECK};min-width:${W_CHECK};flex-shrink:0;text-align:center">${checkNo}</div>
        <div style="${cell};width:${W_OBS};min-width:${W_OBS};flex-shrink:0;border-right:none;color:#475569;font-size:10px;white-space:pre-wrap">${fill.obs || ""}</div>
      </div>`;
    }).join("");
    return `<div class="avoid-break">
      <div style="background:#0e948b!important;color:#fff!important;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:10px;padding:5px 8px;border-bottom:1px solid #0c7a73;-webkit-print-color-adjust:exact;print-color-adjust:exact">${item.label}</div>
      ${rowsHtml}
    </div>`;
  }).join("");

  const tableHtml = `<div style="border:1px solid ${borderC};border-radius:4px;overflow:hidden;margin-bottom:16px">
    <div style="display:flex;background:#0f2340!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <div style="width:${W_NUM};min-width:${W_NUM};flex-shrink:0;padding:7px 4px;text-align:center;border-right:1px solid rgba(255,255,255,.15);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">No.</div>
      <div style="flex:1;padding:7px 8px;border-right:1px solid rgba(255,255,255,.15);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Verificación de Componentes</div>
      <div style="display:flex;flex-direction:column;width:calc(${W_CHECK} * 2);min-width:calc(${W_CHECK} * 2);flex-shrink:0;border-right:1px solid rgba(255,255,255,.15)">
        <div style="text-align:center;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.15);font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">PASA</div>
        <div style="display:flex;flex:1">
          <div style="flex:1;text-align:center;padding:3px 0;border-right:1px solid rgba(255,255,255,.15);font-size:9px;font-weight:700">SI</div>
          <div style="flex:1;text-align:center;padding:3px 0;font-size:9px;font-weight:700">NO</div>
        </div>
      </div>
      <div style="width:${W_OBS};min-width:${W_OBS};flex-shrink:0;padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Observaciones</div>
    </div>
    ${sectionsHtml}
  </div>`;

  const calibHtml = `<div class="avoid-break" style="margin-bottom:16px">
    <div style="background:#0f2340!important;color:#fff!important;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:10px;padding:6px 8px;border-radius:4px 4px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact">Equipo de Calibración / Simulador</div>
    <div style="border:1px solid ${borderC};border-top:none;border-radius:0 0 4px 4px;overflow:hidden">
      <div style="display:flex;background:#e2e8f0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <div style="width:34px;min-width:34px;flex-shrink:0;padding:5px 4px;text-align:center;border-right:1px solid ${borderC};font-size:9px;font-weight:700;text-transform:uppercase;color:#475569">No.</div>
        <div style="flex:1;padding:5px 8px;border-right:1px solid ${borderC};font-size:9px;font-weight:700;text-transform:uppercase;color:#475569">Equipo</div>
        <div style="width:22%;min-width:22%;flex-shrink:0;padding:5px 8px;border-right:1px solid ${borderC};font-size:9px;font-weight:700;text-transform:uppercase;color:#475569">Marca</div>
        <div style="width:22%;min-width:22%;flex-shrink:0;padding:5px 8px;border-right:1px solid ${borderC};font-size:9px;font-weight:700;text-transform:uppercase;color:#475569">Modelo</div>
        <div style="width:18%;min-width:18%;flex-shrink:0;padding:5px 8px;font-size:9px;font-weight:700;text-transform:uppercase;color:#475569">SN/</div>
      </div>
      ${calibEquipos.map((eq, i) => {
        const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
        return `<div style="display:flex;align-items:stretch;background:${bg}!important;-webkit-print-color-adjust:exact;print-color-adjust:exact">
          <div style="${cell};width:34px;min-width:34px;flex-shrink:0;text-align:center;color:#94a3b8;font-size:10px">${i + 1}</div>
          <div style="${cell};flex:1">${eq.equipo || ""}</div>
          <div style="${cell};width:22%;min-width:22%;flex-shrink:0">${eq.marca || ""}</div>
          <div style="${cell};width:22%;min-width:22%;flex-shrink:0">${eq.modelo || ""}</div>
          <div style="${cell};width:18%;min-width:18%;flex-shrink:0;border-right:none">${eq.sn || ""}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;

  const conclusionsHtml = template.conclusions.length > 0
    ? `<div class="avoid-break"><h3>Conclusiones</h3><div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">
        ${template.conclusions.map((c) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px">
          <span style="width:14px;height:14px;border:1.5px solid ${conclusionFill[c] ? "#0e948b" : "#94a3b8"};border-radius:2px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;background:${conclusionFill[c] ? "#0e948b" : "transparent"}!important;-webkit-print-color-adjust:exact;print-color-adjust:exact">
            ${conclusionFill[c] ? '<span style="color:#fff;font-size:9px;font-weight:700">&#10003;</span>' : ""}
          </span>
          <span style="${conclusionFill[c] ? "font-weight:600" : "color:#475569"}">${c}</span>
        </div>`).join("")}
      </div></div>`
    : "";

  const obsHtml = observaciones
    ? `<div class="avoid-break"><h3>Observaciones generales</h3><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:12px;color:#475569;white-space:pre-wrap;line-height:1.5">${observaciones}</div></div>`
    : "";

  const photosHtml = photos.length > 0
    ? `<div class="avoid-break" style="margin-top:16px"><h3>Evidencia fotográfica</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">
          ${photos.map((p) => `<img src="${p}" style="width:100%;height:150px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>`).join("")}
        </div></div>`
    : "";

  const sigBlock = (label: string, src?: string, name?: string) =>
    `<div><div style="min-height:60px;border-bottom:1px solid #1e293b;display:flex;align-items:flex-end;margin-bottom:4px">${src ? `<img src="${src}" style="max-height:56px;max-width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>` : ""}</div><p style="font-size:11px;color:#64748b">${label}${name ? `: <strong>${name}</strong>` : ""}</p><p style="font-size:11px;color:#64748b">Fecha: ${fecha}</p></div>`;
  const sigHtml = `<div class="avoid-break" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px">${sigBlock("Firma del técnico", signature, tecnico)}${sigBlock("Firma del cliente / responsable", signatureCliente || undefined)}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.label}</title><style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    @page{margin:0;size:A4}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
    header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0e948b}
    h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    .data-block h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0e948b;margin-bottom:8px;font-weight:700}
    .data-block dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;align-items:baseline}
    .data-block dt{color:#64748b;font-size:12px;white-space:nowrap}
    .data-block dt::after{content:":"}
    .data-block dd{font-size:12px;font-weight:500}
    footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
  </style></head><body>
  <header>
    <div><img src="${LOGO_B64}" alt="BIOMEDITECH" style="height:48px;-webkit-print-color-adjust:exact;print-color-adjust:exact;forced-color-adjust:none"/></div>
    <div style="text-align:right"><strong style="display:block;font-size:16px;color:#0f2340">${template.label}</strong><span style="font-size:11px;color:#64748b">Protocolo de Mantención · BIOMEDITECH</span></div>
  </header>
  <div style="display:grid;grid-template-columns:max-content 1fr 1fr;gap:16px;margin-bottom:16px;align-items:start">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding-top:3px;border-right:2px solid #e2e8f0;padding-right:12px;white-space:nowrap">Información</div>
    <div class="data-block">
      <h4>Cliente</h4>
      <dl>
        <dt>Empresa</dt><dd>${cliente.nombre}</dd>
        <dt>RUT</dt><dd>${cliente.rut || "—"}</dd>
        <dt>Contacto</dt><dd>${cliente.contacto || "—"}</dd>
        <dt>Teléfono</dt><dd>${cliente.telefono || "—"}</dd>
        <dt>Dirección</dt><dd>${[cliente.direccion, cliente.ciudad].filter(Boolean).join(", ") || "—"}</dd>
      </dl>
    </div>
    <div class="data-block">
      <h4>Equipo</h4>
      <dl>
        <dt>Tipo</dt><dd>${template.label}</dd>
        <dt>Marca</dt><dd>${marca || "—"}</dd>
        <dt>Modelo</dt><dd>${modelo || "—"}</dd>
        <dt>Año</dt><dd>${anio || "—"}</dd>
        <dt>N° serie</dt><dd>${serie || "—"}</dd>
        <dt>Servicio</dt><dd>${servicio || "—"}</dd>
        <dt>Fecha</dt><dd>${fecha}</dd>
        <dt>Técnico</dt><dd>${tecnico || "—"}</dd>
      </dl>
    </div>
  </div>
  ${calibHtml}
  ${tableHtml}
  ${obsHtml}
  ${conclusionsHtml}
  ${photosHtml}
  ${sigHtml}
  <footer>contacto@Biomeditech.cl · Biomeditech.cl · WhatsApp: +56 9 5989 0781</footer>
  </body></html>`;
}

function ProtocolosModule({ clientes, notify }: { clientes: Cliente[]; notify: (msg: string) => void }) {
  const [templates, setTemplates] = useState<ProtoTemplate[]>(() => loadTemplates());
  const [view, setView] = useState<"form" | "tpls">("form");
  const [editingTpl, setEditingTpl] = useState<ProtoTemplate | null>(null);
  const [isNewTpl, setIsNewTpl] = useState(false);
  const [activeTplId, setActiveTplId] = useState("");
  const [designMode, setDesignMode] = useState(false);
  const [workingTpl, setWorkingTpl] = useState<ProtoTemplate | null>(null);
  const [subFill, setSubFill] = useState<Record<string, SubFill>>({});
  const [conclusionFill, setConclusionFill] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [serie, setSerie] = useState("");
  const [servicio, setServicio] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [generating, setGenerating] = useState(false);
  const [calibEquipos, setCalibEquipos] = useState<CalibEquipo[]>([
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
  ]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const sigClienteRef = useRef<HTMLCanvasElement>(null);
  const isDrawingClienteRef = useRef(false);
  const lastPosClienteRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === activeTplId) ?? null;
    if (tpl) {
      setWorkingTpl(JSON.parse(JSON.stringify(tpl)));
      setSubFill(initSubFill(tpl));
      setConclusionFill(initCFill(tpl));
    } else {
      setWorkingTpl(null);
      setSubFill({});
      setConclusionFill({});
    }
    setDesignMode(false);
  }, [activeTplId]);

  function getCanvasPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = signatureRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e, canvas);
  }
  function drawSignature(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e, canvas);
    const last = lastPosRef.current ?? pos;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = pos;
  }
  function stopDraw() { isDrawingRef.current = false; lastPosRef.current = null; }
  function clearSignature() { const c = signatureRef.current; if (!c) return; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }
  function getSignatureUrl() {
    const c = signatureRef.current; if (!c) return "";
    const ctx = c.getContext("2d"); if (!ctx) return "";
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return Array.from(d).some((v, i) => i % 4 === 3 && v > 0) ? c.toDataURL("image/png") : "";
  }

  function startDrawCliente(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = sigClienteRef.current; if (!canvas) return;
    isDrawingClienteRef.current = true;
    lastPosClienteRef.current = getCanvasPos(e, canvas);
  }
  function drawSignatureCliente(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawingClienteRef.current) return;
    const canvas = sigClienteRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getCanvasPos(e, canvas);
    const last = lastPosClienteRef.current ?? pos;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
    lastPosClienteRef.current = pos;
  }
  function stopDrawCliente() { isDrawingClienteRef.current = false; lastPosClienteRef.current = null; }
  function clearSignatureCliente() { const c = sigClienteRef.current; if (!c) return; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }
  function getSignatureClienteUrl() {
    const c = sigClienteRef.current; if (!c) return "";
    const ctx = c.getContext("2d"); if (!ctx) return "";
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    return Array.from(d).some((v, i) => i % 4 === 3 && v > 0) ? c.toDataURL("image/png") : "";
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const res: string[] = [];
    for (const f of files) {
      const url = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = (ev) => r(ev.target?.result as string); fr.readAsDataURL(f); });
      res.push(url);
    }
    setPhotos((prev) => [...prev, ...res]);
    if (e.target) e.target.value = "";
  }

  function handleSaveNewTpl() {
    if (!workingTpl) { notify("Selecciona o diseña una plantilla primero"); return; }
    const label = window.prompt("Nombre de la nueva plantilla:", workingTpl.label + " (copia)");
    if (!label?.trim()) return;
    const newTpl: ProtoTemplate = { ...workingTpl, id: pId(), label: label.trim() };
    const updated = [...templates, newTpl];
    setTemplates(updated);
    persistTemplates(updated);
    setActiveTplId(newTpl.id);
    notify("Plantilla guardada");
  }

  function handleUpdateTpl() {
    if (!workingTpl || !activeTplId) { notify("Selecciona una plantilla primero"); return; }
    const updated = templates.map((t) => t.id === activeTplId ? { ...workingTpl, id: activeTplId } : t);
    setTemplates(updated);
    persistTemplates(updated);
    notify("Plantilla actualizada");
  }

  async function handleDownload() {
    if (!activeTplId || !workingTpl) { notify("Selecciona un tipo de protocolo"); return; }
    if (!selectedCliente) { notify("Selecciona un cliente"); return; }
    setGenerating(true);
    notify("Generando PDF…");
    const fecha = new Date().toLocaleDateString("es-CL");
    try {
      const html = buildProtocolHtml({ template: workingTpl, cliente: selectedCliente, marca, modelo, anio, serie, servicio, tecnico, fecha, subFill, conclusionFill, observaciones, photos, signature: getSignatureUrl(), signatureCliente: getSignatureClienteUrl(), calibEquipos });
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1122px;border:none;visibility:hidden;";
      document.body.appendChild(iframe);
      await new Promise<void>((r) => { iframe.onload = () => r(); iframe.srcdoc = html; });
      await new Promise((r) => setTimeout(r, 600));
      const iDoc = iframe.contentDocument;
      if (!iDoc) { document.body.removeChild(iframe); return; }
      applyPageBreakFix(iDoc);
      await new Promise((r) => setTimeout(r, 150));
      const canvas = await html2canvas(iDoc.body, { useCORS: true, scale: 2, backgroundColor: "#ffffff", windowWidth: 794 });
      document.body.removeChild(iframe);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const totalH = canvas.height * (pdfW / canvas.width);
      let pos = 0; let remaining = totalH;
      pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH);
      remaining -= pdfH;
      while (remaining > 0) { pos -= pdfH; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, pos, pdfW, totalH); remaining -= pdfH; }
      pdf.save(`protocolo-${workingTpl.id}-${selectedCliente.nombre.replace(/\s+/g, "-").slice(0, 25)}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { setGenerating(false); }
  }

  const filteredClientes = clienteQuery.length >= 2
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(clienteQuery.toLowerCase()) || c.rut.toLowerCase().includes(clienteQuery.toLowerCase()) || (c.contacto ?? "").toLowerCase().includes(clienteQuery.toLowerCase())).slice(0, 8)
    : [];

  function tplSet(fn: (t: ProtoTemplate) => ProtoTemplate) { setEditingTpl((prev) => prev ? fn(prev) : prev); }

  function saveEditingTpl() {
    if (!editingTpl) return;
    if (!editingTpl.label.trim()) { notify("Ingresa un nombre para la plantilla"); return; }
    if (isNewTpl) {
      const newTpl = { ...editingTpl, id: pId() };
      const updated = [...templates, newTpl];
      setTemplates(updated); persistTemplates(updated); setActiveTplId(newTpl.id);
    } else {
      const updated = templates.map((t) => t.id === editingTpl.id ? editingTpl : t);
      setTemplates(updated); persistTemplates(updated);
      if (activeTplId === editingTpl.id) {
        setWorkingTpl(JSON.parse(JSON.stringify(editingTpl)));
        setSubFill(initSubFill(editingTpl));
        setConclusionFill(initCFill(editingTpl));
      }
    }
    setEditingTpl(null);
    notify(isNewTpl ? "Plantilla guardada" : "Plantilla actualizada");
  }

  // ── TEMPLATES VIEW ───────────────────────────────────────────────────────────
  if (view === "tpls") {
    return (
      <section className="stack">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <button onClick={() => { setView("form"); setEditingTpl(null); }} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>← Volver</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Gestionar plantillas</span>
        </div>

        {!editingTpl ? (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><FileArchive size={16} />Plantillas guardadas ({templates.length})</div>
              <button onClick={() => { setEditingTpl({ id: "", label: "", items: [], conclusions: [] }); setIsNewTpl(true); }}>
                <Plus size={14} style={{ marginRight: 4 }} />Nueva plantilla
              </button>
            </div>
            {templates.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No hay plantillas guardadas.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {templates.map((tpl) => (
                    <tr key={tpl.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 4px" }}>
                        <strong>{tpl.label}</strong>
                        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
                          {tpl.items.length} secciones · {tpl.items.reduce((a, it) => a + it.subItems.length, 0)} ítems · {tpl.conclusions.length} conclusiones
                        </span>
                      </td>
                      <td style={{ width: 80, textAlign: "right", padding: "10px 4px" }}>
                        <button onClick={() => { setEditingTpl(JSON.parse(JSON.stringify(tpl))); setIsNewTpl(false); }} style={{ marginRight: 4, fontSize: 12 }}><Edit3 size={13} /></button>
                        <button onClick={() => {
                          if (!confirm(`¿Eliminar "${tpl.label}"?`)) return;
                          const updated = templates.filter((t) => t.id !== tpl.id);
                          setTemplates(updated); persistTemplates(updated);
                          if (activeTplId === tpl.id) setActiveTplId("");
                        }} style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><FileText size={16} />{isNewTpl ? "Nueva plantilla" : `Editar: ${editingTpl.label}`}</div>
              <button onClick={() => setEditingTpl(null)}><X size={14} /></button>
            </div>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Nombre del protocolo</span>
              <input value={editingTpl.label} onChange={(e) => tplSet((t) => ({ ...t, label: e.target.value }))} placeholder="Ej: Monitor Multiparámetro" style={{ display: "block", width: "100%", marginTop: 4 }} />
            </label>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Secciones (encabezados celeste)</span>
                <button onClick={() => tplSet((t) => ({ ...t, items: [...t.items, { id: pId(), label: "Nueva sección", subItems: [] }] }))} style={{ fontSize: 12 }}>
                  <Plus size={12} style={{ marginRight: 4 }} />Agregar sección
                </button>
              </div>
              {editingTpl.items.map((item, ii) => (
                <div key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: "#0e948b", flexShrink: 0 }} />
                    <input value={item.label} onChange={(e) => tplSet((t) => ({ ...t, items: t.items.map((it, i) => i === ii ? { ...it, label: e.target.value } : it) }))} style={{ flex: 1, fontSize: 13, fontWeight: 600 }} />
                    <button onClick={() => tplSet((t) => ({ ...t, items: t.items.filter((_, i) => i !== ii) }))} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button>
                  </div>
                  <div style={{ marginLeft: 18 }}>
                    {item.subItems.map((sub, si) => (
                      <div key={sub.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
                        <span style={{ fontSize: 11, color: "var(--muted)", width: 18, textAlign: "right", flexShrink: 0 }}>{si + 1}.</span>
                        <input value={sub.label} onChange={(e) => tplSet((t) => ({ ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: it.subItems.map((s, j) => j === si ? { ...s, label: e.target.value } : s) } : it) }))} style={{ flex: 1, fontSize: 12 }} />
                        <button onClick={() => tplSet((t) => ({ ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: it.subItems.filter((_, j) => j !== si) } : it) }))} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 2 }}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => tplSet((t) => ({ ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: [...it.subItems, { id: pId(), label: "Nuevo ítem" }] } : it) }))} style={{ fontSize: 11, marginTop: 4 }}>+ Agregar ítem</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Conclusiones</span>
                <button onClick={() => tplSet((t) => ({ ...t, conclusions: [...t.conclusions, "Nueva conclusión"] }))} style={{ fontSize: 12 }}>
                  <Plus size={12} style={{ marginRight: 4 }} />Agregar conclusión
                </button>
              </div>
              {editingTpl.conclusions.map((c, ci) => (
                <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input value={c} onChange={(e) => tplSet((t) => ({ ...t, conclusions: t.conclusions.map((cv, i) => i === ci ? e.target.value : cv) }))} style={{ flex: 1 }} />
                  <button onClick={() => tplSet((t) => ({ ...t, conclusions: t.conclusions.filter((_, i) => i !== ci) }))} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <button onClick={() => setEditingTpl(null)} style={{ background: "none" }}>Cancelar</button>
              <button onClick={saveEditingTpl} style={{ background: "#0e948b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {isNewTpl ? "Guardar plantilla" : "Actualizar plantilla"}
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ── FORM VIEW ────────────────────────────────────────────────────────────────
  const thStyle: React.CSSProperties = { padding: "7px 8px", border: "1px solid #1e3a5f", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", background: "#0f2340", color: "#fff" };
  const sectionCellStyle: React.CSSProperties = { background: "#0e948b", color: "#fff", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 11, letterSpacing: "0.04em", padding: "5px 10px", border: "1px solid #0c7a73" };

  return (
    <section className="stack">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Nuevo protocolo</span>
        <button onClick={() => setView("tpls")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, marginLeft: "auto" }}>
          <FileArchive size={13} style={{ marginRight: 4 }} />Gestionar plantillas
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><FileArchive size={16} />Tipo de protocolo</div>
            <select value={activeTplId} onChange={(e) => {
              if (e.target.value === "__new__") {
                const label = window.prompt("Nombre del nuevo protocolo:");
                if (!label?.trim()) return;
                const newTpl: ProtoTemplate = { id: pId(), label: label.trim(), items: [], conclusions: [] };
                const updated = [...templates, newTpl];
                setTemplates(updated); persistTemplates(updated);
                setActiveTplId(newTpl.id);
                setDesignMode(true);
              } else {
                setActiveTplId(e.target.value);
              }
            }} style={{ width: "100%" }}>
              <option value="">— Selecciona un protocolo —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              <option value="__new__">+ Crear nuevo protocolo...</option>
            </select>
          </div>

          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><Search size={16} />Cliente</div>
            <div style={{ position: "relative" }}>
              <input
                value={selectedCliente ? selectedCliente.nombre : clienteQuery}
                onChange={(e) => { setClienteQuery(e.target.value); setSelectedCliente(null); setClienteOpen(true); }}
                onFocus={() => { if (!selectedCliente) setClienteOpen(true); }}
                onBlur={() => setTimeout(() => setClienteOpen(false), 150)}
                placeholder="Buscar por nombre o RUT..."
                style={{ width: "100%", paddingRight: selectedCliente ? 32 : undefined }}
              />
              {selectedCliente && (
                <button onClick={() => { setSelectedCliente(null); setClienteQuery(""); }}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}>
                  <X size={14} />
                </button>
              )}
              {clienteOpen && filteredClientes.length > 0 && !selectedCliente && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 100, maxHeight: 220, overflowY: "auto" }}>
                  {filteredClientes.map((c) => (
                    <button key={c.id} onMouseDown={() => { setSelectedCliente(c); setClienteQuery(""); setClienteOpen(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                      <strong style={{ fontSize: 13 }}>{c.nombre}</strong>
                      <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>{c.rut}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCliente && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#475569", background: "#f0fdf4", borderRadius: 6, padding: "8px 12px", border: "1px solid #bbf7d0" }}>
                <strong>{selectedCliente.nombre}</strong>{selectedCliente.rut ? ` · RUT ${selectedCliente.rut}` : ""}
                {selectedCliente.direccion && <div style={{ marginTop: 2, color: "#64748b" }}>{selectedCliente.direccion}{selectedCliente.ciudad ? `, ${selectedCliente.ciudad}` : ""}</div>}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><Wrench size={16} />Datos del equipo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12 }}>Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: Mindray" style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
              <label style={{ fontSize: 12 }}>Modelo<input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: BS-380" style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ fontSize: 12 }}>Año<input value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2019" maxLength={4} style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
                <label style={{ fontSize: 12 }}>N° serie<input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="S/N" style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
              </div>
              <label style={{ fontSize: 12 }}>Servicio documentado<input value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Ej: Mantención preventiva anual" style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
              <label style={{ fontSize: 12 }}>Nombre del técnico<input value={tecnico} onChange={(e) => setTecnico(e.target.value)} placeholder="Nombre completo" style={{ marginTop: 3, display: "block", width: "100%" }} /></label>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {workingTpl ? (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title"><ClipboardList size={16} />{workingTpl.label}</div>
                <button onClick={() => setDesignMode((d) => !d)} style={{ fontSize: 12, background: designMode ? "#0e948b" : "none", color: designMode ? "#fff" : undefined, border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                  <Edit3 size={12} />{designMode ? "Vista previa" : "Editar estructura"}
                </button>
              </div>

              {designMode ? (
                /* ── DESIGN MODE ── */
                <div>
                  <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: [{ id: pId(), label: "Nueva sección", subItems: [] }, ...t.items] } : t)}
                    style={{ fontSize: 11, marginBottom: 6, background: "#f0fdf4", border: "1px dashed #0e948b", color: "#0e948b", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                    + Insertar sección al inicio
                  </button>
                  {workingTpl.items.map((item, ii) => (
                    <div key={item.id}>
                      <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#0e948b", flexShrink: 0 }} />
                          <input value={item.label} onChange={(e) => setWorkingTpl((t) => t ? { ...t, items: t.items.map((it, i) => i === ii ? { ...it, label: e.target.value } : it) } : t)} style={{ flex: 1, fontSize: 13, fontWeight: 600 }} />
                          <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: t.items.filter((_, i) => i !== ii) } : t)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={13} /></button>
                        </div>
                        <div style={{ marginLeft: 18 }}>
                          {item.subItems.map((sub, si) => (
                            <div key={sub.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5, padding: "4px 0", borderBottom: "1px dashed var(--border)" }}>
                              <span style={{ fontSize: 11, color: "var(--muted)", width: 18, textAlign: "right", flexShrink: 0 }}>{si + 1}.</span>
                              <input value={sub.label} onChange={(e) => setWorkingTpl((t) => t ? { ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: it.subItems.map((s, j) => j === si ? { ...s, label: e.target.value } : s) } : it) } : t)} style={{ flex: 1, fontSize: 12 }} />
                              <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: it.subItems.filter((_, j) => j !== si) } : it) } : t)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 2 }}><Trash2 size={12} /></button>
                            </div>
                          ))}
                          <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: t.items.map((it, i) => i === ii ? { ...it, subItems: [...it.subItems, { id: pId(), label: "Nuevo ítem" }] } : it) } : t)} style={{ fontSize: 11, marginTop: 4 }}>+ Agregar ítem</button>
                        </div>
                      </div>
                      <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: [...t.items.slice(0, ii + 1), { id: pId(), label: "Nueva sección", subItems: [] }, ...t.items.slice(ii + 1)] } : t)}
                        style={{ fontSize: 11, marginBottom: 4, width: "100%", background: "#f0fdf4", border: "1px dashed #0e948b", color: "#0e948b", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
                        + Insertar sección aquí
                      </button>
                    </div>
                  ))}
                  {workingTpl.items.length === 0 && (
                    <button onClick={() => setWorkingTpl((t) => t ? { ...t, items: [...t.items, { id: pId(), label: "Nueva sección", subItems: [] }] } : t)} style={{ marginTop: 4 }}>
                      <Plus size={12} style={{ marginRight: 4 }} />Agregar sección
                    </button>
                  )}
                  <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Conclusiones</span>
                      <button onClick={() => setWorkingTpl((t) => t ? { ...t, conclusions: [...t.conclusions, "Nueva conclusión"] } : t)} style={{ fontSize: 12 }}>
                        <Plus size={12} style={{ marginRight: 4 }} />Agregar
                      </button>
                    </div>
                    {workingTpl.conclusions.map((c, ci) => (
                      <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <input value={c} onChange={(e) => setWorkingTpl((t) => t ? { ...t, conclusions: t.conclusions.map((cv, i) => i === ci ? e.target.value : cv) } : t)} style={{ flex: 1 }} />
                        <button onClick={() => setWorkingTpl((t) => t ? { ...t, conclusions: t.conclusions.filter((_, i) => i !== ci) } : t)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── FILL MODE ── */
                <div style={{ overflowX: "auto" }}>
                  {workingTpl.items.length === 0 && (
                    <p style={{ color: "var(--muted)", fontSize: 12, padding: "12px 0" }}>No hay ítems. Usa &quot;Editar estructura&quot; para agregar.</p>
                  )}
                  {workingTpl.items.length > 0 && (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 540 }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: 36, textAlign: "center" }}>No.</th>
                          <th style={{ ...thStyle, textAlign: "left" }}>Verificación</th>
                          <th style={{ ...thStyle, width: 42, textAlign: "center" }}>SI</th>
                          <th style={{ ...thStyle, width: 42, textAlign: "center" }}>NO</th>
                          <th style={{ ...thStyle, textAlign: "left", minWidth: 160 }}>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let rowN = 0;
                          return workingTpl.items.flatMap((item) => {
                            const sectionRow = (
                              <tr key={`sec-${item.id}`}>
                                <td colSpan={5} style={sectionCellStyle}>{item.label}</td>
                              </tr>
                            );
                            const subRows = item.subItems.map((sub) => {
                              rowN++;
                              const fill = subFill[sub.id] ?? { pasa: "", obs: "" };
                              return (
                                <tr key={sub.id} style={{ background: rowN % 2 === 0 ? "var(--bg)" : "#fff" }}>
                                  <td style={{ textAlign: "center", padding: "5px 4px", border: "1px solid var(--border)", fontSize: 11, color: "#94a3b8" }}>{rowN}</td>
                                  <td style={{ padding: "5px 8px", border: "1px solid var(--border)", fontSize: 12 }}>{sub.label}</td>
                                  <td style={{ textAlign: "center", padding: "5px 4px", border: "1px solid var(--border)" }}>
                                    <input type="radio" name={`pasa-${sub.id}`} checked={fill.pasa === "si"}
                                      onChange={() => setSubFill((prev) => ({ ...prev, [sub.id]: { ...(prev[sub.id] ?? { pasa: "", obs: "" }), pasa: "si" } }))} />
                                  </td>
                                  <td style={{ textAlign: "center", padding: "5px 4px", border: "1px solid var(--border)" }}>
                                    <input type="radio" name={`pasa-${sub.id}`} checked={fill.pasa === "no"}
                                      onChange={() => setSubFill((prev) => ({ ...prev, [sub.id]: { ...(prev[sub.id] ?? { pasa: "", obs: "" }), pasa: "no" } }))} />
                                  </td>
                                  <td style={{ padding: "3px 6px", border: "1px solid var(--border)" }}>
                                    <input value={fill.obs} onChange={(e) => setSubFill((prev) => ({ ...prev, [sub.id]: { ...(prev[sub.id] ?? { pasa: "", obs: "" }), obs: e.target.value } }))}
                                      style={{ width: "100%", border: "none", background: "transparent", fontSize: 11, padding: "2px 0", outline: "none" }} placeholder="Observaciones..." />
                                  </td>
                                </tr>
                              );
                            });
                            return [sectionRow, ...subRows];
                          });
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="panel" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              <FileArchive size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>Selecciona un protocolo para ver la lista de verificación</p>
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><Wrench size={16} />Equipo de Calibración / Simulador</div>
              <button onClick={() => setCalibEquipos((prev) => [...prev, { id: pId(), equipo: "", marca: "", modelo: "", sn: "" }])} style={{ fontSize: 12 }}>
                <Plus size={12} style={{ marginRight: 4 }} />Agregar fila
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 32, textAlign: "center" }}>No.</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Equipo</th>
                  <th style={{ ...thStyle, width: "18%", textAlign: "left" }}>Marca</th>
                  <th style={{ ...thStyle, width: "18%", textAlign: "left" }}>Modelo</th>
                  <th style={{ ...thStyle, width: "16%", textAlign: "left" }}>SN/</th>
                  <th style={{ ...thStyle, width: 28 }}></th>
                </tr>
              </thead>
              <tbody>
                {calibEquipos.map((eq, i) => (
                  <tr key={eq.id} style={{ background: i % 2 === 0 ? "#fff" : "var(--bg)" }}>
                    <td style={{ textAlign: "center", padding: "4px", border: "1px solid var(--border)", color: "#94a3b8", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: "2px 4px", border: "1px solid var(--border)" }}>
                      <input value={eq.equipo} onChange={(e) => setCalibEquipos((prev) => prev.map((r, j) => j === i ? { ...r, equipo: e.target.value } : r))} placeholder="Nombre del equipo" style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, padding: "2px 0", outline: "none" }} />
                    </td>
                    <td style={{ padding: "2px 4px", border: "1px solid var(--border)" }}>
                      <input value={eq.marca} onChange={(e) => setCalibEquipos((prev) => prev.map((r, j) => j === i ? { ...r, marca: e.target.value } : r))} placeholder="Marca" style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, padding: "2px 0", outline: "none" }} />
                    </td>
                    <td style={{ padding: "2px 4px", border: "1px solid var(--border)" }}>
                      <input value={eq.modelo} onChange={(e) => setCalibEquipos((prev) => prev.map((r, j) => j === i ? { ...r, modelo: e.target.value } : r))} placeholder="Modelo" style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, padding: "2px 0", outline: "none" }} />
                    </td>
                    <td style={{ padding: "2px 4px", border: "1px solid var(--border)" }}>
                      <input value={eq.sn} onChange={(e) => setCalibEquipos((prev) => prev.map((r, j) => j === i ? { ...r, sn: e.target.value } : r))} placeholder="S/N" style={{ width: "100%", border: "none", background: "transparent", fontSize: 12, padding: "2px 0", outline: "none" }} />
                    </td>
                    <td style={{ textAlign: "center", padding: "2px", border: "1px solid var(--border)" }}>
                      <button onClick={() => setCalibEquipos((prev) => prev.filter((_, j) => j !== i))} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 2 }}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><FileText size={16} />Observaciones generales</div>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas adicionales del servicio..." rows={4} style={{ width: "100%", resize: "vertical" }} />
          </div>

          {workingTpl && workingTpl.conclusions.length > 0 && !designMode && (
            <div className="panel">
              <div className="panel-title" style={{ marginBottom: 12 }}><Check size={16} />Conclusiones</div>
              {workingTpl.conclusions.map((c, ci) => (
                <label key={ci} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", cursor: "pointer", fontSize: 13, borderBottom: ci < workingTpl.conclusions.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <input type="checkbox" checked={conclusionFill[c] ?? false} onChange={(e) => setConclusionFill((prev) => ({ ...prev, [c]: e.target.checked }))} />
                  {c}
                </label>
              ))}
            </div>
          )}

          <div className="panel">
            <div className="panel-title" style={{ marginBottom: photos.length > 0 ? 12 : 0 }}><FileText size={16} />Fotos de evidencia</div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoUpload} />
            <button onClick={() => photoInputRef.current?.click()} style={{ marginTop: 12, marginBottom: photos.length > 0 ? 12 : 0 }}>
              <Plus size={14} style={{ marginRight: 4 }} />Agregar fotos
            </button>
            {photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p} alt={`foto ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", display: "block" }} />
                    <button onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,.55)", border: "none", borderRadius: 4, cursor: "pointer", color: "#fff", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><Edit3 size={16} />Firmas</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#475569" }}>Técnico</div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "#fafafa", userSelect: "none", touchAction: "none" }}>
                  <canvas ref={signatureRef} width={700} height={140} style={{ width: "100%", height: 140, cursor: "crosshair", display: "block" }}
                    onMouseDown={startDraw} onMouseMove={drawSignature} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={drawSignature} onTouchEnd={stopDraw}
                  />
                </div>
                <button onClick={clearSignature} style={{ marginTop: 6, fontSize: 12, background: "none", border: "1px solid var(--border)", color: "var(--muted)" }}>Limpiar</button>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#475569" }}>Cliente / responsable</div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "#fafafa", userSelect: "none", touchAction: "none" }}>
                  <canvas ref={sigClienteRef} width={700} height={140} style={{ width: "100%", height: 140, cursor: "crosshair", display: "block" }}
                    onMouseDown={startDrawCliente} onMouseMove={drawSignatureCliente} onMouseUp={stopDrawCliente} onMouseLeave={stopDrawCliente}
                    onTouchStart={startDrawCliente} onTouchMove={drawSignatureCliente} onTouchEnd={stopDrawCliente}
                  />
                </div>
                <button onClick={clearSignatureCliente} style={{ marginTop: 6, fontSize: 12, background: "none", border: "1px solid var(--border)", color: "var(--muted)" }}>Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
        <button onClick={handleSaveNewTpl} style={{ border: "1px solid var(--border)", background: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} />Guardar nueva plantilla
        </button>
        {activeTplId && (
          <button onClick={handleUpdateTpl} style={{ border: "1px solid #0e948b", color: "#0e948b", background: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Check size={14} />Actualizar plantilla
          </button>
        )}
        <button onClick={handleDownload} disabled={generating}
          style={{ background: "#0e948b", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, border: "none", cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
          <Download size={16} />{generating ? "Generando PDF…" : "Descargar protocolo PDF"}
        </button>
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
  const [geoLoading, setGeoLoading] = useState(false);

  const debouncedDireccion = useDebounce(kind === "cliente" ? clienteForm.direccion : "", 700);

  useEffect(() => {
    if (!debouncedDireccion || debouncedDireccion.length < 8) return;
    if (clienteForm.ciudad && clienteForm.comuna) return;
    let cancelled = false;
    setGeoLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedDireccion + ", Chile")}&format=json&addressdetails=1&limit=1&accept-language=es`, { headers: { "Accept-Language": "es" } })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const result = (data as { address?: Record<string, string> }[])[0];
        if (!result?.address) return;
        const addr = result.address;
        const ciudad = addr.city || addr.town || addr.village || addr.municipality || "";
        const comuna = addr.suburb || addr.city_district || addr.county || ciudad;
        setClienteForm((f) => ({
          ...f,
          ciudad: f.ciudad || ciudad,
          comuna: f.comuna || comuna,
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGeoLoading(false); });
    return () => { cancelled = true; setGeoLoading(false); };
  }, [debouncedDireccion]);

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
      const rutNorm = normalizeRut(editingLead.rut ?? "");
      const matchingClient = clientes.find((c) =>
        (rutNorm.length > 4 && normalizeRut(c.rut) === rutNorm) ||
        c.nombre.toLowerCase().trim() === (editingLead.empresa || editingLead.nombre).toLowerCase().trim()
      );
      setLeadForm({
        rut: editingLead.rut ?? matchingClient?.rut ?? "",
        nombre: editingLead.nombre,
        empresa: editingLead.empresa,
        tel: editingLead.tel,
        email: editingLead.email,
        canal: editingLead.canal,
        servicio: editingLead.servicio,
        equipo: editingLead.equipo,
        direccion: editingLead.direccion ?? (matchingClient ? [matchingClient.direccion, matchingClient.ciudad].filter(Boolean).join(", ") : ""),
        tipo_entidad: editingLead.tipo_entidad ?? "",
      });
      setLeadItems(leadPreItems[editingLead.id] ?? []);
    } else if (kind === "cliente" && editingCliente) {
      setClienteForm({ rut: editingCliente.rut, nombre: editingCliente.nombre, contacto: editingCliente.contacto, tel: editingCliente.telefono || "+56 ", correo: editingCliente.correo, rubro: editingCliente.rubro, estado: editingCliente.estado || "activo", direccion: editingCliente.direccion || "", ciudad: editingCliente.ciudad || "", comuna: editingCliente.comuna || "", tipo_entidad: editingCliente.tipo_entidad ?? "" });
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

  const [saving, setSaving] = useState(false);

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

  async function handleSave() {
    if (saving) return;
    if (kind === "lead") {
      if (!leadForm.nombre.trim()) { notify("El nombre del contacto es requerido"); return; }
      if (!leadForm.empresa.trim()) { notify("La empresa es requerida"); return; }
      if (!leadForm.rut?.trim()) { notify("El RUT es requerido"); return; }
      if (!validateRut(leadForm.rut)) { notify("El RUT ingresado no es válido. Verifica el dígito verificador."); return; }
      if (leadForm.tel && leadForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(leadForm.tel)) { notify("El teléfono no tiene un formato válido (ej: +56 9 1234 5678)"); return; }
      if (leadForm.email && !isValidEmail(leadForm.email)) { notify("El correo no tiene un formato válido"); return; }
      setSaving(true);
      editingLead ? onUpdateLead(editingLead.id, leadForm, leadItems) : onSaveLead(leadForm, leadItems);
    } else if (kind === "cliente") {
      if (!clienteForm.rut?.trim()) { notify("El RUT de la empresa es requerido"); return; }
      if (!validateRut(clienteForm.rut)) { notify("El RUT del cliente no es válido. Verifica el dígito verificador."); return; }
      if (!clienteForm.nombre.trim()) { notify("El nombre de la empresa es requerido"); return; }
      if (!clienteForm.contacto.trim()) { notify("El nombre del contacto es requerido"); return; }
      if (!clienteForm.tel.trim() || clienteForm.tel.trim() === "+56") { notify("El teléfono es requerido"); return; }
      if (!isValidPhone(clienteForm.tel)) { notify("El teléfono no tiene un formato válido (ej: +56 9 1234 5678)"); return; }
      if (!clienteForm.correo.trim()) { notify("El correo es requerido"); return; }
      if (!isValidEmail(clienteForm.correo)) { notify("El correo no tiene un formato válido"); return; }
      setSaving(true);
      editingCliente ? onUpdateCliente(editingCliente.id, clienteForm) : onSaveCliente(clienteForm);
    } else if (kind === "producto") {
      if (!productoForm.nombre.trim()) { notify("El nombre del producto es requerido"); return; }
      if ([productoForm.diag, productoForm.rep, productoForm.mant, productoForm.inst].some((v) => Number(v) < 0)) { notify("Los precios no pueden ser negativos"); return; }
      setSaving(true);
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
      descripcion_larga: "",
    };
    setCatalogo((prev) => [...prev, item]);
    setLeadItems((prev) => [...prev, catalogoToCotizacionItem(item, plantillas)]);
    setLeadForm((prev) => ({ ...prev, equipo: prev.equipo || name }));
    notify("Producto creado y agregado al lead");
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <h2>{titles[kind]}</h2>
          <button onClick={close} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="modal-grid">
          {kind === "lead" && (
            <>
              <label>RUT empresa / cliente *
                <input
                  value={leadForm.rut ?? ""}
                  onChange={(e) => setLeadForm((f) => ({ ...f, rut: formatRut(e.target.value) }))}
                  placeholder="76.XXX.XXX-X"
                  maxLength={15}
                  style={{ borderColor: leadForm.rut && !validateRut(leadForm.rut) ? "#ef4444" : undefined }}
                />
                {leadForm.rut && !validateRut(leadForm.rut) && (
                  <span className="field-error">RUT inválido — verifica el dígito verificador</span>
                )}
              </label>
              <label>Empresa *<input value={leadForm.empresa} onChange={(e) => setLeadForm((f) => ({ ...f, empresa: e.target.value }))} placeholder="Ej: Clínica Santiago" maxLength={100} /></label>
              <label>Nombre contacto *<input value={leadForm.nombre} onChange={(e) => setLeadForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: María González" maxLength={100} /></label>
              <label>Teléfono
                <input
                  value={leadForm.tel}
                  onChange={(e) => setLeadForm((f) => ({ ...f, tel: e.target.value }))}
                  placeholder="+56 9 XXXX XXXX"
                  maxLength={20}
                  style={{ borderColor: leadForm.tel && leadForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(leadForm.tel) ? "#ef4444" : undefined }}
                />
                {leadForm.tel && leadForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(leadForm.tel) && (
                  <span className="field-error">Teléfono inválido (ej: +56 9 1234 5678)</span>
                )}
              </label>
              <label>Correo
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@empresa.cl"
                  maxLength={100}
                  style={{ borderColor: leadForm.email && !isValidEmail(leadForm.email) ? "#ef4444" : undefined }}
                />
                {leadForm.email && !isValidEmail(leadForm.email) && (
                  <span className="field-error">Correo inválido (ej: usuario@empresa.cl)</span>
                )}
              </label>
              <label className="wide">Dirección cliente
                <input
                  value={leadForm.direccion ?? ""}
                  onChange={(e) => setLeadForm((f) => ({ ...f, direccion: e.target.value }))}
                  placeholder="Ej: Av. Providencia 1234, Santiago"
                  maxLength={200}
                />
              </label>
              <label>
                Tipo de entidad
                <select value={leadForm.tipo_entidad ?? ""} onChange={(e) => setLeadForm((f) => ({ ...f, tipo_entidad: e.target.value }))}>
                  <option value="">— Sin especificar —</option>
                  <option value="publica">Entidad pública</option>
                  <option value="privada">Empresa privada</option>
                  <option value="persona_natural">Persona natural</option>
                </select>
              </label>
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
                                style={{ padding: "2px 8px", fontSize: 11, background: leadItems.some(i => i.producto_id === c.id) ? "#0e948b" : "#0f172a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
                                onClick={() => {
                                  if (leadItems.some(i => i.producto_id === c.id)) {
                                    setLeadItems((prev) => prev.filter(i => i.producto_id !== c.id));
                                  } else {
                                    setLeadItems((prev) => [...prev, catalogoToCotizacionItem(c, plantillas)]);
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
                    <p style={{ padding: "6px 10px", fontSize: 12, color: "#0e948b", fontWeight: 600, borderTop: "1px solid #e2e8f0", margin: 0 }}>
                      {leadItems.length} ítem{leadItems.length > 1 ? "s" : ""} seleccionado{leadItems.length > 1 ? "s" : ""} — se pre-cargarán al cotizar
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {kind === "cliente" && (
            <>
              <label>RUT empresa *
                <input
                  value={clienteForm.rut}
                  onChange={(e) => setClienteForm((f) => ({ ...f, rut: formatRut(e.target.value) }))}
                  placeholder="76.XXX.XXX-X"
                  maxLength={15}
                  style={{ borderColor: clienteForm.rut && !validateRut(clienteForm.rut) ? "#ef4444" : undefined }}
                />
                {clienteForm.rut && !validateRut(clienteForm.rut) && (
                  <span className="field-error">RUT inválido — verifica el dígito verificador</span>
                )}
              </label>
              <label>Nombre empresa *<input value={clienteForm.nombre} onChange={(e) => setClienteForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Clínica Las Condes" maxLength={100} /></label>
              <label>Contacto *<input value={clienteForm.contacto} onChange={(e) => setClienteForm((f) => ({ ...f, contacto: e.target.value }))} placeholder="Nombre del contacto" maxLength={100} /></label>
              <label>Teléfono *
                <input
                  value={clienteForm.tel}
                  onChange={(e) => setClienteForm((f) => ({ ...f, tel: e.target.value }))}
                  placeholder="+56 9 XXXX XXXX"
                  maxLength={20}
                  style={{ borderColor: clienteForm.tel && clienteForm.tel.trim() !== "+56" && clienteForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(clienteForm.tel) ? "#ef4444" : undefined }}
                />
                {clienteForm.tel && clienteForm.tel.trim() !== "+56" && clienteForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(clienteForm.tel) && (
                  <span className="field-error">Teléfono inválido (ej: +56 9 1234 5678)</span>
                )}
              </label>
              <label>Correo *
                <input
                  type="email"
                  value={clienteForm.correo}
                  onChange={(e) => setClienteForm((f) => ({ ...f, correo: e.target.value }))}
                  placeholder="contacto@empresa.cl"
                  maxLength={100}
                  style={{ borderColor: clienteForm.correo && !isValidEmail(clienteForm.correo) ? "#ef4444" : undefined }}
                />
                {clienteForm.correo && !isValidEmail(clienteForm.correo) && (
                  <span className="field-error">Correo inválido (ej: usuario@empresa.cl)</span>
                )}
              </label>
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
                Tipo de entidad
                <select value={clienteForm.tipo_entidad ?? ""} onChange={(e) => setClienteForm((f) => ({ ...f, tipo_entidad: e.target.value }))}>
                  <option value="">— Sin especificar —</option>
                  <option value="publica">Entidad pública</option>
                  <option value="privada">Empresa privada</option>
                  <option value="persona_natural">Persona natural</option>
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
              <label>
                Ciudad
                <div style={{ position: "relative" }}>
                  <input value={clienteForm.ciudad} onChange={(e) => setClienteForm((f) => ({ ...f, ciudad: e.target.value }))} placeholder="Santiago" maxLength={80} style={{ width: "100%" }} />
                  {geoLoading && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8", pointerEvents: "none" }}>buscando…</span>}
                </div>
              </label>
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
              <label>Precio diagnóstico<input type="number" min={0} value={productoForm.diag} onChange={(e) => setProductoForm((f) => ({ ...f, diag: e.target.value }))} placeholder="0" /></label>
              <label>Precio reparación<input type="number" min={0} value={productoForm.rep} onChange={(e) => setProductoForm((f) => ({ ...f, rep: e.target.value }))} placeholder="0" /></label>
              <label>Precio mantención<input type="number" min={0} value={productoForm.mant} onChange={(e) => setProductoForm((f) => ({ ...f, mant: e.target.value }))} placeholder="0" /></label>
              <label>Precio instalación<input type="number" min={0} value={productoForm.inst} onChange={(e) => setProductoForm((f) => ({ ...f, inst: e.target.value }))} placeholder="0" /></label>
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
          <button className="ghost" onClick={close} disabled={saving}>Cancelar</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="btn-spinner" />Guardando...</>
              : kind === "cotizacion" ? "Ir a cotizaciones" : isEditing ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
