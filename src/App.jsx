import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Pantalla de sala de espera: a pantalla completa, sin el menú */}
        <Route path="/turnos/pantalla" element={<ProtectedRoute><PantallaTurnos /></ProtectedRoute>} />
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
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/recursos" element={<Recursos />} />
          <Route path="/vacunacion" element={<Vacunacion />} />
          <Route path="/expedientes" element={<Expedientes />} />
          <Route path="/recetas" element={<Recetas />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/hospitalizacion" element={<Hospitalizacion />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/integraciones" element={<Integraciones />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
