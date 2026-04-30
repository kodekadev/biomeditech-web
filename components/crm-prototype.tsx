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
  Mail,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ModuleId = "dashboard" | "leads" | "clientes" | "productos" | "cotizaciones" | "protocolos";
type LeadStatus = "gestionado" | "no-gestionado";
type LeadChannel = "wsp" | "email";
type QuoteService = "diagnostico" | "reparacion" | "mantencion" | "instalacion" | "mixto" | "";

const navItems: Array<{ id: ModuleId; label: string; icon: React.ElementType; group: string; count?: number }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { id: "leads", label: "Leads", icon: Activity, group: "Gestión", count: 5 },
  { id: "clientes", label: "Clientes", icon: BriefcaseMedical, group: "Gestión" },
  { id: "productos", label: "Productos / Servicios", icon: Wrench, group: "Gestión" },
  { id: "cotizaciones", label: "Cotizaciones", icon: ClipboardList, group: "Operaciones" },
  { id: "protocolos", label: "Protocolos Mantención", icon: FileArchive, group: "Operaciones" },
];

const leads = [
  { id: 1, nombre: "María González", empresa: "Clínica Las Condes", tel: "+56 9 8765 4321", email: "maria@clinica.cl", canal: "wsp" as LeadChannel, estado: "no-gestionado" as LeadStatus, servicio: "Reparación", tiempo: "Hace 12 min", equipo: "Monitor de signos vitales" },
  { id: 2, nombre: "Carlos Herrera", empresa: "Centro Dental Norte", tel: "+56 9 7654 3210", email: "carlos@dental.cl", canal: "email" as LeadChannel, estado: "no-gestionado" as LeadStatus, servicio: "Diagnóstico", tiempo: "Hace 1 hora", equipo: "Autoclave" },
  { id: 3, nombre: "Ana Ramírez", empresa: "Lab. Providencia", tel: "+56 9 6543 2109", email: "ana@lab.cl", canal: "wsp" as LeadChannel, estado: "no-gestionado" as LeadStatus, servicio: "Mantención", tiempo: "Hace 2 horas", equipo: "Centrífuga" },
  { id: 4, nombre: "Pedro Soto", empresa: "Clínica Estética Sur", tel: "+56 9 5432 1098", email: "pedro@estetica.cl", canal: "email" as LeadChannel, estado: "gestionado" as LeadStatus, servicio: "Instalación", tiempo: "Ayer", equipo: "Unidad dental" },
  { id: 5, nombre: "Valentina Cruz", empresa: "Hospital Regional", tel: "+56 9 4321 0987", email: "vcruz@hospital.cl", canal: "wsp" as LeadChannel, estado: "no-gestionado" as LeadStatus, servicio: "Reparación", tiempo: "Hace 3 horas", equipo: "Ecógrafo" },
  { id: 6, nombre: "Roberto Mora", empresa: "UnoSalud", tel: "+56 9 3210 9876", email: "rmora@unosalud.cl", canal: "email" as LeadChannel, estado: "gestionado" as LeadStatus, servicio: "Diagnóstico", tiempo: "Hace 2 días", equipo: "Autoclave" },
  { id: 7, nombre: "Daniela Vega", empresa: "Vetlab", tel: "+56 9 2109 8765", email: "dvega@vetlab.cl", canal: "wsp" as LeadChannel, estado: "no-gestionado" as LeadStatus, servicio: "Mantención", tiempo: "Hace 4 horas", equipo: "Centrífuga" },
  { id: 8, nombre: "Sebastián Ríos", empresa: "U. Mayor", tel: "+56 9 1098 7654", email: "srios@umayor.cl", canal: "email" as LeadChannel, estado: "gestionado" as LeadStatus, servicio: "Instalación", tiempo: "Hace 3 días", equipo: "Máquina de anestesia" },
];

