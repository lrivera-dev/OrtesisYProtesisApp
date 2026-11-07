// Interfaz del cliente (mis-solicitudes.html): formulario de solicitud (crear/editar) y "Mis solicitudes".
import { obtenerSesion } from "./sesion.js";
import {
    obtenerProductosDisponibles,
    crearSolicitud,
    obtenerMisSolicitudes,
    obtenerSolicitudPorId,
    actualizarSolicitudCliente,
    cancelarSolicitud,
    eliminarSolicitud,
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
    editandoId: null
};

function obtenerElementos() {
    return {
        usuario: document.getElementById("usuario-correo"),
        mensajeGlobal: document.getElementById("mensaje-global"),
        contenido: document.getElementById("contenido"),
        form: document.getElementById("form-solicitud"),
        tituloForm: document.getElementById("titulo-form"),
        campoProducto: document.getElementById("campo-producto"),
        producto: document.getElementById("productoId"),
        telefono: document.getElementById("telefono"),
        descripcion: document.getElementById("descripcion"),
        contador: document.getElementById("contador-descripcion"),
        btnEnviar: document.getElementById("btn-enviar"),
        btnCancelarEdicion: document.getElementById("btn-cancelar-edicion"),
        mensajeForm: document.getElementById("mensaje-form"),
        filtroEstado: document.getElementById("filtro-estado"),
        filtroOrden: document.getElementById("filtro-orden"),
        indicadores: document.getElementById("indicadores-cliente"),
        lista: document.getElementById("lista-solicitudes")
    };
}

// ---------- Formulario ----------

function tipoSeleccionado() {
    return el.form.elements.tipo.value;
}

function actualizarCampoProducto() {
    const esProducto = tipoSeleccionado() === "producto";
    el.campoProducto.hidden = !esProducto;
    el.producto.disabled = !esProducto;
}

function actualizarContador() {
    const largo = el.descripcion.value.trim().length;
    el.contador.textContent = `${largo} / ${LIMITES.descripcionMax}`;
    el.contador.classList.toggle("contador-corto", largo > 0 && largo < LIMITES.descripcionMin);
}

function pintarProductos(seleccionado = "") {
    if (!estado.productos.length) {
        el.producto.replaceChildren(crear("option", { texto: "No hay productos disponibles", atributos: { value: "" } }));
        return;
    }
    el.producto.replaceChildren(
        crear("option", { texto: "Selecciona un producto", atributos: { value: "" } }),
        ...estado.productos.map((p) => crear("option", {
            texto: p.categoria ? `${p.nombre} — ${p.categoria}` : p.nombre,
            atributos: { value: p.id }
        }))
    );
    el.producto.value = seleccionado;
}

function leerFormulario() {
    const productoId = el.producto.value;
    const producto = estado.productos.find((p) => p.id === productoId);
    return {
        tipo: tipoSeleccionado(),
        productoId,
        productoNombre: producto?.nombre ?? "",
        telefono: el.telefono.value,
        descripcion: el.descripcion.value
    };
}

function mostrarErrores(errores) {
    for (const campo of ["tipo", "productoId", "telefono", "descripcion"]) {
        const mensaje = errores[campo] ?? "";
        document.getElementById(`error-${campo}`).textContent = mensaje;
        const input = el.form.elements[campo];
        if (input instanceof HTMLElement) input.setAttribute("aria-invalid", mensaje ? "true" : "false");
    }
    const primero = Object.keys(errores)[0];
    if (primero) el.form.elements[primero]?.focus?.();
}

function limpiarFormulario() {
    el.form.reset();
    estado.editandoId = null;
    el.tituloForm.textContent = "Nueva solicitud";
    el.btnEnviar.textContent = "Enviar solicitud";
    el.btnCancelarEdicion.hidden = true;
    mostrarErrores({});
    actualizarCampoProducto();
    actualizarContador();
}

