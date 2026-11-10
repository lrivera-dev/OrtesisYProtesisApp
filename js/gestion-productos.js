import {
    addDoc,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDocs,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { obtenerSesion } from "./solicitudes/sesion.js";
import { pintarUsuario, mostrarMensaje } from "./solicitudes/ui-comun.js";
import { PRODUCTOS_INICIALES } from "./productos-iniciales.js";
import { productoDisponible } from "./productos-utiles.js";

const el = {
    usuario: document.getElementById("usuario-correo"),
    contenido: document.getElementById("contenido"),
    mensajeGlobal: document.getElementById("mensaje-global"),
    contenedorForm: document.getElementById("form-producto-contenedor"),
    botonNuevo: document.getElementById("btn-nuevo-producto"),
    form: document.getElementById("form-producto"),
    tabla: document.getElementById("tabla-productos-body"),
    botonCancelar: document.getElementById("btn-cancelar-prod"),
    botonGuardar: document.getElementById("btn-guardar-prod"),
    botonRecargar: document.getElementById("btn-recargar-productos"),
    botonIniciales: document.getElementById("btn-cargar-iniciales"),
    mensaje: document.getElementById("mensaje-catalogo"),
    id: document.getElementById("prod-id"),
    nombre: document.getElementById("prod-nombre"),
    categoria: document.getElementById("prod-categoria"),
    descripcion: document.getElementById("prod-descripcion"),
    imagen: document.getElementById("prod-imagen"),
    disponibilidad: document.getElementById("prod-disponibilidad"),
    busqueda: document.getElementById("busqueda-productos"),
    filtroDisponibilidad: document.getElementById("filtro-disponibilidad")
};

const CATEGORIAS = {
    rodillas: "Órtesis de rodilla",
    pies: "Órtesis de tobillo",
    superior: "Prótesis de miembro superior",
    inferior: "Prótesis de miembro inferior"
};

const ETIQUETAS = {
    rodillas: "ÓRTESIS DE RODILLA",
    pies: "ÓRTESIS DE TOBILLO",
    superior: "PRÓTESIS DE MIEMBRO SUPERIOR",
    inferior: "PRÓTESIS DE MIEMBRO INFERIOR"
};

let listaProductos = [];

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "";
    return celda;
}

function pintarTabla() {
    const texto = el.busqueda.value.trim().toLocaleLowerCase("es");
    const filtro = el.filtroDisponibilidad.value;
    const productosVisibles = listaProductos.filter((producto) => {
        const coincideTexto = `${producto.nombre ?? ""} ${CATEGORIAS[producto.categoria] ?? producto.categoria ?? ""}`
            .toLocaleLowerCase("es").includes(texto);
        const disponible = productoDisponible(producto);
        const coincideEstado = filtro === "todos"
            || (filtro === "disponibles" && disponible)
            || (filtro === "no-disponibles" && !disponible);
        return coincideTexto && coincideEstado;
    });

    if (!productosVisibles.length) {
        const fila = document.createElement("tr");
        const celda = crearCelda(listaProductos.length
            ? "No hay productos que coincidan con la búsqueda o el filtro."
            : "No hay productos registrados. Puedes cargar los datos de ejemplo o agregar uno.");
        celda.colSpan = 4;
        fila.append(celda);
        el.tabla.replaceChildren(fila);
        return;
    }

    const filas = productosVisibles.map((producto) => {
        const fila = document.createElement("tr");
        fila.append(
            crearCelda(producto.nombre),
            crearCelda(CATEGORIAS[producto.categoria] || producto.categoria)
        );

        const estado = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = productoDisponible(producto) ? "producto-estado disponible" : "producto-estado agotado";
        etiqueta.textContent = productoDisponible(producto) ? "Disponible" : "No disponible";
        estado.append(etiqueta);
        fila.append(estado);

        const acciones = document.createElement("td");
        acciones.className = "tabla-acciones";
        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "btn btn-secundario";
        editar.dataset.accion = "editar";
        editar.dataset.id = producto.id;
        editar.textContent = "Editar";
        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "btn btn-peligro-texto";
        eliminar.dataset.accion = "eliminar";
        eliminar.dataset.id = producto.id;
        eliminar.textContent = "Eliminar";
        acciones.append(editar, eliminar);
        fila.append(acciones);
        return fila;
    });

    el.tabla.replaceChildren(...filas);
}

async function cargarProductos() {
    el.botonRecargar.disabled = true;
    mostrarMensaje(el.mensajeGlobal, "carga", "Cargando productos…");
    try {
        const snapshot = await getDocs(collection(db, "productos"));
        listaProductos = snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));
        el.botonIniciales.hidden = listaProductos.length > 0;
        pintarTabla();
        mostrarMensaje(el.mensajeGlobal, "", "");
    } catch (error) {
        console.error("Error al cargar productos:", error);
        mostrarMensaje(el.mensajeGlobal, "error", "No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
        el.botonRecargar.disabled = false;
    }
}

function prepararEdicion(id) {
    const producto = listaProductos.find((item) => item.id === id);
    if (!producto) return;

    el.id.value = producto.id;
    el.nombre.value = producto.nombre ?? "";
    el.categoria.value = producto.categoria ?? "rodillas";
    el.descripcion.value = producto.descripcion ?? "";
    el.imagen.value = producto.imagen ?? "img/productos/protesis1.png";
    el.disponibilidad.value = productoDisponible(producto) ? "true" : "false";
    el.botonGuardar.textContent = "Actualizar producto";
    el.botonCancelar.hidden = false;
    document.getElementById("titulo-form-producto").textContent = "Editar producto";
    el.contenedorForm.hidden = false;
    el.form.scrollIntoView({ behavior: "smooth", block: "start" });
    el.nombre.focus();
}

