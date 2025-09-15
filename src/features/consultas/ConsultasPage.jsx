import React, { useEffect, useState } from "react";
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

function pad(n) { return String(n).padStart(2, '0'); }
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

  //Estados nuevos y reset
  const [pendingFotos, setPendingFotos] = useState([]); // [{path, name}]


  // buscar pacientes
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!q?.trim()) { setSug([]); return; }
      const rows = await listarPacientes(q.trim());
      if (alive) setSug(rows.slice(0, 20));
    })();
    return () => { alive = false; };
  }, [q]);

  async function selectConsulta(c) {
    const id = c.id_consulta;            // evita Number() innecesario
    setSelId(id);
    setEditing(false);
    setDraft(null);

    // 1) pinta algo inmediatamente
    setSel({
      id_consulta: id,
      id_paciente: paciente?.id_paciente,
      fecha_consulta: c.fecha_consulta,
      motivo: c.motivo ?? "",
      procedimiento: c.procedimiento ?? "",
      ingreso: c.ingreso ?? 0,
      detalle: c.detalle ?? "",          // puede venir vacío en el listado
      __loading: true
    });
    setFotos([]);

    // 2) luego carga el detalle real y las fotos
    try {
      const [d, f] = await Promise.all([
        detalleConsulta(id),
        listarFotos(id),
      ]);
      // si detalle no vino (raro), conserva lo que ya teníamos
      setSel(d || c);
      setFotos(f || []);
    } catch (e) {
      console.error("Error al cargar detalle:", e);
      // al menos deja lo básico visible
      setSel(c);
      setFotos([]);
    }
  }


  async function pickPaciente(p) {
    setPaciente(p);
    setQ(`${p.apellidos} ${p.nombres}`);
    const hist = await listarConsultasPorPaciente(p.id_paciente);
    setConsultas(hist);
    setSelId(null); setSel(null); setFotos([]);
    setEditing(false); setDraft(null);
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
    setSelId(null); setSel(null); setFotos([]);
    setPendingFotos([]);                   // <<-- reset
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
        // update
        await actualizarConsulta(draft.id_consulta, draft);
        await selectConsulta({ ...draft, id_consulta: draft.id_consulta });
      } else {
        // create
        const id = await crearConsulta(draft);

        // si hay fotos en staging, copiarlas + insertarlas
        if (pendingFotos.length) {
          const fechaISO = draft.fecha_consulta;
          let orden = 1;
          for (const pf of pendingFotos) {
            const savedPath = await copyImageToMedia(paciente.id_paciente, fechaISO, pf, orden);
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


  async function onBorrarConsulta() {
    if (!sel) return;
    if (!confirm("¿Borrar esta consulta?")) return;
    await borrarConsulta(sel.id_consulta);
    setSelId(null); setSel(null); setFotos([]);
    await refreshHistorial();
  }

  // fotos
  async function onAgregarFoto() {
    try {
      const picked = await pickImageFile();
      if (!picked) return;

      // Caso 1: ya existe consulta (editar/detalle)
      const id = selId || draft?.id_consulta;
      if (id) {
        const fechaISO = sel?.fecha_consulta || draft?.fecha_consulta || formatISO(new Date());
        const savedPath = await copyImageToMedia(paciente.id_paciente, fechaISO, picked, (fotos?.length || 0) + 1);
        await agregarFoto(id, savedPath, "", (fotos?.length || 0) + 1);
        const f = await listarFotos(id);
        setFotos(f);
        return;
      }

      // Caso 2: consulta nueva (no tiene id todavía) -> staging
      setPendingFotos(prev => [...prev, picked]);
    } catch (e) {
      console.error("onAgregarFoto error", e);
      alert("No se pudo agregar la foto. Revisa permisos de archivos.");
    }
  }

  function removePending(idx) {
    setPendingFotos(prev => prev.filter((_, i) => i !== idx));
  }

  async function onBorrarFoto(foto) {
    if (!confirm("¿Borrar esta foto?")) return;
    await borrarFoto(foto.id_foto);
    try { await deleteLocalFile(foto.ruta_archivo); } catch { }
    const f = await listarFotos(selId || draft?.id_consulta);
    setFotos(f);
  }

  function thumbSrc(f) {
    // si la foto es "nueva" (aún no guardada) puede traer previewUrl
    return f?.previewUrl || fileUrl(f?.ruta_archivo);
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
          <button className="btn btn-primary" onClick={startNueva} disabled={!paciente}>Nueva consulta</button>
        </div>

        {!!sug.length && (
          <div className="card mt-8" style={{ padding: 8 }}>
            {sug.map(p => (
              <div key={p.id_paciente}
                className="row"
                style={{ padding: 8, borderRadius: 8, cursor: "pointer" }}
                onClick={() => pickPaciente(p)}
              >
                <span><b>{p.apellidos} {p.nombres}</b></span>
                <span className="badge">{p.cedula || "s/cedula"}</span>
              </div>
            ))}
          </div>
        )}
        {!sug.length && !paciente && <div className="help mt-8">Escribe para buscar…</div>}
        {paciente && <div className="help mt-8">Paciente seleccionado: <b>{paciente.apellidos} {paciente.nombres}</b></div>}
      </div>

      {/* Layout principal */}
      <div className="grid-2">
        {/* Historial */}
        <div className="card">
          <h3>Historial</h3>
          {!paciente && <div className="help mt-8">Selecciona un paciente…</div>}
          {paciente && consultas.length === 0 && <div className="help mt-8">Sin consultas.</div>}
          <div className="mt-8" style={{ display: "grid", gap: 8 }}>
            {consultas.map((c) => (
              <div
                key={c.id_consulta}
                onClick={() => selectConsulta(c)}   // <--- aquí
                className="row card"
                style={{
                  padding: 10,
                  borderColor: selId === c.id_consulta ? "var(--accent)" : "var(--border)",
                  cursor: "pointer"
                }}
              >
                <div><b>{c.fecha_consulta}</b></div>
                <div className="badge">${Number(c.ingreso || 0).toFixed(2)}</div>
                <div className="help" style={{ marginLeft: 8 }}>{c.motivo || "(sin motivo)"}</div>
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
                <button className="btn ml-auto" onClick={startEditar}>Editar</button>
                <button className="btn" style={{ color: "var(--danger)" }} onClick={onBorrarConsulta}>Borrar</button>
                <button className="btn btn-primary" onClick={startNueva}>Nueva consulta</button>
              </div>
              <div className="row gap-8">
                <div><b>Motivo:</b> {sel.motivo || "-"}</div>
                <div><b>Procedimiento:</b> {sel.procedimiento || "-"}</div>
                <div><b>Ingreso:</b> ${Number(sel.ingreso || 0).toFixed(2)}</div>
              </div>
              <div>
                <b>Detalle:</b>
                <div className="card mt-8" style={{ padding: 12 }}>{sel.detalle || "-"}</div>
              </div>

              <hr />
              <div className="row">
                <h3 style={{ margin: 0 }}>Fotos</h3>
                <button className="btn btn-primary ml-auto" onClick={onAgregarFoto}>Agregar foto</button>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                {fotos.map((f) => (
                  <div key={f.id_foto} className="card" style={{ width: 160, padding: 8 }}>
                    <img
                      src={thumbSrc(f)}
                      alt=""
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }}
                    />
                    <button className="btn mt-8" style={{ color: "var(--danger)" }} onClick={() => onBorrarFoto(f)}>
                      Quitar
                    </button>
                  </div>
                ))}
                {!fotos.length && <div className="help">Sin fotos</div>}
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
                  <input className="input" type="date" value={draft.fecha_consulta}
                    onChange={(e) => setDraft({ ...draft, fecha_consulta: e.target.value })} />
                </label>

                <label style={{ flex: 1 }}>
                  <div className="help">Motivo</div>
                  <input className="input" value={draft.motivo}
                    onChange={(e) => setDraft({ ...draft, motivo: e.target.value })} />
                </label>

                <label style={{ flex: 1 }}>
                  <div className="help">Procedimiento</div>
                  <input className="input" value={draft.procedimiento}
                    onChange={(e) => setDraft({ ...draft, procedimiento: e.target.value })} />
                </label>

                <label style={{ width: 180 }}>
                  <div className="help">Ingreso (USD)</div>
                  <input className="input" type="number" step="0.01" value={draft.ingreso}
                    onChange={(e) => setDraft({ ...draft, ingreso: e.target.value })} />
                </label>
              </div>

              <label>
                <div className="help">Detalle</div>
                <textarea className="input" rows={4} value={draft.detalle}
                  onChange={(e) => setDraft({ ...draft, detalle: e.target.value })} />
              </label>

              <hr />
              <div className="row">
                <h3 style={{ margin: 0 }}>Fotos</h3>
                <button className="btn btn-primary ml-auto" type="button" onClick={onAgregarFoto}>Agregar foto</button>
              </div>

              {!draft?.id_consulta ? (
                // NUEVA consulta: mostrar fotos en staging
                <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                  {pendingFotos.map((pf, idx) => {
                    const src = pf.previewUrl || ""; // preview directo del archivo elegido
                    const key = pf.path || idx;      // algo estable para la key
                    return (
                      <div key={key} className="card" style={{ width: 160, padding: 8 }}>
                        {src ? (
                          <img
                            src={src}
                            alt=""
                            style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }}
                          />
                        ) : (
                          <div className="help" style={{ width: "100%", height: 110, display: "grid", placeItems: "center" }}>
                            Sin vista previa
                          </div>
                        )}
                        <button
                          className="btn mt-8"
                          type="button"
                          style={{ color: "var(--danger)" }}
                          onClick={() => removePending(idx)}
                        >
                          Quitar
                        </button>
                      </div>
                    );
                  })}
                  {!pendingFotos.length && <div className="help">Sin fotos</div>}
                </div>
              ) : (
                // Consulta existente: mostrar fotos guardadas
                <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                  {fotos.map((f) => (
                    <div key={f.id_foto} className="card" style={{ width: 160, padding: 8 }}>
                      <img
                        src={thumbSrc(f)} // usa fileUrl(ruta_archivo)
                        alt=""
                        style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }}
                      />
                      <button
                        className="btn mt-8"
                        type="button"
                        style={{ color: "var(--danger)" }}
                        onClick={() => onBorrarFoto(f)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  {!fotos.length && <div className="help">Sin fotos</div>}
                </div>
              )}

              <div className="row">
                <button className="btn btn-primary" type="submit">Guardar</button>
                <button className="btn" type="button" onClick={() => { setEditing(false); setDraft(null); }}>Cancelar</button>
              </div>

              {draft?.id_consulta && (
                <>
                  <hr />
                  <div className="row">
                    <h3 style={{ margin: 0 }}>Fotos</h3>
                    <button className="btn btn-primary ml-auto" type="button" onClick={onAgregarFoto}>Agregar foto</button>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                    {fotos.map((f) => (
                      <div key={f.id_foto} className="card" style={{ width: 160, padding: 8 }}>
                        <img
                          src={thumbSrc(f)}
                          alt=""
                          style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }}
                        />
                        <button className="btn mt-8" type="button" style={{ color: "var(--danger)" }} onClick={() => onBorrarFoto(f)}>
                          Quitar
                        </button>
                      </div>
                    ))}
                    {!fotos.length && <div className="help">Sin fotos</div>}
                  </div>
                </>
              )}
            </form>
          )}

          {paciente && !sel && !editing && (
            <div className="help">Selecciona una consulta a la izquierda o crea una nueva.</div>
          )}
        </div>
      </div>
    </div>
  );
}
