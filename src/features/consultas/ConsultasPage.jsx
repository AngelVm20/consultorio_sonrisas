import React, { useEffect, useMemo, useState } from "react";
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
import { pickImageFile, copyImageToMedia, fileUrl, deleteLocalFile } from "../../lib/files";

function formatISO(d) {
  // YYYY-MM-DD
  const pad = (n) => String(n).padStart(2, "0");
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

export default function ConsultasPage() {
  // 1) Buscar y seleccionar paciente
  const [q, setQ] = useState("");
  const [sug, setSug] = useState([]);
  const [paciente, setPaciente] = useState(null);

  // 2) Historial de consultas del paciente
  const [consultas, setConsultas] = useState([]);
  const [selId, setSelId] = useState(null); // id_consulta seleccionada
  const [sel, setSel] = useState(null);     // objeto consulta seleccionado
  const [fotos, setFotos] = useState([]);

  // 3) Formulario (crear/editar)
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // consulta en edición o nueva

  // Buscar pacientes
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!q?.trim()) { setSug([]); return; }
      const rows = await listarPacientes(q.trim());
      if (alive) setSug(rows.slice(0, 20));
    }
    run();
    return () => { alive = false; };
  }, [q]);

  // Cargar historial al elegir paciente
  async function pickPaciente(p) {
    setPaciente(p);
    setQ(`${p.apellidos} ${p.nombres}`); // congelar en input
    const hist = await listarConsultasPorPaciente(p.id_paciente);
    setConsultas(hist);
    // reset selección
    setSelId(null);
    setSel(null);
    setFotos([]);
    setEditing(false);
    setDraft(null);
  }

  // Cargar detalle + fotos al seleccionar consulta
  useEffect(() => {
    let alive = true;
    async function loadSel() {
      if (!selId) { setSel(null); setFotos([]); return; }
      const d = await detalleConsulta(selId);
      const f = await listarFotos(selId);
      if (alive) {
        setSel(d);
        setFotos(f);
        setEditing(false);
        setDraft(null);
      }
    }
    loadSel();
    return () => { alive = false; };
  }, [selId]);

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

    if (draft.id_consulta) {
      await actualizarConsulta(draft.id_consulta, draft);
      setSelId(draft.id_consulta);
    } else {
      const id_consulta = await crearConsulta(draft);
      setSelId(id_consulta);
    }
    setEditing(false);
    setDraft(null);
    await refreshHistorial();
  }

  async function onBorrarConsulta() {
    if (!sel) return;
    if (!confirm("¿Borrar esta consulta?")) return;
    await borrarConsulta(sel.id_consulta);
    setSelId(null);
    setSel(null);
    setFotos([]);
    await refreshHistorial();
  }

  // FOTOS
  async function onAgregarFoto() {
    if (!(paciente && (selId || draft?.id_consulta))) {
      // Si es nueva consulta, primero guarda para obtener id_consulta
      if (editing && !draft?.id_consulta) {
        alert("Primero guarda la consulta, luego agrega fotos.");
        return;
      }
    }
    const id_consulta = selId || draft.id_consulta;
    const pick = await pickImageFile();
    if (!pick) return;

    const fechaISO = (sel?.fecha_consulta || draft?.fecha_consulta || formatISO(new Date()));
    const savedPath = await copyImageToMedia(paciente.id_paciente, fechaISO, pick, (fotos?.length || 0) + 1);
    await agregarFoto(id_consulta, savedPath, "", (fotos?.length || 0) + 1);
    const f = await listarFotos(id_consulta);
    setFotos(f);
  }

  async function onBorrarFoto(foto) {
    if (!confirm("¿Borrar esta foto?")) return;
    await borrarFoto(foto.id_foto);
    // Intentar borrar archivo local (no es grave si falla)
    try { await deleteLocalFile(foto.ruta_archivo); } catch {}
    const f = await listarFotos(selId || draft?.id_consulta);
    setFotos(f);
  }

  // Thumbnail helper
  function thumbSrc(f) {
    return fileUrl(f.ruta_archivo);
  }

  return (
    <div className="p-4" style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 12 }}>
      <h2>Consultas</h2>

      {/* Buscador de paciente */}
      <div className="grid" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
        <div>
          <input
            placeholder="Buscar paciente (apellidos / nombres / cédula)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: "100%" }}
          />
          {sug.length > 0 && (
            <div style={{ border: "1px solid #ccc", maxHeight: 200, overflow: "auto", background: "white" }}>
              {sug.map((p) => (
                <div
                  key={p.id_paciente}
                  style={{ padding: 6, cursor: "pointer" }}
                  onClick={() => pickPaciente(p)}
                >
                  {p.apellidos} {p.nombres} — {p.cedula || "s/cedula"}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <button onClick={startNueva} disabled={!paciente}>Nueva consulta</button>
        </div>
      </div>

      {/* Layout: izquierda historial / derecha detalle o form */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, minHeight: 400 }}>
        {/* Historial */}
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 8, overflow: "auto" }}>
          <b>Historial</b>
          {!paciente && <div style={{ color: "#666", marginTop: 8 }}>Selecciona un paciente…</div>}
          {paciente && consultas.length === 0 && <div style={{ color: "#666", marginTop: 8 }}>Sin consultas.</div>}
          {consultas.map((c) => (
            <div
              key={c.id_consulta}
              onClick={() => setSelId(c.id_consulta)}
              style={{
                padding: 8,
                marginTop: 6,
                border: "1px solid " + (selId === c.id_consulta ? "#0b74de" : "#ccc"),
                borderRadius: 4,
                cursor: "pointer",
                background: selId === c.id_consulta ? "#eaf3fe" : "white",
              }}
            >
              <div><b>{c.fecha_consulta}</b> — ${Number(c.ingreso || 0).toFixed(2)}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{c.motivo || "(sin motivo)"}</div>
            </div>
          ))}
        </div>

        {/* Detalle o Form */}
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 12 }}>
          {!paciente && <div>—</div>}

          {/* Vista detalle */}
          {paciente && sel && !editing && (
            <div className="grid" style={{ gap: 8 }}>
              <h3>Consulta del {sel.fecha_consulta}</h3>
              <div><b>Motivo:</b> {sel.motivo || "-"}</div>
              <div><b>Procedimiento:</b> {sel.procedimiento || "-"}</div>
              <div><b>Ingreso:</b> ${Number(sel.ingreso || 0).toFixed(2)}</div>
              <div><b>Detalle:</b><br />{sel.detalle || "-"}</div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={startEditar}>Editar</button>
                <button onClick={onBorrarConsulta} style={{ color: "#a00" }}>Borrar</button>
                <button onClick={startNueva} style={{ marginLeft: "auto" }}>Nueva consulta</button>
              </div>

              <hr />
              <b>Fotos</b>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {fotos.map((f) => (
                  <div key={f.id_foto} style={{ width: 140 }}>
                    <img src={thumbSrc(f)} alt="" style={{ width: 140, height: 100, objectFit: "cover", border: "1px solid #ccc" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button onClick={() => onBorrarFoto(f)} style={{ color: "#a00" }}>Quitar</button>
                    </div>
                  </div>
                ))}
                <button onClick={onAgregarFoto}>Agregar foto</button>
              </div>
            </div>
          )}

          {/* Form crear/editar */}
          {paciente && editing && (
            <form className="grid" style={{ gap: 8 }} onSubmit={onGuardar}>
              <h3>{draft?.id_consulta ? "Editar consulta" : "Nueva consulta"}</h3>

              <label>Fecha
                <input type="date" value={draft.fecha_consulta}
                  onChange={(e) => setDraft({ ...draft, fecha_consulta: e.target.value })} />
              </label>

              <label>Motivo
                <input value={draft.motivo} onChange={(e) => setDraft({ ...draft, motivo: e.target.value })} />
              </label>

              <label>Procedimiento
                <input value={draft.procedimiento} onChange={(e) => setDraft({ ...draft, procedimiento: e.target.value })} />
              </label>

              <label>Ingreso (USD)
                <input type="number" step="0.01" value={draft.ingreso}
                  onChange={(e) => setDraft({ ...draft, ingreso: e.target.value })} />
              </label>

              <label>Detalle
                <textarea rows={4} value={draft.detalle}
                  onChange={(e) => setDraft({ ...draft, detalle: e.target.value })} />
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Guardar</button>
                <button type="button" onClick={() => { setEditing(false); setDraft(null); }}>Cancelar</button>
              </div>

              {/* Si ya existe (edición), permite fotos aquí también */}
              {draft?.id_consulta && (
                <>
                  <hr />
                  <b>Fotos</b>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                    {fotos.map((f) => (
                      <div key={f.id_foto} style={{ width: 140 }}>
                        <img src={thumbSrc(f)} alt="" style={{ width: 140, height: 100, objectFit: "cover", border: "1px solid #ccc" }} />
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <button type="button" onClick={() => onBorrarFoto(f)} style={{ color: "#a00" }}>Quitar</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={onAgregarFoto}>Agregar foto</button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Estado vacío cuando hay paciente pero sin selección y no creando */}
          {paciente && !sel && !editing && (
            <div style={{ color: "#666" }}>Selecciona una consulta a la izquierda o crea una nueva.</div>
          )}
        </div>
      </div>
    </div>
  );
}
