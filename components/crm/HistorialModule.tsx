"use client";

import { Download, FileText, History, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Cotizacion, Cliente } from "@/lib/api";
import { money } from "@/lib/utils";
import { COT_ESTADOS } from "./constants";
import { SortTh, PeriodoPicker } from "./shared";

export function HistorialModule({ cotizaciones, clientes, onVerCotizacion, onUpdateEstado, onDescargarCotizacion, onDeleteCotizacion }: {
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
