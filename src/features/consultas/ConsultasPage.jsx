// ConsultasPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { listarPacientes } from "../pacientes/pacientes.api";
import {
  listarConsultasPorPaciente,
  crearConsulta,
  actualizarConsulta,
  borrarConsulta,
  detalleConsulta,
  listarFotos,
  agregarFoto,
  borrarFoto,
} from "./consultas.api";
import {
  pickImageFile,
  copyImageToMedia,
  fileUrl,
  deleteLocalFile,
} from "../../lib/files";

const MAX_FOTOS = 10;

/* ---------- Modal de confirmación reusable ---------- */
function ConfirmModal({
  open,
  title = "Confirmar",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 0);
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

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
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ color: "#555", lineHeight: 1.4 }}>{message}</div>

        <div
          className="row"
          style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}
        >
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

/* -------------------- Utilidades -------------------- */
function pad(n) {
  return String(n).padStart(2, "0");
}
function formatISO(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
const emptyConsulta = (id_paciente) => ({
  id_paciente,
  motivo: "",
  procedimiento: "",
  ingreso: "",
  detalle: "",
  fecha_consulta: formatISO(new Date()),
});

/** Mini-componente para una tarjeta de foto segura */
function PhotoThumb({ src, onRemove, onOpen }) {
  return (
    <div className="card" style={{ width: 160, padding: 8 }}>
      {src ? (
        <img
          src={src}
          alt=""
          onClick={onOpen}
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 8,
            cursor: onOpen ? "zoom-in" : "default",
          }}
        />
      ) : (
        <div
          className="help"
          style={{
            width: "100%",
            height: 110,
            display: "grid",
            placeItems: "center",
          }}
        >
          Sin vista previa
        </div>
      )}
      {onRemove && (
        <button
          className="btn mt-8"
          type="button"
          style={{ color: "var(--danger)" }}
          onClick={onRemove}
        >
          Quitar
        </button>
      )}
    </div>
  );
}

