import { useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useLocation } from "react-router-dom";
import { anotarSalida, CLAVE_USO, leerSalida, MINUTOS_SIN_USO, SEGUNDOS_AVISO } from "../utils/sesion";
import { recordarDestino } from "../utils/volver";

// Cuida la sesión en las pantallas del sistema (va dentro de Layout):
//  1) Inactividad: el token se renueva solo cada 5 minutos, así que una computadora olvidada
//     quedaría con la sesión abierta. Tras MINUTOS_SIN_USO sin tocar nada avisa con una cuenta
//     regresiva y, si nadie responde, cierra la sesión (también en el Login Único).
//     Se cuenta el uso de TODAS las pestañas del módulo (localStorage), para no cerrar la sesión
//     de alguien que está trabajando en otra pestaña.
//  2) Si el Login Único ya no renueva la sesión (se cerró en otra pestaña o venció), lo dice
//     claramente y ofrece volver a entrar a la misma pantalla.
const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"];

const ahora = () => Date.now();

// Se detiene la renovación antes de salir: una renovación a medias podría volver a guardar
// la sesión después de borrarla
function cerrarSesion(auth) {
  const idToken = auth.user?.id_token;
  auth.stopSilentRenew();
  auth.signoutRedirect({ id_token_hint: idToken });
}
function ultimoUso(local) {
  let otro = 0;
  try { otro = Number(localStorage.getItem(CLAVE_USO)) || 0; } catch { /* sin almacenamiento */ }
  return Math.max(local, otro);
}

export default function AvisoSesion() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const [restante, setRestante] = useState(null);   // segundos para cerrar; null = sin aviso
  const [terminada, setTerminada] = useState(false);
  const uso = useRef(ahora());
  const avisando = useRef(false);
  const cerrando = useRef(false);

  // De vuelta del cierre por inactividad: si quedó algo de la sesión, se borra (y Login lo explica)
  useEffect(() => {
    if (leerSalida()) auth.removeUser();
  }, [auth]);

  // Cada movimiento, tecla o toque cuenta como uso (mientras no se esté mostrando el aviso)
  useEffect(() => {
    let guardado = 0;
    const marcar = () => {
      if (avisando.current) return;
      uso.current = ahora();
      if (uso.current - guardado > 5000) {
        guardado = uso.current;
        try { localStorage.setItem(CLAVE_USO, String(uso.current)); } catch { /* sin almacenamiento */ }
      }
    };
    marcar();
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => EVENTOS.forEach((e) => window.removeEventListener(e, marcar));
  }, []);

  useEffect(() => {
    const revisar = setInterval(() => {
      if (cerrando.current) return;
      const falta = MINUTOS_SIN_USO * 60 + SEGUNDOS_AVISO - (ahora() - ultimoUso(uso.current)) / 1000;
      if (falta <= 0) {
        cerrando.current = true;
        anotarSalida("inactividad");
        cerrarSesion(auth);
      } else if (falta <= SEGUNDOS_AVISO) {
        avisando.current = true;
        setRestante(Math.ceil(falta));
      } else if (avisando.current) {
        avisando.current = false;                   // se siguió trabajando en otra pestaña
        setRestante(null);
      }
    }, 1000);
    return () => clearInterval(revisar);
  }, [auth]);

  // El Login Único no quiso renovar: la sesión ya no existe allá
  useEffect(() => {
    const fallo = () => setTerminada(true);
    const quitarError = auth.events.addSilentRenewError(fallo);
    const quitarCierre = auth.events.addUserSignedOut(fallo);
    return () => { quitarError(); quitarCierre(); };
  }, [auth.events]);

  function seguir() {
    avisando.current = false;
    uso.current = ahora();
    try { localStorage.setItem(CLAVE_USO, String(uso.current)); } catch { /* sin almacenamiento */ }
    setRestante(null);
  }

  function salir() {
    cerrando.current = true;
    cerrarSesion(auth);
  }

  async function volverAEntrar() {
    recordarDestino(pathname + search);
    await auth.removeUser();
    auth.signinRedirect();
  }

  if (!terminada && restante === null) return null;
  const minutos = Math.floor((restante ?? 0) / 60);
  const segundos = String((restante ?? 0) % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden" role="alertdialog"
      aria-modal="true" aria-labelledby="sesion-titulo" aria-describedby="sesion-texto">
      <div className="absolute inset-0 bg-slate-900/50" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white text-slate-800 shadow-xl p-6">
        {terminada ? (
          <>
            <h2 id="sesion-titulo" className="text-lg font-bold">Su sesión terminó</h2>
            <p id="sesion-texto" className="text-sm text-slate-600 mt-2">
              El Login Único cerró la sesión (venció o se cerró en otra pestaña). Vuelva a entrar para
              seguir; regresará a esta misma pantalla.
            </p>
            <button onClick={volverAEntrar} autoFocus
              className="mt-5 w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800">
              Volver a entrar
            </button>
          </>
        ) : (
          <>
            <h2 id="sesion-titulo" className="text-lg font-bold">¿Sigue ahí?</h2>
            <p id="sesion-texto" className="text-sm text-slate-600 mt-2">
              Por seguridad de los datos de los pacientes, la sesión se cerrará por inactividad en
            </p>
            <p className="text-4xl font-bold tabular-nums text-center my-4 text-amber-700" aria-live="polite">
              {minutos}:{segundos}
            </p>
            <p className="text-xs text-slate-500">Lo que esté escribiendo y no haya guardado se perderá al cerrar.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={seguir} autoFocus
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800">
                Seguir trabajando
              </button>
              <button onClick={salir} className="px-4 py-2.5 rounded-lg border text-sm hover:bg-slate-50">
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