// Antes de editar se consulta el documento por ID para trabajar con su estado actual.
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
    el.form.elements.tipo.value = solicitud.tipo;
    pintarProductos(solicitud.productoId ?? "");
    el.telefono.value = solicitud.telefono;
    el.descripcion.value = solicitud.descripcion;
    el.tituloForm.textContent = `Editar ${codigoSolicitud(solicitud.id)}`;
    el.btnEnviar.textContent = solicitud.estado === ESTADOS.REQUIERE_INFO ? "Enviar información" : "Guardar cambios";
    el.btnCancelarEdicion.hidden = false;
    mostrarMensaje(el.mensajeForm, "", "");
    actualizarCampoProducto();
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
    limpiarFormulario();
    mostrarMensaje(el.mensajeForm, "exito", editando
        ? "Cambios guardados. Tu solicitud volvió a revisión."
        : "Solicitud enviada. El personal la revisará pronto.");
    await cargarSolicitudes();
}

// ---------- Lista "Mis solicitudes" ----------

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

    const aviso = s.estado === ESTADOS.REQUIERE_INFO
        ? crear("p", { clase: "aviso", texto: "El personal necesita más información. Revisa la nota y edita tu solicitud." })
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
        crear("p", { clase: "descripcion", texto: s.descripcion }),
        aviso,
        listaNotas(s.notas),
        acciones.childElementCount ? acciones : null
    ]);
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
    el.lista.replaceChildren(estadoCarga());
    const resultado = await obtenerMisSolicitudes(estado.usuario.uid);
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
        ? { titulo: `¿Cancelar ${codigo}?`, detalle: "El personal ya no la revisará. Esta acción no se puede deshacer.", boton: "Cancelar solicitud", exito: "Solicitud cancelada." }
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

// ---------- Inicio ----------

function pintarFiltroEstados() {
    el.filtroEstado.replaceChildren(
        crear("option", { texto: "Todos", atributos: { value: "todos" } }),
        crear("option", { texto: "Pendientes", atributos: { value: "pendientes" } }),
        ...LISTA_ESTADOS.map((e) => crear("option", { texto: e, atributos: { value: e } }))
    );
}

function configurarEventos() {
    el.form.addEventListener("submit", enviarFormulario);
    el.form.addEventListener("change", (e) => {
        if (e.target.name === "tipo") actualizarCampoProducto();
    });
    el.descripcion.addEventListener("input", actualizarContador);
    el.telefono.addEventListener("input", () => {
        // Solo dígitos; agrega el guion después del cuarto dígito.
        const digitos = el.telefono.value.replace(/\D/g, "").slice(0, 8);
        el.telefono.value = digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
    });
    el.btnCancelarEdicion.addEventListener("click", () => {
        limpiarFormulario();
        mostrarMensaje(el.mensajeForm, "", "");
    });
    el.filtroEstado.addEventListener("change", pintarLista);
    el.filtroOrden.addEventListener("change", pintarLista);
}

async function cargarProductos() {
    const resultado = await obtenerProductosDisponibles();
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeForm, "error", `No se pudo cargar el catálogo. ${mensajeError(resultado)}`);
    }
    estado.productos = resultado.exito ? resultado.data : [];
    // Permite llegar desde el catálogo con ?producto=ID para preseleccionarlo.
    const desdeCatalogo = new URLSearchParams(window.location.search).get("producto") ?? "";
    pintarProductos(estado.productos.some((p) => p.id === desdeCatalogo) ? desdeCatalogo : "");
}

// La redirección por sesión/rol la hace protegerPagina() (módulo de auth); aquí solo se carga la vista.
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
        pintarUsuario(el.usuario, usuario);
        mostrarMensaje(el.mensajeGlobal, "", "");
        el.contenido.hidden = false;

        pintarFiltroEstados();
        configurarEventos();
        actualizarCampoProducto();
        actualizarContador();

        await Promise.all([cargarProductos(), cargarSolicitudes()]);
    } catch (error) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(error));
    }
}
