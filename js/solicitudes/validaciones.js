export const LIMITES = Object.freeze({
    descripcionMin: 20,
    descripcionMax: 500,
    horarioMax: 150,
    notaMin: 5,
    notaMax: 300
});

const PATRON_TELEFONO = /^[267]\d{3}-?\d{4}$/;

// Devuelve un objeto { campo: mensaje } con los errores; vacío si todo es válido.
export function validarSolicitud({ tipo, productoId, telefono, descripcion, fechaPreferida, preferenciaHorario = "" }) {
    const errores = {};

    if (tipo !== "producto" && tipo !== "evaluacion") {
        errores.tipo = "Selecciona el tipo de solicitud.";
    }
    if (tipo === "producto" && !productoId) {
        errores.productoId = "Selecciona el producto que te interesa.";
    }

    const fecha = new Date(fechaPreferida);
    if (!fechaPreferida || Number.isNaN(fecha.getTime())) {
        errores.fechaPreferida = "Selecciona la fecha y hora que prefieres.";
    } else if (fecha <= new Date()) {
        errores.fechaPreferida = "La fecha y hora deben ser posteriores al momento actual.";
    }

    const tel = (telefono ?? "").trim();
    if (!PATRON_TELEFONO.test(tel)) {
        errores.telefono = "Ingresa un teléfono de El Salvador de 8 dígitos (ej. 7614-0404).";
    }

    const texto = (descripcion ?? "").trim();
    if (texto.length < LIMITES.descripcionMin) {
        errores.descripcion = `Describe tu necesidad con al menos ${LIMITES.descripcionMin} caracteres.`;
    } else if (texto.length > LIMITES.descripcionMax) {
        errores.descripcion = `La descripción no puede superar ${LIMITES.descripcionMax} caracteres.`;
    }

    if ((preferenciaHorario ?? "").trim().length > LIMITES.horarioMax) {
        errores.preferenciaHorario = `La disponibilidad no puede superar ${LIMITES.horarioMax} caracteres.`;
    }

    return errores;
}

export function validarNota(texto, obligatoria) {
    const nota = (texto ?? "").trim();
    if (!nota) {
        return obligatoria ? "Agrega una nota que explique la información requerida." : "";
    }
    if (nota.length < LIMITES.notaMin) return `La nota debe tener al menos ${LIMITES.notaMin} caracteres.`;
    if (nota.length > LIMITES.notaMax) return `La nota no puede superar ${LIMITES.notaMax} caracteres.`;
    return "";
}

export function normalizarTelefono(telefono) {
    const digitos = telefono.replace(/\D/g, "");
    return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
}
