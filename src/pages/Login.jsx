import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { LogoSalud } from "../components/Layout";

// Sin campos de usuario ni contraseña: la pantalla de login la provee el
// Login Único para los cinco módulos. Aquí solo hay un botón que redirige.
export default function Login() {
  const auth = useAuth();

  if (auth.isLoading) return <p className="p-6">Cargando...</p>;
  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel de presentación */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 text-white p-12">
        <div className="flex items-center gap-3">
          <LogoSalud className="h-10 w-10 text-white" />
          <span className="text-lg font-semibold">Módulo Salud</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Atención en salud,<br />conectada con todo el sistema.
          </h2>
          <p className="mt-4 text-blue-100 max-w-md">
            Pacientes, citas, turnos, vacunación y expedientes clínicos, integrados con Educación,
            Seguridad, Tributario y Auditoría Social.
          </p>
        </div>
        <p className="text-sm text-blue-200">Red Inteligente de Servicios Digitales · Proyecto integrador</p>
      </div>

      {/* Acceso */}
      <div className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden text-blue-700">
            <LogoSalud className="h-10 w-10" />
            <span className="text-lg font-semibold text-slate-800">Módulo Salud</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Use su cuenta del Login Único. Es la misma para todos los módulos del sistema.
          </p>

          {auth.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              Error: {auth.error.message}
            </p>
          )}

          <button
            onClick={() => auth.signinRedirect()}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 transition shadow-sm"
          >
            Iniciar sesión con el Login Único
          </button>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Será redirigido a la pantalla segura del Login Único y volverá aquí al terminar.
          </p>
        </div>
      </div>
    </div>
  );
}