const clientes = [
  { id: "C-001", rut: "61.608.023-8", nombre: "Clínica Las Condes", contacto: "Felipe Morales", correo: "felipe@clc.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-002", rut: "60.503.000-1", nombre: "Universidad de Chile", contacto: "Claudia Torres", correo: "claudia@uchile.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-003", rut: "76.543.210-K", nombre: "Centro Médico Providencia", contacto: "Andrea Silva", correo: "andrea@cmp.cl", rubro: "Médico", estado: "Activo" },
  { id: "C-004", rut: "78.123.456-3", nombre: "Neovida", contacto: "Rodrigo Pinto", correo: "rodrigo@neovida.cl", rubro: "Estético", estado: "Activo" },
  { id: "C-005", rut: "77.654.321-5", nombre: "UnoSalud", contacto: "Patricia Muñoz", correo: "patricia@unosalud.cl", rubro: "Dental", estado: "Inactivo" },
  { id: "C-006", rut: "76.111.222-4", nombre: "Vetlab", contacto: "Jorge Espinoza", correo: "jorge@vetlab.cl", rubro: "Laboratorio", estado: "Activo" },
];

const productos = [
  { id: "P-001", nombre: "Monitor de Signos Vitales", cat: "Equipos médicos", diag: 45000, rep: 120000, mant: 85000, inst: 95000 },
  { id: "P-002", nombre: "Autoclave", cat: "Equipos médicos", diag: 35000, rep: 185000, mant: 90000, inst: 110000 },
  { id: "P-003", nombre: "Ecógrafo", cat: "Equipos médicos", diag: 55000, rep: 250000, mant: 0, inst: 130000 },
  { id: "P-004", nombre: "Centrífuga", cat: "Laboratorio", diag: 30000, rep: 75000, mant: 50000, inst: 60000 },
  { id: "P-005", nombre: "Unidad Dental", cat: "Equipos dentales", diag: 40000, rep: 95000, mant: 70000, inst: 120000 },
  { id: "P-006", nombre: "Máquina de Anestesia", cat: "Equipos médicos", diag: 60000, rep: 320000, mant: 150000, inst: 200000 },
];

const serviceLabels: Record<Exclude<QuoteService, "">, string> = {
  diagnostico: "Diagnóstico",
  reparacion: "Reparación",
  mantencion: "Mantención preventiva",
  instalacion: "Instalación",
  mixto: "Mixto",
};

function money(value: number) {
  return value ? `$${value.toLocaleString("es-CL")}` : "—";
}

function getPrice(productId: string, service: QuoteService) {
  const product = productos.find((item) => item.id === productId);
  if (!product) return 0;
  if (service === "diagnostico") return product.diag;
  if (service === "reparacion") return product.rep;
  if (service === "mantencion") return product.mant;
  if (service === "instalacion") return product.inst;
  if (service === "mixto") return product.diag + product.mant;
  return 0;
}

