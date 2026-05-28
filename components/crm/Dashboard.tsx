"use client";

import { Activity, Bell, BriefcaseMedical, Check, ClipboardList, Clock3, Eye, FileText, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardStats, Cotizacion, Lead } from "@/lib/api";
import { money, fmtActivityDate } from "@/lib/utils";
import type { ModuleId } from "./types";
import { PeriodoPicker } from "./shared";

export function Dashboard({
  noCotizados,
  goTo,
  notify,
  stats,
  cotizaciones,
}: {
  noCotizados: Lead[];
  goTo: (id: ModuleId) => void;
  notify: (message: string) => void;
  stats: DashboardStats | null;
  cotizaciones: Cotizacion[];
}) {
  const [kpiAnio, setKpiAnio] = useState(0);
  const [kpiMes, setKpiMes] = useState(0);

  const cotizacionesFiltradas = useMemo(() => {
    if (!kpiAnio) return cotizaciones;
    return cotizaciones.filter((c) => {
      if (!c.fecha) return false;
      const d = new Date(c.fecha);
      if (d.getFullYear() !== kpiAnio) return false;
      if (kpiMes && d.getMonth() + 1 !== kpiMes) return false;
      return true;
    });
  }, [cotizaciones, kpiAnio, kpiMes]);

  const leadsValue = stats ? String(stats.leadsPendientes) : String(noCotizados.length);
  const clientesValue = stats ? String(stats.clientesActivos) : "—";
  const totalCotizaciones = cotizacionesFiltradas.length;
  const totalEmitido = cotizacionesFiltradas.reduce((s, c) => s + (c.monto || 0), 0);
  const totalAprobado = cotizacionesFiltradas.filter((c) => c.estado === "Aprobada").reduce((s, c) => s + (c.monto || 0), 0);
  const cotizacionesValue = totalCotizaciones > 0 ? String(totalCotizaciones) : (stats ? String(stats.cotizacionesAbiertas) : "—");
  const montoAprobadoStr = totalAprobado > 0
    ? `$${(totalAprobado / 1000000).toFixed(1).replace(".", ",")}M`
    : (stats ? `$${(stats.ventasAprobadas / 1000000).toFixed(1).replace(".", ",")}M` : "—");

  return (
    <section className="stack">
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Filtrar KPIs:</span>
        <PeriodoPicker anio={kpiAnio} mes={kpiMes} fechas={cotizaciones.map((c) => c.fecha)} onAnio={setKpiAnio} onMes={setKpiMes} />
      </div>
      <div className="kpi-row">
        <Kpi icon={Activity} label="Leads pendientes" value={leadsValue} delta="No cotizados" tone="amber" />
        <Kpi icon={BriefcaseMedical} label="Clientes activos" value={clientesValue} delta="En base de datos" tone="green" />
        <Kpi icon={ClipboardList} label="Total cotizaciones" value={cotizacionesValue} delta={totalEmitido > 0 ? `$${totalEmitido.toLocaleString("es-CL")} CLP emitidos` : "Emitidas / en revisión"} tone="amber" />
        <Kpi icon={FileText} label="Monto aprobado" value={montoAprobadoStr} delta="Solo cotizaciones aprobadas" tone="green" />
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
            {stats?.actividadReciente && stats.actividadReciente.length > 0 ? (
              stats.actividadReciente.slice(0, 5).map((item, i) => (
                <ActivityRow
                  key={i}
                  tone="green"
                  icon={Activity}
                  text={<><strong>{item.titulo}</strong>{item.descripcion ? ` — ${item.descripcion}` : ""}</>}
                  time={fmtActivityDate(item.creado_en)}
                />
              ))
            ) : (
              <>
                <ActivityRow tone="green" icon={Activity} text={<><strong>Nuevo lead vía WhatsApp</strong> - Clínica Las Condes solicitó reparación de monitor.</>} time="Hace 12 min" />
                <ActivityRow tone="navy" icon={ClipboardList} text={<><strong>Cotización COT-2026-012</strong> enviada a Universidad de Chile por $320.000 CLP.</>} time="Hace 1 hora" />
                <ActivityRow tone="green" icon={BriefcaseMedical} text={<><strong>Nuevo cliente registrado</strong> - Centro Médico Providencia.</>} time="Hace 3 horas" />
                <ActivityRow tone="amber" icon={Wrench} text={<><strong>Producto actualizado</strong> - Reparación Autoclave ajustada a $185.000.</>} time="Ayer 16:40" />
                <ActivityRow tone="navy" icon={Check} text={<><strong>Cotización COT-2026-011</strong> aprobada por Neovida.</>} time="Ayer 11:20" />
              </>
            )}
          </div>
        </div>
        <div className="panel pending-panel">
          <div className="panel-head">
            <div className="panel-title"><Bell size={18} />Leads sin gestionar</div>
            <span className="tag amber">{noCotizados.length} pendientes</span>
          </div>
          {noCotizados.slice(0, 4).map((lead) => (
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

export function Kpi({ icon: Icon, label, value, delta, tone }: { icon: React.ElementType; label: string; value: string; delta: string; tone: "green" | "amber" }) {
  return (
    <article className="kpi-card">
      <Icon size={23} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{delta}</small>
    </article>
  );
}

export function ActivityRow({ icon: Icon, text, time, tone }: { icon: React.ElementType; text: React.ReactNode; time: string; tone: string }) {
  return (
    <div className="activity-row">
      <div className={`activity-icon ${tone}`}><Icon size={16} /></div>
      <div><p>{text}</p><small>{time}</small></div>
    </div>
  );
}
