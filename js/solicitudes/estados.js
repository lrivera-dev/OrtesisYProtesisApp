// Estados sencillos del proceso de coordinación de una evaluación.

export const ESTADOS = Object.freeze({
    PENDIENTE: "Pendiente",
    PROPUESTA_ENVIADA: "Propuesta enviada",
    CITA_CONFIRMADA: "Cita confirmada",
    ATENDIDA: "Atendida",
    CANCELADA: "Cancelada"
});

export const LISTA_ESTADOS = [
    ESTADOS.PENDIENTE,
    ESTADOS.PROPUESTA_ENVIADA,
    ESTADOS.CITA_CONFIRMADA,
    ESTADOS.ATENDIDA,
    ESTADOS.CANCELADA
];

export const TRANSICIONES_PERSONAL = Object.freeze({
    [ESTADOS.PENDIENTE]: [ESTADOS.PROPUESTA_ENVIADA, ESTADOS.CITA_CONFIRMADA, ESTADOS.CANCELADA],
    [ESTADOS.PROPUESTA_ENVIADA]: [ESTADOS.CANCELADA],
    [ESTADOS.CITA_CONFIRMADA]: [ESTADOS.ATENDIDA, ESTADOS.CANCELADA],
    [ESTADOS.ATENDIDA]: [],
    [ESTADOS.CANCELADA]: []
});

export function siguientesEstados(estadoActual) {
    return TRANSICIONES_PERSONAL[estadoActual] ?? [];
}

export function esTransicionValida(de, a) {
    return siguientesEstados(de).includes(a);
}

export function clientePuedeEditar(estado) {
    return estado === ESTADOS.PENDIENTE;
}

export function clientePuedeCancelar(estado) {
    return estado === ESTADOS.PENDIENTE
        || estado === ESTADOS.PROPUESTA_ENVIADA
        || estado === ESTADOS.CITA_CONFIRMADA;
}

export function clientePuedeEliminar(estado) {
    return estado === ESTADOS.PENDIENTE || estado === ESTADOS.CANCELADA;
}

export function personalPuedeEliminar(estado) {
    return estado === ESTADOS.CANCELADA;
}

export function esPendiente(estado) {
    return estado === ESTADOS.PENDIENTE;
}

export function esCerrada(estado) {
    return estado === ESTADOS.ATENDIDA || estado === ESTADOS.CANCELADA;
}

export function claseEstado(estado) {
    if (estado === ESTADOS.ATENDIDA) return "estado-ok";
    if (estado === ESTADOS.CANCELADA) return "estado-cerrado";
    if (estado === ESTADOS.PENDIENTE) return "estado-pendiente";
    return "estado-progreso";
}
