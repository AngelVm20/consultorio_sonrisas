import React, { useEffect, useState } from 'react'
import { listarPacientes, crearPaciente, actualizarPaciente, borrarPaciente } from './pacientes.api'

export default function PacientesPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)

  async function load() {
    const data = await listarPacientes(q)
    setItems(data)
  }
  useEffect(() => { load() }, [q])

  function empty() {
    return { nombres: '', apellidos: '', cedula: '', telefono: '', fecha_nacimiento: '', direccion: '' }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!edit) return
    if (edit.id_paciente) await actualizarPaciente(edit.id_paciente, edit)
    else await crearPaciente(edit)
    setEdit(null)
    await load()
  }

  return (
    <div className="grid gap-8">
      <h2>Pacientes</h2>

      <div className="card">
        <div className="row">
          <input className="input" placeholder="Buscar (apellido/cedula)" value={q} onChange={e=>setQ(e.target.value)} style={{maxWidth:360}}/>
          <button className="btn btn-primary" onClick={()=>setEdit(empty())}>Nuevo</button>
        </div>

        <div className="mt-12">
          <table className="table">
            <thead>
              <tr>
                <th>Apellidos</th><th>Nombres</th><th>Cédula</th><th>Teléfono</th><th>F.Nac.</th><th>Dirección</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p=> (
                <tr key={p.id_paciente}>
                  <td>{p.apellidos}</td>
                  <td>{p.nombres}</td>
                  <td>{p.cedula}</td>
                  <td>{p.telefono}</td>
                  <td>{p.fecha_nacimiento}</td>
                  <td>{p.direccion}</td>
                  <td className="row">
                    <button className="btn" onClick={()=>setEdit(p)}>Editar</button>
                    <button className="btn" style={{color:'var(--danger)'}}
                      onClick={async()=>{ if(confirm('¿Borrar?')) { await borrarPaciente(p.id_paciente); load(); } }}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td colSpan={7} className="help">No hay resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <form onSubmit={onSubmit} className="card">
          <h3>{edit.id_paciente? 'Editar paciente' : 'Nuevo paciente'}</h3>
          <div className="row">
            <input className="input" required placeholder="Nombres" value={edit.nombres}
                   onChange={e=>setEdit({...edit, nombres: e.target.value})} style={{maxWidth:260}}/>
            <input className="input" required placeholder="Apellidos" value={edit.apellidos}
                   onChange={e=>setEdit({...edit, apellidos: e.target.value})} style={{maxWidth:260}}/>
            <input className="input" placeholder="Cédula" value={edit.cedula ?? ''}
                   onChange={e=>setEdit({...edit, cedula: e.target.value})} style={{maxWidth:180}}/>
            <input className="input" placeholder="Teléfono" value={edit.telefono ?? ''}
                   onChange={e=>setEdit({...edit, telefono: e.target.value})} style={{maxWidth:180}}/>
            <input className="input" type="date" value={edit.fecha_nacimiento ?? ''}
                   onChange={e=>setEdit({...edit, fecha_nacimiento: e.target.value})} style={{maxWidth:190}}/>
          </div>
          <div className="row mt-12">
            <input className="input" placeholder="Dirección" value={edit.direccion ?? ''}
                   onChange={e=>setEdit({...edit, direccion: e.target.value})}/>
          </div>
          <div className="row mt-12">
            <button className="btn btn-primary" type="submit">Guardar</button>
            <button className="btn" type="button" onClick={()=>setEdit(null)}>Cancelar</button>
            <span className="help ml-auto">Los cambios se guardan en la base local</span>
          </div>
        </form>
      )}
    </div>
  )
}
