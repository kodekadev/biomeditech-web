"use client";

import {
  ClipboardList,
  Clock3,
  Edit3,
  Mail,
  MessageCircle,
  Search,
  Trash2,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import type { Lead } from "@/lib/api";
import type { LeadStatus } from "./types";
import { SortTh, PeriodoPicker, serviceLabel, leadEstadoMeta } from "./shared";

type SortState = { key: string; dir: "asc" | "desc" };

interface Props {
  leads: Lead[];
  visibleLeads: Lead[];
  noCotizados: Lead[];
  leadFilter: "todos" | LeadStatus;
  setLeadFilter: (f: "todos" | LeadStatus) => void;
  leadAnio: number;
  setLeadAnio: (v: number) => void;
  leadMes: number;
  setLeadMes: (v: number) => void;
  leadQuery: string;
  setLeadQuery: (v: string) => void;
  leadSort: SortState;
  setLeadSort: (fn: (s: SortState) => SortState) => void;
  leadView: "iconos" | "lista" | "detalle";
  setLeadView: (v: "iconos" | "lista" | "detalle") => void;
  onCotizarLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onSetLeadEstado: (id: string, estado: LeadStatus) => void;
  onAddLead: () => void;
}

export function LeadsModule({
  leads,
  visibleLeads,
  noCotizados,
  leadFilter,
  setLeadFilter,
  leadAnio,
  setLeadAnio,
  leadMes,
  setLeadMes,
  leadQuery,
  setLeadQuery,
  leadSort,
  setLeadSort,
  leadView,
  setLeadView,
  onCotizarLead,
  onEditLead,
  onDeleteLead,
  onSetLeadEstado,
  onAddLead,
}: Props) {
  return (
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
            {leadQuery && (
              <button onClick={() => setLeadQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                <X size={13} />
              </button>
            )}
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
          <button className="primary" onClick={onAddLead}>
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
                <button className="primary small" title="Crear cotización para este lead" onClick={() => onCotizarLead(lead)}>
                  <ClipboardList size={15} />Cotizar
                </button>
                <select
                  value={lead.estado}
                  onChange={(e) => onSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                  style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", minHeight: 28 }}
                  title="Cambiar estado"
                >
                  <option value="no-cotizado">No cotizado</option>
                  <option value="cotizado">Cotizado</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
                <button className="ghost small card-icon-btn" aria-label="Editar" title="Editar lead" onClick={() => onEditLead(lead)}><Edit3 size={14} /></button>
                <button className="ghost small card-icon-btn danger" aria-label="Eliminar" title="Eliminar lead" onClick={() => onDeleteLead(lead.id)}><Trash2 size={14} /></button>
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
                      <button aria-label="Cotizar" title="Crear cotización" onClick={() => onCotizarLead(lead)}><ClipboardList size={15} /></button>
                      <select
                        value={lead.estado}
                        onChange={(e) => onSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                        style={{ fontSize: 11, padding: "2px 4px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}
                        title="Estado"
                      >
                        <option value="no-cotizado">No cotizado</option>
                        <option value="cotizado">Cotizado</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="rechazado">Rechazado</option>
                      </select>
                      <button aria-label="Editar" title="Editar lead" onClick={() => onEditLead(lead)}><Edit3 size={15} /></button>
                      <button aria-label="Eliminar" title="Eliminar lead" className="danger" onClick={() => onDeleteLead(lead.id)}><Trash2 size={15} /></button>
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
                  <button className="primary small" onClick={() => onCotizarLead(lead)}><ClipboardList size={15} />Cotizar</button>
                  <select
                    value={lead.estado}
                    onChange={(e) => onSetLeadEstado(lead.id, e.target.value as LeadStatus)}
                    style={{ fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", minHeight: 28 }}
                    title="Estado"
                  >
                    <option value="no-cotizado">No cotizado</option>
                    <option value="cotizado">Cotizado</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                  <button className="ghost small card-icon-btn" aria-label="Editar" onClick={() => onEditLead(lead)}><Edit3 size={14} /></button>
                  <button className="ghost small card-icon-btn danger" aria-label="Eliminar" onClick={() => onDeleteLead(lead.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
