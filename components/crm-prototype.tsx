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
  Edit3,
  Eye,
  EyeOff,
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
import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Lead, Cliente, Producto, Cotizacion, DashboardStats, LeadForm, ClienteForm, ProductoForm, CatalogoItem, CatalogoItemForm, Plantilla, CotizacionItemForm } from "@/lib/api";
import { money, formatRut, normalizeRut, isValidEmail, validateRut, isValidPhone, isActivo, fmtActivityDate } from "@/lib/utils";

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
  { id: "CAT-MP-001", codigo: "MP-001", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 85000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CAT-MP-002", codigo: "MP-002", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 90000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CAT-MC-001", codigo: "MC-001", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 120000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CAT-MC-002", codigo: "MC-002", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 185000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CAT-BS-001", codigo: "BS-001", categoria: "BS", servicio: "Bloque servicio tecnico", equipo: "Atencion en terreno", unidad: "Bloque", precio_neto: 65000, grupo: "BS", texto_base_key: "BS", descripcion_larga: "" },
  { id: "CAT-VS-001", codigo: "VS-001", categoria: "VS", servicio: "Visita tecnica", equipo: "Evaluacion inicial", unidad: "Visita", precio_neto: 45000, grupo: "VS", texto_base_key: "VS", descripcion_larga: "" },
  { id: "CAT-EV-001", codigo: "EV-001", categoria: "EV", servicio: "Evaluacion diagnostica", equipo: "Equipo biomedico", unidad: "Servicio", precio_neto: 55000, grupo: "EV", texto_base_key: "EV", descripcion_larga: "" },
  { id: "CAT-RS-001", codigo: "RS-001", categoria: "RS", servicio: "Repuesto / Insumo", equipo: "Kit de repuestos", unidad: "Unidad", precio_neto: 0, grupo: "RS", texto_base_key: "RS", descripcion_larga: "" },
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

