import type { Lead, Cliente, Producto, Cotizacion, CatalogoItem, LeadForm, ClienteForm, ProductoForm, CatalogoItemForm } from "@/lib/api";
import type { ModuleId, QuoteService, ServiceTypeEntry } from "./types";
import {
  Activity,
  BriefcaseMedical,
  ClipboardList,
  FileArchive,
  History,
  LayoutDashboard,
  Wrench,
} from "lucide-react";

export const NAV_ITEMS: Array<{ id: ModuleId; label: string; icon: React.ElementType; group: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Principal" },
  { id: "leads", label: "Leads", icon: Activity, group: "Gestión" },
  { id: "clientes", label: "Clientes", icon: BriefcaseMedical, group: "Gestión" },
  { id: "productos", label: "Productos / Servicios", icon: Wrench, group: "Gestión" },
  { id: "cotizaciones", label: "Cotizaciones", icon: ClipboardList, group: "Operaciones" },
  { id: "historial", label: "Historial de cotizaciones", icon: History, group: "Operaciones" },
  { id: "protocolos", label: "Protocolos Mantención", icon: FileArchive, group: "Operaciones" },
  { id: "historial-protocolos", label: "Historial de protocolos", icon: History, group: "Operaciones" },
];

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_CLIENTES: Cliente[] = [];

export const INITIAL_PRODUCTOS: Producto[] = [
  { id: "P-001", nombre: "Monitor de Signos Vitales", cat: "Equipos médicos", diag: 45000, rep: 120000, mant: 85000, inst: 95000 },
  { id: "P-002", nombre: "Autoclave", cat: "Equipos médicos", diag: 35000, rep: 185000, mant: 90000, inst: 110000 },
  { id: "P-003", nombre: "Ecógrafo", cat: "Equipos médicos", diag: 55000, rep: 250000, mant: 0, inst: 130000 },
  { id: "P-004", nombre: "Centrífuga", cat: "Laboratorio", diag: 30000, rep: 75000, mant: 50000, inst: 60000 },
  { id: "P-005", nombre: "Unidad Dental", cat: "Equipos dentales", diag: 40000, rep: 95000, mant: 70000, inst: 120000 },
  { id: "P-006", nombre: "Máquina de Anestesia", cat: "Equipos médicos", diag: 60000, rep: 320000, mant: 150000, inst: 200000 },
];

export const INITIAL_CATALOGO: CatalogoItem[] = [
  { id: "CATMP001", codigo: "MP001", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 85000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CATMP002", codigo: "MP002", categoria: "MP", servicio: "Mantencion preventiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 90000, grupo: "MP", texto_base_key: "MP", descripcion_larga: "" },
  { id: "CATMC001", codigo: "MC001", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Monitor multiparametro", unidad: "Servicio", precio_neto: 120000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CATMC002", codigo: "MC002", categoria: "MC", servicio: "Mantencion correctiva", equipo: "Autoclave", unidad: "Servicio", precio_neto: 185000, grupo: "MC", texto_base_key: "MC", descripcion_larga: "" },
  { id: "CATBS001", codigo: "BS001", categoria: "BS", servicio: "Bloque servicio tecnico", equipo: "Atencion en terreno", unidad: "Bloque", precio_neto: 65000, grupo: "BS", texto_base_key: "BS", descripcion_larga: "" },
  { id: "CATVS001", codigo: "VS001", categoria: "VS", servicio: "Visita tecnica", equipo: "Evaluacion inicial", unidad: "Visita", precio_neto: 45000, grupo: "VS", texto_base_key: "VS", descripcion_larga: "" },
  { id: "CATEV001", codigo: "EV001", categoria: "EV", servicio: "Evaluacion diagnostica", equipo: "Equipo biomedico", unidad: "Servicio", precio_neto: 55000, grupo: "EV", texto_base_key: "EV", descripcion_larga: "" },
  { id: "CATRS001", codigo: "RS001", categoria: "RS", servicio: "Repuesto / Insumo", equipo: "Kit de repuestos", unidad: "Unidad", precio_neto: 0, grupo: "RS", texto_base_key: "RS", descripcion_larga: "" },
];

export const INITIAL_COTIZACIONES: Cotizacion[] = [];

export const SERVICE_LABELS: Record<Exclude<QuoteService, "">, string> = {
  diagnostico: "Diagnóstico",
  reparacion: "Reparación",
  mantencion: "Mantención preventiva",
  instalacion: "Instalación",
  mixto: "Mixto",
};

export const SERVICE_MAP: Record<string, QuoteService> = {
  diagnóstico: "diagnostico", diagnostico: "diagnostico",
  reparación: "reparacion", reparacion: "reparacion",
  mantención: "mantencion", mantencion: "mantencion",
  instalación: "instalacion", instalacion: "instalacion",
};

