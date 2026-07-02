"use client";

import { Check, ClipboardList, Download, Edit3, FileArchive, FileText, Plus, Search, Settings, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { Cliente, ProtocolRaw } from "@/lib/api";
import { LOGO_B64 } from "@/lib/logo-b64";
import type { ProtoTemplate, ProtoItem, ProtoSubItem, SubFill, CalibEquipo } from "./types";
import { PROTO_KEY, DEFAULT_PROTO_DATA } from "./constants";

// ── Proto helper functions ────────────────────────────────────────────────────

export function pId() { return Math.random().toString(36).slice(2, 9); }

export function defaultProtoTemplates(): ProtoTemplate[] {
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

export function loadTemplates(): ProtoTemplate[] {
  try {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem(PROTO_KEY);
      if (s) return JSON.parse(s);
    }
  } catch {}
  return defaultProtoTemplates();
}

export function persistTemplates(t: ProtoTemplate[]) {
  try { localStorage.setItem(PROTO_KEY, JSON.stringify(t)); } catch {}
}

export function initSubFill(tpl: ProtoTemplate): Record<string, SubFill> {
  const f: Record<string, SubFill> = {};
  tpl.items.forEach((item) => {
    item.subItems.forEach((s) => { f[s.id] = { pasa: "", obs: "" }; });
  });
  return f;
}

export function initCFill(tpl: ProtoTemplate): Record<string, boolean> {
  const f: Record<string, boolean> = {};
  tpl.conclusions.forEach((c) => { f[c] = false; });
  return f;
}

export function applyPageBreakFix(iDoc: Document) {
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

export function buildProtocolHtml(params: {
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
  condicionesIniciales?: string;
  correlativo?: string;
}): string {
  const { template, cliente, marca, modelo, anio, serie, servicio, tecnico, fecha, subFill, conclusionFill, observaciones, photos, signature, signatureCliente, calibEquipos, condicionesIniciales, correlativo } = params;

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
          ${photos.map((p) => `<img src="${p}" style="width:100%;height:220px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>`).join("")}
        </div></div>`
    : "";

  const sigBlock = (label: string, src?: string, name?: string) =>
    `<div><div style="min-height:60px;border-bottom:1px solid #1e293b;display:flex;align-items:flex-end;margin-bottom:4px">${src ? `<img src="${src}" style="max-height:56px;max-width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact"/>` : ""}</div><p style="font-size:11px;color:#64748b">${label}${name ? `: <strong>${name}</strong>` : ""}</p><p style="font-size:11px;color:#64748b">Fecha: ${fecha}</p></div>`;
  const sigHtml = `<div class="avoid-break" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px">${sigBlock("Firma del técnico", signature, tecnico)}${sigBlock("Firma del cliente / responsable", signatureCliente || undefined)}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.label}</title><style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    @page{margin:0;size:A4}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:28px 32px}
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
    <div style="text-align:right">${correlativo ? `<span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:2px">N° ${correlativo}</span>` : ""}<strong style="display:block;font-size:16px;color:#0f2340">${template.label}</strong><span style="font-size:11px;color:#64748b">Protocolo de Mantención · BIOMEDITECH</span></div>
  </header>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;align-items:start">
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
  ${condicionesIniciales ? `<div class="avoid-break" style="margin-bottom:16px"><div style="background:#f0faf5;border:1px solid #0e948b;border-left:4px solid #0e948b;border-radius:6px;padding:12px 14px;font-size:12px;color:#1e293b;white-space:pre-wrap;line-height:1.5"><strong style="display:block;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#0e948b">Condiciones iniciales</strong>${condicionesIniciales}</div></div>` : ""}
  ${tableHtml}
  ${calibHtml}
  ${obsHtml}
  ${conclusionsHtml}
  ${photosHtml}
  ${sigHtml}
  <footer>contacto@Biomeditech.cl · Biomeditech.cl · WhatsApp: +56 9 5989 0781</footer>
  </body></html>`;
}

// ── ProtocolosModule ──────────────────────────────────────────────────────────

export function ProtocolosModule({ clientes, notify, onSaveHistorial }: {
  clientes: Cliente[];
  notify: (msg: string) => void;
  onSaveHistorial?: (data: { correlativo: string; plantilla_id: string; plantilla_label: string; cliente_id: string; cliente_nombre: string; tecnico: string; marca: string; modelo: string; serie: string; anio: string; servicio: string; observaciones: string; fecha: string; datos_json: string }) => void;
}) {
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
  const [sinCliente, setSinCliente] = useState(false);
  const [condIniciales, setCondIniciales] = useState("");
  const [condInicialesOn, setCondInicialesOn] = useState(false);
  const [calibEquipos, setCalibEquipos] = useState<CalibEquipo[]>([
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
    { id: pId(), equipo: "", marca: "", modelo: "", sn: "" },
  ]);
  const [simuladores, setSimuladores] = useState<api.Simulador[]>([]);
  const [simSearch, setSimSearch] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [showSimMgr, setShowSimMgr] = useState(false);
  const [simForm, setSimForm] = useState({ nombre: "", marca: "", modelo: "", serie: "" });
  const [simEditId, setSimEditId] = useState<string | null>(null);
  const [simSaving, setSimSaving] = useState(false);
  const simSearchRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const sigClienteRef = useRef<HTMLCanvasElement>(null);
  const isDrawingClienteRef = useRef(false);
  const lastPosClienteRef = useRef<{ x: number; y: number } | null>(null);
  const openInDesignRef = useRef(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const apiProtocolIdsRef = useRef<Set<string>>(new Set());
  const apiLoadedRef = useRef(false);
  const skipSyncRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load templates from API on mount; merge with localStorage (API is source of truth)
  useEffect(() => {
    api.fetchProtocols().then((rows: ProtocolRaw[]) => {
      apiLoadedRef.current = true;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current); // cancel any pending sync from mount
      apiProtocolIdsRef.current = new Set(rows.map((r) => r.id));
      skipSyncRef.current = true;
      setTemplates((local) => {
        const apiIds = new Set(rows.map((r) => r.id));
        const apiTpls: ProtoTemplate[] = rows.map((r) => ({
          id: r.id,
          label: r.label,
          items: (() => { try { return JSON.parse(r.items_json || "[]"); } catch { return []; } })(),
          conclusions: (() => { try { return JSON.parse(r.conclusiones_json || "[]"); } catch { return []; } })(),
        }));
        // Only keep local templates that don't exist in the API
        const localOnly = local.filter((t) => !apiIds.has(t.id));
        const merged = [...apiTpls, ...localOnly];
        persistTemplates(merged);
        return merged;
      });
    }).catch(() => { apiLoadedRef.current = true; });
  }, []);

  // Debounced sync to API whenever templates change — only after API has loaded
  useEffect(() => {
    if (skipSyncRef.current) { skipSyncRef.current = false; return; }
    if (!apiLoadedRef.current) return; // don't sync until API has responded
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const apiIds = apiProtocolIdsRef.current;
      const updatedIds = new Set(templates.map((t) => t.id));
      // Delete removed templates
      Array.from(apiIds).forEach((id) => {
        if (!updatedIds.has(id)) { api.deleteProtocol(id); apiIds.delete(id); }
      });
      // Create or update — add to apiIds immediately to prevent duplicate creates on rapid re-renders
      for (const tpl of templates) {
        if (apiIds.has(tpl.id)) {
          api.updateProtocol(tpl.id, tpl.label, tpl.items, tpl.conclusions);
        } else {
          apiIds.add(tpl.id);
          api.createProtocol(tpl.id, tpl.label, tpl.items, tpl.conclusions)
            .catch(() => apiIds.delete(tpl.id));
        }
      }
    }, 1200);
  }, [templates]);

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
    setCollapsedSections(new Set());
    if (openInDesignRef.current) {
      setDesignMode(true);
      openInDesignRef.current = false;
    } else {
      setDesignMode(false);
    }
  }, [activeTplId]);

  useEffect(() => {
    api.fetchSimuladores().then(setSimuladores).catch(() => {});
  }, []);

  // Close combobox on outside click
  useEffect(() => {
    if (!simOpen) return;
    const handler = (e: MouseEvent) => {
      if (simSearchRef.current && !simSearchRef.current.closest("[data-sim-combo]")?.contains(e.target as Node)) {
        setSimOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [simOpen]);

  useEffect(() => {
    setCalibEquipos((prev) => prev.map((row, i) =>
      i === 0 ? { ...row, marca, modelo, sn: serie } : row
    ));
  }, [marca, modelo, serie]);

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
      const raw = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = (ev) => r(ev.target?.result as string); fr.readAsDataURL(f); });
      const url = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1600;
          const scale = img.width > MAX ? MAX / img.width : 1;
          const cvs = document.createElement("canvas");
          cvs.width = Math.round(img.width * scale);
          cvs.height = Math.round(img.height * scale);
          cvs.getContext("2d")!.drawImage(img, 0, 0, cvs.width, cvs.height);
          resolve(cvs.toDataURL("image/jpeg", 0.9));
        };
        img.src = raw;
      });
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
    if (!sinCliente && !selectedCliente) { notify("Selecciona un cliente"); return; }
    setGenerating(true);
    notify("Generando PDF…");
    const fecha = new Date().toLocaleDateString("es-CL");
    const correlativo = (() => {
      const n = parseInt(localStorage.getItem("proto_correlativo") || "0") + 1;
      localStorage.setItem("proto_correlativo", String(n));
      return `PT-${String(n).padStart(3, "0")}`;
    })();
    const clienteParaPDF: Cliente = selectedCliente ?? { id: "", rut: "", nombre: "— Sin datos de cliente —", contacto: "", telefono: "", correo: "", estado: "Activo", ciudad: "", comuna: "", direccion: "" };
    try {
      const html = buildProtocolHtml({ template: workingTpl, cliente: clienteParaPDF, marca, modelo, anio, serie, servicio, tecnico, fecha, subFill, conclusionFill, observaciones, photos, signature: getSignatureUrl(), signatureCliente: getSignatureClienteUrl(), calibEquipos, condicionesIniciales: condInicialesOn ? condIniciales : "", correlativo });
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1122px;border:none;visibility:hidden;";
      document.body.appendChild(iframe);
      await new Promise<void>((r) => { iframe.onload = () => r(); iframe.srcdoc = html; });
      await new Promise((r) => setTimeout(r, 600));
      const iDoc = iframe.contentDocument;
      if (!iDoc) { document.body.removeChild(iframe); return; }
      // First expand so applyPageBreakFix can measure offsetTop values correctly
      iframe.style.height = `${iDoc.body.scrollHeight + 200}px`;
      await new Promise((r) => setTimeout(r, 150));
      applyPageBreakFix(iDoc);
      await new Promise((r) => setTimeout(r, 150));
      // Re-expand: applyPageBreakFix adds margins that increase total height
      iframe.style.height = `${iDoc.body.scrollHeight + 200}px`;
      await new Promise((r) => setTimeout(r, 150));
      const canvas = await html2canvas(iDoc.body, { useCORS: true, scale: 2, backgroundColor: "#ffffff", windowWidth: 794 });
      document.body.removeChild(iframe);
      const imgData = canvas.toDataURL("image/jpeg", 0.82);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const totalH = canvas.height * (pdfW / canvas.width);
      const pageTopMargin = 14;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, totalH);
      let consumed = pdfH;
      while (consumed < totalH) {
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, pageTopMargin - consumed, pdfW, totalH);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfW, pageTopMargin, "F");
        consumed += pdfH - pageTopMargin;
      }
      pdf.save(`protocolo-${correlativo}-${workingTpl.label.replace(/\s+/g, "-").slice(0, 20)}-${new Date().toISOString().slice(0, 10)}.pdf`);
      onSaveHistorial?.({
        correlativo,
        plantilla_id: workingTpl.id,
        plantilla_label: workingTpl.label,
        cliente_id: selectedCliente?.id ?? "",
        cliente_nombre: selectedCliente?.nombre ?? "Sin cliente",
        tecnico,
        marca,
        modelo,
        serie,
        anio,
        servicio,
        observaciones,
        fecha,
        datos_json: JSON.stringify({
          workingTpl,
          subFill,
          conclusionFill,
          calibEquipos,
          condicionesIniciales: condInicialesOn ? condIniciales : "",
          cliente: selectedCliente ?? { id: "", rut: "", nombre: "— Sin datos de cliente —", contacto: "", telefono: "", correo: "", estado: "Activo", ciudad: "", comuna: "", direccion: "" },
        }),
      });
    } finally { setGenerating(false); }
  }

  const filteredClientes = clienteQuery
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(clienteQuery.toLowerCase()) || (c.rut || "").toLowerCase().includes(clienteQuery.toLowerCase()) || (c.contacto ?? "").toLowerCase().includes(clienteQuery.toLowerCase())).slice(0, 8)
    : clientes.slice(0, 8);

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
                  {templates.map((tpl) => {
                    const isDup = templates.filter((t) => t.label === tpl.label).length > 1;
                    return (
                    <tr key={tpl.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 4px" }}>
                        <strong>{tpl.label}</strong>
                        {isDup && <span style={{ fontSize: 10, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 4, padding: "1px 5px", marginLeft: 6 }}>Duplicado</span>}
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
                    );
                  })}
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 360, minWidth: 260 }}>
          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 12 }}><FileArchive size={16} />Tipo de protocolo</div>
            <select value={activeTplId} onChange={(e) => {
              if (e.target.value === "__new__") {
                const label = window.prompt("Nombre del nuevo protocolo:");
                if (!label?.trim()) return;
                const newTpl: ProtoTemplate = { id: pId(), label: label.trim(), items: [], conclusions: [] };
                const updated = [...templates, newTpl];
                setTemplates(updated); persistTemplates(updated);
                openInDesignRef.current = true;
                setActiveTplId(newTpl.id);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="panel-title" style={{ marginBottom: 0 }}><Search size={16} />Cliente</div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={sinCliente} onChange={(e) => { setSinCliente(e.target.checked); if (e.target.checked) setSelectedCliente(null); }} style={{ accentColor: "#0e948b" }} />
                Reporte en blanco
              </label>
            </div>
            <div style={{ position: "relative" }}>
              {selectedCliente && !clienteOpen ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", background: "#f8fafc" }}
                  onClick={() => { setClienteOpen(true); setClienteQuery(""); }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#0f2340" }}>{selectedCliente.nombre}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{selectedCliente.rut}</span>
                  <X size={13} style={{ color: "#94a3b8", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setSelectedCliente(null); setClienteQuery(""); }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #0e948b", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
                  <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <input
                    placeholder="Buscar cliente por nombre o RUT..."
                    value={clienteQuery}
                    onChange={(e) => { setClienteQuery(e.target.value); setSelectedCliente(null); setClienteOpen(true); }}
                    onFocus={() => setClienteOpen(true)}
                    onBlur={() => setTimeout(() => setClienteOpen(false), 150)}
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent" }}
                  />
                </div>
              )}
              {clienteOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 100, maxHeight: 240, overflowY: "auto", marginTop: 2 }}>
                  {filteredClientes.length === 0 && <div style={{ padding: "10px 14px", color: "#94a3b8", fontSize: 13 }}>Sin resultados</div>}
                  {filteredClientes.map((c) => (
                    <div
                      key={c.id}
                      onMouseDown={() => { setSelectedCliente(c); setClienteQuery(""); setClienteOpen(false); }}
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
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: condInicialesOn ? 10 : 0 }}>
              <div className="panel-title" style={{ marginBottom: 0 }}><FileText size={16} />Condiciones iniciales</div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" checked={condInicialesOn} onChange={(e) => setCondInicialesOn(e.target.checked)} style={{ accentColor: "#0e948b" }} />
                Activar
              </label>
            </div>
            {condInicialesOn && (
              <textarea value={condIniciales} onChange={(e) => setCondIniciales(e.target.value)} placeholder="Estado inicial del equipo, condiciones previas al servicio..." rows={3} style={{ width: "100%", resize: "vertical", marginTop: 4 }} />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 280 }}>
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
                            const isCollapsed = collapsedSections.has(item.id);
                            const toggleSection = () => setCollapsedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                              return next;
                            });
                            const sectionRow = (
                              <tr key={`sec-${item.id}`} onClick={toggleSection} style={{ cursor: "pointer" }}>
                                <td colSpan={5} style={{ ...sectionCellStyle, userSelect: "none" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ display: "inline-block", transition: "transform 0.15s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", fontSize: 10 }}>▼</span>
                                    {item.label}
                                  </span>
                                </td>
                              </tr>
                            );
                            if (isCollapsed) return [sectionRow];
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
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setShowSimMgr(true); setSimEditId(null); setSimForm({ nombre: "", marca: "", modelo: "", serie: "" }); }}
                  style={{ fontSize: 12, border: "1px solid var(--border)", background: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Settings size={12} />Catálogo
                </button>
                <button onClick={() => setCalibEquipos((prev) => [...prev, { id: pId(), equipo: "", marca: "", modelo: "", sn: "" }])} style={{ fontSize: 12 }}>
                  <Plus size={12} style={{ marginRight: 4 }} />Agregar fila
                </button>
              </div>
            </div>

            {/* Combobox para insertar desde catálogo */}
            <div style={{ position: "relative", marginBottom: 10 }} data-sim-combo="">
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
                <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <input
                  ref={simSearchRef}
                  value={simSearch}
                  onFocus={() => setSimOpen(true)}
                  onChange={(e) => { setSimSearch(e.target.value); setSimOpen(true); }}
                  placeholder={simuladores.length ? "Buscar simulador del catálogo para agregar..." : "Catálogo vacío — usa el botón «Catálogo» para agregar equipos"}
                  style={{ border: "none", outline: "none", flex: 1, fontSize: 12, background: "transparent" }}
                />
                {simSearch && (
                  <button onClick={() => { setSimSearch(""); setSimOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0, display: "flex" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              {simOpen && simuladores.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 100, maxHeight: 220, overflowY: "auto", marginTop: 2 }}>
                  {(() => {
                    const q = simSearch.toLowerCase();
                    const filtered = simuladores.filter((s) =>
                      !q || s.nombre.toLowerCase().includes(q) || s.marca.toLowerCase().includes(q) || s.modelo.toLowerCase().includes(q)
                    );
                    if (!filtered.length) return <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>Sin resultados</div>;
                    return filtered.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCalibEquipos((prev) => [...prev, { id: pId(), equipo: s.nombre, marca: s.marca, modelo: s.modelo, sn: s.serie }]);
                          setSimSearch("");
                          setSimOpen(false);
                        }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", borderBottom: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: 12 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <span style={{ fontWeight: 600 }}>{s.nombre}</span>
                        {s.marca && <span style={{ color: "var(--muted)", marginLeft: 8 }}>{s.marca}{s.modelo ? ` · ${s.modelo}` : ""}</span>}
                        {s.serie && <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>SN: {s.serie}</span>}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
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

          {/* ── Modal: gestión del catálogo de simuladores ── */}
          {showSimMgr && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={(e) => { if (e.target === e.currentTarget) { setShowSimMgr(false); setSimEditId(null); setSimForm({ nombre: "", marca: "", modelo: "", serie: "" }); } }}>
              <div style={{ background: "#fff", borderRadius: 12, width: "min(700px, 95vw)", maxHeight: "90vh", overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}><Wrench size={16} />Catálogo de Equipos de Calibración</div>
                  <button onClick={() => { setShowSimMgr(false); setSimEditId(null); setSimForm({ nombre: "", marca: "", modelo: "", serie: "" }); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={20} /></button>
                </div>

                {/* Formulario agregar / editar */}
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "var(--bg)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#475569" }}>{simEditId ? "Editar simulador" : "Agregar nuevo"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Nombre / Tipo *</label>
                      <input value={simForm.nombre} onChange={(e) => setSimForm((f) => ({ ...f, nombre: e.target.value }))}
                        placeholder="ej: Simulador de ECG" style={{ width: "100%", fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Marca</label>
                      <input value={simForm.marca} onChange={(e) => setSimForm((f) => ({ ...f, marca: e.target.value }))}
                        placeholder="ej: Fluke" style={{ width: "100%", fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Modelo</label>
                      <input value={simForm.modelo} onChange={(e) => setSimForm((f) => ({ ...f, modelo: e.target.value }))}
                        placeholder="ej: 87V" style={{ width: "100%", fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>N° Serie</label>
                      <input value={simForm.serie} onChange={(e) => setSimForm((f) => ({ ...f, serie: e.target.value }))}
                        placeholder="ej: 38850529" style={{ width: "100%", fontSize: 12 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                    {simEditId && (
                      <button onClick={() => { setSimEditId(null); setSimForm({ nombre: "", marca: "", modelo: "", serie: "" }); }}
                        style={{ border: "1px solid var(--border)", background: "none", padding: "7px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                    )}
                    <button
                      disabled={simSaving || !simForm.nombre.trim()}
                      onClick={async () => {
                        if (!simForm.nombre.trim()) return;
                        setSimSaving(true);
                        try {
                          if (simEditId) {
                            await api.updateSimulador(simEditId, { ...simForm, activo: true });
                            setSimuladores((prev) => prev.map((s) => s.id === simEditId ? { ...s, ...simForm } : s));
                            setSimEditId(null);
                          } else {
                            const created = await api.createSimulador({ ...simForm, activo: true });
                            if (created) setSimuladores((prev) => [...prev, created]);
                          }
                          setSimForm({ nombre: "", marca: "", modelo: "", serie: "" });
                        } finally {
                          setSimSaving(false);
                        }
                      }}
                      style={{ background: "#0e948b", color: "#fff", border: "none", padding: "7px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: simSaving || !simForm.nombre.trim() ? "not-allowed" : "pointer", opacity: simSaving || !simForm.nombre.trim() ? 0.6 : 1 }}>
                      {simSaving ? "Guardando..." : simEditId ? "Guardar cambios" : "Agregar"}
                    </button>
                  </div>
                </div>

                {/* Lista de simuladores */}
                {simuladores.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <span>No hay equipos en el catálogo aún.</span>
                    <button
                      onClick={async () => {
                        setSimSaving(true);
                        try {
                          await api.setupSimuladores();
                          const refreshed = await api.fetchSimuladores();
                          setSimuladores(refreshed);
                        } finally {
                          setSimSaving(false);
                        }
                      }}
                      disabled={simSaving}
                      style={{ background: "#0e948b", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: simSaving ? "not-allowed" : "pointer", opacity: simSaving ? 0.7 : 1 }}>
                      {simSaving ? "Cargando..." : "Cargar equipos por defecto"}
                    </button>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--bg)" }}>
                        <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)", fontWeight: 600 }}>Equipo</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)", fontWeight: 600 }}>Marca</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)", fontWeight: 600 }}>Modelo</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid var(--border)", fontWeight: 600 }}>N° Serie</th>
                        <th style={{ width: 72, borderBottom: "2px solid var(--border)" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {simuladores.map((s, i) => (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "var(--bg)" }}>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{s.nombre}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{s.marca}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>{s.modelo}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 11 }}>{s.serie}</td>
                          <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border)", textAlign: "center", whiteSpace: "nowrap" }}>
                            <button onClick={() => { setSimEditId(s.id); setSimForm({ nombre: s.nombre, marca: s.marca, modelo: s.modelo, serie: s.serie }); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#0e948b", padding: "3px 5px" }}><Edit3 size={13} /></button>
                            <button onClick={async () => {
                              if (!confirm(`¿Eliminar "${s.nombre}" del catálogo?`)) return;
                              await api.deleteSimulador(s.id);
                              setSimuladores((prev) => prev.filter((x) => x.id !== s.id));
                              if (simEditId === s.id) { setSimEditId(null); setSimForm({ nombre: "", marca: "", modelo: "", serie: "" }); }
                            }} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "3px 5px" }}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

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
