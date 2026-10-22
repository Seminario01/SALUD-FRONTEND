// Lo que se ve mientras se baja una pantalla (utils/cargarPantalla.js) o si no se pudo bajar.
export function CargandoPantalla() {
  return (
    <div className="p-6 flex items-center gap-3 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" aria-hidden="true" />
      Abriendo la pantalla...
    </div>
  );
}

export function ErrorDeCarga() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-semibold">No se pudo abrir esta pantalla</h1>
      <p className="text-sm text-slate-600 mt-1">Revise su conexión a internet e intente de nuevo.</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
        Intentar de nuevo
      </button>
    </div>
  );
}
