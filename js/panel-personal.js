import {
    protegerPagina,
    configurarCerrarSesion
} from "./proteccion.js";
import { iniciarVistaPersonal } from "./solicitudes/vista-personal.js";

protegerPagina(["personal"]);
configurarCerrarSesion();
iniciarVistaPersonal();
