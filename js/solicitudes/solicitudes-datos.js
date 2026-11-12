import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    arrayUnion,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { db } from "../firebase.js";
import { ESTADOS } from "./estados.js";
import { normalizarTelefono } from "./validaciones.js";
import { productoDisponible } from "../productos-utiles.js";

const COLECCION = "solicitudes";
const COLECCION_PRODUCTOS = "productos";
const solicitudesRef = collection(db, COLECCION);

function fallo(error) {
    console.error(error);
    return { exito: false, error: error.message, codigo: error.code ?? "" };
}

function mapearDocumentos(snapshot) {
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Campos que el cliente puede escribir al crear o editar.
function datosEditables({ tipo, productoId, productoNombre, telefono, descripcion, preferenciaHorario, fechaPreferida }) {
    const esProducto = tipo === "producto";
    return {
        tipo,
        productoId: esProducto ? productoId : null,
        productoNombre: esProducto ? productoNombre : "Evaluación personalizada",
        telefono: normalizarTelefono(telefono),
        descripcion: descripcion.trim(),
        preferenciaHorario: (preferenciaHorario ?? "").trim(),
        fechaPreferida: Timestamp.fromDate(fechaPreferida instanceof Date ? fechaPreferida : new Date(fechaPreferida))
    };
}

function nuevaSolicitud(usuario, perfil, datos) {
    return {
        clienteId: usuario.uid,
        clienteNombre: perfil.nombreCompleto,
        clienteEmail: usuario.email,
        ...datosEditables(datos),
        estado: ESTADOS.PENDIENTE,
        fechaPropuesta: null,
        fechaCita: null,
        notas: [],
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
    };
}

// Productos disponibles del catálogo para relacionarlos con la solicitud.
export async function obtenerProductosDisponibles() {
    try {
        const snapshot = await getDocs(collection(db, COLECCION_PRODUCTOS));
        const data = mapearDocumentos(snapshot)
            .filter(productoDisponible)
            .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
        return { exito: true, data };
    } catch (error) {
        return fallo(error);
    }
}

export async function crearSolicitud(usuario, perfil, datos) {
    try {
        const ref = await addDoc(solicitudesRef, nuevaSolicitud(usuario, perfil, datos));
        return { exito: true, data: { id: ref.id } };
    } catch (error) {
        return fallo(error);
    }
}

// Cliente: el filtro por clienteId es obligatorio; las reglas rechazan consultas más amplias.
export async function obtenerMisSolicitudes(uid) {
    try {
        const consulta = query(solicitudesRef, where("clienteId", "==", uid));
        return { exito: true, data: mapearDocumentos(await getDocs(consulta)) };
    } catch (error) {
        return fallo(error);
    }
}

// Personal: solo este rol tiene permiso de leer todas.
export async function obtenerTodasLasSolicitudes() {
    try {
        return { exito: true, data: mapearDocumentos(await getDocs(solicitudesRef)) };
    } catch (error) {
        return fallo(error);
    }
}

// Lectura de un solo documento por su ID (se usa antes de editar para trabajar con el estado actual).
export async function obtenerSolicitudPorId(id) {
    try {
        const resultado = await getDoc(doc(db, COLECCION, id));
        if (!resultado.exists()) {
            return { exito: false, error: "La solicitud no existe.", codigo: "not-found" };
        }
        return { exito: true, data: { id: resultado.id, ...resultado.data() } };
    } catch (error) {
        return fallo(error);
    }
}

// Cliente: edita los datos mientras la solicitud siga pendiente.
export async function actualizarSolicitudCliente(id, datos) {
    try {
        await updateDoc(doc(db, COLECCION, id), {
            ...datosEditables(datos),
            estado: ESTADOS.PENDIENTE,
            actualizadoEn: serverTimestamp()
        });
        return { exito: true };
    } catch (error) {
        return fallo(error);
    }
}

export async function cancelarSolicitud(id) {
    try {
        await updateDoc(doc(db, COLECCION, id), {
            estado: ESTADOS.CANCELADA,
            actualizadoEn: serverTimestamp()
        });
        return { exito: true };
    } catch (error) {
        return fallo(error);
    }
}

// Cliente: acepta el horario propuesto por el personal o envía otra fecha preferida.
export async function responderPropuestaCliente(id, { aceptar, fechaPreferida }) {
    try {
        const ref = doc(db, COLECCION, id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) return { exito: false, error: "La solicitud no existe.", codigo: "not-found" };
        const solicitud = snapshot.data();
        if (solicitud.estado !== ESTADOS.PROPUESTA_ENVIADA || !solicitud.fechaPropuesta) {
            return { exito: false, error: "La propuesta ya no está disponible.", codigo: "failed-precondition" };
        }

        const cambios = aceptar
            ? { estado: ESTADOS.CITA_CONFIRMADA, fechaCita: solicitud.fechaPropuesta }
            : {
                estado: ESTADOS.PENDIENTE,
                fechaPreferida: Timestamp.fromDate(fechaPreferida instanceof Date ? fechaPreferida : new Date(fechaPreferida)),
                fechaPropuesta: null,
                fechaCita: null
            };
        await updateDoc(ref, { ...cambios, actualizadoEn: serverTimestamp() });
        return { exito: true };
    } catch (error) {
        return fallo(error);
    }
}

// Borrado físico (permanente). Las reglas solo lo permiten en estados sin trabajo del taller.
export async function eliminarSolicitud(id) {
    try {
        await deleteDoc(doc(db, COLECCION, id));
        return { exito: true };
    } catch (error) {
        return fallo(error);
    }
}

// Personal: cambia el estado y/o agrega una nota de seguimiento al final del historial.
export async function actualizarSeguimiento(id, { nuevoEstado, nota, autor, fechaCita, fechaPropuesta }) {
    try {
        const cambios = {
            estado: nuevoEstado,
            actualizadoEn: serverTimestamp()
        };
        if (fechaCita !== undefined) cambios.fechaCita = fechaCita;
        if (fechaPropuesta !== undefined) cambios.fechaPropuesta = fechaPropuesta;
        if (nota) {
            cambios.notas = arrayUnion({
                texto: nota.trim(),
                autor,
                estado: nuevoEstado,
                fecha: Timestamp.now()
            });
        }
        await updateDoc(doc(db, COLECCION, id), cambios);
        return { exito: true };
    } catch (error) {
        return fallo(error);
    }
}

// Datos iniciales: crea solicitudes de ejemplo a nombre del cliente que ha iniciado sesión.
export async function crearSolicitudesDemo(usuario, perfil, productos) {
    const ejemplos = [
        {
            tipo: "evaluacion",
            telefono: "7614-0404",
            descripcion: "Quisiera una evaluación para saber qué órtesis de tobillo se adapta a mis necesidades."
        },
        {
            tipo: "producto",
            producto: productos[0],
            telefono: "2250-1234",
            descripcion: "Me interesa este producto y quisiera coordinar una evaluación y toma de medidas."
        },
        {
            tipo: "producto",
            producto: productos[1] ?? productos[0],
            telefono: "6012-9876",
            descripcion: "Quisiera saber si este producto puede adaptarse a mi caso y agendar una evaluación."
        }
    ].filter((e) => e.tipo === "evaluacion" || e.producto);

    try {
        const lote = writeBatch(db);
        for (const [indice, ejemplo] of ejemplos.entries()) {
            const fechaPreferida = new Date();
            fechaPreferida.setDate(fechaPreferida.getDate() + 7 + indice);
            fechaPreferida.setHours(10 + indice, 0, 0, 0);
            lote.set(doc(solicitudesRef), nuevaSolicitud(usuario, perfil, {
                ...ejemplo,
                productoId: ejemplo.producto?.id,
                productoNombre: ejemplo.producto?.nombre,
                fechaPreferida
            }));
        }
        await lote.commit();
        return { exito: true, data: { total: ejemplos.length } };
    } catch (error) {
        return fallo(error);
    }
}
