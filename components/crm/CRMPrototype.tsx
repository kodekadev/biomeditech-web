"use client";

import {
  Bell,
  Check,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { LOGO_B64 } from "@/lib/logo-b64";
import type { Lead, Cliente, Producto, Cotizacion, DashboardStats, LeadForm, ClienteForm, ProductoForm, CatalogoItem, Plantilla, CotizacionItemForm, CotizacionDetalle } from "@/lib/api";
import { money, normalizeRut } from "@/lib/utils";
// normalizeRut used in handleCotizarLead + handleSaveLead
import type { ModuleId, LeadStatus, LeadChannel, QuoteService } from "./types";
import { NAV_ITEMS, INITIAL_LEADS, INITIAL_CLIENTES, INITIAL_PRODUCTOS, INITIAL_COTIZACIONES } from "./constants";
import { serviceLabel } from "./shared";
import { LoginScreen } from "./LoginScreen";
import { Dashboard } from "./Dashboard";
import { ProductsModule, catalogoToCotizacionItem } from "./ProductsModule";
import { LeadsModule } from "./LeadsModule";
import { ClientesModule } from "./ClientesModule";
import { CotizacionesModule } from "./CotizacionesModule";
import { HistorialModule } from "./HistorialModule";
import { ProtocolosModule } from "./ProtocolosModule";
import { Modal } from "./Modal";

export default function CRMPrototype() {
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== "undefined") return !!localStorage.getItem("crm_token");
    return false;
  });

  const [currentUser] = useState(() => api.getUser());
  const [active, setActive] = useState<ModuleId>(() => {
    try { return (localStorage.getItem("crm_active_module") as ModuleId) || "dashboard"; } catch { return "dashboard"; }
  });
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);
  const [productos, setProductos] = useState<Producto[]>(INITIAL_PRODUCTOS);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(INITIAL_COTIZACIONES);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"lead" | "cliente" | "producto" | "cotizacion" | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingCatalogo, setEditingCatalogo] = useState<CatalogoItem | null>(null);
  const [leadPreItems, setLeadPreItems] = useState<Record<string, CotizacionItemForm[]>>({});
  const [clientePrefill, setClientePrefill] = useState<Partial<ClienteForm> | null>(null);
  const [toast, setToast] = useState("");
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cotizClienteId, setCotizClienteId] = useState("");
  const [cotizNotas, setCotizNotas] = useState("");
  const [cotizFormaPago, setCotizFormaPago] = useState("50% inicio - 50% entrega");
  const [cotizGarantia, setCotizGarantia] = useState("");
  const [cotizValidez, setCotizValidez] = useState(15);
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
  const condSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try { localStorage.setItem("crm_condiciones", cotizCondiciones); } catch {}
    if (condSaveTimer.current) clearTimeout(condSaveTimer.current);
    condSaveTimer.current = setTimeout(() => {
      api.fetchCrmSettings().then((cfg) => api.saveCrmSettings({ ...cfg, condiciones: cotizCondiciones })).catch(() => {});
    }, 2000);
  }, [cotizCondiciones]);
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

    const fetchCritical = (initial: boolean) => {
      let resolved = 0;
      const done = () => {
        resolved++;
        if (initial && resolved === 1 && !cancelled) setIsLoading(false);
      };
      // Merge helper: preserve local items not yet in BigQuery (eventual consistency lag)
      const merge = <T extends { id: string }>(apiItems: T[], prev: T[]): T[] => {
        const apiIds = new Set(apiItems.map((x) => x.id));
        const localOnly = prev.filter((x) => !x.id.includes("temp") && !apiIds.has(x.id));
        return localOnly.length > 0 ? [...apiItems, ...localOnly] : apiItems;
      };
      api.fetchLeads().then((l) => { if (!cancelled && l.length > 0) setLeads((prev) => merge(l, prev)); done(); }).catch(() => done());
      api.fetchClientes().then((c) => { if (!cancelled && c.length > 0) setClientes((prev) => merge(c, prev)); done(); }).catch(() => { done(); if (initial) setFetchError("Error al cargar los datos. Verifica tu conexión."); });
      api.fetchCotizaciones().then((cot) => { if (!cancelled && cot.length > 0) setCotizaciones((prev) => merge(cot, prev)); done(); }).catch(() => done());
      api.fetchDashboard().then((s) => { if (!cancelled && s) setStats(s); done(); }).catch(() => done());
    };

    const fetchBackground = () => {
      api.fetchProductos().then((p) => { if (!cancelled && p.length > 0) setProductos(p); }).catch(() => {});
      api.fetchCatalogo().then((cat) => {
        if (cancelled || cat.length === 0) return;
        setCatalogo((prev) => {
          const apiIds = new Set(cat.map((c) => c.id));
          const localOnly = prev.filter((c) => !apiIds.has(c.id));
          return localOnly.length > 0 ? [...cat, ...localOnly] : cat;
        });
      }).catch(() => {});
      api.fetchPlantillas().then((plt) => { if (!cancelled && plt.length > 0) setPlantillas(plt); }).catch(() => {});
      api.fetchCrmSettings().then((cfg) => {
        if (cancelled || !cfg.condiciones) return;
        setCotizCondiciones(cfg.condiciones);
        try { localStorage.setItem("crm_condiciones", cfg.condiciones); } catch {}
      }).catch(() => {});
    };

    setFetchError(null);
    setIsLoading(true);
    fetchCritical(true);
    fetchBackground();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCritical(false);
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [loggedIn]);

  // All hooks must be called before any conditional return
  const noCotizados = useMemo(() => leads.filter((l) => l.estado === "no-cotizado"), [leads]);
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
    try { localStorage.setItem("crm_active_module", id); } catch {}
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
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== tempId));
      notify("Error al guardar el lead. Intenta nuevamente.");
      return;
    }
    api.logActivity("nuevo_lead", "Nuevo lead registrado", `${form.nombre} (${form.empresa}) — ${form.servicio}`, lead.id, "lead", currentUser?.email);

    // Auto-create client if not yet registered
    const rutNorm = normalizeRut(form.rut ?? "");
    const clienteExiste = clientes.some((c) =>
      (rutNorm.length > 4 && normalizeRut(c.rut) === rutNorm) ||
      c.nombre.toLowerCase().trim() === (form.empresa || form.nombre).toLowerCase().trim()
    );
    if (!clienteExiste && (form.empresa || form.nombre)) {
      const clienteForm: ClienteForm = {
        rut: form.rut ?? "",
        nombre: form.empresa || form.nombre,
        contacto: form.nombre,
        tel: form.tel || "+56 ",
        correo: form.email || "",
        estado: "activo",
        direccion: form.direccion || "",
        ciudad: "",
        comuna: "",
      };
      const tempCId = `C-temp-${Date.now()}`;
      const tempCliente: Cliente = { id: tempCId, rut: clienteForm.rut, nombre: clienteForm.nombre, contacto: clienteForm.contacto, correo: clienteForm.correo, estado: clienteForm.estado, telefono: clienteForm.tel, direccion: "", ciudad: "", comuna: "" };
      setClientes((prev) => [tempCliente, ...prev]);
      const newCliente = await api.createCliente(clienteForm);
      if (newCliente) {
        setClientes((prev) => prev.map((c) => c.id === tempCId ? newCliente : c));
      } else {
        setClientes((prev) => prev.filter((c) => c.id !== tempCId));
      }
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
      const clienteForm: ClienteForm = {
        rut: form.rut ?? matchingCliente.rut,
        nombre: form.empresa || matchingCliente.nombre,
        contacto: form.nombre || matchingCliente.contacto,
        tel: form.tel || matchingCliente.telefono,
        correo: form.email || matchingCliente.correo,
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
    const tempCliente: Cliente = { id: tempId, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, estado: form.estado || "activo", telefono: form.tel, direccion: form.direccion, ciudad: form.ciudad, comuna: form.comuna };
    setClientes((prev) => [tempCliente, ...prev]);
    closeModal();
    notify("Cliente agregado correctamente");

    const newCliente = await api.createCliente(form);
    if (newCliente) {
      setClientes((prev) => prev.map((c) => c.id === tempId ? newCliente : c));
      api.logActivity("nuevo_cliente", "Nuevo cliente registrado", `${form.nombre}`, newCliente.id, "cliente", currentUser?.email);
    } else {
      // API failed — remove temp and alert user
      setClientes((prev) => prev.filter((c) => c.id !== tempId));
      notify("Error al crear el cliente. Intenta nuevamente.");
    }
  }

  async function handleUpdateCliente(id: string, form: ClienteForm) {
    setClientes((prev) => prev.map((c) => c.id === id ? { ...c, rut: form.rut, nombre: form.nombre, contacto: form.contacto, correo: form.correo, estado: form.estado, telefono: form.tel, direccion: form.direccion, ciudad: form.ciudad, comuna: form.comuna } : c));
    closeModal();

    const updated = await api.saveCliente(id, form);
    if (updated) {
      setClientes((prev) => prev.map((c) => c.id === id ? updated : c));
      notify("Cliente actualizado");
    } else {
      notify("Error al actualizar el cliente. Intenta nuevamente.");
    }
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

    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const todayCount = await api.countCotizacionesHoy();
    const numero = `${dd}${mm}${yy}${String(todayCount + 1).padStart(2, "0")}`;

    const result = await api.createCotizacionMulti({
      cliente_id: cotizClienteId,
      lead_id: matchLead?.id,
      notas_cliente: cotizNotas,
      forma_pago: cotizFormaPago,
      notas_internas: cotizGarantia,
      validez_dias: cotizValidez,
      items: cotizItems,
      numero,
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

  function buildCotizHtml(det: CotizacionDetalle): string {
    const clienteObj = clientes.find((c) => c.id === det.cliente_id);
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
      .gloss-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:6px;border-left:3px solid #0e948b;page-break-inside:avoid;break-inside:avoid}
      .gloss-item p{font-size:12px;color:#475569;white-space:pre-line;line-height:1.6}
      footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
    </style></head><body>
    <div style="min-height:1050px">
    <header>
      <div><img src="${LOGO_B64}" alt="Biomeditech" style="height:48px;-webkit-print-color-adjust:exact;print-color-adjust:exact;forced-color-adjust:none"/></div>
      <div class="right"><strong>COT-${det.numero}</strong><br/><span style="color:#64748b">Biomeditech.cl</span></div>
    </header>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
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
    </div>
    ${glossaryHtml}
    <footer>contacto@biomeditech.cl · biomeditech.cl · WhatsApp: +56 9 5989 0781</footer>
    </body></html>`;
  }

  function handlePrintDetalle(det: CotizacionDetalle) {
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

  async function downloadCotizacionAsPDF(det: CotizacionDetalle) {
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
    const empresa = (clienteObj?.nombre ?? "cliente").replace(/\s+/g, "").replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]/g, "");
    pdf.save(`COT_${det.numero}_${empresa}.pdf`);
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
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
    const fechaPDF = new Date().toISOString().slice(0, 10);
    pdf.save(`cotizacion-${(cliente?.nombre ?? "borrador").replace(/\s+/g, "-")}-${fechaPDF}.pdf`);
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
            <LeadsModule
              leads={leads}
              setLeads={setLeads}
              onCotizarLead={handleCotizarLead}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onSetLeadEstado={handleSetLeadEstado}
              onAddLead={() => setModal("lead")}
            />
          )}

          {active === "clientes" && (
            <ClientesModule
              clientes={clientes}
              setClientes={setClientes}
              notify={notify}
              onCotizarCliente={handleCotizarCliente}
              onEditCliente={handleEditCliente}
              onDeleteCliente={handleDeleteCliente}
              onAddCliente={() => setModal("cliente")}
            />
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

          {active === "cotizaciones" && (
            <CotizacionesModule
              clientes={clientes}
              noCotizados={noCotizados}
              catalogo={catalogo}
              plantillas={plantillas}
              cotizClienteId={cotizClienteId}
              setCotizClienteId={setCotizClienteId}
              cotizNotas={cotizNotas}
              setCotizNotas={setCotizNotas}
              cotizFormaPago={cotizFormaPago}
              setCotizFormaPago={setCotizFormaPago}
              cotizCondiciones={cotizCondiciones}
              setCotizCondiciones={setCotizCondiciones}
              cotizGarantia={cotizGarantia}
              setCotizGarantia={setCotizGarantia}
              cotizValidez={cotizValidez}
              setCotizValidez={setCotizValidez}
              cotizItems={cotizItems}
              setCotizItems={setCotizItems}
              emitiendo={emitiendo}
              fecha={fecha}
              onEmitirCotizacion={handleEmitirCotizacion}
              onPrintQuote={handlePrintQuote}
              onCotizarLead={handleCotizarLead}
            />
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
