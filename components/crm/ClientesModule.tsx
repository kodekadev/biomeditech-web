"use client";

import type { Cliente } from "@/lib/api";
import { isActivo } from "@/lib/utils";
import { DataModule, SortTh, RowActions } from "./shared";

type SortState = { key: string; dir: "asc" | "desc" };

interface Props {
  filteredClients: Cliente[];
  clientQuery: string;
  setClientQuery: (v: string) => void;
  clientSearchField: "todos" | "rut" | "nombre" | "contacto" | "correo";
  setClientSearchField: (v: "todos" | "rut" | "nombre" | "contacto" | "correo") => void;
  clientSort: SortState;
  setClientSort: (fn: (s: SortState) => SortState) => void;
  notify: (msg: string) => void;
  onCotizarCliente: (cliente: Cliente) => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  onAddCliente: () => void;
}

export function ClientesModule({
  filteredClients,
  clientQuery,
  setClientQuery,
  clientSearchField,
  setClientSearchField,
  clientSort,
  setClientSort,
  notify,
  onCotizarCliente,
  onEditCliente,
  onDeleteCliente,
  onAddCliente,
}: Props) {
  return (
    <DataModule
      title="Clientes"
      search={clientQuery}
      setSearch={setClientQuery}
      searchPlaceholder="Buscar por RUT, nombre, contacto o correo..."
      onAdd={onAddCliente}
      filterEl={
        <select
          value={clientSearchField}
          onChange={(e) => setClientSearchField(e.target.value as typeof clientSearchField)}
          style={{ minHeight: 38, fontSize: 13, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }}
        >
          <option value="todos">Todos los campos</option>
          <option value="rut">RUT</option>
          <option value="nombre">Empresa</option>
          <option value="contacto">Contacto</option>
          <option value="correo">Correo</option>
        </select>
      }
    >
      <table>
        <thead>
          <tr>
            <SortTh label="RUT" sortKey="rut" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
            <SortTh label="Nombre / Empresa" sortKey="nombre" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
            <SortTh label="Contacto" sortKey="contacto" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
            <th>Teléfono</th><th>Ciudad</th>
            <SortTh label="Estado" sortKey="estado" current={clientSort} onSort={(k) => setClientSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))} />
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map((client) => (
            <tr key={client.id}>
              <td className="mono" style={{ fontSize: 12 }}>{client.rut}</td>
              <td><strong>{client.nombre}</strong><small>{client.correo}</small></td>
              <td>{client.contacto}</td>
              <td style={{ fontSize: 12, color: "#64748b" }}>{client.telefono || "—"}</td>
              <td style={{ fontSize: 12 }}>{client.ciudad || (client.comuna ? client.comuna : "—")}</td>
              <td><span className={`tag ${isActivo(client.estado) ? "green" : "amber"}`}>{client.estado}</span></td>
              <td>
                <RowActions
                  notify={notify}
                  quote={() => onCotizarCliente(client)}
                  onEdit={() => onEditCliente(client)}
                  onDelete={() => onDeleteCliente(client.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataModule>
  );
}
