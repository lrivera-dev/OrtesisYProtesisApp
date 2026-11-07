import { loginUser, logoutUser } from "./firebase.js";

const loginForm = document.getElementById("loginForm");
const authStatus = document.getElementById("authStatus");

const vistasPorRol = {
    cliente: "mis-solicitudes.html",
    personal: "panel-personal.html"
};

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const boton = loginForm.querySelector('button[type="submit"]');
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    boton.disabled = true;
    authStatus.textContent = "Iniciando sesión…";

    try {
        const { profile } = await loginUser(email, password);
        const destino = vistasPorRol[profile.role];

        if (!destino) {
            await logoutUser();
            throw new Error("La cuenta tiene un rol no reconocido.");
        }

        window.location.assign(destino);
    } catch (error) {
        authStatus.textContent =
            "No se pudo iniciar sesión. Revisa tus datos e inténtalo de nuevo.";
        console.error("Error de inicio de sesión:", error);
    } finally {
        boton.disabled = false;
    }
});