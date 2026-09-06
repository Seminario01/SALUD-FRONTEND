import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pacientes from "./pages/Pacientes";
import Citas from "./pages/Citas";
import Turnos from "./pages/Turnos";
import Recursos from "./pages/Recursos";
import Vacunacion from "./pages/Vacunacion";
import Expedientes from "./pages/Expedientes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/turnos" element={<Turnos />} />
          <Route path="/recursos" element={<Recursos />} />
          <Route path="/vacunacion" element={<Vacunacion />} />
          <Route path="/expedientes" element={<Expedientes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}