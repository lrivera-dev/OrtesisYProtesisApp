import { db } from './firebase.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const formProducto = document.getElementById('form-producto');
const tablaBody = document.getElementById('tabla-productos-body');
const btnCancelar = document.getElementById('btn-cancelar-prod');
const btnGuardar = document.getElementById('btn-guardar-prod');

const inputId = document.getElementById('prod-id');
const inputNombre = document.getElementById('prod-nombre');
const inputCategoria = document.getElementById('prod-categoria');
const inputDescripcion = document.getElementById('prod-descripcion');
const inputImagen = document.getElementById('prod-imagen');
const inputDisponibilidad = document.getElementById('prod-disponibilidad');

let listaProductos = [];

async function cargarProductos() {
    try {
        tablaBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando inventario...</td></tr>';
        const snapshot = await getDocs(collection(db, 'productos'));
        
        listaProductos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderizarTabla();
    } catch (error) {
        console.error("Error al cargar productos:", error);
        tablaBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
    }
}

function renderizarTabla() {
    tablaBody.innerHTML = '';
    if (listaProductos.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay productos registrados.</td></tr>';
        return;
    }

    listaProductos.forEach(prod => {
        const categoriasNombres = {
            'rodillas': 'Órtesis de rodilla',
            'pies': 'Órtesis de tobillo',
            'superior': 'Prótesis Sup.',
            'inferior': 'Prótesis Inf.'
        };

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><strong>${prod.nombre}</strong></td>
            <td>${categoriasNombres[prod.categoria] || prod.categoria}</td>
            <td>
                <span style="color: ${prod.disponibilidad ? 'green' : 'red'}; font-weight: bold;">
                    ${prod.disponibilidad ? 'Disponible' : 'Agotado'}
                </span>
            </td>
            <td style="display: flex; gap: 8px;">
                <button class="btn-editar" data-id="${prod.id}" style="background: #0056b3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">Editar</button>
                <button class="btn-eliminar" data-id="${prod.id}" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;">Eliminar</button>
            </td>
        `;
        tablaBody.appendChild(fila);
    });

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', (e) => prepararEdicion(e.target.dataset.id));
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => eliminarProducto(e.target.dataset.id));
    });
}

formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const etiquetas = {
        'rodillas': 'ÓRTESIS DE RODILLA',
        'pies': 'ÓRTESIS DE TOBILLO',
        'superior': 'PRÓTESIS DE MIEMBRO SUPERIOR',
        'inferior': 'PRÓTESIS DE MIEMBRO INFERIOR'
    };

    const productoData = {
        nombre: inputNombre.value,
        categoria: inputCategoria.value,
        etiqueta: etiquetas[inputCategoria.value],
        descripcion: inputDescripcion.value,
        imagen: inputImagen.value,
        disponibilidad: inputDisponibilidad.value === 'true',
        specs: ['Especificación 1', 'Especificación 2'] // Valores por defecto simples
    };

    try {
        if (inputId.value) {
            await updateDoc(doc(db, 'productos', inputId.value), productoData);
            alert('Producto actualizado correctamente');
        } else {
            await addDoc(collection(db, 'productos'), productoData);
            alert('Producto agregado al catálogo');
        }
        
        limpiarFormulario();
        await cargarProductos();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert('Hubo un error al guardar el producto.');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Producto';
    }
});

function prepararEdicion(id) {
    const producto = listaProductos.find(p => p.id === id);
    if (!producto) return;

    inputId.value = producto.id;
    inputNombre.value = producto.nombre;
    inputCategoria.value = producto.categoria;
    inputDescripcion.value = producto.descripcion;
    inputImagen.value = producto.imagen;
    inputDisponibilidad.value = producto.disponibilidad ? 'true' : 'false';

    btnGuardar.textContent = 'Actualizar Producto';
    btnCancelar.style.display = 'block';
    
    formProducto.scrollIntoView({ behavior: 'smooth' });
}

async function eliminarProducto(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto del catálogo? Esta acción no se puede deshacer.')) {
        try {
            await deleteDoc(doc(db, 'productos', id));
            alert('Producto eliminado');
            await cargarProductos();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert('No se pudo eliminar el producto.');
        }
    }
}

btnCancelar.addEventListener('click', limpiarFormulario);

function limpiarFormulario() {
    formProducto.reset();
    inputId.value = '';
    btnGuardar.textContent = 'Guardar Producto';
    btnCancelar.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', cargarProductos);