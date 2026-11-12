import { Timestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { obtenerSesion } from "./sesion.js";
import { obtenerTodasLasSolicitudes, actualizarSeguimiento, eliminarSolicitud } from "./solicitudes-datos.js";
import { ESTADOS, LISTA_ESTADOS, personalPuedeEliminar } from "./estados.js";
import { filtrarSolicitudes, ordenarPorFecha, contarPorEstado, contarPendientes, formatearFecha } from "./procesamiento.js";
import { validarNota, LIMITES } from "./validaciones.js";
import { crear, codigoSolicitud, etiquetaEstado, mostrarMensaje, mensajeError, listaNotas, confirmar, pintarUsuario } from "./ui-comun.js";

const el = {
    usuario: document.getElementById("usuario-correo"),
    mensajeGlobal: document.getElementById("mensaje-global"),
    contenido: document.getElementById("contenido"),
    kpiTotal: document.getElementById("kpi-total"),
    kpiPendientes: document.getElementById("kpi-pendientes"),
    kpiConfirmadas: document.getElementById("kpi-confirmadas"),
    chips: document.getElementById("chips-estado"),
    busqueda: document.getElementById("busqueda"),
    filtroEstado: document.getElementById("filtro-estado"),
    filtroOrden: document.getElementById("filtro-orden"),
    conteo: document.getElementById("resultado-conteo"),
    lista: document.getElementById("lista-solicitudes"),
    btnRecargar: document.getElementById("btn-recargar"),
    dialogo: document.getElementById("detalle-dialog"),
    detalle: document.getElementById("detalle-contenido")
};

const estado = { usuario: null, perfil: null, solicitudes: [] };

function fechaLocalInput(fecha) {
    if (!fecha) return "";
    const date = typeof fecha.toDate === "function" ? fecha.toDate() : new Date(fecha);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fechaParaFirestore(valor) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : Timestamp.fromDate(fecha);
}

function fechaMinimaLocal() {
    const ahora = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return ahora.toISOString().slice(0, 16);
}

function pintarIndicadores() {
    const conteos = contarPorEstado(estado.solicitudes);
    el.kpiTotal.textContent = estado.solicitudes.length;
    el.kpiPendientes.textContent = contarPendientes(estado.solicitudes);
    el.kpiConfirmadas.textContent = conteos[ESTADOS.CITA_CONFIRMADA] ?? 0;

    const activo = el.filtroEstado.value;
    el.chips.replaceChildren(...LISTA_ESTADOS.map((nombre) => {
        const chip = crear("button", { clase: "chip", atributos: { type: "button", "aria-pressed": String(activo === nombre) } }, [
            crear("span", { texto: nombre }), crear("strong", { texto: String(conteos[nombre] ?? 0) })
        ]);
        chip.addEventListener("click", () => {
            el.filtroEstado.value = activo === nombre ? "todos" : nombre;
            pintarLista();
        });
        return chip;
    }));
}

function celda(texto) {
    return crear("td", { texto: texto || "—" });
}

function horarioVisible(s) {
    if (s.estado === ESTADOS.PROPUESTA_ENVIADA) return `Propuesta: ${formatearFecha(s.fechaPropuesta)}`;
    if (s.estado === ESTADOS.CITA_CONFIRMADA || s.estado === ESTADOS.ATENDIDA) return formatearFecha(s.fechaCita);
    return s.fechaPreferida ? `Solicitada: ${formatearFecha(s.fechaPreferida)}` : "Sin fecha";
}

function filaSolicitud(s) {
    const boton = crear("button", { clase: "btn btn-secundario", texto: "Ver detalle", atributos: { type: "button" } });
    boton.addEventListener("click", () => abrirDetalle(s));
    return crear("tr", {}, [
        celda(codigoSolicitud(s.id)),
        celda(s.clienteNombre),
        celda(s.tipo === "producto" ? s.productoNombre : "Evaluación general"),
        celda(formatearFecha(s.creadoEn)),
        crear("td", {}, [etiquetaEstado(s.estado)]),
        celda(horarioVisible(s)),
        crear("td", {}, [boton])
    ]);
}

function agregarFilaMensaje(texto) {
    const fila = crear("tr");
    const celdaMensaje = crear("td", { texto });
    celdaMensaje.colSpan = 7;
    celdaMensaje.className = "tabla-vacia";
    fila.append(celdaMensaje);
    el.lista.replaceChildren(fila);
}

function pintarLista() {
    pintarIndicadores();
    if (!estado.solicitudes.length) {
        el.conteo.textContent = "";
        agregarFilaMensaje("Todavía no hay solicitudes de evaluación.");
        return;
    }
    const visibles = ordenarPorFecha(
        filtrarSolicitudes(estado.solicitudes, { texto: el.busqueda.value, estado: el.filtroEstado.value }),
        el.filtroOrden.value
    );
    el.conteo.textContent = `Mostrando ${visibles.length} de ${estado.solicitudes.length} solicitudes`;
    if (!visibles.length) {
        agregarFilaMensaje("Ninguna solicitud coincide con la búsqueda o el filtro.");
        return;
    }
    el.lista.replaceChildren(...visibles.map(filaSolicitud));
}

function crearCampo(label, input) {
    return crear("div", { clase: "campo" }, [crear("label", { texto: label, atributos: { for: input.id } }), input]);
}

function crearNota() {
    const nota = crear("textarea", {
        atributos: { id: "detalle-nota", rows: "3", maxlength: String(LIMITES.notaMax), placeholder: "Nota visible para el cliente (opcional)" }
    });
    return { nota, grupo: crearCampo("Nota de seguimiento", nota) };
}

function cerrarDetalle() {
    if (el.dialogo.open) el.dialogo.close();
    el.detalle.replaceChildren();
}

function abrirDetalle(s) {
    const encabezado = crear("div", { clase: "detalle-dialogo-cabecera" }, [
        crear("div", {}, [
            crear("span", { clase: "codigo", texto: codigoSolicitud(s.id) }),
            crear("h2", { texto: "Detalle de evaluación", atributos: { id: "detalle-titulo" } })
        ]),
        crear("button", { clase: "btn btn-secundario", texto: "Cerrar", atributos: { type: "button", "aria-label": "Cerrar detalle" } })
    ]);
    encabezado.querySelector("button").addEventListener("click", cerrarDetalle);

    const resumen = crear("div", { clase: "detalle-dialogo-resumen" }, [etiquetaEstado(s.estado), crear("p", { texto: `Enviada: ${formatearFecha(s.creadoEn)}` })]);
    const feedback = crear("div", { clase: "mensaje", atributos: { id: "detalle-feedback", role: "status", "aria-live": "polite", hidden: "" } });
    const datos = crear("dl", { clase: "detalle detalle-dialogo-datos" }, [
        crear("dt", { texto: "Cliente" }), crear("dd", { texto: s.clienteNombre }),
        crear("dt", { texto: "Correo" }), crear("dd", { texto: s.clienteEmail }),
        crear("dt", { texto: "Teléfono" }), crear("dd", { texto: s.telefono }),
        crear("dt", { texto: "Producto de interés" }), crear("dd", { texto: s.tipo === "producto" ? s.productoNombre : "Evaluación general" }),
        crear("dt", { texto: "Fecha solicitada" }), crear("dd", { texto: s.fechaPreferida ? formatearFecha(s.fechaPreferida) : "No indicada en esta solicitud" }),
        crear("dt", { texto: "Otras opciones indicadas" }), crear("dd", { texto: s.preferenciaHorario || "No especificadas" }),
        crear("dt", { texto: "Qué necesita" }), crear("dd", { texto: s.descripcion })
    ]);
    const bloques = [encabezado, resumen, feedback, datos];

    if (s.estado === ESTADOS.PENDIENTE) {
        construirAccionesPendientes(s, bloques);
    } else if (s.estado === ESTADOS.PROPUESTA_ENVIADA) {
        bloques.push(crear("p", { clase: "aviso", texto: `Horario alternativo enviado al cliente: ${formatearFecha(s.fechaPropuesta)}. Se espera su respuesta.` }));
        construirFormularioPropuesta(s, bloques, true);
        bloques.push(botonCancelar(s));
    } else if (s.estado === ESTADOS.CITA_CONFIRMADA) {
        bloques.push(crear("p", { clase: "aviso", texto: `Cita confirmada: ${formatearFecha(s.fechaCita)}` }));
        const acciones = crear("div", { clase: "form-acciones" });
        const atendida = crear("button", { clase: "btn btn-primario", texto: "Marcar atendida", atributos: { type: "button" } });
        const fechaCita = s.fechaCita?.toDate?.() ?? (s.fechaCita ? new Date(s.fechaCita) : null);
        if (fechaCita && fechaCita > new Date()) {
            atendida.disabled = true;
            atendida.title = "La cita aún no ha llegado.";
        }
        atendida.addEventListener("click", () => guardarSeguimiento(s, { nuevoEstado: ESTADOS.ATENDIDA }, atendida));
        acciones.append(atendida, botonCancelar(s));
        bloques.push(acciones);
    } else if (s.estado === ESTADOS.ATENDIDA) {
        bloques.push(crear("p", { clase: "ayuda", texto: `Evaluación atendida en la cita del ${formatearFecha(s.fechaCita)}.` }));
    } else if (s.estado === ESTADOS.CANCELADA) {
        bloques.push(crear("p", { clase: "ayuda", texto: "Esta solicitud está cancelada." }));
    }

    const notas = listaNotas(s.notas);
    if (notas) bloques.push(crear("section", { clase: "detalle-notas" }, [crear("h3", { texto: "Notas de seguimiento" }), notas]));
    if (personalPuedeEliminar(s.estado)) {
        const eliminar = crear("button", { clase: "btn btn-peligro-texto", texto: "Eliminar solicitud cancelada", atributos: { type: "button" } });
        eliminar.addEventListener("click", () => eliminarRegistro(s, eliminar));
        bloques.push(crear("div", { clase: "form-acciones" }, [eliminar]));
    }

    el.detalle.replaceChildren(...bloques);
    el.dialogo.showModal();
}

function construirAccionesPendientes(s, bloques) {
    const { nota, grupo } = crearNota();
    const error = crear("small", { clase: "error", atributos: { id: "detalle-error" } });
    const alternativa = crear("input", { atributos: { id: `fecha-alternativa-admin-${s.id}`, type: "datetime-local", min: fechaMinimaLocal() } });
    const confirmarHorario = crear("button", { clase: "btn btn-primario", texto: "Confirmar fecha solicitada", atributos: { type: "button" } });
    const proponerHorario = crear("button", { clase: "btn btn-secundario", texto: "Proponer otro horario", atributos: { type: "button" } });
    if (!s.fechaPreferida) {
        confirmarHorario.disabled = true;
        confirmarHorario.title = "Esta solicitud anterior no tiene una fecha seleccionada. Propón un horario alternativo.";
    }
    confirmarHorario.addEventListener("click", () => {
        const errorNota = validarNota(nota.value.trim(), false);
        if (errorNota) {
            error.textContent = errorNota;
            return;
        }
        const solicitada = s.fechaPreferida?.toDate?.() ?? (s.fechaPreferida ? new Date(s.fechaPreferida) : null);
        if (!solicitada || solicitada <= new Date()) {
            error.textContent = "La fecha solicitada ya pasó. Propón otro horario al cliente.";
            return;
        }
        guardarSeguimiento(s, { nuevoEstado: ESTADOS.CITA_CONFIRMADA, fechaCita: s.fechaPreferida, nota: nota.value.trim() }, confirmarHorario);
    });
    proponerHorario.addEventListener("click", () => {
        const errorNota = validarNota(nota.value.trim(), false);
        if (errorNota) {
            error.textContent = errorNota;
            return;
        }
        const fechaPropuesta = fechaParaFirestore(alternativa.value);
        if (!fechaPropuesta || fechaPropuesta.toDate() <= new Date()) {
            error.textContent = "Selecciona una fecha y hora futuras para la propuesta.";
            alternativa.focus();
            return;
        }
        guardarSeguimiento(s, {
            nuevoEstado: ESTADOS.PROPUESTA_ENVIADA,
            fechaPropuesta,
            nota: nota.value.trim()
        }, proponerHorario);
    });
    const controles = crear("section", { clase: "form-detalle-cita" }, [
        crear("h3", { texto: "Responder a la solicitud" }),
        crear("p", { clase: "ayuda", texto: "Puedes confirmar el horario solicitado o proponer otro. El cliente verá la propuesta en Mis solicitudes y podrá aceptarla o enviar una alternativa." }),
        crearCampo("Si el horario no está disponible, propone otra fecha y hora", alternativa),
        grupo,
        error,
        crear("div", { clase: "form-acciones" }, [confirmarHorario, proponerHorario, botonCancelar(s)])
    ]);
    bloques.push(controles);
}

function construirFormularioPropuesta(s, bloques, esActualizacion) {
    const fecha = crear("input", { atributos: { id: `fecha-propuesta-${s.id}`, type: "datetime-local", required: "", min: fechaMinimaLocal() } });
    fecha.value = fechaLocalInput(esActualizacion ? s.fechaPropuesta : null);
    const error = crear("small", { clase: "error" });
    const nota = crear("textarea", {
        atributos: { id: `nota-propuesta-${s.id}`, rows: "2", maxlength: String(LIMITES.notaMax), placeholder: "Nota visible para el cliente (opcional)" }
    });
    const enviar = crear("button", { clase: "btn btn-secundario", texto: esActualizacion ? "Actualizar horario propuesto" : "Proponer otro horario", atributos: { type: "submit" } });
    const formulario = crear("form", { clase: "form-detalle-cita form-propuesta-admin", atributos: { novalidate: "" } }, [
        crear("h3", { texto: esActualizacion ? "Cambiar la propuesta" : "Proponer una alternativa" }),
        crearCampo("Nueva fecha y hora", fecha),
        crearCampo("Nota para el cliente", nota),
        error,
        crear("div", { clase: "form-acciones" }, [enviar])
    ]);
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const fechaElegida = fechaParaFirestore(fecha.value);
        if (!fechaElegida || fechaElegida.toDate() <= new Date()) {
            error.textContent = "Selecciona una fecha y hora futuras.";
            fecha.focus();
            return;
        }
        const notaTexto = nota.value.trim();
        const errorNota = validarNota(notaTexto, false);
        if (errorNota) {
            error.textContent = errorNota;
            return;
        }
        await guardarSeguimiento(s, {
            nuevoEstado: ESTADOS.PROPUESTA_ENVIADA,
            fechaPropuesta: fechaElegida,
            nota: notaTexto
        }, enviar);
    });
    bloques.push(formulario);
}

