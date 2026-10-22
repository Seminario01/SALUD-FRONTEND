import { createElement, lazy } from "react";
import { ErrorDeCarga } from "../components/CargandoPantalla";

// Carga una pantalla recién cuando se abre (React.lazy). nombre: la exportación, si no es la default.
//
// Después de actualizar el servidor, una pestaña que ya estaba abierta pide archivos viejos que ya
// no existen: entonces se recarga UNA vez para bajar la versión nueva. Si aun así falla (sin
// internet), se muestra "No se pudo abrir esta pantalla" en vez de dejar la página en blanco.
const CLAVE = "salud.recargada";

const leer = () => { try { return sessionStorage.getItem(CLAVE); } catch { return null; } };
const escribir = (v) => { try { if (v) sessionStorage.setItem(CLAVE, v); else sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };

export function cargar(importar, nombre = "default") {
  return lazy(() => importar().then(
    (modulo) => {
      escribir(null);
      return { default: modulo[nombre] };
    },
    () => {
      if (!leer()) {
        escribir("1");
        window.location.reload();
        return new Promise(() => {});           // la página se está recargando
      }
      return { default: () => createElement(ErrorDeCarga) };
    },
  ));
}
