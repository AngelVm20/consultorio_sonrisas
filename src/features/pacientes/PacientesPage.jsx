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
    <div className="p-4 grid gap-4">
      <h2>Pacientes</h2>
      <div>
        <input placeholder="Buscar (apellido/cedula)" value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={()=>setEdit(empty())}>Nuevo</button>
      </div>

      <table border={1} cellPadding={6}>
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
              <td>
                <button onClick={()=>setEdit(p)}>Editar</button>
                <button onClick={async()=>{ if(confirm('¿Borrar?')) { await borrarPaciente(p.id_paciente); load(); } }}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {edit && (
        <form onSubmit={onSubmit} className="grid gap-2 border p-3">
          <h3>{edit.id_paciente? 'Editar paciente' : 'Nuevo paciente'}</h3>
          <input required placeholder="Nombres" value={edit.nombres}
                 onChange={e=>setEdit({...edit, nombres: e.target.value})} />
          <input required placeholder="Apellidos" value={edit.apellidos}
                 onChange={e=>setEdit({...edit, apellidos: e.target.value})} />
          <input placeholder="Cédula" value={edit.cedula ?? ''}
                 onChange={e=>setEdit({...edit, cedula: e.target.value})} />
          <input placeholder="Teléfono" value={edit.telefono ?? ''}
                 onChange={e=>setEdit({...edit, telefono: e.target.value})} />
          <input type="date" placeholder="Fecha nacimiento" value={edit.fecha_nacimiento ?? ''}
                 onChange={e=>setEdit({...edit, fecha_nacimiento: e.target.value})} />
          <input placeholder="Dirección" value={edit.direccion ?? ''}
                 onChange={e=>setEdit({...edit, direccion: e.target.value})} />
          <div className="flex gap-2">
            <button type="submit">Guardar</button>
            <button type="button" onClick={()=>setEdit(null)}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}
