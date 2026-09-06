// Helper centralizado para manejar la sesión del usuario.
// Hoy el token puede ser uno "simulado" (botón de desarrollo) o, en el futuro,
// el token JWT real que devuelva Cognito tras un login válido.

const TOKEN_KEY = "token";

export function iniciarSesion(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
}

export function estaAutenticado() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}
