import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import PacientesPage from './features/pacientes/PacientesPage'

const ConsultasStub = () => <div>Consultas (pendiente)</div>
const CajaStub = () => <div>Caja (pendiente)</div>

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { path: '/pacientes', element: <PacientesPage /> },
    { path: '/consultas', element: <ConsultasStub /> },
    { path: '/caja', element: <CajaStub /> },
  ]}
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
