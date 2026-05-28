"use client";

import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import type { Cliente } from "@/lib/api";
import { isActivo, normalizeRut } from "@/lib/utils";
import { useDebounce, DataModule, SortTh, RowActions } from "./shared";

type SortState = { key: string; dir: "asc" | "desc" };

interface Props {
  clientes: Cliente[];
  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  notify: (msg: string) => void;
  onCotizarCliente: (cliente: Cliente) => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  onAddCliente: () => void;
}

export function ClientesModule({
  clientes,
  setClientes,
  notify,
  onCotizarCliente,
  onEditCliente,
  onDeleteCliente,
  onAddCliente,
}: Props) {
  const [clientQuery, setClientQuery] = useState("");
  const [clientSearchField, setClientSearchField] = useState<"todos" | "rut" | "nombre" | "contacto" | "correo">("todos");
  const [clientSort, setClientSort] = useState<SortState>({ key: "nombre", dir: "asc" });

  const debouncedClientQuery = useDebounce(clientQuery, 250);

  useEffect(() => {
    let cancelled = false;

    const merge = <T extends { id: string }>(apiItems: T[], prev: T[]): T[] => {
      const apiIds = new Set(apiItems.map((x) => x.id));
      const localOnly = prev.filter((x) => !x.id.includes("temp") && !apiIds.has(x.id));
      return localOnly.length > 0 ? [...apiItems, ...localOnly] : apiItems;
    };

    const load = () => {
      api.fetchClientes().then((c) => {
        if (!cancelled && c.length > 0) setClientes((prev) => merge(c, prev));
      }).catch(() => {});
    };

    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [setClientes]);

  const filteredClients = useMemo(() => {
    const list = clientes.filter((c) => {
      if (!debouncedClientQuery) return true;
      const q = debouncedClientQuery.toLowerCase();
      const qNorm = normalizeRut(debouncedClientQuery);
      if (clientSearchField === "rut") return normalizeRut(c.rut).includes(qNorm);
      if (clientSearchField === "nombre") return c.nombre.toLowerCase().includes(q);
      if (clientSearchField === "contacto") return c.contacto.toLowerCase().includes(q);
      if (clientSearchField === "correo") return c.correo.toLowerCase().includes(q);
      return normalizeRut(c.rut).includes(qNorm) || c.nombre.toLowerCase().includes(q) || c.contacto.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q) || (c.ciudad ?? "").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[clientSort.key] ?? "").toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[clientSort.key] ?? "").toLowerCase();
      return clientSort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [clientes, debouncedClientQuery, clientSearchField, clientSort]);

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
