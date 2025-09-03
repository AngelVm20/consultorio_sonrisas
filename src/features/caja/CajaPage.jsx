import React, { useEffect, useMemo, useState } from "react";
import { agregarMovimiento, borrarMovimiento, listarMovimientos, resumenSemanas } from "./caja.api";

function pad(n){ return String(n).padStart(2,'0'); }
function formatISO(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}
function mondayOf(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0=domingo, 1=lunes
  const diff = (day === 0 ? -6 : 1 - day);
  dt.setDate(dt.getDate() + diff);
  return dt;
}
function sundayOf(d = new Date()) {
  const mon = mondayOf(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return sun;
}

function toCurrency(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function arrToCSV(rows, headers) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = headers.map(h => esc(h.label)).join(",");
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(",")).join("\n");
  return head + "\n" + body;
}

export default function CajaPage() {
  const [fi, setFi] = useState(formatISO(mondayOf(new Date())));
  const [ff, setFf] = useState(formatISO(sundayOf(new Date())));
  const [movs, setMovs] = useState([]);
  const [weeks, setWeeks] = useState([]);

  // formulario rápido
  const [fecha, setFecha] = useState(formatISO(new Date()));
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  async function load() {
    const m = await listarMovimientos(fi, ff);
    setMovs(m);
    const w = await resumenSemanas(fi, ff);
    setWeeks(w);
  }
  useEffect(() => { load(); }, [fi, ff]);

  const totales = useMemo(() => {
    let ingresos = 0, gastos = 0;
    for (const r of movs) {
      if (r.tipo === "INGRESO") ingresos += Number(r.monto || 0);
      if (r.tipo === "GASTO") gastos  += Number(r.monto || 0);
    }
    return { ingresos, gastos, saldo: ingresos - gastos };
  }, [movs]);

  async function add(tipo) {
    if (!monto || Number(monto) <= 0) { alert("Monto inválido"); return; }
    await agregarMovimiento({ fecha, tipo, monto, nota });
    setMonto(""); setNota("");
    await load();
  }

  async function del(id_mov, fuente) {
    if (fuente === "CONSULTA" && !confirm("Este movimiento viene de una consulta. ¿Eliminar de todos modos?")) return;
    await borrarMovimiento(id_mov);
    await load();
  }

  function exportMovsCSV() {
    const headers = [
      { key: "fecha", label: "Fecha" },
      { key: "tipo", label: "Tipo" },
      { key: "monto", label: "Monto" },
      { key: "fuente", label: "Fuente" },
      { key: "id_paciente", label: "Id Paciente" },
      { key: "id_consulta", label: "Id Consulta" },
      { key: "nota", label: "Nota" },
    ];
    const csv = arrToCSV(movs, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `movimientos_${fi}_a_${ff}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportWeeksCSV() {
    const headers = [
      { key: "semana_iso", label: "Semana" },
      { key: "desde", label: "Desde" },
      { key: "hasta", label: "Hasta" },
      { key: "ingresos", label: "Ingresos" },
      { key: "gastos", label: "Gastos" },
      { key: "saldo", label: "Saldo" },
    ];
    const csv = arrToCSV(weeks, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `resumen_semanal_${fi}_a_${ff}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 grid" style={{ gap: 12 }}>
      <h2>Caja</h2>

      {/* Filtro por rango */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Desde <input type="date" value={fi} onChange={(e)=>setFi(e.target.value)} /></label>
        <label>Hasta <input type="date" value={ff} onChange={(e)=>setFf(e.target.value)} /></label>
        <button onClick={exportMovsCSV}>Exportar Movimientos (CSV)</button>
        <button onClick={exportWeeksCSV}>Exportar Resumen (CSV)</button>
        <div style={{ marginLeft: "auto" }}>
          <b>Ingresos:</b> ${toCurrency(totales.ingresos)} &nbsp;
          <b>Gastos:</b> ${toCurrency(totales.gastos)} &nbsp;
          <b>Saldo:</b> ${toCurrency(totales.saldo)}
        </div>
      </div>

      {/* Alta rápida */}
      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 12 }}>
        <h3>Agregar movimiento</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>Fecha <input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} /></label>
          <label>Monto (USD) <input type="number" step="0.01" value={monto} onChange={(e)=>setMonto(e.target.value)} /></label>
          <label style={{ flex: 1 }}>Nota <input style={{ width: "100%" }} value={nota} onChange={(e)=>setNota(e.target.value)} /></label>
          <button onClick={()=>add("INGRESO")}>+ Ingreso</button>
          <button onClick={()=>add("GASTO")}>+ Gasto</button>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 12, overflow: "auto" }}>
        <h3>Movimientos</h3>
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th style={{ textAlign: "right" }}>Monto</th>
              <th>Fuente</th>
              <th>Id Pac.</th>
              <th>Id Cons.</th>
              <th>Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {movs.map(m => (
              <tr key={m.id_mov}>
                <td>{m.fecha}</td>
                <td>{m.tipo}</td>
                <td style={{ textAlign: "right" }}>${toCurrency(m.monto)}</td>
                <td>{m.fuente || "-"}</td>
                <td>{m.id_paciente || "-"}</td>
                <td>{m.id_consulta || "-"}</td>
                <td>{m.nota || "-"}</td>
                <td>
                  <button onClick={()=>del(m.id_mov, m.fuente)} style={{ color: "#a00" }}>Borrar</button>
                </td>
              </tr>
            ))}
            {movs.length === 0 && (
              <tr><td colSpan={8} style={{ color: "#666", textAlign: "center" }}>Sin movimientos en el rango</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen semanal */}
      <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 12, overflow: "auto" }}>
        <h3>Resumen por semana</h3>
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th style={{ textAlign: "right" }}>Ingresos</th>
              <th style={{ textAlign: "right" }}>Gastos</th>
              <th style={{ textAlign: "right" }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map(w => (
              <tr key={w.semana_iso}>
                <td>{w.semana_iso}</td>
                <td>{w.desde}</td>
                <td>{w.hasta}</td>
                <td style={{ textAlign: "right" }}>${toCurrency(w.ingresos)}</td>
                <td style={{ textAlign: "right" }}>${toCurrency(w.gastos)}</td>
                <td style={{ textAlign: "right" }}>${toCurrency(w.saldo)}</td>
              </tr>
            ))}
            {weeks.length === 0 && (
              <tr><td colSpan={6} style={{ color: "#666", textAlign: "center" }}>Sin semanas en el rango</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
