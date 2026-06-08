"use client";

import { ChevronDown, ChevronUp, Edit3, FileText, Plus, Printer, Search, Send, Settings, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { CatalogoItem, CatalogoItemForm, CotizacionItemForm, Cliente, CrmSettings, Plantilla } from "@/lib/api";
import { money } from "@/lib/utils";
import type { ServiceTypeEntry } from "./types";
import { CAT_LABELS, EQUIP_CAT_DEFAULTS, SERVICE_TYPES_DEFAULTS } from "./constants";

// ── Utility functions ─────────────────────────────────────────────────────────

export function normCat(cat: string): string {
  return cat.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
}

export function catalogoDescription(item: CatalogoItem): string {
  return `${item.servicio} - ${item.equipo.toUpperCase()}`.trim().replace(/\s*-\s*$/, "");
}

export function resolveDescLarga(item: CatalogoItem, plantillas: Plantilla[]): string {
  if (item.descripcion_larga) return item.descripcion_larga;
  const generalKey = `${item.categoria}_GENERAL`;
  const byGeneral = plantillas.find((p) => p.codigo === generalKey);
  if (byGeneral?.descripcion_larga) return byGeneral.descripcion_larga;
  try {
    const local = JSON.parse(localStorage.getItem("crm_desc_templates") || "{}") as Record<string, string>;
    return local[generalKey] || "";
  } catch { return ""; }
}

export function catalogoToCotizacionItem(item: CatalogoItem, plantillas: Plantilla[]) {
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

export function resolveCotizacionItemDesc(
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

// ── DescripcionEditor ─────────────────────────────────────────────────────────

export function DescripcionEditor({ codigo, label, value, plantillaId, onSave }: {
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

// ── AddCatDescRow ─────────────────────────────────────────────────────────────

export function AddCatDescRow({ svcId, equipCats, existing, onAdd }: {
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

// ── ProductsModule ────────────────────────────────────────────────────────────

export function ProductsModule({
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
  const [catServiceMap, setCatServiceMap] = useState<Record<string, string[]>>(() => {
    try { const s = localStorage.getItem("crm_cat_svc_map"); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // Sync localStorage
  useEffect(() => { try { localStorage.setItem("crm_svc_types", JSON.stringify(serviceTypes)); } catch {} }, [serviceTypes]);
  useEffect(() => { try { localStorage.setItem("crm_equip_cats", JSON.stringify(equipCats)); } catch {} }, [equipCats]);
  useEffect(() => { try { localStorage.setItem("crm_desc_templates", JSON.stringify(descTemplates)); } catch {} }, [descTemplates]);
  useEffect(() => { try { localStorage.setItem("crm_cat_svc_map", JSON.stringify(catServiceMap)); } catch {} }, [catServiceMap]);

  // Load shared settings from API — on mount and every 30s
  const cfgPendingRef = useRef(false); // true while a local change is pending save
  useEffect(() => {
    let cancelled = false;
    const applySettings = (cfg: CrmSettings) => {
      if (cancelled || cfgPendingRef.current) return; // don't overwrite unsaved local changes
      if (cfg.equip_cats?.length) {
        setEquipCats(cfg.equip_cats);
        try { localStorage.setItem("crm_equip_cats", JSON.stringify(cfg.equip_cats)); } catch {}
      }
      if (cfg.svc_types?.length) {
        setServiceTypes(cfg.svc_types as ServiceTypeEntry[]);
        try { localStorage.setItem("crm_svc_types", JSON.stringify(cfg.svc_types)); } catch {}
      }
      if (cfg.cat_svc_map && Object.keys(cfg.cat_svc_map).length) {
        setCatServiceMap(cfg.cat_svc_map);
        try { localStorage.setItem("crm_cat_svc_map", JSON.stringify(cfg.cat_svc_map)); } catch {}
      }
    };
    api.fetchCrmSettings().then(applySettings).catch(() => {});
    const interval = setInterval(() => { api.fetchCrmSettings().then(applySettings).catch(() => {}); }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Save shared settings to API (debounced)
  const cfgSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleCfgSave(patch: Partial<CrmSettings>) {
    cfgPendingRef.current = true;
    if (cfgSaveTimer.current) clearTimeout(cfgSaveTimer.current);
    cfgSaveTimer.current = setTimeout(() => {
      api.fetchCrmSettings()
        .then((cfg) => api.saveCrmSettings({ ...cfg, ...patch }))
        .catch(() => {})
        .finally(() => { cfgPendingRef.current = false; });
    }, 1500);
  }

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
      await Promise.all(enabled.map(async (s) => {
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
      }));
      const toDelete = existing.filter((c) => !enabled.some((s) => s.id === c.categoria));
      setCatalogo((prev) => prev.filter((c) => !toDelete.some((d) => d.id === c.id)));
      await Promise.all(toDelete.map((item) => api.deleteCatalogoItem(item.id)));
      notify(`Equipo "${prodForm.nombre}" actualizado`);
    } else {
      const results = await Promise.all(enabled.map((s) => api.createCatalogoItem({
        codigo: nextCode(s.id),
        categoria: s.id,
        servicio: svcLabel[s.id] || s.id,
        equipo: prodForm.nombre,
        unidad: "Servicio",
        precio_neto: s.precio,
        texto_base_key: `${s.id}_${prodForm.equipCat}`,
        descripcion_larga: s.descripcion,
      })));
      const saved = results.filter((r): r is CatalogoItem => r !== null);
      if (saved.length > 0) setCatalogo((prev) => [...prev, ...saved]);
      if (saved.length === 0) {
        notify("Error al guardar el producto. Intenta de nuevo.");
      } else if (saved.length < enabled.length) {
        notify(`Equipo "${prodForm.nombre}" guardado parcialmente (${saved.length}/${enabled.length} servicios)`);
      } else {
        notify(`Equipo "${prodForm.nombre}" agregado con ${enabled.length} servicio(s)`);
      }
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
                    <button onClick={() => { if (window.confirm(`¿Eliminar categoría "${cat}"?`)) { setEquipCats((p) => { const next = p.filter((c) => c !== cat); scheduleCfgSave({ equip_cats: next }); return next; }); } }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 2 }}><Trash2 size={13} /></button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input placeholder="Nueva categoría" value={newEquipCat} onChange={(e) => setNewEquipCat(e.target.value)} style={{ flex: 1 }} maxLength={40} />
                  <button className="primary small" onClick={() => { if (!newEquipCat.trim()) { notify("Debe ingresar una categoría"); return; } if (equipCats.includes(newEquipCat.trim())) { notify("Ya existe"); return; } setEquipCats((p) => { const next = [...p, newEquipCat.trim()]; scheduleCfgSave({ equip_cats: next }); return next; }); setNewEquipCat(""); }}><Plus size={14} /></button>
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
                            onClick={() => { if (window.confirm(`¿Eliminar tipo de servicio "${st.id}"?`)) { setServiceTypes((p) => { const next = p.filter((s) => s.id !== st.id); scheduleCfgSave({ svc_types: next }); return next; }); } }}
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
                    const newTypes = [...serviceTypes, { id, label, defaultPrice: Number(newSvcPrice) || 0 }];
                    setServiceTypes(() => { scheduleCfgSave({ svc_types: newTypes }); return newTypes; });
                    // Auto-include new type in all categories that already have explicit mappings
                    setCatServiceMap((prev) => {
                      const updated = { ...prev };
                      let changed = false;
                      for (const cat of Object.keys(updated)) {
                        if (updated[cat] && updated[cat].length > 0 && !updated[cat].includes(id)) {
                          updated[cat] = [...updated[cat], id];
                          changed = true;
                        }
                      }
                      if (changed) scheduleCfgSave({ cat_svc_map: updated });
                      return changed ? updated : prev;
                    });
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
                                  const next = { ...prev, [cat]: updated.length === serviceTypes.length ? [] : updated };
                                  scheduleCfgSave({ cat_svc_map: next });
                                  return next;
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
                    servicios: serviceTypes.filter((st) => allowed.includes(st.id)).map((st) => {
                      const prev = f.servicios.find((sv) => sv.id === st.id);
                      if (prev) return prev;
                      return { id: st.id, precio: st.defaultPrice > 0 ? String(st.defaultPrice) : "", descripcion: "", enabled: false };
                    }),
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
                          <textarea rows={2} value={s.descripcion} placeholder={tplDesc || `Descripción de ${stLabel}...`} onChange={(e) => setProdForm((f) => ({ ...f, servicios: f.servicios.map((sv, i) => i === idx ? { ...sv, descripcion: e.target.value } : sv) }))} style={{ fontSize: 12, marginTop: 2 }} maxLength={3000} />
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

// ── CotizadorForm ─────────────────────────────────────────────────────────────

export function CotizadorForm({
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
        <select value={["50% inicio - 50% entrega", "Crédito a 30 días", "Contra entrega"].includes(formaPago) ? formaPago : "otro"} onChange={(e) => setFormaPago(e.target.value)}>
          {["50% inicio - 50% entrega", "Crédito a 30 días", "Contra entrega"].map((f) => <option key={f} value={f}>{f}</option>)}
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

// ── CotizadorPreview ──────────────────────────────────────────────────────────

export function CotizadorPreview({
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
