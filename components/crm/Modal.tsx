"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Lead, Cliente, Producto, LeadForm, ClienteForm, ProductoForm, CatalogoItem, Plantilla, CotizacionItemForm } from "@/lib/api";
import { formatRut, normalizeRut, isValidEmail, validateRut, isValidPhone } from "@/lib/utils";
import type { ModuleId } from "./types";
import { CAT_LABELS, LEAD_FORM_INIT, CLIENTE_FORM_INIT, CATALOGO_FORM_INIT, PRODUCTO_FORM_INIT } from "./constants";
import { useDebounce } from "./shared";
import { catalogoToCotizacionItem } from "./ProductsModule";

export function Modal({
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
  onSaveLead: (form: LeadForm, items?: CotizacionItemForm[]) => Promise<void>;
  onSaveCliente: (form: ClienteForm) => Promise<void>;
  onSaveProducto: (form: ProductoForm) => Promise<void>;
  onUpdateLead: (id: string, form: LeadForm, items?: CotizacionItemForm[]) => Promise<void>;
  onUpdateCliente: (id: string, form: ClienteForm) => Promise<void>;
  onUpdateProducto: (id: string, form: ProductoForm) => Promise<void>;
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
      setClienteForm({ rut: editingCliente.rut, nombre: editingCliente.nombre, contacto: editingCliente.contacto, tel: editingCliente.telefono || "+56 ", correo: editingCliente.correo, estado: editingCliente.estado || "activo", direccion: editingCliente.direccion || "", ciudad: editingCliente.ciudad || "", comuna: editingCliente.comuna || "", tipo_entidad: editingCliente.tipo_entidad ?? "" });
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

    let action: Promise<void> | null = null;

    if (kind === "lead") {
      if (!leadForm.nombre.trim()) { notify("El nombre del contacto es requerido"); return; }
      if (!leadForm.empresa.trim()) { notify("La empresa es requerida"); return; }
      if (!leadForm.rut?.trim()) { notify("El RUT es requerido"); return; }
      if (!validateRut(leadForm.rut)) { notify("El RUT ingresado no es válido. Verifica el dígito verificador."); return; }
      if (leadForm.tel && leadForm.tel.replace(/\D/g, "").length > 0 && !isValidPhone(leadForm.tel)) { notify("El teléfono no tiene un formato válido (ej: +56 9 1234 5678)"); return; }
      if (leadForm.email && !isValidEmail(leadForm.email)) { notify("El correo no tiene un formato válido"); return; }
      action = editingLead ? onUpdateLead(editingLead.id, leadForm, leadItems) : onSaveLead(leadForm, leadItems);
    } else if (kind === "cliente") {
      if (!clienteForm.rut?.trim()) { notify("El RUT de la empresa es requerido"); return; }
      if (!validateRut(clienteForm.rut)) { notify("El RUT del cliente no es válido. Verifica el dígito verificador."); return; }
      if (!clienteForm.nombre.trim()) { notify("El nombre de la empresa es requerido"); return; }
      if (!clienteForm.contacto.trim()) { notify("El nombre del contacto es requerido"); return; }
      if (!clienteForm.tel.trim() || clienteForm.tel.trim() === "+56") { notify("El teléfono es requerido"); return; }
      if (!isValidPhone(clienteForm.tel)) { notify("El teléfono no tiene un formato válido (ej: +56 9 1234 5678)"); return; }
      if (!clienteForm.correo.trim()) { notify("El correo es requerido"); return; }
      if (!isValidEmail(clienteForm.correo)) { notify("El correo no tiene un formato válido"); return; }
      action = editingCliente ? onUpdateCliente(editingCliente.id, clienteForm) : onSaveCliente(clienteForm);
    } else if (kind === "producto") {
      if (!productoForm.nombre.trim()) { notify("El nombre del producto es requerido"); return; }
      if ([productoForm.diag, productoForm.rep, productoForm.mant, productoForm.inst].some((v) => Number(v) < 0)) { notify("Los precios no pueden ser negativos"); return; }
      action = editingProducto ? onUpdateProducto(editingProducto.id, productoForm) : onSaveProducto(productoForm);
    } else if (kind === "cotizacion") {
      close();
      goTo("cotizaciones");
      return;
    }

    if (action) {
      setSaving(true);
      try {
        await action;
      } catch {
        notify("No se pudo guardar. Intenta nuevamente.");
      } finally {
        setSaving(false);
      }
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
                            <td style={{ padding: "4px 8px", textAlign: "right", color: "#64748b" }}>{c.precio_neto}</td>
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
              <label className="wide">Nombre equipo / producto<input value={productoForm.nombre} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, nombre: e.target.value }))} placeholder="Monitor de Signos Vitales" maxLength={150} /></label>
              <label>
                Categoría
                <select value={productoForm.cat} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, cat: e.target.value }))}>
                  <option>Equipos médicos</option>
                  <option>Equipos dentales</option>
                  <option>Laboratorio</option>
                  <option>Equipos estéticos</option>
                </select>
              </label>
              <label>Marca / Modelo<input value={productoForm.marca} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, marca: e.target.value }))} placeholder="Philips MP5" maxLength={100} /></label>
              <label>Precio diagnóstico<input type="number" min={0} value={productoForm.diag} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, diag: e.target.value }))} placeholder="0" /></label>
              <label>Precio reparación<input type="number" min={0} value={productoForm.rep} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, rep: e.target.value }))} placeholder="0" /></label>
              <label>Precio mantención<input type="number" min={0} value={productoForm.mant} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, mant: e.target.value }))} placeholder="0" /></label>
              <label>Precio instalación<input type="number" min={0} value={productoForm.inst} onChange={(e) => setProductoForm((f: ProductoForm) => ({ ...f, inst: e.target.value }))} placeholder="0" /></label>
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
