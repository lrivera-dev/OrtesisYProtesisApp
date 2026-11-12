import { LISTA_ESTADOS, esPendiente } from "./estados.js";

function normalizar(texto) {
    return (texto ?? "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

export function aMilisegundos(fecha) {
    if (!fecha) return 0;
    if (typeof fecha.toMillis === "function") return fecha.toMillis();
    if (fecha instanceof Date) return fecha.getTime();
    return Number(fecha) || 0;
}

export function filtrarSolicitudes(solicitudes, { texto = "", estado = "todos" } = {}) {
    const busqueda = normalizar(texto.trim());
    return solicitudes.filter((s) => {
        const coincideEstado = estado === "todos" || s.estado === estado;
        if (!coincideEstado) return false;
        if (!busqueda) return true;
        const campos = [s.clienteNombre, s.clienteEmail, s.productoNombre, s.descripcion, s.preferenciaHorario, s.codigo];
        return campos.some((campo) => normalizar(campo).includes(busqueda));
    });
}

export function ordenarPorFecha(solicitudes, orden = "recientes") {
    const copia = [...solicitudes];
    copia.sort((a, b) => {
        const diferencia = aMilisegundos(b.creadoEn) - aMilisegundos(a.creadoEn);
        return orden === "antiguas" ? -diferencia : diferencia;
    });
    return copia;
}

export function contarPorEstado(solicitudes) {
    const conteo = Object.fromEntries(LISTA_ESTADOS.map((estado) => [estado, 0]));
    for (const s of solicitudes) {
        if (s.estado in conteo) conteo[s.estado] += 1;
    }
    return conteo;
}

export function contarPendientes(solicitudes) {
    return solicitudes.filter((s) => esPendiente(s.estado)).length;
}

export function formatearFecha(fecha) {
    const ms = aMilisegundos(fecha);
    if (!ms) return "Guardando…";
    return new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
}
