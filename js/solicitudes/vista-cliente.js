import { obtenerSesion } from "./sesion.js";
import {
    obtenerProductosDisponibles,
    crearSolicitud,
    obtenerMisSolicitudes,
    obtenerSolicitudPorId,
    actualizarSolicitudCliente,
    cancelarSolicitud,
    eliminarSolicitud,
    responderPropuestaCliente,
    crearSolicitudesDemo
} from "./solicitudes-datos.js";
import {
    ESTADOS,
    LISTA_ESTADOS,
    clientePuedeEditar,
    clientePuedeCancelar,
    clientePuedeEliminar
} from "./estados.js";
import { filtrarSolicitudes, ordenarPorFecha, contarPendientes, formatearFecha } from "./procesamiento.js";
import { validarSolicitud, LIMITES } from "./validaciones.js";
import {
    crear,
    codigoSolicitud,
    etiquetaEstado,
    mostrarMensaje,
    estadoCarga,
    estadoVacio,
    mensajeError,
    listaNotas,
    confirmar,
    pintarUsuario
} from "./ui-comun.js";

let el;

const estado = {
    usuario: null,
    perfil: null,
    productos: [],
    solicitudes: [],
    editandoId: null,
    tipoSolicitud: "evaluacion",
    productoSeleccionado: null,
    tipoInicial: "evaluacion",
    productoInicial: null
};

function obtenerElementos() {
    return {
        usuario: document.getElementById("usuario-correo"),
        mensajeGlobal: document.getElementById("mensaje-global"),
        contenido: document.getElementById("contenido"),
        form: document.getElementById("form-solicitud"),
        tituloForm: document.getElementById("titulo-form"),
        ayudaTipo: document.getElementById("ayuda-tipo-solicitud"),
        productoResumen: document.getElementById("producto-seleccionado"),
        errorProducto: document.getElementById("error-productoId"),
        enlaceCatalogo: document.getElementById("enlace-catalogo"),
        telefono: document.getElementById("telefono"),
        fechaPreferida: document.getElementById("fecha-preferida"),
        preferenciaHorario: document.getElementById("preferencia-horario"),
        descripcion: document.getElementById("descripcion"),
        contador: document.getElementById("contador-descripcion"),
        btnEnviar: document.getElementById("btn-enviar"),
        btnCancelarEdicion: document.getElementById("btn-cancelar-edicion"),
        mensajeForm: document.getElementById("mensaje-form"),
        filtroEstado: document.getElementById("filtro-estado"),
        filtroOrden: document.getElementById("filtro-orden"),
        indicadores: document.getElementById("indicadores-cliente"),
        btnRecargar: document.getElementById("btn-recargar-solicitudes"),
        lista: document.getElementById("lista-solicitudes")
    };
}

function tipoSeleccionado() {
    return estado.tipoSolicitud;
}

function actualizarContador() {
    const largo = el.descripcion.value.trim().length;
    el.contador.textContent = `${largo} / ${LIMITES.descripcionMax}`;
    el.contador.classList.toggle("contador-corto", largo > 0 && largo < LIMITES.descripcionMin);
}

