import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { tomarDestino } from "./utils/volver";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { CargandoPantalla } from "./components/CargandoPantalla";
import { cargar } from "./utils/cargarPantalla";
import Login from "./pages/Login";

// Cada pantalla se baja recién cuando se abre (así la app abre más rápido, sobre todo en celular)
const Dashboard = cargar(() => import("./pages/Dashboard"));
const Pacientes = cargar(() => import("./pages/Pacientes"));
const FichaPaciente = cargar(() => import("./pages/FichaPaciente"));
const Citas = cargar(() => import("./pages/Citas"));
const Turnos = cargar(() => import("./pages/Turnos"));
const PantallaTurnos = cargar(() => import("./pages/PantallaTurnos"));
const Recursos = cargar(() => import("./pages/Recursos"));
const Vacunacion = cargar(() => import("./pages/Vacunacion"));
const Expedientes = cargar(() => import("./pages/Expedientes"));
const Integraciones = cargar(() => import("./pages/Integraciones"));
const Recetas = cargar(() => import("./pages/Recetas"));
const Inventario = cargar(() => import("./pages/Inventario"));
const Hospitalizacion = cargar(() => import("./pages/Hospitalizacion"));
const Caja = cargar(() => import("./pages/Caja"));
const NoEncontrado = cargar(() => import("./pages/NoEncontrado"));
const Bitacora = cargar(() => import("./pages/Bitacora"));
const DetalleCita = cargar(() => import("./pages/DetalleCita"));
const Recordatorios = cargar(() => import("./pages/Recordatorios"));
const Agenda = cargar(() => import("./pages/Agenda"));
const VerificarReceta = cargar(() => import("./pages/VerificarReceta"));
const VerificarConstancia = cargar(() => import("./pages/VerificarConstancia"));
const ConstanciaImpresa = cargar(() => import("./pages/Documentos"), "ConstanciaImpresa");
const ConstanciaVacunacion = cargar(() => import("./pages/Documentos"), "ConstanciaVacunacion");
const EstadoCuentaImpreso = cargar(() => import("./pages/Documentos"), "EstadoCuentaImpreso");
const LaboratorioImpreso = cargar(() => import("./pages/Documentos"), "LaboratorioImpreso");
const RecetaImpresa = cargar(() => import("./pages/Documentos"), "RecetaImpresa");
const ResumenPaciente = cargar(() => import("./pages/Documentos"), "ResumenPaciente");
const Laboratorio = cargar(() => import("./pages/Laboratorio"));
const ListaEspera = cargar(() => import("./pages/ListaEspera"));
const Vigilancia = cargar(() => import("./pages/Vigilancia"));
const CompletarResidencia = cargar(() => import("./pages/CompletarResidencia"));
const Permisos = cargar(() => import("./pages/Permisos"));
const AsignarPuestos = cargar(() => import("./pages/AsignarPuestos"));

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
      <Suspense fallback={<CargandoPantalla />}>
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
          <Route path="/pacientes/residencia" element={<CompletarResidencia />} />
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
          <Route path="/vigilancia" element={<Vigilancia />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/hospitalizacion" element={<Hospitalizacion />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/integraciones" element={<Integraciones />} />
          <Route path="/bitacora" element={<Bitacora />} />
          <Route path="/permisos" element={<Permisos />} />
          <Route path="/puestos" element={<AsignarPuestos />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
