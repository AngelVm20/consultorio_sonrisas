import React from 'react'
import { Link, Outlet } from 'react-router-dom'

export default function App(){
  return (
    <div className="container">
      <h1>SONRISAS</h1>
      <nav>
        <Link to="/pacientes">PACIENTES</Link>
        <Link to="/consultas">CONSULTAS</Link>
        <Link to="/caja">CAJA</Link>
      </nav>
      <hr/>
      <Outlet />
    </div>
  )
}