function fechaLocalInput(fecha) {
    if (!fecha) return "";
    const date = typeof fecha.toDate === "function" ? fecha.toDate() : new Date(fecha);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fechaMinimaLocal() {
    const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return ahora.toISOString().slice(0, 16);
}

function pintarContextoSolicitud() {
    const esProducto = estado.tipoSolicitud === "producto";
    el.tituloForm.textContent = estado.editandoId
        ? `Editar ${codigoSolicitud(estado.editandoId)}`
        : "Solicitar una evaluación";
    el.ayudaTipo.textContent = esProducto
        ? "Indica que te interesa este producto. El personal coordinará contigo una cita para evaluarte y tomar medidas."
        : "Describe brevemente qué evaluación necesitas; el personal se pondrá en contacto para coordinar una cita.";
    el.enlaceCatalogo.hidden = esProducto && Boolean(estado.productoSeleccionado);
    el.enlaceCatalogo.textContent = esProducto ? "Elegir otro producto del catálogo" : "Elegir un producto del catálogo";
    el.productoResumen.hidden = !esProducto;
    el.productoResumen.replaceChildren();
    el.errorProducto.textContent = "";
    el.btnEnviar.disabled = false;

    if (!esProducto) return;
    if (!estado.productoSeleccionado) {
        el.productoResumen.append(crear("p", {
            clase: "producto-solicitud-error",
            texto: "No encontramos este producto o ya no está disponible. Vuelve al catálogo y elige otro."
        }));
        el.errorProducto.textContent = "Selecciona un producto disponible desde el catálogo.";
        el.btnEnviar.disabled = true;
        return;
    }

    const producto = estado.productoSeleccionado;
    const imagen = crear("img", {
        atributos: {
            src: producto.imagen || "img/productos/protesis1.png",
            alt: `Imagen de ${producto.nombre}`
        }
    });
    el.productoResumen.append(
        imagen,
        crear("div", {}, [
            crear("span", { clase: "producto-solicitud-etiqueta", texto: producto.etiqueta || producto.categoria || "Producto del catálogo" }),
            crear("h3", { texto: producto.nombre }),
            crear("p", { texto: producto.descripcion || "Producto seleccionado del catálogo." })
        ])
    );
    el.btnEnviar.disabled = false;
}

function leerFormulario() {
    const producto = estado.productoSeleccionado;
    return {
        tipo: tipoSeleccionado(),
        productoId: producto?.id ?? "",
        productoNombre: producto?.nombre ?? "",
        telefono: el.telefono.value,
        fechaPreferida: el.fechaPreferida.value,
        descripcion: el.descripcion.value,
        preferenciaHorario: el.preferenciaHorario.value
    };
}

function mostrarErrores(errores) {
    for (const campo of ["telefono", "descripcion", "preferenciaHorario", "fechaPreferida"]) {
        const mensaje = errores[campo] ?? "";
        const idError = campo === "preferenciaHorario"
            ? "error-preferencia-horario"
            : campo === "fechaPreferida" ? "error-fecha-preferida" : `error-${campo}`;
        document.getElementById(idError).textContent = mensaje;
        const input = el.form.elements[campo];
        if (input instanceof HTMLElement) input.setAttribute("aria-invalid", mensaje ? "true" : "false");
    }
    el.errorProducto.textContent = errores.productoId ?? "";
    const primero = Object.keys(errores)[0];
    if (primero === "productoId") el.enlaceCatalogo.focus();
    else if (primero) el.form.elements[primero]?.focus?.();
}

function limpiarFormulario({ reiniciarProducto = false } = {}) {
    el.form.reset();
    estado.editandoId = null;
    if (reiniciarProducto) {
        estado.tipoInicial = "evaluacion";
        estado.productoInicial = null;
        const url = new URL(window.location.href);
        url.searchParams.delete("producto");
        window.history.replaceState({}, "", url);
    }
    estado.tipoSolicitud = estado.tipoInicial;
    estado.productoSeleccionado = estado.productoInicial;
    el.tituloForm.textContent = "Solicitar una evaluación";
    el.btnEnviar.textContent = "Solicitar evaluación";
    el.btnCancelarEdicion.hidden = true;
    mostrarErrores({});
    pintarContextoSolicitud();
    actualizarContador();
}

async function iniciarEdicion(id) {
    mostrarMensaje(el.mensajeForm, "carga", "Cargando solicitud…");
    const resultado = await obtenerSolicitudPorId(id);
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeForm, "error", mensajeError(resultado));
        return;
    }
    const solicitud = resultado.data;
    if (!clientePuedeEditar(solicitud.estado)) {
        mostrarMensaje(el.mensajeForm, "error", `Ya no se puede editar: la solicitud está "${solicitud.estado}".`);
        await cargarSolicitudes();
        return;
    }

    estado.editandoId = solicitud.id;
    estado.tipoSolicitud = solicitud.tipo;
    estado.productoSeleccionado = solicitud.tipo === "producto"
        ? estado.productos.find((producto) => producto.id === solicitud.productoId)
            ?? { id: solicitud.productoId, nombre: solicitud.productoNombre, disponibilidad: false }
        : null;
    el.telefono.value = solicitud.telefono;
    el.fechaPreferida.value = fechaLocalInput(solicitud.fechaPreferida);
    el.preferenciaHorario.value = solicitud.preferenciaHorario ?? "";
    el.descripcion.value = solicitud.descripcion;
    el.btnEnviar.textContent = "Guardar cambios";
    el.btnCancelarEdicion.hidden = false;
    mostrarMensaje(el.mensajeForm, "", "");
    pintarContextoSolicitud();
    actualizarContador();
    el.form.scrollIntoView({ behavior: "smooth", block: "start" });
    el.descripcion.focus();
}

