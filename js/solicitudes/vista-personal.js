// Interfaz del personal (panel-personal.html): revisión de solicitudes, cambio de estado y notas de seguimiento.
import { obtenerSesion } from "./sesion.js";
import { obtenerTodasLasSolicitudes, actualizarSeguimiento, eliminarSolicitud } from "./solicitudes-datos.js";
import {
    ESTADOS,
    LISTA_ESTADOS,
    siguientesEstados,
    personalPuedeEliminar,
    esPendiente,
    esCerrada
} from "./estados.js";
import {
    filtrarSolicitudes,
    ordenarPorFecha,
    contarPorEstado,
    contarPendientes,
    formatearFecha
} from "./procesamiento.js";
import { validarNota, LIMITES } from "./validaciones.js";
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

const el = {
    usuario: document.getElementById("usuario-correo"),
    mensajeGlobal: document.getElementById("mensaje-global"),
    contenido: document.getElementById("contenido"),
    kpiTotal: document.getElementById("kpi-total"),
    kpiPendientes: document.getElementById("kpi-pendientes"),
    kpiProceso: document.getElementById("kpi-proceso"),
    chips: document.getElementById("chips-estado"),
    busqueda: document.getElementById("busqueda"),
    filtroEstado: document.getElementById("filtro-estado"),
    filtroOrden: document.getElementById("filtro-orden"),
    conteo: document.getElementById("resultado-conteo"),
    lista: document.getElementById("lista-solicitudes"),
    btnRecargar: document.getElementById("btn-recargar")
};

const estado = {
    usuario: null,
    perfil: null,
    solicitudes: []
};

// ---------- Indicadores ----------

function pintarIndicadores() {
    const conteo = contarPorEstado(estado.solicitudes);
    const pendientes = contarPendientes(estado.solicitudes);
    const enProceso = estado.solicitudes.filter((s) => !esPendiente(s.estado) && !esCerrada(s.estado)).length;

    el.kpiTotal.textContent = estado.solicitudes.length;
    el.kpiPendientes.textContent = pendientes;
    el.kpiProceso.textContent = enProceso;

    const activo = el.filtroEstado.value;
    el.chips.replaceChildren(...LISTA_ESTADOS.map((nombre) => {
        const chip = crear("button", {
            clase: "chip",
            atributos: { type: "button", "aria-pressed": String(activo === nombre) }
        }, [
            crear("span", { texto: nombre }),
            crear("strong", { texto: String(conteo[nombre]) })
        ]);
        chip.addEventListener("click", () => {
            el.filtroEstado.value = activo === nombre ? "todos" : nombre;
            pintarLista();
        });
        return chip;
    }));
}

// ---------- Tarjeta con formulario de seguimiento ----------

function formularioSeguimiento(s) {
    const opciones = [s.estado, ...siguientesEstados(s.estado)];
    const idBase = `seg-${s.id}`;

    const select = crear("select", { atributos: { id: `${idBase}-estado`, name: "estado" } },
        opciones.map((op) => crear("option", {
            texto: op === s.estado ? `${op} (actual)` : op,
            atributos: { value: op }
        })));

    const nota = crear("textarea", {
        atributos: {
            id: `${idBase}-nota`,
            name: "nota",
            rows: "2",
            maxlength: String(LIMITES.notaMax),
            placeholder: "Nota visible para el cliente (obligatoria si pides información)",
            "aria-describedby": `${idBase}-error`
        }
    });
    const error = crear("small", { clase: "error", atributos: { id: `${idBase}-error` } });
    const guardar = crear("button", { clase: "btn btn-primario", texto: "Guardar seguimiento", atributos: { type: "submit" } });

    const form = crear("form", { clase: "form-seguimiento", atributos: { novalidate: "" } }, [
        crear("div", { clase: "campo" }, [crear("label", { texto: "Estado", atributos: { for: select.id } }), select]),
        crear("div", { clase: "campo campo-nota" }, [crear("label", { texto: "Nota de seguimiento", atributos: { for: nota.id } }), nota, error]),
        crear("div", { clase: "form-acciones" }, [guardar])
    ]);

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const nuevoEstado = select.value;
        const textoNota = nota.value.trim();

        if (nuevoEstado === s.estado && !textoNota) {
            error.textContent = "Cambia el estado o agrega una nota.";
            return;
        }
        const errorNota = validarNota(textoNota, nuevoEstado === ESTADOS.REQUIERE_INFO);
        error.textContent = errorNota;
        nota.setAttribute("aria-invalid", errorNota ? "true" : "false");
        if (errorNota) {
            nota.focus();
            return;
        }
        if (nuevoEstado === ESTADOS.RECHAZADA
            && !(await confirmar(`¿Rechazar ${codigoSolicitud(s.id)}?`, "El cliente verá la solicitud como rechazada y ya no podrá avanzar.", "Rechazar"))) {
            return;
        }

        guardar.disabled = true;
        mostrarMensaje(el.mensajeGlobal, "carga", "Guardando seguimiento…");
        const resultado = await actualizarSeguimiento(s.id, {
            nuevoEstado,
            nota: textoNota,
            autor: estado.perfil.nombreCompleto
        });
        if (!resultado.exito) {
            mostrarMensaje(el.mensajeGlobal, "error", mensajeError(resultado));
            guardar.disabled = false;
            return;
        }
        mostrarMensaje(el.mensajeGlobal, "exito", `${codigoSolicitud(s.id)} actualizada a "${nuevoEstado}".`);
        await cargarSolicitudes();
    });

    return form;
}

