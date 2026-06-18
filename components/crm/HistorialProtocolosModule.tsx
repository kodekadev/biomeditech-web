"use client";

import { ClipboardList, Eye, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProtocoloInstancia } from "@/lib/api";
import { PeriodoPicker, SortTh } from "./shared";
import { buildProtocolHtml } from "./ProtocolosModule";
import type { ProtoTemplate, SubFill, CalibEquipo } from "./types";
import type { Cliente } from "@/lib/api";

export function HistorialProtocolosModule({
  registros,
  onDelete,
}: {
  registros: ProtocoloInstancia[];
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [anioFilter, setAnioFilter] = useState(0);
  const [mesFilter, setMesFilter] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "creado_en", dir: "desc" });

  function toggleSort(key: string) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    const list = registros.filter((r) => {
      if ((anioFilter || mesFilter) && r.fecha) {
        const parts = r.fecha.split("/");
        if (parts.length === 3) {
          const anio = parseInt(parts[2]);
          const mes = parseInt(parts[1]);
          if (anioFilter && anio !== anioFilter) return false;
          if (mesFilter && mes !== mesFilter) return false;
        }
      }
      if (!q) return true;
      return (
        r.correlativo.toLowerCase().includes(q) ||
        r.plantilla_label.toLowerCase().includes(q) ||
        r.cliente_nombre.toLowerCase().includes(q) ||
        r.tecnico.toLowerCase().includes(q) ||
        r.marca.toLowerCase().includes(q) ||
        r.modelo.toLowerCase().includes(q) ||
        r.serie.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[sort.key] ?? "").toLowerCase();
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [registros, search, anioFilter, mesFilter, sort]);

  const fechas = registros.map((r) => {
    const parts = r.fecha.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    return r.creado_en;
  });

  function handleVer(r: ProtocoloInstancia) {
    if (!r.datos_json) {
      alert("Este registro no tiene datos guardados para previsualizar.");
      return;
    }
    let parsed: {
      workingTpl: ProtoTemplate;
      subFill: Record<string, SubFill>;
      conclusionFill: Record<string, boolean>;
      calibEquipos: CalibEquipo[];
      condicionesIniciales: string;
      cliente: Cliente;
    };
    try {
      parsed = JSON.parse(r.datos_json);
    } catch {
      alert("Error al leer los datos del protocolo.");
      return;
    }
    const html = buildProtocolHtml({
      template: parsed.workingTpl,
      cliente: parsed.cliente,
      marca: r.marca,
      modelo: r.modelo,
      anio: r.anio,
      serie: r.serie,
      servicio: r.servicio,
      tecnico: r.tecnico,
      fecha: r.fecha,
      subFill: parsed.subFill,
      conclusionFill: parsed.conclusionFill,
      observaciones: r.observaciones,
      photos: [],
      signature: "",
      signatureCliente: "",
      calibEquipos: parsed.calibEquipos ?? [],
      condicionesIniciales: parsed.condicionesIniciales ?? "",
      correlativo: r.correlativo,
    });
    const win = window.open("", "_blank");
    if (!win) return;
    const withBar = html.replace("</body></html>",
      `<style>
        .action-bar{position:fixed;top:0;left:0;right:0;background:#0f2340;color:#fff;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px}
        .action-bar span{font-weight:600;font-size:14px}
        .action-bar .btn-print{background:#0e948b;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
        .action-bar .btn-close{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.3);padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px}
        body{padding-top:60px!important}
        @media print{.action-bar{display:none}body{padding-top:0!important}}
      </style>
      <div class="action-bar">
        <span>${r.correlativo} — ${r.plantilla_label}</span>
        <div style="display:flex;gap:8px">
          <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
          <button class="btn-close" onclick="window.close()">Cerrar</button>
        </div>
      </div>
      </body></html>`
    );
    win.document.write(withBar);
    win.document.close();
  }

  return (
    <div className="panel table-card">
      <div className="panel-head">
        <div className="panel-title"><ClipboardList size={18} />Historial de protocolos</div>
        <span className="tag navy">{visible.length} resultado{visible.length !== 1 ? "s" : ""}</span>
      </div>
      <div style={{ padding: "8px 16px 10px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px" }}>
          <Search size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <input
            placeholder="Buscar por N° protocolo, plantilla, cliente, técnico, equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minHeight: 28, fontSize: 13, border: "none", background: "transparent", outline: "none" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
        <PeriodoPicker anio={anioFilter} mes={mesFilter} fechas={fechas} onAnio={setAnioFilter} onMes={setMesFilter} />
      </div>
      <table>
        <thead>
          <tr>
            <SortTh label="N° Protocolo" sortKey="correlativo" current={sort} onSort={toggleSort} />
            <SortTh label="Plantilla" sortKey="plantilla_label" current={sort} onSort={toggleSort} />
            <SortTh label="Cliente" sortKey="cliente_nombre" current={sort} onSort={toggleSort} />
            <SortTh label="Técnico" sortKey="tecnico" current={sort} onSort={toggleSort} />
            <SortTh label="Equipo" sortKey="marca" current={sort} onSort={toggleSort} />
            <SortTh label="Fecha" sortKey="fecha" current={sort} onSort={toggleSort} />
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>Sin resultados</td></tr>
          )}
          {visible.map((r) => (
            <tr key={r.id}>
              <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.correlativo}</td>
              <td style={{ fontWeight: 500 }}>{r.plantilla_label}</td>
              <td>{r.cliente_nombre || <span style={{ color: "#94a3b8" }}>—</span>}</td>
              <td>{r.tecnico || <span style={{ color: "#94a3b8" }}>—</span>}</td>
              <td style={{ fontSize: 12 }}>
                {[r.marca, r.modelo, r.serie ? `SN: ${r.serie}` : ""].filter(Boolean).join(" · ") || <span style={{ color: "#94a3b8" }}>—</span>}
              </td>
              <td style={{ color: "#64748b", fontSize: 12 }}>{r.fecha}</td>
              <td>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => handleVer(r)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0e948b", fontWeight: 600, background: "none", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", padding: "4px 9px" }}
                  >
                    <Eye size={13} />Ver
                  </button>
                  <button
                    onClick={() => { if (!confirm(`¿Eliminar registro ${r.correlativo}? Esta acción no se puede deshacer.`)) return; onDelete(r.id); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#dc2626", fontWeight: 600, background: "none", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", padding: "4px 9px" }}
                  >
                    <Trash2 size={13} />Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
