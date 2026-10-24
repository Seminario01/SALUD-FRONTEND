import { useEffect, useState } from "react";
import client, { mensajeError } from "../api/client";
import { useAvisos } from "../components/Avisos";

// Asignar puestos (Administración, permiso puestos.asignar): da un puesto de Salud a una cuenta
// del Login Único (por ejemplo, a un compañero que entra como ciudadano). Vale solo en este módulo;
// el servidor lo suma a los roles de su cuenta en cada petición. Nadie cambia su propio puesto.
const fecha = (t) => (t ? new Date(t).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" }) : "—");

// Sede donde trabaja cada persona del personal (GET /sedes/personal, PUT /sedes/personal/{sub})
function SedesPersonal() {
  const avisos = useAvisos();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const cargar = () => client.get("/sedes/personal")
    .then((r) => { setDatos(r.data.data); setError(null); })
    .catch((e) => setError(mensajeError(e)));
  useEffect(() => { cargar(); }, []);

  function cambiar(persona, sedeId) {
    setGuardando(persona.usuario_sub);
    client.put(`/sedes/personal/${persona.usuario_sub}`, { sede_id: Number(sedeId) })
      .then((r) => { avisos.exito(r.data.message); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)))
      .finally(() => setGuardando(null));
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Sede del personal</h2>
      {error && <p className="text-sm text-red-600" role="alert">No se pudo cargar: {error}</p>}
      {datos && datos.personal.length === 0 && <p className="text-sm text-slate-500">Nadie por ahora.</p>}
      {datos?.personal.length > 0 && (
        <table className="w-full">
          <thead><tr className="text-left"><th className="p-2">Persona</th><th className="p-2">Puesto</th><th className="p-2">Sede</th></tr></thead>
          <tbody>
            {datos.personal.map((p) => (
              <tr key={p.usuario_sub}>
                <td className="p-2">
                  <span className="font-medium">{p.nombre || p.usuario}</span>
                  <span className="block text-xs text-slate-500">{[p.usuario, p.email].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="p-2 text-sm">{p.puestos.join(", ")}</td>
                <td className="p-2">
                  <select value={p.sede_id ?? ""} disabled={guardando === p.usuario_sub} onChange={(e) => cambiar(p, e.target.value)}
                    aria-label={`Sede de ${p.nombre || p.usuario}`} className="border rounded px-2 py-1.5 text-sm w-full max-w-xs">
                    {datos.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function AsignarPuestos() {
  const avisos = useAvisos();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ usuario_sub: "", rol: "salud:jefatura", nota: "" });
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);

  const cargar = () => client.get("/puestos/asignados")
    .then((r) => { setDatos(r.data.data); setError(null); })
    .catch((e) => setError(mensajeError(e)));
  useEffect(() => { cargar(); }, []);

  function asignar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrorForm(null);
    client.post("/puestos/asignados", { ...form, usuario_sub: form.usuario_sub.trim() })
      .then((r) => { avisos.exito(r.data.message); setForm({ ...form, usuario_sub: "", nota: "" }); cargar(); })
      .catch((err) => setErrorForm(mensajeError(err)))
      .finally(() => setEnviando(false));
  }

  function quitar(p) {
    if (!window.confirm(`¿Quitar el puesto ${p.puesto} a ${p.nombre || p.usuario || p.usuario_sub}?`)) return;
    client.delete(`/puestos/asignados/${p.id}`)
      .then(() => { avisos.exito("Puesto quitado."); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  function cambiarPuesto(p, rol) {
    client.put(`/puestos/asignados/${p.id}`, { rol })
      .then((r) => { avisos.exito(r.data.message); cargar(); })
      .catch((err) => avisos.error(mensajeError(err)));
  }

  function elegir(persona) {
    setForm({ ...form, usuario_sub: persona.usuario_sub });
    setErrorForm(null);
    document.getElementById("form-puesto")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Asignar puestos</h1>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">No se pudo cargar: {error}</p>}

      <form id="form-puesto" onSubmit={asignar} className="bg-white border rounded-lg p-4 grid gap-3 md:grid-cols-[2fr_1fr_1.5fr_auto] md:items-end">
        <label className="text-sm">Código del usuario
          <input value={form.usuario_sub} onChange={(e) => setForm({ ...form, usuario_sub: e.target.value })} required
            placeholder="c493af3e-4609-4955-a1e1-62c03ac52e2c" className="w-full border rounded px-2 py-1.5 font-mono text-xs" />
        </label>
        <label className="text-sm">Puesto
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="w-full border rounded px-2 py-1.5">
            {(datos?.puestos ?? []).map((p) => <option key={p.rol} value={p.rol}>{p.nombre}</option>)}
          </select>
        </label>
        <label className="text-sm">Nota (opcional)
          <input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} maxLength={255}
            placeholder="Compañero del grupo, revisión" className="w-full border rounded px-2 py-1.5" />
        </label>
        <button disabled={enviando || !datos} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-60">
          {enviando ? "Asignando..." : "Asignar"}
        </button>
        {errorForm && <p className="md:col-span-4 text-sm text-red-700" role="alert">{errorForm}</p>}
      </form>

      <section>
        <h2 className="text-lg font-semibold mb-2">Puestos asignados en Salud</h2>
        {datos && datos.asignados.length === 0 && <p className="text-sm text-slate-500">Todavía no hay puestos asignados.</p>}
        {datos?.asignados.length > 0 && (
          <table className="w-full">
            <thead><tr className="text-left"><th className="p-2">Persona</th><th className="p-2">Puesto</th><th className="p-2">Asignado por</th><th className="p-2">Nota</th><th className="p-2" /></tr></thead>
            <tbody>
              {datos.asignados.map((p) => (
                <tr key={p.id}>
                  <td className="p-2">
                    <span className="font-medium">{p.nombre || p.usuario || "Sin nombre todavía"}</span>
                    <span className="block text-xs text-slate-500">{[p.usuario, p.email].filter(Boolean).join(" · ")}</span>
                    <span className="block text-[11px] text-slate-400 font-mono">{p.usuario_sub}</span>
                  </td>
                  <td className="p-2">
                    <select value={p.rol} onChange={(e) => cambiarPuesto(p, e.target.value)} aria-label={`Puesto de ${p.nombre || p.usuario || p.usuario_sub}`}
                      className="border rounded px-2 py-1 text-sm bg-blue-50 text-blue-800">
                      {datos.puestos.map((x) => <option key={x.rol} value={x.rol}>{x.nombre}</option>)}
                    </select>
                  </td>
                  <td className="p-2 text-sm">{p.asignado_por || "—"}<span className="block text-xs text-slate-500">{fecha(p.fecha)}</span></td>
                  <td className="p-2 text-sm text-slate-600">{p.nota || "—"}</td>
                  <td className="p-2 text-right"><button onClick={() => quitar(p)} className="text-sm text-red-700 hover:underline">Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Entraron sin puesto de Salud</h2>
        {datos && datos.recientes.length === 0 && <p className="text-sm text-slate-500">Nadie por ahora.</p>}
        {datos?.recientes.length > 0 && (
          <table className="w-full">
            <thead><tr className="text-left"><th className="p-2">Persona</th><th className="p-2">Último ingreso</th><th className="p-2" /></tr></thead>
            <tbody>
              {datos.recientes.map((u) => (
                <tr key={u.usuario_sub}>
                  <td className="p-2">
                    <span className="font-medium">{u.nombre || u.usuario}</span>
                    <span className="block text-xs text-slate-500">{[u.usuario, u.email].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="p-2 text-sm">{fecha(u.ultimo_acceso)}</td>
                  <td className="p-2 text-right"><button onClick={() => elegir(u)} className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50">Asignar puesto</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <SedesPersonal />
    </div>
  );
}