export const CAT_LABELS: Record<string, string> = {
  VS: "Visita técnica",
  MP: "Mantención preventiva",
  MC: "Mantención correctiva",
  BS: "Bloque servicio",
  EV: "Evaluación diagnóstica",
  RS: "Repuesto / Insumo",
};

export const FORMAS_PAGO = ["50% inicio - 50% entrega", "Crédito a 30 días", "Contra entrega"];

export const LEAD_ESTADO_META: Record<string, { label: string; tagClass: string }> = {
  "no-cotizado": { label: "No cotizado", tagClass: "amber" },
  cotizado:      { label: "Cotizado",    tagClass: "navy"  },
  aprobado:      { label: "Aprobado",    tagClass: "green" },
  rechazado:     { label: "Rechazado",   tagClass: "red"   },
};

export const COT_ESTADOS = ["Pendiente", "En revisión", "Aprobada", "Rechazada"];

export const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const SERVICE_TYPES_DEFAULTS: ServiceTypeEntry[] = [
  { id: "VS", label: "Visita técnica", defaultPrice: 45000 },
  { id: "MP", label: "Mantención preventiva", defaultPrice: 85000 },
  { id: "MC", label: "Mantención correctiva", defaultPrice: 120000 },
  { id: "BS", label: "Bloque servicio", defaultPrice: 65000 },
  { id: "EV", label: "Evaluación diagnóstica", defaultPrice: 55000 },
  { id: "RS", label: "Repuesto / Insumo", defaultPrice: 0 },
];

export const EQUIP_CAT_DEFAULTS = ["Médico", "Dental", "Estético", "Otro"];

export const LEAD_FORM_INIT: LeadForm = { rut: "", nombre: "", empresa: "", tel: "+56 ", email: "", canal: "wsp", servicio: "", equipo: "", direccion: "", tipo_entidad: "" };
export const CLIENTE_FORM_INIT: ClienteForm = { rut: "", nombre: "", contacto: "", tel: "+56 ", correo: "", estado: "activo", direccion: "", ciudad: "", comuna: "", tipo_entidad: "" };
export const CATALOGO_FORM_INIT: CatalogoItemForm = { codigo: "", categoria: "MP", servicio: "", equipo: "", unidad: "Servicio", precio_neto: "", texto_base_key: "", descripcion_larga: "" };
export const PRODUCTO_FORM_INIT: ProductoForm = { nombre: "", cat: "Equipos médicos", marca: "", diag: "", rep: "", mant: "", inst: "" };

export const PROTO_KEY = "crm_proto_templates";

