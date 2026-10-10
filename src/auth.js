// Configuración del Login Único (Keycloak) con react-oidc-context.
//
// Reglas de la guía "Cómo consumir el Login Único":
//  - La app NO tiene pantalla de usuario/contraseña: redirige al Login Único.
//  - Flujo Authorization Code + PKCE (lo activa la librería sola con response_type "code").
//  - Al backend se envía el ACCESS token, nunca el id_token.
//  - El issuer cambia cada día: va en el .env.local (VITE_AUTH_URL), nunca en el código.
import { WebStorageStateStore, User } from "oidc-client-ts";

// Prioridad: config en tiempo de ejecución (public/config.js, lo genera el
// contenedor al arrancar) y, si no existe, las variables VITE_* del .env.local.
const runtime = window.__SALUD_CONFIG__ || {};
export const AUTH_URL = runtime.AUTH_URL || import.meta.env.VITE_AUTH_URL; // <URL_DEL_DIA>/realms/rsd
export const CLIENT_ID = runtime.CLIENT_ID || import.meta.env.VITE_CLIENT_ID || "salud-web";

export const oidcConfig = {
  authority: AUTH_URL,
  client_id: CLIENT_ID,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: true, // renueva el token (dura 5 minutos) antes de que venza
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Quita ?code=...&state=... de la barra de direcciones después del login.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

// Lee el usuario guardado por oidc-client-ts. Se usa fuera de React
// (por ejemplo en el interceptor de axios), donde no existe useAuth().
function usuarioGuardado() {
  const datos = sessionStorage.getItem(`oidc.user:${AUTH_URL}:${CLIENT_ID}`);
  return datos ? User.fromStorageString(datos) : null;
}

export function obtenerAccessToken() {
  return usuarioGuardado()?.access_token ?? null;
}

// Roles del usuario (vienen en realm_access.roles del access token).
export function rolesDe(user) {
  const token = user?.access_token;
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

export const ROLES = {
  MEDICO: "salud:medico",
  ADMIN: "salud:admin",
  CIUDADANO: "ciudadano",
};
