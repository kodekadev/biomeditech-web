"use client";

import React from "react";
import { Activity, ClipboardList } from "lucide-react";
import type { Lead, Cliente, CatalogoItem, Plantilla, CotizacionItemForm } from "@/lib/api";
import { CotizadorForm, CotizadorPreview } from "./ProductsModule";
import { serviceLabel } from "./shared";

interface Props {
  clientes: Cliente[];
  noCotizados: Lead[];
  catalogo: CatalogoItem[];
  plantillas: Plantilla[];
  cotizClienteId: string;
  setCotizClienteId: (v: string) => void;
  cotizNotas: string;
  setCotizNotas: (v: string) => void;
  cotizFormaPago: string;
  setCotizFormaPago: (v: string) => void;
  cotizCondiciones: string;
  setCotizCondiciones: (v: string) => void;
  cotizGarantia: string;
  setCotizGarantia: (v: string) => void;
  cotizValidez: number;
  setCotizValidez: (v: number) => void;
  cotizItems: CotizacionItemForm[];
  setCotizItems: React.Dispatch<React.SetStateAction<CotizacionItemForm[]>>;
  emitiendo: boolean;
  fecha: string;
  onEmitirCotizacion: () => void;
  onPrintQuote: () => void;
  onCotizarLead: (lead: Lead) => void;
}

export function CotizacionesModule({
  clientes,
  noCotizados,
  catalogo,
  plantillas,
  cotizClienteId,
  setCotizClienteId,
  cotizNotas,
  setCotizNotas,
  cotizFormaPago,
  setCotizFormaPago,
  cotizCondiciones,
  setCotizCondiciones,
  cotizGarantia,
  setCotizGarantia,
  cotizValidez,
  setCotizValidez,
  cotizItems,
  setCotizItems,
  emitiendo,
  fecha,
  onEmitirCotizacion,
  onPrintQuote,
  onCotizarLead,
}: Props) {
  return (
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
            condiciones={cotizCondiciones}
            setCondiciones={setCotizCondiciones}
            garantia={cotizGarantia}
            setGarantia={setCotizGarantia}
            validez={cotizValidez}
            setValidez={setCotizValidez}
            items={cotizItems}
            setItems={setCotizItems}
            onEmitir={onEmitirCotizacion}
            onDescargarPDF={onPrintQuote}
            emitiendo={emitiendo}
          />
        </div>
        {noCotizados.length > 0 && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><Activity size={18} />Leads por cotizar</div>
              <span className="tag amber">{noCotizados.length} pendiente{noCotizados.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
              {noCotizados.slice(0, 6).map((lead) => (
                <div key={lead.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 6, gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#0f2340", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.empresa || lead.nombre}</div>
                    <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {serviceLabel(lead.servicio)}{lead.equipo ? ` · ${lead.equipo}` : ""}
                    </div>
                  </div>
                  <button className="primary small" style={{ flexShrink: 0 }} onClick={() => onCotizarLead(lead)}>
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
          validez={cotizValidez}
          garantia={cotizGarantia}
          condiciones={cotizCondiciones}
        />
      </div>
    </section>
  );
}
