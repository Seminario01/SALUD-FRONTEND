import { Navigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

// Sin campos de usuario ni contraseña: la pantalla de login la provee el
// Login Único para los cinco módulos. Aquí solo hay un botón que redirige.
export default function Login() {
  const auth = useAuth();

  if (auth.isLoading) return <p className="p-6">Cargando...</p>;
  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-lg shadow-sm p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Módulo Salud</h1>
        <p className="text-sm text-gray-500 mb-6">Red Inteligente de Servicios Digitales</p>

        {auth.error && (
          <p className="text-sm text-red-600 mb-4">Error: {auth.error.message}</p>
        )}

        <button
          onClick={() => auth.signinRedirect()}
          className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
        >
          Iniciar sesión con el Login Único
        </button>
      </div>
    </div>
  );
}