async function enviarFormulario(evento) {
    evento.preventDefault();
    const datos = leerFormulario();
    const errores = validarSolicitud(datos);
    mostrarErrores(errores);
    if (Object.keys(errores).length) {
        mostrarMensaje(el.mensajeForm, "error", "Revisa los campos marcados.");
        return;
    }

    const editando = Boolean(estado.editandoId);
    el.btnEnviar.disabled = true;
    mostrarMensaje(el.mensajeForm, "carga", editando ? "Guardando cambios…" : "Enviando solicitud…");

    const resultado = editando
        ? await actualizarSolicitudCliente(estado.editandoId, datos)
        : await crearSolicitud(estado.usuario, estado.perfil, datos);

    el.btnEnviar.disabled = false;
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeForm, "error", mensajeError(resultado));
        return;
    }
    limpiarFormulario({ reiniciarProducto: !editando });
    mostrarMensaje(el.mensajeForm, "exito", editando
        ? "Cambios guardados. El personal coordinará contigo la evaluación."
        : "Solicitud enviada. El personal se pondrá en contacto para coordinar la cita.");
    await cargarSolicitudes();
}

function tarjetaSolicitud(s) {
    const acciones = crear("div", { clase: "tarjeta-acciones" });

    if (clientePuedeEditar(s.estado)) {
        const editar = crear("button", { clase: "btn btn-secundario", texto: "Editar", atributos: { type: "button" } });
        editar.addEventListener("click", () => iniciarEdicion(s.id));
        acciones.append(editar);
    }
    if (clientePuedeCancelar(s.estado)) {
        const cancelar = crear("button", { clase: "btn btn-secundario", texto: "Cancelar solicitud", atributos: { type: "button" } });
        cancelar.addEventListener("click", () => ejecutarAccion(s, "cancelar", cancelar));
        acciones.append(cancelar);
    }
    if (clientePuedeEliminar(s.estado)) {
        const eliminar = crear("button", { clase: "btn btn-peligro-texto", texto: "Eliminar", atributos: { type: "button" } });
        eliminar.addEventListener("click", () => ejecutarAccion(s, "eliminar", eliminar));
        acciones.append(eliminar);
    }

    const aviso = s.estado === ESTADOS.PROPUESTA_ENVIADA
        ? crear("p", { clase: "aviso", texto: `El personal propone: ${formatearFecha(s.fechaPropuesta)}` })
        : s.fechaCita
        ? crear("p", { clase: "aviso", texto: s.estado === ESTADOS.CANCELADA
            ? `Cita cancelada (horario anterior: ${formatearFecha(s.fechaCita)})`
            : s.estado === ESTADOS.ATENDIDA
                ? `Evaluación atendida: ${formatearFecha(s.fechaCita)}`
                : `Cita confirmada: ${formatearFecha(s.fechaCita)}` })
        : s.estado === ESTADOS.PENDIENTE
            ? crear("p", { clase: "aviso", texto: s.fechaPreferida
                ? `Fecha solicitada: ${formatearFecha(s.fechaPreferida)}. Aún falta confirmación.`
                : "Esta solicitud no tiene una fecha seleccionada. Edítala para proponer una." })
            : null;

    return crear("article", { clase: "solicitud" }, [
        crear("div", { clase: "solicitud-cabecera" }, [
            crear("div", {}, [
                crear("span", { clase: "codigo", texto: codigoSolicitud(s.id) }),
                crear("h3", { texto: s.productoNombre })
            ]),
            etiquetaEstado(s.estado)
        ]),
        crear("p", { clase: "fechas", texto: `Creada: ${formatearFecha(s.creadoEn)} · Actualizada: ${formatearFecha(s.actualizadoEn)}` }),
        s.estado === ESTADOS.PROPUESTA_ENVIADA
            ? crear("p", { clase: "fechas", texto: `Tu fecha solicitada: ${formatearFecha(s.fechaPreferida)}` })
            : null,
        s.preferenciaHorario ? crear("p", { clase: "fechas", texto: `Disponibilidad indicada: ${s.preferenciaHorario}` }) : null,
        crear("p", { clase: "descripcion", texto: s.descripcion }),
        aviso,
        s.estado === ESTADOS.PROPUESTA_ENVIADA ? controlesPropuesta(s) : null,
        listaNotas(s.notas),
        acciones.childElementCount ? acciones : null
    ]);
}

