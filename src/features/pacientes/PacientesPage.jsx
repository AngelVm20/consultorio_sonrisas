import React, { useEffect, useRef, useState } from "react";
import { listarPacientes, crearPaciente, actualizarPaciente, borrarPaciente } from "./pacientes.api";

/* ---------- Modal de confirmación reutilizable ---------- */
function ConfirmModal({ open, title = "Confirmar", message, confirmText = "Sí, borrar", cancelText = "Cancelar", onConfirm, onCancel, busy = false }) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Foco al botón confirmar
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 0);
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
      if ((e.key === "Enter" || e.key === " ") && e.target === confirmBtnRef.current) onConfirm?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 92vw)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
          padding: 18,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ color: "#555", lineHeight: 1.4 }}>{message}</div>

        <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button className="btn" type="button" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button
            className="btn"
            type="button"
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={busy}
            style={{ background: "var(--danger, #e74c3c)", color: "#fff" }}
          >
            {busy ? "Borrando…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Página ------------------------- */
export default function PacientesPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);

  // borrado
  const [deletingId, setDeletingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null); // { id_paciente, apellidos, nombres }

  async function load() {
    const data = await listarPacientes(q);
    setItems(data);
  }
  useEffect(() => {
    load();
  }, [q]);

  function empty() {
    return {
      nombres: "",
      apellidos: "",
      cedula: "",
      telefono: "",
      fecha_nacimiento: "",
      direccion: "",
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!edit) return;
    if (edit.id_paciente) await actualizarPaciente(edit.id_paciente, edit);
    else await crearPaciente(edit);
    setEdit(null);
    await load();
  }

  function askDeletePaciente(p) {
    setToDelete(p);
    setConfirmOpen(true);
  }

  async function confirmDeletePaciente() {
    if (!toDelete || deletingId) return;
    try {
      setDeletingId(toDelete.id_paciente);
      await borrarPaciente(toDelete.id_paciente);
      setConfirmOpen(false);
      setToDelete(null);
      await load();
    } catch (err) {
      console.error("Error al borrar paciente:", err);
      alert("No se pudo borrar el paciente.");
    } finally {
      setDeletingId(null);
    }
  }

  function cancelDeletePaciente() {
    setConfirmOpen(false);
    setToDelete(null);
  }

  return (
    <div className="grid gap-8">
      <h2>Pacientes Registrados</h2>

      <div className="card">
        <div className="row">
          <input
            className="input"
            placeholder="Buscar (apellido/cedula)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <button className="btn btn-primary" type="button" onClick={() => setEdit(empty())}>
            Nuevo
          </button>
        </div>

        <div className="mt-12">
          <table className="table">
            <thead>
              <tr>
                <th>Apellidos</th>
                <th>Nombres</th>
                <th>Cédula</th>
                <th>Teléfono</th>
                <th>F.Nac.</th>
                <th>Dirección</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id_paciente}>
                  <td>{p.apellidos}</td>
                  <td>{p.nombres}</td>
                  <td>{p.cedula}</td>
                  <td>{p.telefono}</td>
                  <td>{p.fecha_nacimiento}</td>
                  <td>{p.direccion}</td>
                  <td className="row" style={{ gap: 8 }}>
                    <button className="btn" type="button" onClick={() => setEdit(p)}>
                      Editar
                    </button>
                    <button
                      className="btn"
                      type="button"
                      style={{ color: "var(--danger)" }}
                      disabled={deletingId === p.id_paciente}
                      onClick={() => askDeletePaciente(p)}
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="help">
                    No hay resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <form onSubmit={onSubmit} className="card">
          <h3>{edit.id_paciente ? "Editar paciente" : "Nuevo paciente"}</h3>
          <div className="row">
            <input
              className="input"
              required
              placeholder="Nombres"
              value={edit.nombres}
              onChange={(e) => setEdit({ ...edit, nombres: e.target.value })}
              style={{ maxWidth: 260 }}
            />
            <input
              className="input"
              required
              placeholder="Apellidos"
              value={edit.apellidos}
              onChange={(e) => setEdit({ ...edit, apellidos: e.target.value })}
              style={{ maxWidth: 260 }}
            />
            <input
              className="input"
              placeholder="Cédula"
              value={edit.cedula ?? ""}
              onChange={(e) => setEdit({ ...edit, cedula: e.target.value })}
              style={{ maxWidth: 180 }}
            />
            <input
              className="input"
              placeholder="Teléfono"
              value={edit.telefono ?? ""}
              onChange={(e) => setEdit({ ...edit, telefono: e.target.value })}
              style={{ maxWidth: 180 }}
            />
            <input
              className="input"
              type="date"
              value={edit.fecha_nacimiento ?? ""}
              onChange={(e) => setEdit({ ...edit, fecha_nacimiento: e.target.value })}
              style={{ maxWidth: 190 }}
            />
          </div>
          <div className="row mt-12">
            <input
              className="input"
              placeholder="Dirección"
              value={edit.direccion ?? ""}
              onChange={(e) => setEdit({ ...edit, direccion: e.target.value })}
            />
          </div>
          <div className="row mt-12">
            <button className="btn btn-primary" type="submit">
              Guardar
            </button>
            <button className="btn" type="button" onClick={() => setEdit(null)}>
              Cancelar
            </button>
            <span className="help ml-auto">Los cambios se guardan en la base local</span>
          </div>
        </form>
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        open={confirmOpen}
        title="Eliminar paciente"
        message={
          toDelete
            ? (
              <>
                ¿Seguro que deseas borrar al paciente <b>{toDelete.apellidos} {toDelete.nombres}</b>?<br />
                Esta acción no se puede deshacer.
              </>
            )
            : "¿Seguro que deseas borrar este paciente?"
        }
        confirmText="Sí, borrar"
        cancelText="Cancelar"
        onConfirm={confirmDeletePaciente}
        onCancel={cancelDeletePaciente}
        busy={!!deletingId}
      />
    </div>
  );
}
