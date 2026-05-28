"use client";

import { ChevronDown, ChevronUp, ClipboardList, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MESES } from "./constants";

// ── Debounce hook ─────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── DataModule ────────────────────────────────────────────────────────────────

export function DataModule({ children, search, setSearch, searchPlaceholder, onAdd, hideHeader, filterEl }: {
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

// ── SortTh ────────────────────────────────────────────────────────────────────

export function SortTh({ label, sortKey, current, onSort }: {
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

// ── RowActions ────────────────────────────────────────────────────────────────

export function RowActions({ notify, quote, onDelete, onEdit }: {
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

// ── PeriodoPicker ─────────────────────────────────────────────────────────────

export function PeriodoPicker({ anio, mes, fechas, onAnio, onMes }: {
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

// ── Inline utility functions used across modules ───────────────────────────────

export function serviceLabel(value: string): string {
  const CAT_LABELS: Record<string, string> = {
    VS: "Visita técnica",
    MP: "Mantención preventiva",
    MC: "Mantención correctiva",
    BS: "Bloque servicio",
    EV: "Evaluación diagnóstica",
    RS: "Repuesto / Insumo",
  };
  return CAT_LABELS[value] ? `${value} - ${CAT_LABELS[value]}` : value;
}

export function leadEstadoMeta(estado: string) {
  const LEAD_ESTADO_META: Record<string, { label: string; tagClass: string }> = {
    "no-cotizado": { label: "No cotizado", tagClass: "amber" },
    cotizado:      { label: "Cotizado",    tagClass: "navy"  },
    aprobado:      { label: "Aprobado",    tagClass: "green" },
    rechazado:     { label: "Rechazado",   tagClass: "red"   },
  };
  return LEAD_ESTADO_META[estado] ?? { label: estado, tagClass: "amber" };
}