export const DEFAULT_PROTO_DATA: { id: string; label: string; sections: { label: string; subItems: string[] }[] }[] = [
  { id: "anestesia", label: "Máquina de Anestesia", sections: [
    { label: "VERIFICACIÓN DE COMPONENTES E INSPECCIÓN VISUAL", subItems: [
      "Estado general del equipo",
      "Limpieza externa",
      "Pantalla y panel de control",
      "Perillas y controles",
      "Conectores y mangueras",
      "Sistema de ruedas y frenos",
      "Cable de alimentación",
      "Etiquetas y señaléticas",
    ]},
    { label: "SISTEMA DE GASES", subItems: [
      "Conexión a red de gases (O₂, N₂O, Aire)",
      "Estado de mangueras de gases",
      "Fugas en conexiones",
      "Funcionamiento de manómetros",
      "Funcionamiento de flujómetros",
      "Sistema de seguridad de oxígeno (fail-safe)",
    ]},
    { label: "VAPORIZADORES", subItems: [
      "Instalación y fijación correcta",
      "Nivel de agente anestésico",
      "Funcionamiento del mecanismo de bloqueo",
      "Prueba de estanqueidad del vaporizador",
    ]},
    { label: "CIRCUITO PACIENTE", subItems: [
      "Estado de mangueras y conexiones",
      "Sistema de absorción de CO₂ (cal sodada)",
      "Bolsa reservorio",
      "Mascarilla facial",
    ]},
    { label: "VENTILACIÓN Y ALARMAS", subItems: [
      "Prueba de ventilación manual",
      "Prueba de ventilación mecánica",
      "Alarmas de alta y baja presión",
      "Alarmas de volumen tidal",
    ]},
    { label: "MONITORES Y PRUEBA FUNCIONAL", subItems: [
      "Revisión de monitores integrados (SpO₂, capnografía)",
      "Limpieza y desinfección del circuito paciente",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "monitor", label: "Monitor Multiparámetro", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, pantalla y carcasa",
      "Revisión de cables y electrodos ECG",
      "Limpieza de pantalla táctil y superficie del equipo",
    ]},
    { label: "MÓDULOS CLÍNICOS", subItems: [
      "Módulo SpO₂ (oximetría de pulso)",
      "Módulo NIBP (presión arterial no invasiva)",
      "Módulo de temperatura",
    ]},
    { label: "SISTEMA Y ALARMAS", subItems: [
      "Batería y sistema de carga",
      "Fecha y hora del sistema",
      "Prueba de alarmas sonoras y visuales",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba funcional completa con paciente simulado",
    ]},
  ]},
  { id: "impedancia", label: "Analizador Corporal por Impedancia", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios",
      "Revisión de electrodos y cables de medición",
      "Limpieza y desinfección de electrodos y superficie",
    ]},
    { label: "CALIBRACIÓN Y FUNCIONAMIENTO", subItems: [
      "Verificación de calibración interna",
      "Prueba de reproducibilidad de mediciones",
      "Revisión de la plataforma de pesaje integrada",
      "Actualización de software si corresponde",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "balanza", label: "Balanza", sections: [
    { label: "VERIFICACIÓN VISUAL Y NIVELACIÓN", subItems: [
      "Inspección visual del equipo y plataforma",
      "Verificación de nivelación (burbuja de nivel)",
      "Revisión del indicador digital y display",
    ]},
    { label: "CALIBRACIÓN", subItems: [
      "Encendido y período de calentamiento",
      "Prueba de cero / tara",
      "Calibración con pesas patrón certificadas",
      "Verificación de repetibilidad (3 pesadas con misma carga)",
      "Prueba con carga máxima",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de plataforma y estructura del equipo",
      "Prueba funcional general",
    ]},
  ]},
  { id: "ecg", label: "Electrocardiógrafo", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios",
      "Revisión de cables de derivaciones y electrodos",
      "Verificación de impresora y papel de registro",
      "Revisión de batería y sistema de carga",
    ]},
    { label: "CALIBRACIÓN Y SEÑAL", subItems: [
      "Verificación de calibración de señal (1 mV = 10 mm)",
      "Verificación de velocidad de papel (25 mm/s)",
      "Prueba de todas las derivaciones (I, II, III, aVR, aVL, aVF, V1–V6)",
      "Revisión de filtros (60 Hz, EMG)",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de electrodos y superficies del equipo",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "espirometro", label: "Espirómetro", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, turbina y accesorios",
      "Revisión del sensor de flujo / turbina",
      "Verificación de impresora o conectividad de exportación",
      "Revisión de batería y sistema de carga",
    ]},
    { label: "CALIBRACIÓN", subItems: [
      "Calibración con jeringa de 3 L (±3.5%)",
      "Verificación de prueba FVC (Capacidad Vital Forzada)",
      "Verificación de prueba FEV1",
      "Verificación de prueba PEF (Flujo espiratorio máximo)",
    ]},
    { label: "SOFTWARE Y PRUEBA FUNCIONAL", subItems: [
      "Revisión de software e interfaz de usuario",
      "Limpieza y desinfección de turbina y boquillas",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "calorico", label: "Estimulador Calórico", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo y accesorios (cánulas, tubing)",
      "Revisión y limpieza del depósito de agua",
      "Revisión de alarmas y protecciones de seguridad",
    ]},
    { label: "SISTEMA TÉRMICO", subItems: [
      "Verificación del sistema de calentamiento (44°C)",
      "Verificación del sistema de enfriamiento (30°C)",
      "Control de presión y caudal de irrigación",
      "Calibración del temporizador de irrigación",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Prueba de ciclo completo (caliente / frío / aire)",
      "Limpieza y desinfección de cánulas y accesorios",
      "Prueba funcional general del equipo",
    ]},
  ]},
  { id: "optotipos", label: "Proyector de Optotipos", sections: [
    { label: "VERIFICACIÓN VISUAL Y COMPONENTES", subItems: [
      "Inspección visual del equipo, lentes y espejo de proyección",
      "Revisión del motor y mecanismo de rotación de optotipos",
      "Revisión del panel de control / control remoto",
    ]},
    { label: "VERIFICACIÓN ÓPTICA", subItems: [
      "Verificación de uniformidad de iluminación en pantalla",
      "Prueba de todos los optotipos disponibles (letras, números, símbolos)",
      "Verificación de la distancia focal de proyección (5 o 6 metros)",
      "Control del nivel de contraste de imágenes proyectadas",
    ]},
    { label: "PRUEBA FUNCIONAL", subItems: [
      "Limpieza de lentes, espejo y superficie del equipo",
      "Prueba funcional general del equipo",
    ]},
  ]},
];
