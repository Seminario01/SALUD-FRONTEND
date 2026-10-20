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
import Agenda from "./pages/Agenda";
import VerificarReceta from "./pages/VerificarReceta";
import VerificarConstancia from "./pages/VerificarConstancia";
import { ConstanciaImpresa, ConstanciaVacunacion, EstadoCuentaImpreso, LaboratorioImpreso, RecetaImpresa, ResumenPaciente } from "./pages/Documentos";
import Laboratorio from "./pages/Laboratorio";
import ListaEspera from "./pages/ListaEspera";

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
        {/* Pública: otra farmacia verifica la receta al escanear su QR */}
        <Route path="/verificar/:codigo" element={<VerificarReceta />} />
        <Route path="/verificar/constancia/:codigo" element={<VerificarConstancia />} />
        {/* Pantalla de sala de espera: a pantalla completa, sin el menú */}
        <Route path="/turnos/pantalla" element={<ProtectedRoute><PantallaTurnos /></ProtectedRoute>} />
        {/* Documentos para imprimir o guardar como PDF: sin el menú */}
        <Route path="/imprimir/receta/:id" element={<ProtectedRoute><RecetaImpresa /></ProtectedRoute>} />
        <Route path="/imprimir/constancia/:id" element={<ProtectedRoute><ConstanciaImpresa /></ProtectedRoute>} />
        <Route path="/imprimir/laboratorio/:id" element={<ProtectedRoute><LaboratorioImpreso /></ProtectedRoute>} />
        <Route path="/imprimir/cuenta/:id" element={<ProtectedRoute><EstadoCuentaImpreso /></ProtectedRoute>} />
        <Route path="/imprimir/vacunacion/:id" element={<ProtectedRoute><ConstanciaVacunacion /></ProtectedRoute>} />
        <Route path="/imprimir/resumen/:id" element={<ProtectedRoute><ResumenPaciente /></ProtectedRoute>} />
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
          <Route path="/citas/lista-espera" element={<ListaEspera />} />
          <Route path="/citas/agenda" element={<Agenda />} />
          <Route path="/citas/:id" element={<DetalleCita />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/recursos" element={<Recursos />} />
          <Route path="/vacunacion" element={<Vacunacion />} />
          <Route path="/expedientes" element={<Expedientes />} />
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/laboratorio" element={<Laboratorio />} />
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
