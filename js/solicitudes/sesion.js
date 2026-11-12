import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db, observeAuth } from "../firebase.js";

function esperarUsuario() {
    return new Promise((resolve) => {
        const cancelar = observeAuth((usuario) => {
            cancelar();
            resolve(usuario);
        });
    });
}

export async function obtenerSesion() {
    const usuario = await esperarUsuario();
    if (!usuario) return { usuario: null, perfil: null };

    const snap = await getDoc(doc(db, "usuarios", usuario.uid));
    if (!snap.exists()) return { usuario, perfil: null };

    const datos = snap.data();
    const nombreCompleto = [datos.nombre, datos.apellido].filter(Boolean).join(" ") || usuario.email;
    return { usuario, perfil: { ...datos, nombreCompleto } };
}