function controlesPropuesta(s) {
    const aceptar = crear("button", { clase: "btn btn-primario", texto: "Aceptar horario", atributos: { type: "button" } });
    const fechaPropuesta = s.fechaPropuesta?.toDate?.() ?? new Date(s.fechaPropuesta);
    if (!fechaPropuesta || Number.isNaN(fechaPropuesta.getTime()) || fechaPropuesta <= new Date()) {
        aceptar.disabled = true;
        aceptar.title = "La fecha propuesta ya pasó. Envía otra fecha para coordinar.";
    }
    aceptar.addEventListener("click", () => responderPropuesta(s, { aceptar: true }, aceptar));

    const fecha = crear("input", { atributos: { type: "datetime-local", required: "", min: fechaMinimaLocal() } });
    const error = crear("small", { clase: "error" });
    const enviar = crear("button", { clase: "btn btn-secundario", texto: "Proponer otra fecha", atributos: { type: "submit" } });
    const formulario = crear("form", { clase: "form-propuesta-cliente", atributos: { novalidate: "" } }, [
        crear("label", { texto: "Si no te funciona, indica otra fecha y hora", atributos: { for: `fecha-alternativa-${s.id}` } }),
        fecha,
        error,
        enviar
    ]);
    fecha.id = `fecha-alternativa-${s.id}`;
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const seleccionada = new Date(fecha.value);
        if (!fecha.value || Number.isNaN(seleccionada.getTime()) || seleccionada <= new Date()) {
            error.textContent = "Selecciona una fecha y hora futuras.";
            fecha.focus();
            return;
        }
        await responderPropuesta(s, { aceptar: false, fechaPreferida: seleccionada }, enviar);
    });
    return crear("div", { clase: "respuesta-propuesta" }, [
        crear("div", { clase: "form-acciones" }, [aceptar]),
        crear("details", {}, [
            crear("summary", { texto: "No me funciona; proponer otra fecha" }),
            formulario
        ])
    ]);
}

async function responderPropuesta(s, respuesta, boton) {
    boton.disabled = true;
    mostrarMensaje(el.mensajeGlobal, "carga", "Enviando tu respuesta…");
    const resultado = await responderPropuestaCliente(s.id, respuesta);
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(resultado));
        boton.disabled = false;
        return;
    }
    mostrarMensaje(el.mensajeGlobal, "exito", respuesta.aceptar
        ? "Horario aceptado. Tu cita está confirmada."
        : "Nueva fecha enviada. El personal revisará tu propuesta.");
    await cargarSolicitudes();
}

function pintarIndicadores() {
    const pendientes = contarPendientes(estado.solicitudes);
    el.indicadores.replaceChildren(
        crear("span", { clase: "indicador", texto: `${estado.solicitudes.length} en total` }),
        crear("span", { clase: "indicador indicador-destacado", texto: `${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"}` })
    );
}

function botonDemo() {
    const boton = crear("button", { clase: "btn btn-secundario", texto: "Crear solicitudes de ejemplo", atributos: { type: "button" } });
    boton.addEventListener("click", async () => {
        boton.disabled = true;
        mostrarMensaje(el.mensajeGlobal, "carga", "Creando solicitudes de ejemplo…");
        const resultado = await crearSolicitudesDemo(estado.usuario, estado.perfil, estado.productos);
        if (!resultado.exito) {
            mostrarMensaje(el.mensajeGlobal, "error", mensajeError(resultado));
            boton.disabled = false;
            return;
        }
        mostrarMensaje(el.mensajeGlobal, "exito", `Se crearon ${resultado.data.total} solicitudes de ejemplo.`);
        await cargarSolicitudes();
    });
    return boton;
}

function pintarLista() {
    pintarIndicadores();

    if (!estado.solicitudes.length) {
        el.lista.replaceChildren(estadoVacio(
            "Aún no tienes solicitudes",
            "Envía tu primera solicitud con el formulario o crea ejemplos para la demostración.",
            botonDemo()
        ));
        return;
    }

    const visibles = ordenarPorFecha(
        filtrarSolicitudes(estado.solicitudes, { estado: el.filtroEstado.value }),
        el.filtroOrden.value
    );

    if (!visibles.length) {
        el.lista.replaceChildren(estadoVacio("Sin resultados", "No tienes solicitudes con el estado seleccionado."));
        return;
    }
    el.lista.replaceChildren(...visibles.map(tarjetaSolicitud));
}

async function cargarSolicitudes() {
    el.btnRecargar.disabled = true;
    el.lista.replaceChildren(estadoCarga());
    const resultado = await obtenerMisSolicitudes(estado.usuario.uid);
    el.btnRecargar.disabled = false;
    if (!resultado.exito) {
        el.lista.replaceChildren(estadoVacio("No se pudieron cargar tus solicitudes", mensajeError(resultado)));
        return;
    }
    estado.solicitudes = resultado.data;
    pintarLista();
}

