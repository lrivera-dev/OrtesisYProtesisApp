import { registerUser } from "./firebase.js";

const registerForm = document.getElementById("registerForm");
const authStatus = document.getElementById("authStatus");
const productoSolicitado = new URLSearchParams(window.location.search).get("producto");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const boton = registerForm.querySelector('button[type="submit"]');

    const nombre = document.getElementById("registerNombre").value.trim();
    const apellido = document.getElementById("registerApellido").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    boton.disabled = true;
    authStatus.textContent = "Creando tu cuenta…";

    try {
        await registerUser({ nombre, apellido, email, password });

        authStatus.textContent = "Cuenta creada. Abriendo tus solicitudes…";
        const destino = productoSolicitado
            ? `mis-solicitudes.html?producto=${encodeURIComponent(productoSolicitado)}`
            : "mis-solicitudes.html";
        window.location.assign(destino);
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            authStatus.textContent = "Ya existe una cuenta con ese correo.";
        } else if (error.code === "auth/weak-password") {
            authStatus.textContent = "La contraseña debe tener al menos 6 caracteres.";
        } else if (error.code === "auth/invalid-email") {
            authStatus.textContent = "Escribe un correo electrónico válido.";
        } else {
            authStatus.textContent =
                "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.";
            console.error("Error de registro:", error);
        }
    } finally {
        boton.disabled = false;
    }
});
