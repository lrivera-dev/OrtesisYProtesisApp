// Reglas de negocio de las solicitudes (sin Firebase ni DOM).
// Las mismas transiciones se validan también en firestore.rules.

export const ESTADOS = Object.freeze({
    PENDIENTE: "Pendiente de revisión",
    EN_REVISION: "En revisión",
    REQUIERE_INFO: "Requiere información",
    APROBADA: "Aprobada",
    RECHAZADA: "Rechazada",
    EN_DESARROLLO: "En desarrollo",
    LISTA_ENTREGA: "Lista para entrega",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada"
});

// Orden del flujo para mostrar filtros y agrupaciones.
export const LISTA_ESTADOS = [
    ESTADOS.PENDIENTE,
    ESTADOS.EN_REVISION,
    ESTADOS.REQUIERE_INFO,
    ESTADOS.APROBADA,
    ESTADOS.EN_DESARROLLO,
    ESTADOS.LISTA_ENTREGA,
    ESTADOS.COMPLETADA,
    ESTADOS.RECHAZADA,
    ESTADOS.CANCELADA
];

// Transiciones que puede hacer el personal: estado actual -> estados siguientes.
export const TRANSICIONES_PERSONAL = Object.freeze({
    [ESTADOS.PENDIENTE]: [ESTADOS.EN_REVISION],
    [ESTADOS.EN_REVISION]: [ESTADOS.REQUIERE_INFO, ESTADOS.APROBADA, ESTADOS.RECHAZADA],
    [ESTADOS.REQUIERE_INFO]: [ESTADOS.EN_REVISION, ESTADOS.RECHAZADA],
    [ESTADOS.APROBADA]: [ESTADOS.EN_DESARROLLO],
    [ESTADOS.EN_DESARROLLO]: [ESTADOS.LISTA_ENTREGA],
    [ESTADOS.LISTA_ENTREGA]: [ESTADOS.COMPLETADA],
    [ESTADOS.COMPLETADA]: [],
    [ESTADOS.RECHAZADA]: [],
    [ESTADOS.CANCELADA]: []
});

const ESTADOS_PENDIENTES = [ESTADOS.PENDIENTE, ESTADOS.EN_REVISION, ESTADOS.REQUIERE_INFO];
const ESTADOS_CERRADOS = [ESTADOS.COMPLETADA, ESTADOS.RECHAZADA, ESTADOS.CANCELADA];

export function siguientesEstados(estadoActual) {
    return TRANSICIONES_PERSONAL[estadoActual] ?? [];
}

export function esTransicionValida(de, a) {
    return siguientesEstados(de).includes(a);
}

// El cliente solo edita mientras está pendiente o cuando se le pidió información.
export function clientePuedeEditar(estado) {
    return estado === ESTADOS.PENDIENTE || estado === ESTADOS.REQUIERE_INFO;
}

// Solo se cancela mientras está pendiente de revisión.
export function clientePuedeCancelar(estado) {
    return estado === ESTADOS.PENDIENTE;
}

// El cliente puede eliminar una solicitud que aún nadie revisó o que ya canceló.
export function clientePuedeEliminar(estado) {
    return estado === ESTADOS.PENDIENTE || estado === ESTADOS.CANCELADA;
}

// El personal solo elimina solicitudes cerradas sin trabajo (rechazadas o canceladas).
export function personalPuedeEliminar(estado) {
    return estado === ESTADOS.RECHAZADA || estado === ESTADOS.CANCELADA;
}

export function esPendiente(estado) {
    return ESTADOS_PENDIENTES.includes(estado);
}

export function esCerrada(estado) {
    return ESTADOS_CERRADOS.includes(estado);
}

// Clase CSS para la etiqueta de cada estado.
export function claseEstado(estado) {
    if (esCerrada(estado)) {
        return estado === ESTADOS.COMPLETADA ? "estado-ok" : "estado-cerrado";
    }
    if (estado === ESTADOS.REQUIERE_INFO) return "estado-alerta";
    if (esPendiente(estado)) return "estado-pendiente";
    return "estado-progreso";
}