function botonCancelar(s) {
    const boton = crear("button", { clase: "btn btn-peligro-texto", texto: "Cancelar solicitud", atributos: { type: "button" } });
    boton.addEventListener("click", async () => {
        if (!(await confirmar(`¿Cancelar ${codigoSolicitud(s.id)}?`, "La solicitud quedará marcada como cancelada.", "Cancelar solicitud"))) return;
        guardarSeguimiento(s, { nuevoEstado: ESTADOS.CANCELADA }, boton);
    });
    return boton;
}

async function guardarSeguimiento(s, cambios, boton) {
    boton.disabled = true;
    const nota = cambios.nota ?? "";
    const resultado = await actualizarSeguimiento(s.id, {
        nuevoEstado: cambios.nuevoEstado,
        nota,
        autor: estado.perfil.nombreCompleto,
        ...(cambios.fechaCita !== undefined ? { fechaCita: cambios.fechaCita } : {}),
        ...(cambios.fechaPropuesta !== undefined ? { fechaPropuesta: cambios.fechaPropuesta } : {})
    });
    if (!resultado.exito) {
        mostrarMensaje(el.detalle.querySelector("#detalle-feedback"), "error", mensajeError(resultado));
        boton.disabled = false;
        return;
    }
    cerrarDetalle();
    mostrarMensaje(el.mensajeGlobal, "exito", `${codigoSolicitud(s.id)} actualizada.`);
    await cargarSolicitudes();
}

