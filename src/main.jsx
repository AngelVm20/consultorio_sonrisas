import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import PacientesPage from './features/pacientes/PacientesPage'
import ConsultasPage from './features/consultas/ConsultasPage'
import CajaPage from './features/caja/CajaPage'
import './styles.css'

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { path: '/pacientes', element: <PacientesPage /> },
    { path: '/consultas', element: <ConsultasPage /> }, // <-- aquí
    { path: '/caja', element: <CajaPage /> },
  ]}
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
