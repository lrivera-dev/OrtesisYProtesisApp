import { claseEstado } from "./estados.js";
import { formatearFecha } from "./procesamiento.js";

// Crea un elemento con clase, texto y atributos sin usar innerHTML (evita inyección de HTML).
export function crear(etiqueta, { clase, texto, atributos } = {}, hijos = []) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    if (atributos) {
        for (const [nombre, valor] of Object.entries(atributos)) el.setAttribute(nombre, valor);
    }
    for (const hijo of hijos) if (hijo) el.append(hijo);
    return el;
}

export function codigoSolicitud(id) {
    return `SOL-${id.slice(0, 6).toUpperCase()}`;
}

export function etiquetaEstado(estado) {
    return crear("span", { clase: `estado ${claseEstado(estado)}`, texto: estado });
}

// Mensaje visible de carga, éxito o error en una región aria-live.
export function mostrarMensaje(contenedor, tipo, texto) {
    contenedor.replaceChildren();
    if (!texto) {
        contenedor.hidden = true;
        return;
    }
    contenedor.hidden = false;
    contenedor.className = `mensaje mensaje-${tipo}`;
    contenedor.append(crear("span", { texto }));
}

export function estadoCarga(texto = "Cargando solicitudes…") {
    return crear("div", { clase: "lista-estado", atributos: { role: "status" } }, [
        crear("span", { clase: "spinner", atributos: { "aria-hidden": "true" } }),
        crear("span", { texto })
    ]);
}

export function estadoVacio(titulo, detalle, accion) {
    return crear("div", { clase: "lista-estado lista-vacia" }, [
        crear("strong", { texto: titulo }),
        crear("p", { texto: detalle }),
        accion
    ]);
}

// Traduce el error de un resultado { exito: false, codigo } (o un error de Firebase) a un mensaje comprensible.
export function mensajeError(resultado) {
    const codigo = resultado?.codigo ?? resultado?.code ?? "";
    if (codigo.includes("permission-denied")) return "No tienes permiso para realizar esta acción.";
    if (codigo.includes("unavailable")) return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
    if (codigo.includes("not-found")) return "La solicitud ya no existe. Actualiza la lista.";
    return "Ocurrió un error inesperado. Intenta de nuevo.";
}

export function listaNotas(notas = []) {
    if (!notas.length) return null;
    const lista = crear("ol", { clase: "notas", atributos: { "aria-label": "Notas de seguimiento" } });
    for (const nota of [...notas].reverse()) {
        lista.append(crear("li", {}, [
            crear("p", { texto: nota.texto }),
            crear("small", { texto: `${nota.autor ?? "Personal"} · ${nota.estado} · ${formatearFecha(nota.fecha)}` })
        ]));
    }
    return lista;
}

// Diálogo de confirmación accesible con <dialog>. Devuelve una promesa con true/false.
export function confirmar(titulo, detalle, textoAceptar = "Confirmar") {
    return new Promise((resolve) => {
        const dialogo = crear("dialog", { clase: "dialogo", atributos: { "aria-labelledby": "dialogo-titulo" } }, [
            crear("h2", { texto: titulo, atributos: { id: "dialogo-titulo" } }),
            crear("p", { texto: detalle })
        ]);
        const cancelar = crear("button", { clase: "btn btn-secundario", texto: "Volver", atributos: { type: "button" } });
        const aceptar = crear("button", { clase: "btn btn-peligro", texto: textoAceptar, atributos: { type: "button" } });
        dialogo.append(crear("div", { clase: "dialogo-acciones" }, [cancelar, aceptar]));

        const cerrar = (resultado) => {
            dialogo.close();
            dialogo.remove();
            resolve(resultado);
        };
        cancelar.addEventListener("click", () => cerrar(false));
        aceptar.addEventListener("click", () => cerrar(true));
        dialogo.addEventListener("cancel", (e) => {
            e.preventDefault();
            cerrar(false);
        });

        document.body.append(dialogo);
        dialogo.showModal();
        cancelar.focus();
    });
}

export function pintarUsuario(contenedor, usuario, perfil) {
    const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || usuario?.email;
    contenedor.textContent = nombre ? `Sesión iniciada · ${nombre}` : "";
}