async function eliminarRegistro(s, boton) {
    if (!(await confirmar(`¿Eliminar ${codigoSolicitud(s.id)}?`, "Se borrará permanentemente esta solicitud cancelada.", "Eliminar"))) return;
    boton.disabled = true;
    const resultado = await eliminarSolicitud(s.id);
    if (!resultado.exito) {
        mostrarMensaje(el.detalle.querySelector("#detalle-feedback"), "error", mensajeError(resultado));
        boton.disabled = false;
        return;
    }
    cerrarDetalle();
    mostrarMensaje(el.mensajeGlobal, "exito", "Solicitud eliminada.");
    await cargarSolicitudes();
}

async function cargarSolicitudes() {
    el.btnRecargar.disabled = true;
    const cargando = crear("tr", {}, [crear("td", { texto: "Cargando solicitudes…" })]);
    cargando.firstElementChild.colSpan = 7;
    el.lista.replaceChildren(cargando);
    const resultado = await obtenerTodasLasSolicitudes();
    el.btnRecargar.disabled = false;
    if (!resultado.exito) {
        agregarFilaMensaje(mensajeError(resultado));
        return;
    }
    estado.solicitudes = resultado.data;
    pintarLista();
}

function pintarFiltroEstados() {
    el.filtroEstado.replaceChildren(
        crear("option", { texto: "Todos", atributos: { value: "todos" } }),
        ...LISTA_ESTADOS.map((nombre) => crear("option", { texto: nombre, atributos: { value: nombre } }))
    );
    el.filtroEstado.value = "todos";
}

