import React from 'react'
import { Link, Outlet } from 'react-router-dom'

export default function App(){
  return (
    <div className="container">
      <h1>SONRISAS</h1>
      <nav>
        <Link to="/pacientes">Pacientes</Link>
        <Link to="/consultas">Consultas</Link>
        <Link to="/caja">Caja</Link>
      </nav>
      <hr/>
      <Outlet />
    </div>
  )
}