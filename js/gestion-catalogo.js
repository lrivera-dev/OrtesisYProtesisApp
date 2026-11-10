import { protegerPagina, configurarCerrarSesion } from "./proteccion.js";
import { iniciarGestionProductos } from "./gestion-productos.js";

protegerPagina(["personal"]);
configurarCerrarSesion();
iniciarGestionProductos();