function configurarEventos() {
    let espera;
    el.busqueda.addEventListener("input", () => {
        clearTimeout(espera);
        espera = setTimeout(pintarLista, 200);
    });
    el.filtroEstado.addEventListener("change", pintarLista);
    el.filtroOrden.addEventListener("change", pintarLista);
    el.btnRecargar.addEventListener("click", () => {
        mostrarMensaje(el.mensajeGlobal, "", "");
        cargarSolicitudes();
    });
    el.dialogo.addEventListener("click", (evento) => {
        if (evento.target === el.dialogo) cerrarDetalle();
    });
}

export async function iniciarVistaPersonal() {
    mostrarMensaje(el.mensajeGlobal, "carga", "Verificando permisos…");
    try {
        const { usuario, perfil } = await obtenerSesion();
        if (!usuario || perfil?.role !== "personal") {
            mostrarMensaje(el.mensajeGlobal, "error", "Acceso restringido: esta vista es solo para el personal. Redirigiendo…");
            return;
        }
        estado.usuario = usuario;
        estado.perfil = perfil;
        pintarUsuario(el.usuario, usuario, perfil);
        mostrarMensaje(el.mensajeGlobal, "", "");
        el.contenido.hidden = false;
        pintarFiltroEstados();
        configurarEventos();
        await cargarSolicitudes();
    } catch (error) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(error));
    }
}
