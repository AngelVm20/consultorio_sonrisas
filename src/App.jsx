import React from 'react'
import { Link, Outlet } from 'react-router-dom'

export default function App(){
  return (
    <div className="p-4">
      <h1>OdontoDesk</h1>
      <nav className="flex gap-3">
        <Link to="/pacientes">Pacientes</Link>
        <Link to="/consultas">Consultas</Link>
        <Link to="/caja">Caja</Link>
      </nav>
      <hr/>
      <Outlet />
    </div>
  )
}