export default function CRMPrototype() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const [leadFilter, setLeadFilter] = useState<"todos" | LeadStatus>("todos");
  const [clientQuery, setClientQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [modal, setModal] = useState<"lead" | "cliente" | "producto" | "cotizacion" | null>(null);
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

  const activeTitle = navItems.find((item) => item.id === active)?.label ?? "Dashboard";
  const visibleLeads = leadFilter === "todos" ? leads : leads.filter((lead) => lead.estado === leadFilter);
  const noGestionados = leads.filter((lead) => lead.estado === "no-gestionado");
  const filteredClients = clientes.filter((client) => JSON.stringify(client).toLowerCase().includes(clientQuery.toLowerCase()));
  const filteredProducts = productos.filter((product) => JSON.stringify(product).toLowerCase().includes(productQuery.toLowerCase()));
  const selectedProduct = productos.find((product) => product.id === quote.productId);
  const computedValue = Number(quote.valor) || getPrice(quote.productId, quote.service);
  const fecha = useMemo(
    () => new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function goTo(id: ModuleId) {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" />
          <span>Sistema CRM</span>
        </div>

        {["Principal", "Gestión", "Operaciones"].map((group) => (
          <div key={group} className="nav-group">
            <p>{group}</p>
            {navItems
              .filter((item) => item.group === group)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => goTo(item.id)}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.count ? <b>{item.count}</b> : null}
                  </button>
                );
              })}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="avatar">JD</div>
          <div>
            <strong>Juan Díaz</strong>
            <span>Administrador</span>
          </div>
          <Settings size={17} />
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
            <Dashboard noGestionados={noGestionados} goTo={goTo} notify={notify} />
          )}

          {active === "leads" && (
            <section className="stack">
              <div className="module-toolbar">
                <div className="segmented">
                  <button className={leadFilter === "todos" ? "selected" : ""} onClick={() => setLeadFilter("todos")}>Todos mis leads <span>{leads.length}</span></button>
                  <button className={leadFilter === "gestionado" ? "selected" : ""} onClick={() => setLeadFilter("gestionado")}>Gestionados <span>{leads.filter((lead) => lead.estado === "gestionado").length}</span></button>
                  <button className={leadFilter === "no-gestionado" ? "selected" : ""} onClick={() => setLeadFilter("no-gestionado")}>Sin gestionar <span>{noGestionados.length}</span></button>
                </div>
                <button className="primary" onClick={() => setModal("lead")}><UserPlus size={16} />Agregar lead</button>
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
                        <span className={lead.estado === "gestionado" ? "ok" : "pending"}>{lead.estado === "gestionado" ? "Gestionado" : "Sin gestionar"}</span>
                      </div>
                    </div>
                    <dl className="lead-meta">
                      <div><MessageCircle size={14} />{lead.tel}</div>
                      <div><Mail size={14} />{lead.email}</div>
                      <div><Wrench size={14} />{lead.servicio} / {lead.equipo}</div>
                      <div><Clock3 size={14} />{lead.tiempo}</div>
                    </dl>
                    <div className="card-actions">
                      <button className="primary small" onClick={() => goTo("cotizaciones")}><ClipboardList size={15} />Cotizar</button>
                      <button className="ghost small" onClick={() => notify("Lead marcado como gestionado")}><Check size={15} />Gestionar</button>
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
                <thead><tr><th>ID</th><th>RUT</th><th>Nombre / Empresa</th><th>Contacto</th><th>Rubro</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      <td className="mono">{client.id}</td>
                      <td className="mono">{client.rut}</td>
                      <td><strong>{client.nombre}</strong><small>{client.correo}</small></td>
                      <td>{client.contacto}</td>
                      <td><span className="tag navy">{client.rubro}</span></td>
                      <td><span className={`tag ${client.estado === "Activo" ? "green" : "amber"}`}>{client.estado}</span></td>
                      <td><RowActions notify={notify} quote={() => goTo("cotizaciones")} /></td>
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
                <thead><tr><th>ID</th><th>Producto / Servicio</th><th>Categoría</th><th>Diagnóstico</th><th>Reparación</th><th>Mantención</th><th>Instalación</th><th>Acciones</th></tr></thead>
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
                      <td><RowActions notify={notify} /></td>
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
                  <QuoteForm quote={quote} setQuote={setQuote} notify={notify} />
                </div>
                <ProcessTimeline />
              </div>

              <div className="stack">
                <div className="preview-label">Previsualización en tiempo real</div>
                <QuotePreview quote={quote} selectedProduct={selectedProduct} computedValue={computedValue} fecha={fecha} />
                <HistoryTable />
              </div>
            </section>
          )}

          {active === "protocolos" && <Protocols />}
        </section>
      </main>

      <Modal kind={modal} close={() => setModal(null)} notify={notify} goTo={goTo} />

      <div className={`toast ${toast ? "show" : ""}`}>
        <Check size={16} />
        <span>{toast}</span>
      </div>
    </div>
  );
}

