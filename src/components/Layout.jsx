import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import useRoles from "../hooks/useRoles";

// Ícono del módulo (cruz médica), dibujado aquí mismo
export function LogoSalud({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.15" />
      <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="currentColor" />
    </svg>
  );
}


export default function Layout() {
  const auth = useAuth();
  const r = useRoles();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const perfil = auth.user?.profile;


  // Cada rol ve solo lo que puede usar (el backend igual valida cada petición)
  const enlaces = [
    { to: "/", texto: r.esPersonal ? "Dashboard" : r.esAuditor ? "Panel de indicadores" : "Mi resumen", ver: true },
    { to: "/pacientes", texto: "Pacientes", ver: r.puede("pacientes.ver") },
    { to: "/citas", texto: r.esPersonal ? "Citas" : "Mis citas", ver: r.puede("citas.ver") || r.esCiudadano },
    { to: "/turnos", texto: "Turnos", ver: r.puede("turnos.ver_cola", "turnos.generar") },
    { to: "/vacunacion", texto: r.esPersonal ? "Vacunación" : "Mi vacunación", ver: r.puede("vacunacion.ver") || r.esCiudadano },
    { to: "/expedientes", texto: r.esPersonal ? "Expedientes" : "Mi expediente", ver: r.puede("expediente.ver") || r.esCiudadano },
    { to: "/recursos", texto: "Recursos", ver: r.puede("recursos.ver") },
    { to: "/integraciones", texto: "Integraciones", ver: r.puede("integraciones.ver") },
  ].filter((e) => e.ver);

  function manejarLogout() {
    // Cierra la sesión también en el Login Único (no solo en esta app).
    auth.signoutRedirect({ id_token_hint: auth.user?.id_token });
  }

  const claseEnlace = ({ isActive }) =>
    `px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
      isActive ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <LogoSalud className="h-8 w-8 text-white" />
            <div className="leading-tight">
              <p className="font-bold">Módulo Salud</p>
              <p className="text-[11px] text-blue-100 hidden sm:block">Red Inteligente de Servicios Digitales</p>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-0.5 ml-2">
            {enlaces.map((e) => (
              <NavLink key={e.to} to={e.to} end={e.to === "/"} className={claseEnlace}>
                {e.texto}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden xl:flex items-center gap-3">
            <div className="text-right leading-tight whitespace-nowrap">
              <p className="text-sm font-medium">{perfil?.name || perfil?.preferred_username}</p>
              {r.puesto && (
                <span className="text-[11px] bg-white/15 rounded-full px-2 py-0.5 whitespace-nowrap">{r.puesto}</span>
              )}
            </div>
            <button
              onClick={manejarLogout}
              className="text-sm whitespace-nowrap border border-white/30 rounded-lg px-3 py-1.5 hover:bg-white/10 transition"
            >
              Cerrar sesión
            </button>
          </div>

          {/* Celular / tableta */}
          <button
            className="ml-auto xl:hidden p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuAbierto && (
          <div className="xl:hidden border-t border-white/15 px-4 pb-4">
            <nav className="flex flex-col gap-1 pt-3">
              {enlaces.map((e) => (
                <NavLink key={e.to} to={e.to} end={e.to === "/"} className={claseEnlace} onClick={() => setMenuAbierto(false)}>
                  {e.texto}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/15">
              <span className="text-sm">
                {perfil?.name || perfil?.preferred_username}
                {r.puesto && <span className="text-blue-100"> · {r.puesto}</span>}
              </span>
              <button onClick={manejarLogout} className="text-sm border border-white/30 rounded-lg px-3 py-1.5">
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto sm:px-2">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Módulo de Salud · Red Inteligente de Servicios Digitales · Autenticación con el Login Único
      </footer>
    </div>
  );
}
