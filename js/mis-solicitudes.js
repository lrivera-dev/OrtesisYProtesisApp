import {
    protegerPagina,
    configurarCerrarSesion
} from "./proteccion.js";
import { iniciarVistaCliente } from "./solicitudes/vista-cliente.js";

protegerPagina(["cliente"]);
configurarCerrarSesion();
iniciarVistaCliente();
