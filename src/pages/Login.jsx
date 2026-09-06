import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { iniciarSesion } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function manejarLoginReal(e) {
    e.preventDefault();
    // TODO: reemplazar esto cuando exista el User Pool de Cognito.
    // Aquí iría la llamada real, por ejemplo con Amplify Auth o el SDK de Cognito:
    //   const resultado = await Auth.signIn(email, password);
    //   iniciarSesion(resultado.getAccessToken().getJwtToken());
    alert("El login con Cognito todavía no está disponible (falta el User Pool).");
  }

  function simularLogin() {
    // Genera un token falso solo para poder navegar la app en desarrollo.
    // El backend lo va a rechazar como token inválido (no viene firmado por
    // Cognito), pero permite probar la navegación, rutas protegidas y logout.
    iniciarSesion("token-simulado-desarrollo");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-lg shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Módulo Salud</h1>
        <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>

        <form onSubmit={manejarLoginReal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="usuario@universidad.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800"
          >
            Iniciar sesión
          </button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-400 mb-2">
            Herramienta de desarrollo — mientras no exista el User Pool de Cognito:
          </p>
          <button
            onClick={simularLogin}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 text-sm"
          >
            Simular login (solo desarrollo)
          </button>
        </div>
      </div>
    </div>
  );
}
