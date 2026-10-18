import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { tomarDestino } from "./utils/volver";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import FichaPaciente from "./pages/FichaPaciente";
import Citas from "./pages/Citas";
import Turnos from "./pages/Turnos";
import PantallaTurnos from "./pages/PantallaTurnos";
import Recursos from "./pages/Recursos";
import Vacunacion from "./pages/Vacunacion";
import Expedientes from "./pages/Expedientes";
import Integraciones from "./pages/Integraciones";
import Recetas from "./pages/Recetas";
import Inventario from "./pages/Inventario";
import Hospitalizacion from "./pages/Hospitalizacion";
import Caja from "./pages/Caja";
import NoEncontrado from "./pages/NoEncontrado";
import Bitacora from "./pages/Bitacora";
import DetalleCita from "./pages/DetalleCita";
import Recordatorios from "./pages/Recordatorios";
import { ConstanciaVacunacion, EstadoCuentaImpreso, RecetaImpresa } from "./pages/Documentos";

// Al regresar del Login Único se vuelve a la página que se había pedido (receta, ficha, etc.)
function VolverTrasLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const destino = tomarDestino();
    if (destino) navigate(destino, { replace: true });
  }, [auth.isAuthenticated, navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <VolverTrasLogin />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Pantalla de sala de espera: a pantalla completa, sin el menú */}
        <Route path="/turnos/pantalla" element={<ProtectedRoute><PantallaTurnos /></ProtectedRoute>} />
        {/* Documentos para imprimir o guardar como PDF: sin el menú */}
        <Route path="/imprimir/receta/:id" element={<ProtectedRoute><RecetaImpresa /></ProtectedRoute>} />
        <Route path="/imprimir/cuenta/:id" element={<ProtectedRoute><EstadoCuentaImpreso /></ProtectedRoute>} />
        <Route path="/imprimir/vacunacion/:id" element={<ProtectedRoute><ConstanciaVacunacion /></ProtectedRoute>} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/pacientes/:id" element={<FichaPaciente />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/citas/recordatorios" element={<Recordatorios />} />
          <Route path="/citas/:id" element={<DetalleCita />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/recursos" element={<Recursos />} />
          <Route path="/vacunacion" element={<Vacunacion />} />
          <Route path="/expedientes" element={<Expedientes />} />
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/hospitalizacion" element={<Hospitalizacion />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/integraciones" element={<Integraciones />} />
          <Route path="/bitacora" element={<Bitacora />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
