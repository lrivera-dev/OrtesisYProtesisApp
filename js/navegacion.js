import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db, observeAuth, logoutUser } from "./firebase.js";

const encabezado = document.querySelector("header");
const listaNavegacion = encabezado?.querySelector("nav ul");
let enlaceInicioSesion = encabezado?.querySelector('a[href="login.html"]');

if (encabezado && listaNavegacion && enlaceInicioSesion) {
    const enlacesPublicos = Array.from(listaNavegacion.children, (item) => item.cloneNode(true));
    const enlaceInicioSesionOriginal = enlaceInicioSesion.cloneNode(true);
    let contenedorSesion = null;
    let uidProcesado = null;

    function crearEnlace({ texto, destino, actual }) {
        const elemento = document.createElement("a");
        elemento.className = `nav-link${actual ? " active" : ""}`;
        elemento.href = destino;
        elemento.textContent = texto;
        if (actual) elemento.setAttribute("aria-current", "page");

        const item = document.createElement("li");
        item.append(elemento);
        return item;
    }

    function pintarEnlaces(rol) {
        const paginaActual = window.location.pathname.split("/").pop() || "index.html";
        const enlacesPorRol = {
            cliente: [
                { texto: "Inicio", destino: "index.html" },
                { texto: "Productos", destino: "productos.html" },
                { texto: "Mis solicitudes", destino: "mis-solicitudes.html" }
            ],
            personal: [
                { texto: "Solicitudes", destino: "panel-personal.html" },
                { texto: "Catálogo", destino: "gestion-catalogo.html" },
                { texto: "Ver sitio", destino: "productos.html" }
            ]
        };

        const enlaces = enlacesPorRol[rol];
        if (!enlaces) {
            listaNavegacion.replaceChildren(...enlacesPublicos.map((item) => item.cloneNode(true)));
            return;
        }

        listaNavegacion.replaceChildren(...enlaces.map((enlace) => crearEnlace({
            ...enlace,
            actual: paginaActual === enlace.destino
        })));
    }

    function restaurarAccesoPublico() {
        pintarEnlaces(null);
        if (contenedorSesion) {
            contenedorSesion.replaceWith(enlaceInicioSesionOriginal);
            contenedorSesion = null;
            enlaceInicioSesion = enlaceInicioSesionOriginal;
        }
    }

    function mostrarSesion(usuario, perfil) {
        const rol = perfil?.role;
        const nombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ") || usuario.email;
        pintarEnlaces(rol);

        if (!contenedorSesion) {
            contenedorSesion = document.createElement("div");
            contenedorSesion.className = "sesion sesion-publica";

            const indicador = document.createElement("span");
            indicador.className = "usuario-correo";
            indicador.setAttribute("aria-live", "polite");

            const salir = document.createElement("button");
            salir.type = "button";
            salir.className = "nav-link button";
            salir.textContent = "Cerrar sesión";
            salir.addEventListener("click", async () => {
                salir.disabled = true;
                try {
                    await logoutUser();
                } catch (error) {
                    console.error("No se pudo cerrar la sesión:", error);
                    salir.disabled = false;
                }
            });

            contenedorSesion.append(indicador, salir);
            enlaceInicioSesion.replaceWith(contenedorSesion);
            enlaceInicioSesion = null;
        }

        const indicador = contenedorSesion.querySelector(".usuario-correo");
        indicador.textContent = `Sesión iniciada · ${nombre}`;
    }

    observeAuth(async (usuario) => {
        if (!usuario) {
            uidProcesado = null;
            restaurarAccesoPublico();
            return;
        }

        uidProcesado = usuario.uid;
        try {
            const perfilSnapshot = await getDoc(doc(db, "usuarios", usuario.uid));
            if (uidProcesado !== usuario.uid) return;
            mostrarSesion(usuario, perfilSnapshot.exists() ? perfilSnapshot.data() : null);
        } catch (error) {
            console.error("No se pudo cargar el perfil para la navegación:", error);
            if (uidProcesado === usuario.uid) mostrarSesion(usuario, null);
        }
    });
}
