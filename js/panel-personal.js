import {
    protegerPagina,
    configurarCerrarSesion
} from "./proteccion.js";

protegerPagina(["personal"]);
configurarCerrarSesion();