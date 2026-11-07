import {
    protegerPagina,
    configurarCerrarSesion
} from "./proteccion.js";

protegerPagina(["cliente"]);
configurarCerrarSesion();