/* -------------------- Página -------------------- */
export default function ConsultasPage() {
  // búsqueda/selección de paciente
  const [q, setQ] = useState("");
  const [sug, setSug] = useState([]);
  const [paciente, setPaciente] = useState(null);

  // historial + selección
  const [consultas, setConsultas] = useState([]);
  const [selId, setSelId] = useState(null);
  const [sel, setSel] = useState(null);
  const [fotos, setFotos] = useState([]);

  // edición
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  // staging de fotos para consulta NUEVA
  const [pendingFotos, setPendingFotos] = useState([]); // [{path, name, previewUrl}]

  // visor de imagen (modal)
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [zoom, setZoom] = useState(1);

  // confirmaciones
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmKind, setConfirmKind] = useState(null); // 'consulta' | 'foto'
  const [fotoAEliminar, setFotoAEliminar] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!q?.trim()) {
        setSug([]);
        return;
      }
      const rows = await listarPacientes(q.trim());
      if (alive) setSug(rows.slice(0, 20));
    })();
    return () => {
      alive = false;
    };
  }, [q]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeLightbox();
      if (!lightboxSrc) return;
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(0.25, z - 0.25));
      if (e.key === "0") setZoom(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  function openLightbox(src) {
    setLightboxSrc(src);
    setZoom(1);
  }
  function closeLightbox() {
    setLightboxSrc(null);
    setZoom(1);
  }

  /** Devuelve un src seguro para <img>, o null si no hay */
  function thumbSrc(f) {
    if (!f) return null;
    if (f.previewUrl) return f.previewUrl; // fotos en staging
    if (f.ruta_archivo) return fileUrl(f.ruta_archivo) || null;
    return null;
  }

  async function selectConsulta(c) {
    const id = c.id_consulta;
    setSelId(id);
    setEditing(false);
    setDraft(null);
    setPendingFotos([]);

    setSel({
      id_consulta: id,
      id_paciente: paciente?.id_paciente,
      fecha_consulta: c.fecha_consulta,
      motivo: c.motivo ?? "",
      procedimiento: c.procedimiento ?? "",
      ingreso: c.ingreso ?? 0,
      detalle: c.detalle ?? "",
      __loading: true,
    });
    setFotos([]);

    try {
      const [d, f] = await Promise.all([detalleConsulta(id), listarFotos(id)]);
      setSel(d || c);
      setFotos(f || []);
    } catch (e) {
      console.error("Error al cargar detalle:", e);
      setSel(c);
      setFotos([]);
    }
  }

  async function pickPaciente(p) {
    setPaciente(p);
    setQ(`${p.apellidos} ${p.nombres}`);
    const hist = await listarConsultasPorPaciente(p.id_paciente);
    setConsultas(hist);
    setSelId(null);
    setSel(null);
    setFotos([]);
    setEditing(false);
    setDraft(null);
    setPendingFotos([]);
  }

  async function refreshHistorial() {
    if (!paciente) return;
    const hist = await listarConsultasPorPaciente(paciente.id_paciente);
    setConsultas(hist);
  }

  function startNueva() {
    if (!paciente) return;
    setEditing(true);
    setSelId(null);
    setSel(null);
    setFotos([]);
    setPendingFotos([]);
    setDraft(emptyConsulta(paciente.id_paciente));
  }
  function startEditar() {
    if (!sel) return;
    setEditing(true);
    setDraft({ ...sel, ingreso: sel.ingreso ?? "" });
  }

  async function onGuardar(e) {
    e.preventDefault();
    if (!draft || !paciente) return;

    try {
      if (draft.id_consulta) {
        await actualizarConsulta(draft.id_consulta, draft);
        await selectConsulta({ ...draft, id_consulta: draft.id_consulta });
      } else {
        const id = await crearConsulta(draft);

        if (pendingFotos.length) {
          const fechaISO = draft.fecha_consulta;
          let orden = 1;
          for (const pf of pendingFotos) {
            const savedPath = await copyImageToMedia(
              paciente.id_paciente,
              fechaISO,
              pf.path,
              orden
            );
            await agregarFoto(id, savedPath, "", orden);
            orden++;
          }
          setPendingFotos([]);
        }
        await selectConsulta({ ...draft, id_consulta: id });
      }

      setEditing(false);
      setDraft(null);
      await refreshHistorial();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la consulta. Revisa la consola para más detalles.");
    }
  }

  /* ---------- Borrado con modal ---------- */
  function pedirBorrarConsulta() {
    if (!sel) return;
    setConfirmKind("consulta");
    setConfirmOpen(true);
  }
  async function confirmarBorrarConsulta() {
    if (!sel) return;
    try {
      setConfirmBusy(true);
      await borrarConsulta(sel.id_consulta);
      setSelId(null);
      setSel(null);
      setFotos([]);
      await refreshHistorial();
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar la consulta.");
    } finally {
      setConfirmBusy(false);
      setConfirmOpen(false);
      setConfirmKind(null);
    }
  }

  // fotos
  function fotosTotalesSiAgregoEnNueva(mas = 0) {
    return (pendingFotos?.length || 0) + mas;
  }
  function fotosTotalesSiAgregoEnExistente(mas = 0) {
    return (fotos?.length || 0) + mas;
  }

  async function onAgregarFoto() {
    try {
      const esExistente = !!(selId || draft?.id_consulta);
      const actuales = esExistente
        ? fotosTotalesSiAgregoEnExistente(0)
        : fotosTotalesSiAgregoEnNueva(0);
      if (actuales >= MAX_FOTOS) {
        alert(`Límite alcanzado: máximo ${MAX_FOTOS} fotos por consulta.`);
        return;
      }

      const picked = await pickImageFile();
      if (!picked) return;

      const id = selId || draft?.id_consulta;
      if (id) {
        const actuales2 = fotosTotalesSiAgregoEnExistente(1);
        if (actuales2 > MAX_FOTOS) {
          alert(`Límite: máximo ${MAX_FOTOS} fotos por consulta.`);
          return;
        }
        const fechaISO =
          sel?.fecha_consulta || draft?.fecha_consulta || formatISO(new Date());
        const savedPath = await copyImageToMedia(
          paciente.id_paciente,
          fechaISO,
          picked.path,
          (fotos?.length || 0) + 1
        );
        await agregarFoto(id, savedPath, "", (fotos?.length || 0) + 1);
        const f = await listarFotos(id);
        setFotos(f);
        return;
      }

      // nueva (staging)
      const actuales3 = fotosTotalesSiAgregoEnNueva(1);
      if (actuales3 > MAX_FOTOS) {
        alert(`Límite: máximo ${MAX_FOTOS} fotos por consulta.`);
        return;
      }
      setPendingFotos((prev) => [...prev, picked]);
    } catch (e) {
      console.error("onAgregarFoto error", e);
      alert("No se pudo agregar la foto. Revisa permisos de archivos.");
    }
  }

  function removePending(idx) {
    setPendingFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function pedirBorrarFoto(foto) {
    setFotoAEliminar(foto);
    setConfirmKind("foto");
    setConfirmOpen(true);
  }
  async function confirmarBorrarFoto() {
    if (!fotoAEliminar) return;
    try {
      setConfirmBusy(true);
      await borrarFoto(fotoAEliminar.id_foto);
      try {
        await deleteLocalFile(fotoAEliminar.ruta_archivo);
      } catch { }
      const f = await listarFotos(selId || draft?.id_consulta);
      setFotos(f);
    } catch (e) {
      console.error(e);
      alert("No se pudo borrar la foto.");
    } finally {
      setConfirmBusy(false);
      setConfirmOpen(false);
      setConfirmKind(null);
      setFotoAEliminar(null);
    }
  }

  return (
    <div className="grid gap-8">
      <h2>Consultas</h2>

      {/* Buscador de paciente */}
      <div className="card">
        <div className="row">
          <input
            className="input"
            placeholder="Buscar paciente (apellidos / nombres / cédula)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={startNueva}
            disabled={!paciente}
          >
            Nueva consulta
          </button>
        </div>

        {!!sug.length && (
          <div className="card mt-8" style={{ padding: 8 }}>
            {sug.map((p) => (
              <div
                key={p.id_paciente}
                className="row"
                style={{ padding: 8, borderRadius: 8, cursor: "pointer" }}
                onClick={() => pickPaciente(p)}
              >
                <span>
                  <b>
                    {p.apellidos} {p.nombres}
                  </b>
                </span>
                <span className="badge">{p.cedula || "s/cedula"}</span>
              </div>
            ))}
          </div>
        )}
        {!sug.length && !paciente && (
          <div className="help mt-8">Escribe para buscar…</div>
        )}
        {paciente && (
          <div className="help mt-8">
            Paciente seleccionado:{" "}
            <b>
              {paciente.apellidos} {paciente.nombres}
            </b>
          </div>
        )}
      </div>

      {/* Layout principal */}
      <div className="grid-2">
        {/* Historial */}
        <div className="card">
          <h3>Historial</h3>
          {!paciente && <div className="help mt-8">Selecciona un paciente…</div>}
          {paciente && consultas.length === 0 && (
            <div className="help mt-8">Sin consultas.</div>
          )}
          <div className="mt-8" style={{ display: "grid", gap: 8 }}>
            {consultas.map((c) => (
              <div
                key={c.id_consulta}
                onClick={() => selectConsulta(c)}
                className="row card"
                style={{
                  padding: 10,
                  borderColor:
                    selId === c.id_consulta ? "var(--accent)" : "var(--border)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <b>{c.fecha_consulta}</b>
                </div>
                <div className="badge">
                  ${Number(c.ingreso || 0).toFixed(2)}
                </div>
                <div className="help" style={{ marginLeft: 8 }}>
                  {c.motivo || "(sin motivo)"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle / Form */}
        <div className="card">
          {!paciente && <div className="help">—</div>}

          {/* Detalle */}
          {paciente && sel && !editing && (
            <div className="grid gap-8">
              <div className="row">
                <h3 style={{ margin: 0 }}>Consulta del {sel.fecha_consulta}</h3>
                <button className="btn ml-auto" type="button" onClick={startEditar}>
                  Editar
                </button>
                <button
                  className="btn"
                  type="button"
                  style={{ color: "var(--danger)" }}
                  onClick={pedirBorrarConsulta}
                >
                  Borrar
                </button>
              </div>
              <div className="row gap-8">
                <div>
                  <b>Motivo:</b> {sel.motivo || "-"}
                </div>
                <div>
                  <b>Procedimiento:</b> {sel.procedimiento || "-"}
                </div>
                <div>
                  <b>Ingreso:</b> ${Number(sel.ingreso || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <b>Detalle:</b>
                <div className="card mt-8" style={{ padding: 12 }}>
                  {sel.detalle || "-"}
                </div>
              </div>

              <hr />
              <div className="row">
                <h3 style={{ margin: 0 }}>Fotos</h3>
                <span className="help ml-auto">
                  Máximo {MAX_FOTOS} fotos por consulta
                </span>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                {(fotos || []).map((f, idx) => (
                  <PhotoThumb
                    key={f.id_foto ?? idx}
                    src={thumbSrc(f)}
                    onRemove={() => pedirBorrarFoto(f)}
                    onOpen={() => openLightbox(thumbSrc(f))}
                  />
                ))}
                {!fotos?.length && <div className="help">Sin fotos</div>}
              </div>
            </div>
          )}

          {/* Form */}
          {paciente && editing && (
            <form className="grid gap-8" onSubmit={onGuardar}>
              <h3>{draft?.id_consulta ? "Editar consulta" : "Nueva consulta"}</h3>

              <div className="row gap-8">
                <label style={{ flex: 1 }}>
                  <div className="help">Fecha</div>
                  <input
                    className="input"
                    type="date"
                    value={draft.fecha_consulta}
                    onChange={(e) =>
                      setDraft({ ...draft, fecha_consulta: e.target.value })
                    }
                  />
                </label>

                <label style={{ flex: 1 }}>
                  <div className="help">Motivo</div>
                  <input
                    className="input"
                    value={draft.motivo}
                    onChange={(e) =>
                      setDraft({ ...draft, motivo: e.target.value })
                    }
                  />
                </label>

                <label style={{ flex: 1 }}>
                  <div className="help">Procedimiento</div>
                  <input
                    className="input"
                    value={draft.procedimiento}
                    onChange={(e) =>
                      setDraft({ ...draft, procedimiento: e.target.value })
                    }
                  />
                </label>

                <label style={{ width: 180 }}>
                  <div className="help">Ingreso (USD)</div>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={draft.ingreso}
                    onChange={(e) =>
                      setDraft({ ...draft, ingreso: e.target.value })
                    }
                  />
                </label>
              </div>

              <label>
                <div className="help">Detalle</div>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.detalle}
                  onChange={(e) =>
                    setDraft({ ...draft, detalle: e.target.value })
                  }
                />
              </label>

              <hr />
              <div className="row">
                <h3 style={{ margin: 0 }}>Fotos</h3>
                <span className="help" style={{ marginLeft: 12 }}>
                  Máximo {MAX_FOTOS} fotos por consulta
                </span>
                <button
                  className="btn btn-primary ml-auto"
                  type="button"
                  onClick={onAgregarFoto}
                >
                  Agregar foto
                </button>
              </div>

              {!draft?.id_consulta ? (
                <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                  {pendingFotos.map((pf, idx) => (
                    <PhotoThumb
                      key={pf.path || idx}
                      src={pf.previewUrl || null}
                      onRemove={() => removePending(idx)}
                      onOpen={() => openLightbox(pf.previewUrl || null)}
                    />
                  ))}
                  {!pendingFotos.length && <div className="help">Sin fotos</div>}
                </div>
              ) : (
                <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                  {(fotos || []).map((f, idx) => (
                    <PhotoThumb
                      key={f.id_foto ?? idx}
                      src={thumbSrc(f)}
                      onRemove={() => pedirBorrarFoto(f)}
                      onOpen={() => openLightbox(thumbSrc(f))}
                    />
                  ))}
                  {!fotos?.length && <div className="help">Sin fotos</div>}
                </div>
              )}

              <div className="row">
                <button className="btn btn-primary" type="submit">
                  Guardar
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {paciente && !sel && !editing && (
            <div className="help">
              Selecciona una consulta a la izquierda o crea una nueva.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox (visor de imagen) */}
      {lightboxSrc && (
        <div
          className="lightbox-backdrop"
          onClick={closeLightbox}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "grid",
            placeItems: "center",
            zIndex: 9998,
            padding: 16,
          }}
        >
          <div
            className="lightbox-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(1000px, 90vw)",
              height: "min(700px, 80vh)",
              borderRadius: 14,
              background: "#111",
              boxShadow: "0 10px 30px rgba(0,0,0,.5)",
              display: "grid",
              gridTemplateRows: "1fr auto",
              overflow: "hidden",
            }}
          >
            <div
              style={{ display: "grid", placeItems: "center", overflow: "hidden" }}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.1 : -0.1;
                setZoom((z) => Math.min(5, Math.max(0.25, z + delta)));
              }}
            >
              <img
                src={lightboxSrc}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.12s ease-out",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
              />
            </div>

            <div
              className="row"
              style={{
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
                background: "rgba(255,255,255,0.9)",
                padding: "10px 12px",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              >
                −
              </button>
              <span className="help">Zoom: {(zoom * 100).toFixed(0)}%</span>
              <button
                type="button"
                className="btn"
                onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              >
                +
              </button>
              <button type="button" className="btn" onClick={() => setZoom(1)}>
                Reset
              </button>
              <button
                type="button"
                className="btn"
                onClick={closeLightbox}
                style={{ marginLeft: 8, fontWeight: 600 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación (consulta/foto) */}
      <ConfirmModal
        open={confirmOpen}
        title={confirmKind === "foto" ? "Eliminar foto" : "Eliminar consulta"}
        message={
          confirmKind === "foto"
            ? "¿Seguro que deseas borrar esta foto? Esta acción no se puede deshacer."
            : "¿Seguro que deseas borrar esta consulta? Esta acción no se puede deshacer."
        }
        confirmText="Sí, borrar"
        cancelText="Cancelar"
        onConfirm={
          confirmKind === "foto" ? confirmarBorrarFoto : confirmarBorrarConsulta
        }
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmKind(null);
          setFotoAEliminar(null);
        }}
        busy={confirmBusy}
      />
    </div>
  );
}