const LEAD_FORM_INIT: LeadForm = { rut: "", nombre: "", empresa: "", tel: "+56 ", email: "", canal: "wsp", servicio: "", equipo: "", direccion: "" };
const CLIENTE_FORM_INIT: ClienteForm = { rut: "", nombre: "", contacto: "", tel: "+56 ", correo: "", rubro: "Médico", estado: "activo", direccion: "", ciudad: "", comuna: "" };
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
  const noGestionados = useMemo(() => leads.filter((l) => l.estado === "no-gestionado"), [leads]);
  const visibleLeads = useMemo(() => {
    const list = leadFilter === "todos" ? leads : leads.filter((l) => l.estado === leadFilter);
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
  }, [leads, leadFilter, leadSort]);
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

    // Visita técnica rule: cobrada si dirección no es Santiago,
    // o si es Santiago pero neto < $500.000
    const addr = lead.direccion || match?.ciudad || match?.direccion || "";
    if (addr.trim()) {
      const esEnSantiago = /santiago|stgo/i.test(addr);
      const neto = finalItems.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
      const vsRequerida = !esEnSantiago || neto < 500000;
      if (vsRequerida) {
        const vsItem = catalogo.find((c) => c.categoria === "VS");
        const yaIncluida = finalItems.some((i) => i.tipo_servicio === "VS" || (vsItem && i.codigo === vsItem.codigo));
        if (vsItem && !yaIncluida) {
          finalItems = [catalogoToCotizacionItem(vsItem, plantillas), ...finalItems];
        }
      }
    }

    setCotizItems(finalItems);
    setCotizNotas([
      `Origen lead: ${lead.nombre}`,
      lead.empresa ? `Empresa: ${lead.empresa}` : "",
      lead.tel ? `Tel: ${lead.tel}` : "",
      lead.email ? `Correo: ${lead.email}` : "",
      lead.equipo ? `Equipo/producto: ${lead.equipo}` : "",
      lead.servicio ? `Servicio solicitado: ${serviceLabel(lead.servicio)}` : "",
      addr ? `Dirección: ${addr}` : "",
    ].filter(Boolean).join(" | "));
    if (!match) notify("Cliente no encontrado — selecciona o crea uno antes de emitir");
    goTo("cotizaciones");
  }

  async function handleSaveLead(form: LeadForm, items: CotizacionItemForm[] = []) {
    const tempId = `temp-${Date.now()}`;
    const tempLead: Lead = { id: tempId, ...form, canal: form.canal as LeadChannel, estado: "no-gestionado", tiempo: "Justo ahora" };
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
        direccion: "",
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

    const result = await api.createCotizacionMulti({
      cliente_id: cotizClienteId,
      notas_cliente: cotizNotas,
      forma_pago: cotizFormaPago,
      validez_dias: 30,
      items: cotizItems,
    });
    const total = result?.total_con_iva ?? tempTotal;
    const cot: Cotizacion = {
      id: result?.id ?? String(Date.now()),
      nro: result?.numero ?? "",
      cliente: clienteObj?.id ?? cotizClienteId,
      monto: total,
      estado: "Pendiente",
      fecha: new Date().toISOString().slice(0, 10),
      pdfUrl: result?.pdf_url ?? undefined,
    };
    setCotizaciones((prev) => prev.map((c) => c.id === tempId ? cot : c));
    api.logActivity("cotizacion_emitida", `Cotización ${cot.nro} emitida`, `${clienteObj?.nombre ?? cotizClienteId} — ${money(total)} CLP`, cot.id, "cotizacion", currentUser?.email);

    // Mark matching no-gestionado lead as gestionado
    const rutCliente = normalizeRut(clienteObj?.rut ?? "");
    const matchLead = leads.find((l) =>
      l.estado === "no-gestionado" && (
        (rutCliente.length > 4 && normalizeRut(l.rut ?? "") === rutCliente) ||
        clienteObj?.nombre.toLowerCase().trim() === l.empresa.toLowerCase().trim()
      )
    );
    if (matchLead) {
      setLeads((prev) => prev.map((l) => l.id === matchLead.id ? { ...l, estado: "gestionado" } : l));
      api.updateLead(matchLead.id, { estado: "gestionado" });
    }

    setEmitiendo(false);
    setCotizItems([]);
    setCotizNotas("");
    notify(`Cotización ${cot.nro} emitida`);
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
      </tr>`;
    }).join("");
    const glossaryEntries: { label: string; desc: string }[] = [];
    const seenGloss = new Set<string>();
    det.items.forEach((it) => {
      const key = it.tipo_servicio || it.descripcion_larga;
      if (it.descripcion_larga && key && !seenGloss.has(key)) {
        seenGloss.add(key);
        glossaryEntries.push({ label: it.tipo_servicio || it.descripcion.split("—")[0].trim(), desc: it.descripcion_larga });
      }
    });
    const glossaryHtml = glossaryEntries.length > 0
      ? `<div class="glossary">
          <h3 style="page-break-before:always">Descripción de servicios</h3>
          ${glossaryEntries.map((e) => `<div class="gloss-item"><strong>${e.label}</strong><p>${e.desc}</p></div>`).join("")}
        </div>`
      : "";
    const win = window.open("", "_blank", "width=920,height=750");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización ${det.numero}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #007a4e}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#007a4e}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .data-block h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#007a4e;margin-bottom:8px;font-weight:700}
      .data-block dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;align-items:baseline}
      .data-block dt{color:#64748b;font-size:12px;white-space:nowrap}
      .data-block dt::after{content:":"}
      .data-block dd{font-size:12px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#007a4e;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #007a4e}
      .conditions{font-size:12px;color:#475569;background:#f0faf5;padding:12px;border-radius:6px;margin-bottom:16px;border-left:3px solid #007a4e}
      .conditions strong{display:block;margin-bottom:4px;color:#007a4e}
      .transfer{font-size:12px;color:#1e293b;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .transfer strong{display:block;margin-bottom:6px;color:#007a4e;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
      .transfer dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px}
      .transfer dt{color:#64748b;white-space:nowrap}
      .transfer dt::after{content:":"}
      .transfer dd{font-weight:500}
      .glossary{margin-top:8px}
      .gloss-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;border-left:3px solid #007a4e}
      .gloss-item strong{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#007a4e;margin-bottom:4px}
      .gloss-item p{font-size:12px;color:#475569;white-space:pre-line;line-height:1.6}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
    </style></head><body>
    <header>
      <div><img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" style="filter:brightness(0)"/><p style="margin-top:4px;color:#64748b;font-size:12px">Reparación y mantención de equipos médicos</p></div>
      <div class="right"><strong>${det.numero}</strong><span>${fechaStr}</span><br/><span style="color:#64748b">biomeditech.cl</span></div>
    </header>
    <h3>Información</h3>
    <div class="two-col">
      <div class="data-block">
        <h4>Cliente</h4>
        <dl>
          <dt>Empresa</dt><dd>${clienteObj?.nombre ?? det.cliente_id}</dd>
          <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
          <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
          <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
          <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
        </dl>
      </div>
      <div class="data-block">
        <h4>Biomeditech SpA</h4>
        <dl>
          <dt>RUT</dt><dd>78.200.394-1</dd>
          <dt>Dirección</dt><dd>Pedro Torres 798, Ñuñoa</dd>
          <dt>Contacto</dt><dd>contacto@biomeditech.cl</dd>
          <dt>Teléfono</dt><dd>+56 9 9999 9999</dd>
          <dt>Web</dt><dd>biomeditech.cl</dd>
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
      <strong>Condiciones</strong>
      Forma de pago: ${det.forma_pago} · Validez: ${det.validez_dias} días · Diagnóstico incluido en servicio aceptado
    </div>
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
      </tr>`;
    }).join("");
    const glossaryEntriesDraft: { label: string; desc: string }[] = [];
    const seenGlossDraft = new Set<string>();
    cotizItems.forEach((it) => {
      const key = it.tipo_servicio || it.descripcion_larga;
      if (it.descripcion_larga && key && !seenGlossDraft.has(key)) {
        seenGlossDraft.add(key);
        glossaryEntriesDraft.push({ label: it.tipo_servicio || it.descripcion.split("—")[0].trim(), desc: it.descripcion_larga });
      }
    });
    const glossaryHtmlDraft = glossaryEntriesDraft.length > 0
      ? `<div class="glossary">
          <h3 style="page-break-before:always">Descripción de servicios</h3>
          ${glossaryEntriesDraft.map((e) => `<div class="gloss-item"><strong>${e.label}</strong><p>${e.desc}</p></div>`).join("")}
        </div>`
      : "";
    const win = window.open("", "_blank", "width=920,height=750");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cotización BORRADOR</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:36px 40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #007a4e}
      header img{height:40px}
      header .right{text-align:right}
      header .right strong{display:block;font-size:20px;color:#007a4e}
      h3{margin:18px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .data-block h4{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#007a4e;margin-bottom:8px;font-weight:700}
      .data-block dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;align-items:baseline}
      .data-block dt{color:#64748b;font-size:12px;white-space:nowrap}
      .data-block dt::after{content:":"}
      .data-block dd{font-size:12px;font-weight:500}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      thead th{background:#007a4e;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{padding:7px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
      .totals{width:320px;margin-left:auto;margin-bottom:16px}
      .totals tr td{padding:5px 12px}
      .totals tr:last-child{font-weight:700;font-size:15px;border-top:2px solid #007a4e}
      .conditions{font-size:12px;color:#475569;background:#f0faf5;padding:12px;border-radius:6px;margin-bottom:16px;border-left:3px solid #007a4e}
      .conditions strong{display:block;margin-bottom:4px;color:#007a4e}
      .transfer{font-size:12px;color:#1e293b;background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px}
      .transfer strong{display:block;margin-bottom:6px;color:#007a4e;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
      .transfer dl{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px}
      .transfer dt{color:#64748b;white-space:nowrap}
      .transfer dt::after{content:":"}
      .transfer dd{font-weight:500}
      .glossary{margin-top:8px}
      .gloss-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;border-left:3px solid #007a4e}
      .gloss-item strong{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#007a4e;margin-bottom:4px}
      .gloss-item p{font-size:12px;color:#475569;white-space:pre-line;line-height:1.6}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
      .draft-badge{display:inline-block;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.06em;margin-bottom:4px}
    </style></head><body>
    <header>
      <div><img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" style="filter:brightness(0)"/><p style="margin-top:4px;color:#64748b;font-size:12px">Reparación y mantención de equipos médicos</p></div>
      <div class="right"><span class="draft-badge">BORRADOR</span><strong style="font-size:16px;color:#64748b">Sin número</strong><span>${fechaStr}</span><br/><span style="color:#64748b">biomeditech.cl</span></div>
    </header>
    <h3>Información</h3>
    <div class="two-col">
      <div class="data-block">
        <h4>Cliente</h4>
        <dl>
          <dt>Empresa</dt><dd>${clienteObj?.nombre ?? "—"}</dd>
          <dt>RUT</dt><dd>${clienteObj?.rut ?? "—"}</dd>
          <dt>Contacto</dt><dd>${clienteObj?.contacto ?? "—"}</dd>
          <dt>Teléfono</dt><dd>${clienteObj?.telefono || "—"}</dd>
          <dt>Dirección</dt><dd>${clienteObj?.direccion || "—"}</dd>
        </dl>
      </div>
      <div class="data-block">
        <h4>Biomeditech SpA</h4>
        <dl>
          <dt>RUT</dt><dd>78.200.394-1</dd>
          <dt>Dirección</dt><dd>Pedro Torres 798, Ñuñoa</dd>
          <dt>Contacto</dt><dd>contacto@biomeditech.cl</dd>
          <dt>Teléfono</dt><dd>+56 9 9999 9999</dd>
          <dt>Web</dt><dd>biomeditech.cl</dd>
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
      <strong>Condiciones</strong>
      Forma de pago: ${cotizFormaPago} · Validez: 30 días · Diagnóstico incluido en servicio aceptado
    </div>
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
    ${glossaryHtmlDraft}
    <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por 30 días desde emisión</footer>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  async function handleVerCotizacion(id: string) {
    const det = await api.fetchCotizacionDetalle(id);
    if (!det) { notify("No se pudo cargar el detalle de la cotización"); return; }
    handlePrintDetalle(det);
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
            <Dashboard noGestionados={noGestionados} goTo={goTo} notify={notify} stats={stats} cotizaciones={cotizaciones} />
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
                        <button className="primary small" title="Crear cotización para este lead" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} />Cotizar</button>
                        <button className="ghost small" title={lead.estado === "gestionado" ? "Marcar como sin gestionar" : "Marcar como gestionado"} onClick={() => handleToggleGestionar(lead.id)}><Check size={15} />{lead.estado === "gestionado" ? "Desmarcar" : "Gestionar"}</button>
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
                          <td><span className={`tag ${lead.estado === "gestionado" ? "green" : "amber"}`}>{lead.estado === "gestionado" ? "Gestionado" : "Sin gestionar"}</span></td>
                          <td style={{ color: "#64748b", fontSize: 12 }}>{lead.tiempo}</td>
                          <td>
                            <div className="row-actions">
                              <button aria-label="Cotizar" title="Crear cotización" onClick={() => handleCotizarLead(lead)}><ClipboardList size={15} /></button>
                              <button aria-label="Gestionar" title="Cambiar estado de gestión" onClick={() => handleToggleGestionar(lead.id)}><Check size={15} /></button>
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
                    emitiendo={emitiendo}
                  />
                </div>
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
                />
                <HistoryTable cotizaciones={cotizaciones} clientes={clientes} onVerCotizacion={handleVerCotizacion} />
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
  cotizaciones,
}: {
  noGestionados: Lead[];
  goTo: (id: ModuleId) => void;
  notify: (message: string) => void;
  stats: DashboardStats | null;
  cotizaciones: Cotizacion[];
}) {
  const leadsValue = stats ? String(stats.leadsPendientes) : String(noGestionados.length);
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
        <Kpi icon={Activity} label="Leads pendientes" value={leadsValue} delta="Sin gestionar" tone="amber" />
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
  return `${item.servicio} - ${item.equipo}`.trim().replace(/\s*-\s*$/, "");
}

function catalogoToCotizacionItem(item: CatalogoItem, plantillas: Plantilla[]): CotizacionItemForm {
  const plantilla = plantillas.find((p) => p.codigo === item.texto_base_key || p.codigo === item.categoria);
  return {
    producto_id: item.id,
    codigo: item.codigo,
    descripcion: catalogoDescription(item),
    descripcion_larga: item.descripcion_larga || plantilla?.descripcion_larga || "",
    tipo_servicio: item.categoria || item.texto_base_key,
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
  items: CotizacionItemForm[];
  setItems: React.Dispatch<React.SetStateAction<CotizacionItemForm[]>>;
  onEmitir: () => void;
  onDescargarPDF: () => void;
  emitiendo?: boolean;
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
    const plantilla = plantillas.find((p) => p.codigo === cat.texto_base_key || p.codigo === cat.categoria);
    setItems((prev) => [
      ...prev,
      {
        producto_id: cat.id,
        codigo: cat.codigo,
        descripcion: `${cat.servicio} — ${cat.equipo}`.trim().replace(/\s*—\s*$/, ""),
        descripcion_larga: cat.descripcion_larga || plantilla?.descripcion_larga || "",
        tipo_servicio: cat.categoria || cat.texto_base_key,
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

  // Visita técnica indicator (live, based on selected client city and current subtotal)
  const clienteObj = clientes.find((c) => c.id === clienteId);
  const clienteAddr = clienteObj ? `${clienteObj.ciudad || ""} ${clienteObj.direccion || ""}`.toLowerCase().trim() : "";
  const vsIndicator: { cobrada: boolean; razon: string } | null = clienteAddr
    ? /santiago|stgo/.test(clienteAddr)
      ? subtotal >= 500000
        ? { cobrada: false, razon: "Santiago + cotización ≥ $500.000 → incluida sin costo" }
        : { cobrada: true, razon: "Santiago + cotización < $500.000 → cobrada" }
      : { cobrada: true, razon: "Fuera de Santiago → siempre cobrada" }
    : null;

  return (
    <div className="form-stack">
      <label>
        Cliente *
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">— Seleccionar cliente —</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      {vsIndicator && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: vsIndicator.cobrada ? "#fff7ed" : "#f0fdf4", border: `1px solid ${vsIndicator.cobrada ? "#fed7aa" : "#bbf7d0"}`, fontSize: 12 }}>
          <span style={{ fontSize: 16 }}>{vsIndicator.cobrada ? "🔴" : "🟢"}</span>
          <div>
            <strong style={{ color: vsIndicator.cobrada ? "#9a3412" : "#166534" }}>
              Visita técnica: {vsIndicator.cobrada ? "cobrada" : "incluida sin costo"}
            </strong>
            <span style={{ color: "#64748b", marginLeft: 6 }}>{vsIndicator.razon}</span>
          </div>
        </div>
      )}

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

const PROD_SVC_DEFAULTS = [
  { id: "MP", label: "Mantención Preventiva" },
  { id: "MC", label: "Mantención Correctiva" },
  { id: "MR", label: "Mantención/Reparación" },
  { id: "INST", label: "Instalación" },
  { id: "DIAG", label: "Diagnóstico" },
  { id: "VS", label: "Visita Técnica" },
  { id: "RS", label: "Repuesto/Insumo" },
];
const EQUIP_CAT_DEFAULTS = ["Médico", "Dental", "Estético", "Otro"];

function ProductsModule({
  catalogo, setCatalogo, notify,
}: {
  catalogo: CatalogoItem[];
  setCatalogo: React.Dispatch<React.SetStateAction<CatalogoItem[]>>;
  notify: (msg: string) => void;
}) {
  const [serviceTypes, setServiceTypes] = useState<{ id: string; label: string }[]>(() => {
    try { const s = localStorage.getItem("crm_svc_types"); return s ? JSON.parse(s) : PROD_SVC_DEFAULTS; } catch { return PROD_SVC_DEFAULTS; }
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

  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [taxOpen, setTaxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modal, setModal] = useState<"product" | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSvcType, setNewSvcType] = useState({ id: "", label: "" });
  const [newEquipCat, setNewEquipCat] = useState("");
  const [prodForm, setProdForm] = useState<{
    nombre: string;
    equipCat: string;
    servicios: { id: string; precio: string; descripcion: string; enabled: boolean }[];
  }>({ nombre: "", equipCat: EQUIP_CAT_DEFAULTS[0], servicios: [] });

  function getEquipCat(item: CatalogoItem): string {
    if (item.texto_base_key?.includes(":")) return item.texto_base_key.split(":")[0];
    return "Otro";
  }

  function resolveDesc(equipCat: string, svcId: string): string {
    return descTemplates[`${equipCat}:${svcId}`] || descTemplates[`GENERAL:${svcId}`] || "";
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
    setEditingGroup(null);
    setProdForm({ nombre: "", equipCat: equipCats[0] || "Médico", servicios: serviceTypes.map((st) => ({ id: st.id, precio: "", descripcion: "", enabled: false })) });
    setModal("product");
  }

  function openEdit(equipName: string, items: CatalogoItem[], equipCat: string) {
    setEditingGroup(equipName);
    setProdForm({
      nombre: equipName,
      equipCat,
      servicios: serviceTypes.map((st) => {
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
          texto_base_key: `${prodForm.equipCat}:${s.id}`,
          descripcion_larga: s.descripcion || resolveDesc(prodForm.equipCat, s.id),
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
          texto_base_key: `${prodForm.equipCat}:${s.id}`,
          descripcion_larga: s.descripcion || resolveDesc(prodForm.equipCat, s.id),
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
          <button className="primary" onClick={openAdd}><Plus size={16} />Nuevo equipo</button>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="panel" style={{ padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#64748b" }}>Tipos de servicio</strong>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {serviceTypes.map((st) => (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span className="tag navy" style={{ minWidth: 44, textAlign: "center", fontSize: 11 }}>{st.id}</span>
                    <span style={{ flex: 1, color: "#475569" }}>{st.label}</span>
                    <button onClick={() => { if (window.confirm(`¿Eliminar "${st.label}"?`)) setServiceTypes((p) => p.filter((s) => s.id !== st.id)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}><Trash2 size={13} /></button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input placeholder="ID" value={newSvcType.id} onChange={(e) => setNewSvcType((p) => ({ ...p, id: e.target.value.toUpperCase().slice(0, 8) }))} style={{ width: 64 }} maxLength={8} />
                  <input placeholder="Nombre del servicio" value={newSvcType.label} onChange={(e) => setNewSvcType((p) => ({ ...p, label: e.target.value }))} style={{ flex: 1 }} maxLength={60} />
                  <button className="primary small" onClick={() => { if (!newSvcType.id || !newSvcType.label) return; if (serviceTypes.some((s) => s.id === newSvcType.id)) { notify("Ya existe ese código"); return; } setServiceTypes((p) => [...p, { ...newSvcType }]); setNewSvcType({ id: "", label: "" }); }}><Plus size={14} /></button>
                </div>
              </div>
            </div>
            <div>
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
                  <button className="primary small" onClick={() => { if (!newEquipCat.trim()) return; if (equipCats.includes(newEquipCat.trim())) { notify("Ya existe"); return; } setEquipCats((p) => [...p, newEquipCat.trim()]); setNewEquipCat(""); }}><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glosario / Taxonomy collapsible */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <button onClick={() => setTaxOpen((v) => !v)} style={{ width: "100%", background: "#f8fafc", border: "none", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><FileText size={15} />Glosario de glosas por categoría</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d={taxOpen ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {taxOpen && (
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Estas descripciones se asignan automáticamente al crear ítems de la misma categoría + tipo de servicio. Si el equipo tiene descripción propia, esa tiene prioridad.</p>
            {[...equipCats, "GENERAL"].map((cat) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: cat === "GENERAL" ? "#64748b" : "var(--bio-green-dark)" }}>{cat === "GENERAL" ? "GENERAL (fallback global)" : cat}</strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {serviceTypes.filter((st) => st.id !== "VS").map((st) => (
                    <label key={st.id} style={{ fontSize: 12 }}>
                      {st.id} — {st.label}
                      <textarea rows={2} value={descTemplates[`${cat}:${st.id}`] || ""} placeholder={cat === "GENERAL" ? `Descripción estándar de ${st.label}...` : `Descripción de ${st.label} para equipos ${cat}...`} onChange={(e) => setDescTemplates((p) => ({ ...p, [`${cat}:${st.id}`]: e.target.value }))} style={{ fontSize: 11, lineHeight: 1.5, marginTop: 2 }} maxLength={600} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                {search || catFilter ? "Sin resultados para este filtro." : "No hay equipos registrados. Haz clic en «Nuevo equipo» para agregar."}
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
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editingGroup ? `Editar: ${editingGroup}` : "Nuevo equipo"}</h2>
              <button onClick={() => setModal(null)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            <div className="modal-grid">
              <label className="wide">
                Nombre del equipo *
                <input value={prodForm.nombre} onChange={(e) => setProdForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Autoclave clase B 23L" maxLength={120} disabled={!!editingGroup} />
              </label>
              <label>
                Categoría *
                <select value={prodForm.equipCat} onChange={(e) => setProdForm((f) => ({ ...f, equipCat: e.target.value }))}>
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
              <button className="primary" onClick={handleSaveProd} disabled={saving}>{saving ? "Guardando..." : editingGroup ? "Actualizar" : "Guardar equipo"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HistoryTable({ cotizaciones, clientes, onVerCotizacion }: {
  cotizaciones: Cotizacion[];
  clientes: Cliente[];
  onVerCotizacion: (id: string) => void;
}) {
  const [clienteFilter, setClienteFilter] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "fecha", dir: "desc" });

  function getClienteName(clienteId: string) {
    const found = clientes.find((c) => c.id === clienteId || c.nombre === clienteId);
    return found?.nombre ?? clienteId;
  }

  function toggleSort(key: string) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  const visible = useMemo(() => {
    const list = cotizaciones.filter((cot) => {
      if (!clienteFilter) return true;
      return getClienteName(cot.cliente).toLowerCase().includes(clienteFilter.toLowerCase());
    });
    return [...list].sort((a, b) => {
      if (sort.key === "monto") {
        return sort.dir === "asc" ? a.monto - b.monto : b.monto - a.monto;
      }
      if (sort.key === "cliente") {
        const av = getClienteName(a.cliente).toLowerCase();
        const bv = getClienteName(b.cliente).toLowerCase();
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const av = String((a as unknown as Record<string,unknown>)[sort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string,unknown>)[sort.key] ?? "").toLowerCase();
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }).slice(0, 20);
  }, [cotizaciones, clienteFilter, sort, clientes]);

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
                      <FileText size={13} />PDF
                    </a>
                  : cot.id
                    ? <button onClick={() => onVerCotizacion(cot.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0f2340", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <Eye size={13} />Ver
                      </button>
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
      });
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
      if (!leadForm.nombre.trim()) { notify("El nombre del contacto es requerido"); return; }
      if (!leadForm.empresa.trim()) { notify("La empresa es requerida"); return; }
      if (!leadForm.rut?.trim()) { notify("El RUT es requerido"); return; }
      if (!validateRut(leadForm.rut)) { notify("El RUT ingresado no es válido. Verifica el dígito verificador."); return; }
      if (leadForm.tel && leadForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(leadForm.tel)) { notify("El teléfono no tiene un formato válido (ej: +56 9 1234 5678)"); return; }
      if (leadForm.email && !isValidEmail(leadForm.email)) { notify("El correo no tiene un formato válido"); return; }
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
      editingCliente ? onUpdateCliente(editingCliente.id, clienteForm) : onSaveCliente(clienteForm);
    } else if (kind === "producto") {
      if (!productoForm.nombre.trim()) { notify("El nombre del producto es requerido"); return; }
      if ([productoForm.diag, productoForm.rep, productoForm.mant, productoForm.inst].some((v) => Number(v) < 0)) { notify("Los precios no pueden ser negativos"); return; }
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
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
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
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                  Visita técnica: cobrada si no es Santiago o si el monto es &lt; $500.000
                </span>
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
          <button className="ghost" onClick={close}>Cancelar</button>
          <button className="primary" onClick={handleSave}>
            {kind === "cotizacion" ? "Ir a cotizaciones" : isEditing ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