function tarjetaSolicitud(s) {
    const detalle = crear("dl", { clase: "detalle" }, [
        crear("dt", { texto: "Cliente" }), crear("dd", { texto: s.clienteNombre }),
        crear("dt", { texto: "Correo" }), crear("dd", { texto: s.clienteEmail }),
        crear("dt", { texto: "Teléfono" }), crear("dd", { texto: s.telefono }),
        crear("dt", { texto: "Tipo" }), crear("dd", { texto: s.tipo === "producto" ? "Producto del catálogo" : "Evaluación" })
    ]);

    const cerrada = esCerrada(s.estado);
    let acciones = null;
    if (personalPuedeEliminar(s.estado)) {
        const eliminar = crear("button", { clase: "btn btn-peligro-texto", texto: "Eliminar registro", atributos: { type: "button" } });
        eliminar.addEventListener("click", () => eliminarRegistro(s, eliminar));
        acciones = crear("div", { clase: "tarjeta-acciones" }, [eliminar]);
    }

    return crear("article", { clase: `solicitud${cerrada ? " solicitud-cerrada" : ""}` }, [
        crear("div", { clase: "solicitud-cabecera" }, [
            crear("div", {}, [
                crear("span", { clase: "codigo", texto: codigoSolicitud(s.id) }),
                crear("h3", { texto: s.productoNombre })
            ]),
            etiquetaEstado(s.estado)
        ]),
        crear("p", { clase: "fechas", texto: `Creada: ${formatearFecha(s.creadoEn)} · Actualizada: ${formatearFecha(s.actualizadoEn)}` }),
        detalle,
        crear("p", { clase: "descripcion", texto: s.descripcion }),
        listaNotas(s.notas),
        cerrada ? null : formularioSeguimiento(s),
        acciones
    ]);
}

async function eliminarRegistro(s, boton) {
    const ok = await confirmar(
        `¿Eliminar ${codigoSolicitud(s.id)}?`,
        `Solo se eliminan solicitudes rechazadas o canceladas. Se borrará la solicitud de ${s.clienteNombre}.`,
        "Eliminar"
    );
    if (!ok) return;

    boton.disabled = true;
    mostrarMensaje(el.mensajeGlobal, "carga", "Eliminando…");
    const resultado = await eliminarSolicitud(s.id);
    if (!resultado.exito) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(resultado));
        boton.disabled = false;
        return;
    }
    mostrarMensaje(el.mensajeGlobal, "exito", "Registro eliminado.");
    await cargarSolicitudes();
}

// ---------- Lista ----------

function pintarLista() {
    pintarIndicadores();

    if (!estado.solicitudes.length) {
        el.conteo.textContent = "";
        el.lista.replaceChildren(estadoVacio("No hay solicitudes registradas", "Cuando un cliente envíe una solicitud aparecerá aquí."));
        return;
    }

    const visibles = ordenarPorFecha(
        filtrarSolicitudes(estado.solicitudes, { texto: el.busqueda.value, estado: el.filtroEstado.value }),
        el.filtroOrden.value
    );
    el.conteo.textContent = `Mostrando ${visibles.length} de ${estado.solicitudes.length} solicitudes`;

    if (!visibles.length) {
        el.lista.replaceChildren(estadoVacio("Sin resultados", "Ninguna solicitud coincide con la búsqueda o el filtro."));
        return;
    }
    el.lista.replaceChildren(...visibles.map(tarjetaSolicitud));
}

async function cargarSolicitudes() {
    el.btnRecargar.disabled = true;
    el.lista.replaceChildren(estadoCarga());
    const resultado = await obtenerTodasLasSolicitudes();
    el.btnRecargar.disabled = false;
    if (!resultado.exito) {
        el.lista.replaceChildren(estadoVacio("No se pudieron cargar las solicitudes", mensajeError(resultado)));
        return;
    }
    estado.solicitudes = resultado.data;
    pintarLista();
}

// ---------- Inicio ----------

function pintarFiltroEstados() {
    el.filtroEstado.replaceChildren(
        crear("option", { texto: "Todos", atributos: { value: "todos" } }),
        crear("option", { texto: "Pendientes de atender", atributos: { value: "pendientes" } }),
        ...LISTA_ESTADOS.map((e) => crear("option", { texto: e, atributos: { value: e } }))
    );
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
}

// La redirección por sesión/rol la hace protegerPagina() (módulo de auth). Ocultar la vista mejora la
// experiencia, pero la protección real está en firestore.rules: un cliente recibe permission-denied.
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
        pintarUsuario(el.usuario, usuario);
        mostrarMensaje(el.mensajeGlobal, "", "");
        el.contenido.hidden = false;

        pintarFiltroEstados();
        el.filtroEstado.value = "pendientes";
        configurarEventos();
        await cargarSolicitudes();
    } catch (err) {
        mostrarMensaje(el.mensajeGlobal, "error", mensajeError(err));
    }
}
