import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from "./firebase.js";
import { productoDisponible } from "./productos-utiles.js";

let productosActuales = [];

const contenedorProductos = document.getElementById("contenedor-productos");
const contadorModelos = document.getElementById("contador-modelos");
const botonesFiltro = document.querySelectorAll(".filter-btn");

function elemento(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    if (texto) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
}

function tarjetaProducto(producto) {
    const tarjeta = elemento("article", null, "producto-tarjeta");
    tarjeta.append(elemento("span", producto.etiqueta ?? producto.categoria, "product-tag-top"));

    const contenedorImagen = elemento("div", null, "product-img-container");
    const imagen = elemento("img");
    imagen.src = producto.imagen || "img/productos/protesis1.png";
    imagen.alt = producto.nombre ? `Imagen de ${producto.nombre}` : "Producto ortopédico";
    imagen.loading = "lazy";
    contenedorImagen.append(imagen);

    const contenido = elemento("div", null, "producto-contenido");
    contenido.append(
        elemento("h3", producto.nombre || "Producto"),
        elemento("p", producto.descripcion || "Consulta con nuestro personal para conocer más detalles.")
    );

    const especificaciones = elemento("div", null, "product-specs");
    (Array.isArray(producto.specs) ? producto.specs : []).slice(0, 2).forEach((spec) => {
        especificaciones.append(elemento("span", spec));
    });
    contenido.append(especificaciones);

    const disponible = productoDisponible(producto);
    contenido.append(elemento(
        "p",
        disponible ? "Disponible" : "No disponible",
        disponible ? "producto-disponibilidad disponible" : "producto-disponibilidad agotado"
    ));

    if (disponible && producto.id) {
        const solicitar = elemento("a", "Agendar evaluación", "btn-consultar");
        solicitar.href = `mis-solicitudes.html?producto=${encodeURIComponent(producto.id)}`;
        contenido.append(solicitar);
    } else {
        contenido.append(elemento("span", "No disponible para evaluación", "btn-consultar producto-no-disponible"));
    }

    tarjeta.append(contenedorImagen, contenido);
    return tarjeta;
}

function renderizarCatalogo(productos) {
    contadorModelos.textContent = `${productos.length} ${productos.length === 1 ? "modelo" : "modelos"}`;
    if (!productos.length) {
        const vacio = elemento("p", "No hay productos en esta categoría.");
        vacio.style.textAlign = "center";
        vacio.style.gridColumn = "1 / -1";
        contenedorProductos.replaceChildren(vacio);
        return;
    }
    contenedorProductos.replaceChildren(...productos.map(tarjetaProducto));
}

function configurarFiltros() {
    botonesFiltro.forEach((boton) => {
        boton.addEventListener("click", (evento) => {
            evento.preventDefault();
            botonesFiltro.forEach((otro) => otro.classList.remove("active"));
            boton.classList.add("active");

            const categoria = boton.getAttribute("href").slice(1);
            const filtrados = categoria === "todos"
                ? productosActuales
                : productosActuales.filter((producto) => producto.categoria === categoria);
            renderizarCatalogo(filtrados);
        });
    });
}

async function inicializarCatalogo() {
    contenedorProductos.replaceChildren(elemento("p", "Cargando catálogo…"));
    try {
        const snapshot = await getDocs(collection(db, "productos"));
        productosActuales = snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data()
        }));
        renderizarCatalogo(productosActuales);
    } catch (error) {
        console.error("Error cargando el catálogo:", error);
        const mensaje = elemento("p", "No se pudo cargar el catálogo. Intenta de nuevo más tarde.");
        mensaje.style.textAlign = "center";
        mensaje.style.gridColumn = "1 / -1";
        contenedorProductos.replaceChildren(mensaje);
    }
}

configurarFiltros();
inicializarCatalogo();
