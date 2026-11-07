// Validaciones del formulario de solicitud y de las notas del personal.

export const LIMITES = Object.freeze({
    descripcionMin: 20,
    descripcionMax: 500,
    notaMin: 5,
    notaMax: 300
});

const PATRON_TELEFONO = /^[267]\d{3}-?\d{4}$/;

// Devuelve un objeto { campo: mensaje } con los errores; vacío si todo es válido.
export function validarSolicitud({ tipo, productoId, telefono, descripcion }) {
    const errores = {};

    if (tipo !== "producto" && tipo !== "evaluacion") {
        errores.tipo = "Selecciona el tipo de solicitud.";
    }
    if (tipo === "producto" && !productoId) {
        errores.productoId = "Selecciona el producto que te interesa.";
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