function limpiarFormulario() {
    el.form.reset();
    el.id.value = "";
    el.imagen.value = "img/productos/protesis1.png";
    el.botonGuardar.textContent = "Guardar producto";
    el.botonCancelar.hidden = true;
    document.getElementById("titulo-form-producto").textContent = "Agregar producto";
    el.contenedorForm.hidden = true;
    mostrarMensaje(el.mensaje, "", "");
}

async function guardarProducto(evento) {
    evento.preventDefault();
    if (!el.form.reportValidity()) return;

    const producto = {
        nombre: el.nombre.value.trim(),
        categoria: el.categoria.value,
        etiqueta: ETIQUETAS[el.categoria.value],
        descripcion: el.descripcion.value.trim(),
        imagen: el.imagen.value.trim(),
        disponibilidad: el.disponibilidad.value === "true",
        disponible: deleteField(),
        specs: listaProductos.find((item) => item.id === el.id.value)?.specs ?? ["Consulta con nuestro personal", "Adaptación personalizada"]
    };

    el.botonGuardar.disabled = true;
    mostrarMensaje(el.mensaje, "carga", "Guardando producto…");
    try {
        const estabaEditando = Boolean(el.id.value);
        if (el.id.value) {
            await updateDoc(doc(db, "productos", el.id.value), producto);
        } else {
            delete producto.disponible;
            await addDoc(collection(db, "productos"), producto);
        }
        limpiarFormulario();
        await cargarProductos();
        mostrarMensaje(el.mensajeGlobal, "exito", estabaEditando
            ? "Producto actualizado. El catálogo público ya refleja el cambio."
            : "Producto agregado al catálogo público.");
    } catch (error) {
        console.error("Error al guardar el producto:", error);
        mostrarMensaje(el.mensaje, "error", "No se pudo guardar el producto. Verifica los datos y los permisos de Firestore.");
    } finally {
        el.botonGuardar.disabled = false;
    }
}

async function cargarCatalogoInicial() {
    el.botonIniciales.disabled = true;
    mostrarMensaje(el.mensajeGlobal, "carga", "Preparando el catálogo de ejemplo…");
    try {
        const productosRef = collection(db, "productos");
        const actual = await getDocs(productosRef);
        if (!actual.empty) {
            await cargarProductos();
            mostrarMensaje(el.mensajeGlobal, "exito", "El catálogo ya tiene productos; no se agregaron duplicados.");
            return;
        }

        const lote = writeBatch(db);
        PRODUCTOS_INICIALES.forEach((producto) => {
            lote.set(doc(productosRef), producto);
        });
        await lote.commit();
        await cargarProductos();
        mostrarMensaje(el.mensajeGlobal, "exito", "Se agregaron los 12 productos de ejemplo.");
    } catch (error) {
        console.error("Error al cargar el catálogo inicial:", error);
        mostrarMensaje(el.mensajeGlobal, "error", "No se pudo cargar el catálogo inicial. Inténtalo de nuevo.");
    } finally {
        el.botonIniciales.disabled = false;
    }
}

async function eliminarProducto(id) {
    const producto = listaProductos.find((item) => item.id === id);
    if (!producto || !window.confirm(`¿Eliminar “${producto.nombre}” del catálogo?`)) return;

    try {
        await deleteDoc(doc(db, "productos", id));
        await cargarProductos();
        mostrarMensaje(el.mensajeGlobal, "exito", "Producto eliminado del catálogo.");
    } catch (error) {
        console.error("Error al eliminar el producto:", error);
        mostrarMensaje(el.mensajeGlobal, "error", "No se pudo eliminar el producto.");
    }
}

function configurarEventos() {
    el.form.addEventListener("submit", guardarProducto);
    el.botonCancelar.addEventListener("click", limpiarFormulario);
    el.botonRecargar.addEventListener("click", cargarProductos);
    el.botonIniciales.addEventListener("click", cargarCatalogoInicial);
    el.botonNuevo.addEventListener("click", () => {
        limpiarFormulario();
        el.contenedorForm.hidden = false;
        el.botonCancelar.hidden = false;
        el.nombre.focus();
        el.contenedorForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    el.busqueda.addEventListener("input", pintarTabla);
    el.filtroDisponibilidad.addEventListener("change", pintarTabla);
    el.tabla.addEventListener("click", (evento) => {
        const boton = evento.target.closest("button[data-accion]");
        if (!boton) return;
        if (boton.dataset.accion === "editar") prepararEdicion(boton.dataset.id);
        if (boton.dataset.accion === "eliminar") eliminarProducto(boton.dataset.id);
    });
}

export async function iniciarGestionProductos() {
    try {
        const { usuario, perfil } = await obtenerSesion();
        if (!usuario || perfil?.role !== "personal") return;

        pintarUsuario(el.usuario, usuario);
        el.contenido.hidden = false;
        el.contenedorForm.hidden = true;
        configurarEventos();
        await cargarProductos();
    } catch (error) {
        console.error("No se pudo iniciar la gestión del catálogo:", error);
        mostrarMensaje(el.mensajeGlobal, "error", "No se pudo verificar tu sesión. Vuelve a iniciar sesión.");
    }
}