function Dashboard({ noGestionados, goTo, notify }: { noGestionados: typeof leads; goTo: (id: ModuleId) => void; notify: (message: string) => void }) {
  return (
    <section className="stack">
      <div className="kpi-row">
        <Kpi icon={Activity} label="Leads este mes" value="18" delta="+6 vs mes anterior" tone="green" />
        <Kpi icon={BriefcaseMedical} label="Clientes activos" value="47" delta="3 nuevos" tone="green" />
        <Kpi icon={ClipboardList} label="Cotizaciones emitidas" value="12" delta="4 pendientes" tone="amber" />
        <Kpi icon={FileText} label="Facturación estimada" value="$4,2M" delta="CLP este mes" tone="green" />
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
            <ActivityRow tone="green" icon={Activity} text={<><strong>Nuevo lead vía WhatsApp</strong> - Clínica Las Condes solicitó reparación de monitor.</>} time="Hace 12 min" />
            <ActivityRow tone="navy" icon={ClipboardList} text={<><strong>Cotización COT-2026-012</strong> enviada a Universidad de Chile por $320.000 CLP.</>} time="Hace 1 hora" />
            <ActivityRow tone="green" icon={BriefcaseMedical} text={<><strong>Nuevo cliente registrado</strong> - Centro Médico Providencia.</>} time="Hace 3 horas" />
            <ActivityRow tone="amber" icon={Wrench} text={<><strong>Producto actualizado</strong> - Reparación Autoclave ajustada a $185.000.</>} time="Ayer 16:40" />
            <ActivityRow tone="navy" icon={Check} text={<><strong>Cotización COT-2026-011</strong> aprobada por Neovida.</>} time="Ayer 11:20" />
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

function DataModule({ children, search, setSearch, searchPlaceholder, onAdd }: { children: React.ReactNode; search: string; setSearch: (value: string) => void; searchPlaceholder: string; onAdd: () => void; title: string }) {
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

function RowActions({ notify, quote }: { notify: (message: string) => void; quote?: () => void }) {
  return (
    <div className="row-actions">
      <button aria-label="Editar" onClick={() => notify("Modo edición abierto")}><Edit3 size={15} /></button>
      {quote ? <button aria-label="Cotizar" onClick={quote}><ClipboardList size={15} /></button> : null}
      <button aria-label="Eliminar" className="danger" onClick={() => notify("Registro eliminado del prototipo")}><Trash2 size={15} /></button>
    </div>
  );
}

function QuoteForm({ quote, setQuote, notify }: { quote: { cliente: string; email: string; nro: string; service: QuoteService; productId: string; valor: string; notas: string }; setQuote: React.Dispatch<React.SetStateAction<{ cliente: string; email: string; nro: string; service: QuoteService; productId: string; valor: string; notas: string }>>; notify: (message: string) => void }) {
  function update<K extends keyof typeof quote>(key: K, value: (typeof quote)[K]) {
    setQuote((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="form-stack">
      <label>Cliente<select value={quote.cliente} onChange={(event) => update("cliente", event.target.value)}>{clientes.map((client) => <option key={client.id}>{client.nombre}</option>)}</select></label>
      <label>Correo cliente<input value={quote.email} onChange={(event) => update("email", event.target.value)} /></label>
      <label>N° Cotización<input value={quote.nro} onChange={(event) => update("nro", event.target.value)} /></label>
      <label>Tipo de servicio<select value={quote.service} onChange={(event) => update("service", event.target.value as QuoteService)}><option value="">Seleccionar</option>{Object.entries(serviceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Producto / Equipo<select value={quote.productId} onChange={(event) => update("productId", event.target.value)}>{productos.map((product) => <option key={product.id} value={product.id}>{product.nombre}</option>)}</select></label>
      <label>Valor del servicio (CLP)<input type="number" value={quote.valor} onChange={(event) => update("valor", event.target.value)} placeholder="Usar precio base automático" /></label>
      <label>Notas adicionales<textarea rows={3} value={quote.notas} onChange={(event) => update("notas", event.target.value)} /></label>
      <div className="split-actions">
        <button className="ghost" onClick={() => notify("Previsualización actualizada")}><Eye size={16} />Actualizar vista</button>
        <button className="primary" onClick={() => notify(`Cotización ${quote.nro} emitida y enviada`)}><Send size={16} />Emitir y enviar</button>
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

function QuotePreview({ quote, selectedProduct, computedValue, fecha }: { quote: { cliente: string; email: string; nro: string; service: QuoteService; notas: string }; selectedProduct?: typeof productos[number]; computedValue: number; fecha: string }) {
  return (
    <article className="quote-preview">
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
          <dt>Tipo servicio</dt><dd>{quote.service ? serviceLabels[quote.service] : "—"}</dd>
        </dl>
        <h3>Detalle del servicio</h3>
        <table className="quote-table">
          <thead><tr><th>Producto / Equipo</th><th>Servicio</th><th>Valor</th></tr></thead>
          <tbody>
            <tr>
              <td>{selectedProduct?.nombre ?? "—"}</td>
              <td>{quote.service ? serviceLabels[quote.service] : "—"}</td>
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
    </article>
  );
}

function HistoryTable() {
  return (
    <div className="panel table-card compact">
      <div className="panel-title"><FileText size={18} />Historial reciente</div>
      <table>
        <thead><tr><th>N°</th><th>Cliente</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>
          <tr><td>COT-2026-012</td><td>U. de Chile</td><td>$320.000</td><td><span className="tag amber">Pendiente</span></td></tr>
          <tr><td>COT-2026-011</td><td>Neovida</td><td>$540.000</td><td><span className="tag green">Aprobada</span></td></tr>
          <tr><td>COT-2026-010</td><td>UnoSalud</td><td>$210.000</td><td><span className="tag navy">En revisión</span></td></tr>
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

function Modal({ kind, close, notify, goTo }: { kind: "lead" | "cliente" | "producto" | "cotizacion" | null; close: () => void; notify: (message: string) => void; goTo: (id: ModuleId) => void }) {
  if (!kind) return null;
  const titles = {
    lead: "Nuevo Lead",
    cliente: "Agregar cliente",
    producto: "Agregar producto / servicio",
    cotizacion: "Nueva cotización rápida",
  };
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
              <label>Nombre contacto<input placeholder="Ej: María González" /></label>
              <label>Empresa<input placeholder="Ej: Clínica Santiago" /></label>
              <label>Teléfono<input placeholder="+56 9 XXXX XXXX" /></label>
              <label>Canal<select><option>WhatsApp</option><option>Correo</option><option>Formulario web</option></select></label>
              <label>Correo<input placeholder="correo@empresa.cl" /></label>
              <label>Servicio<select><option>Diagnóstico</option><option>Reparación</option><option>Mantención</option><option>Instalación</option></select></label>
            </>
          )}
          {kind === "cliente" && (
            <>
              <label>RUT empresa<input placeholder="76.XXX.XXX-X" /></label>
              <label>Nombre empresa<input placeholder="Clínica Las Condes" /></label>
              <label>Contacto<input placeholder="Nombre del contacto" /></label>
              <label>Cargo<input placeholder="Jefe de Mantención" /></label>
              <label>Teléfono<input placeholder="+56 9 XXXX XXXX" /></label>
              <label>Correo<input placeholder="contacto@empresa.cl" /></label>
            </>
          )}
          {kind === "producto" && (
            <>
              <label className="wide">Nombre equipo / producto<input placeholder="Monitor de Signos Vitales" /></label>
              <label>Categoría<select><option>Equipos médicos</option><option>Equipos dentales</option><option>Laboratorio</option><option>Equipos estéticos</option></select></label>
              <label>Marca / Modelo<input placeholder="Philips MP5" /></label>
              <label>Precio diagnóstico<input type="number" placeholder="0" /></label>
              <label>Precio reparación<input type="number" placeholder="0" /></label>
              <label>Precio mantención<input type="number" placeholder="0" /></label>
              <label>Precio instalación<input type="number" placeholder="0" /></label>
            </>
          )}
          {kind === "cotizacion" && (
            <>
              <label>Cliente<select><option>Clínica Las Condes</option><option>U. de Chile</option><option>Neovida</option></select></label>
              <label>Servicio<select><option>Diagnóstico</option><option>Reparación</option><option>Mantención</option><option>Instalación</option></select></label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={close}>Cancelar</button>
          <button className="primary" onClick={() => { close(); kind === "cotizacion" ? goTo("cotizaciones") : notify("Registro guardado en el prototipo"); }}>{kind === "cotizacion" ? "Ir a cotizaciones" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