async function ejecutarAccion(solicitud, accion, boton) {
    const codigo = codigoSolicitud(solicitud.id);
    const textos = accion === "cancelar"
        ? { titulo: `¿Cancelar ${codigo}?`, detalle: solicitud.estado === ESTADOS.CITA_CONFIRMADA
            ? "La cita dejará de estar programada. Esta acción no se puede deshacer."
            : "El personal dejará de coordinar esta evaluación. Esta acción no se puede deshacer.", boton: "Cancelar solicitud", exito: "Solicitud cancelada." }
        : { titulo: `¿Eliminar ${codigo}?`, detalle: "Se borrará definitivamente de tu historial.", boton: "Eliminar", exito: "Solicitud eliminada." };

    if (!(await confirmar(textos.titulo, textos.detalle, textos.boton))) return;

    boton.disabled = true;
    mostrarMensaje(el.mensajeGlobal, "carga", "Procesando…");
    const resultado = accion === "cancelar"
        ? await cancelarSolicitud(solicitud.id)
        : await eliminarSolicitud(solicitud.id);

    if (!resultado.exito) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(resultado));
        boton.disabled = false;
        return;
    }
    if (estado.editandoId === solicitud.id) limpiarFormulario();
    mostrarMensaje(el.mensajeGlobal, "exito", textos.exito);
    await cargarSolicitudes();
}

function pintarFiltroEstados() {
    el.filtroEstado.replaceChildren(
        crear("option", { texto: "Todos", atributos: { value: "todos" } }),
        ...LISTA_ESTADOS.map((e) => crear("option", { texto: e, atributos: { value: e } }))
    );
}

function configurarEventos() {
    el.form.addEventListener("submit", enviarFormulario);
    el.descripcion.addEventListener("input", actualizarContador);
    el.fechaPreferida.addEventListener("input", () => {
        document.getElementById("error-fecha-preferida").textContent = "";
    });
    el.fechaPreferida.min = fechaMinimaLocal();
    el.preferenciaHorario.addEventListener("input", () => {
        const error = document.getElementById("error-preferencia-horario");
        if (error) error.textContent = "";
    });
    el.telefono.addEventListener("input", () => {
        const digitos = el.telefono.value.replace(/\D/g, "").slice(0, 8);
        el.telefono.value = digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
    });
    el.btnCancelarEdicion.addEventListener("click", () => {
        limpiarFormulario();
        mostrarMensaje(el.mensajeForm, "", "");
    });
    el.filtroEstado.addEventListener("change", pintarLista);
    el.filtroOrden.addEventListener("change", pintarLista);
    el.btnRecargar.addEventListener("click", cargarSolicitudes);
}

async function cargarProductos() {
    const resultado = await obtenerProductosDisponibles();
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeForm, "error", `No se pudo cargar el catálogo. ${mensajeError(resultado)}`);
    }
    estado.productos = resultado.exito ? resultado.data : [];
    const parametros = new URLSearchParams(window.location.search);
    const productoId = parametros.get("producto") ?? "";
    estado.tipoInicial = productoId ? "producto" : "evaluacion";
    estado.productoInicial = productoId
        ? estado.productos.find((producto) => producto.id === productoId) ?? null
        : null;
    estado.tipoSolicitud = estado.tipoInicial;
    estado.productoSeleccionado = estado.productoInicial;

    if (productoId && !estado.productoInicial) {
        mostrarMensaje(el.mensajeForm, "error", "El producto ya no está disponible. Vuelve al catálogo y elige otro.");
    }
    pintarContextoSolicitud();
}

export async function iniciarVistaCliente() {
    el = obtenerElementos();
    mostrarMensaje(el.mensajeGlobal, "carga", "Cargando tu cuenta…");
    try {
        const { usuario, perfil } = await obtenerSesion();
        if (!usuario || perfil?.role !== "cliente") {
            mostrarMensaje(el.mensajeGlobal, "info", "Esta vista es para clientes. Redirigiendo…");
            return;
        }

        estado.usuario = usuario;
        estado.perfil = perfil;
        pintarUsuario(el.usuario, usuario, perfil);
        mostrarMensaje(el.mensajeGlobal, "", "");
        el.contenido.hidden = false;

        pintarFiltroEstados();
        configurarEventos();
        actualizarContador();

        await cargarProductos();
        await cargarSolicitudes();
    } catch (error) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(error));
    }
}
