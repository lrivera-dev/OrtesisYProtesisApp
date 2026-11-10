import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
    auth,
    db,
    observeAuth,
    logoutUser
} from "./firebase.js";

const vistaPorRol = {
    cliente: "mis-solicitudes.html",
    personal: "panel-personal.html"
};

function rutaLogin() {
    const productoId = new URLSearchParams(window.location.search).get("producto");
    if (window.location.pathname.endsWith("/mis-solicitudes.html") && productoId) {
        return `login.html?producto=${encodeURIComponent(productoId)}`;
    }
    return "login.html";
}

export function protegerPagina(rolesPermitidos) {
    let ultimoUidProcesado = null;

    return observeAuth(async (user) => {
        if (!user) {
            window.location.replace(rutaLogin());
            return;
        }

        if (ultimoUidProcesado === user.uid) {
            return;
        }

        ultimoUidProcesado = user.uid;

        try {
            const profileSnapshot = await getDoc(
                doc(db, "usuarios", user.uid)
            );

            if (!profileSnapshot.exists()) {
                await logoutUser();
                window.location.replace(rutaLogin());
                return;
            }

            const profile = profileSnapshot.data();

            if (!rolesPermitidos.includes(profile.role)) {
                const destino = vistaPorRol[profile.role];

                if (destino) {
                    window.location.replace(destino);
                } else {
                    await logoutUser();
                    window.location.replace("login.html");
                }
            }
        } catch (error) {
            console.error("No se pudo validar la sesión:", error);
            window.location.replace(rutaLogin());
        }
    });
}

export function configurarCerrarSesion(buttonId = "logoutButton") {
    const boton = document.getElementById(buttonId);

    if (!boton) {
        return;
    }

    boton.addEventListener("click", async (event) => {
        event.preventDefault();

        try {
            await logoutUser();
            window.location.replace("login.html");
        } catch (error) {
            console.error("No se pudo cerrar la sesión:", error);
        }
    });
}
