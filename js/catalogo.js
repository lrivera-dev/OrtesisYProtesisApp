import { db } from './firebase.js';
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. Datos iniciales (Mock data que subiremos a la nube la primera vez)
const productosMock = [
    { categoria: 'rodillas', etiqueta: 'ÓRTESIS DE RODILLA', imagen: 'img/productos/protesis1.png', nombre: 'Órtesis de Rodilla Post-Quirúrgica OrtoFlex Pro', descripcion: 'Articulaciones policéntricas regulables en flexo-extensión con barras de duraluminio aeronáutico y almohadillas termoformadas.', specs: ['Rango 0°-120°', 'Fijación milimétrica'], disponibilidad: true },
    { categoria: 'rodillas', etiqueta: 'ÓRTESIS DE RODILLA', imagen: 'img/productos/protesis2.png', nombre: 'Rodillera de Descarga Unicompartimental OsteoRelief', descripcion: 'Sistema correctivo biomecánico de 3 puntos de palanca para artrosis de rodilla grado I-IV.', specs: ['Descarga 3 Puntos', 'Alineación Asistida'], disponibilidad: true },
    { categoria: 'rodillas', etiqueta: 'ÓRTESIS DE RODILLA', imagen: 'img/productos/protesis3.png', nombre: 'Estabilizador Rotuliano ActiveSport', descripcion: 'Rodillera deportiva con anillo de silicona de alta densidad para control de la rótula en la actividad física.', specs: ['Anillo de Silicona', 'Neopreno Breathe'], disponibilidad: true },
    { categoria: 'pies', etiqueta: 'ÓRTESIS DE TOBILLO', imagen: 'img/productos/protesis4.png', nombre: 'Férula Estabilizadora Dinámica AFO Matrix', descripcion: 'Diseño ultraligero en fibra de carbono preimpregnado con retorno elástico optimizado.', specs: ['Fibra de Carbono 100%', 'Retorno Asistido'], disponibilidad: true },
    { categoria: 'pies', etiqueta: 'ÓRTESIS DE TOBILLO', imagen: 'img/productos/protesis5.png', nombre: 'Tobillera Estabilizadora MalleoShield', descripcion: 'Valvas laterales rígidas anatómicas con forro de gel frío para esguinces severos de grado II y III.', specs: ['Valvas Anatómicas', 'Terapia de Gel'], disponibilidad: true },
    { categoria: 'pies', etiqueta: 'ÓRTESIS DE TOBILLO', imagen: 'img/productos/protesis6.png', nombre: 'Bota Walker Fija ProGuard', descripcion: 'Estructura rígida de soporte tibial con suela mecedora antideslizante para inmovilización post-operatoria.', specs: ['Suela Mecedora', 'Rigidez Total'], disponibilidad: true },
    { categoria: 'superior', etiqueta: 'PRÓTESIS DE MIEMBRO SUPERIOR', imagen: 'img/productos/protesis7.png', nombre: 'Mano Biónica Mioeléctrica Multi-Articular NeuroGrip', descripcion: '5 motores independientes controlados por señales mioeléctricas superficiales del muñón.', specs: ['14 Patrones de Agarre', 'Retroalimentación Háptica'], disponibilidad: true },
    { categoria: 'superior', etiqueta: 'PRÓTESIS DE MIEMBRO SUPERIOR', imagen: 'img/productos/protesis8.png', nombre: 'Prótesis Transradial Mio-Flex Estética', descripcion: 'Socket ergonómico de silicona biomédica con electrodos integrados y guante cosmético personalizado.', specs: ['Silicona Biomédica', 'Sensor Mioeléctrico'], disponibilidad: true },
    { categoria: 'superior', etiqueta: 'PRÓTESIS DE MIEMBRO SUPERIOR', imagen: 'img/productos/protesis9.png', nombre: 'Prótesis Mecánica por Cable WorkHand', descripcion: 'Dispositivo de accionamiento corporal mediante arnés de hombro y cable de tracción de alta resistencia.', specs: ['Accionamiento Corporal', 'Alta Resistencia'], disponibilidad: true },
    { categoria: 'inferior', etiqueta: 'PRÓTESIS DE MIEMBRO INFERIOR', imagen: 'img/productos/protesis10.png', nombre: 'Prótesis Transtibial Apex Active con Vacío', descripcion: 'Encaje distal sellado térmicamente con suspensión activa por bomba mecánica y pie dinámico de carbono.', specs: ['Vacío Activo de Presión', 'Pie Dinámico Multicapa'], disponibilidad: true },
    { categoria: 'inferior', etiqueta: 'PRÓTESIS DE MIEMBRO INFERIOR', imagen: 'img/productos/protesis11.png', nombre: 'Prótesis Transfemoral Biónica K-Sensor', descripcion: 'Rodilla hidráulica inteligente con microprocesadores y giroscopios en tiempo real.', specs: ['Kit Biónico C-HR', 'Resistente al Agua IP67'], disponibilidad: true },
    { categoria: 'inferior', etiqueta: 'PRÓTESIS DE MIEMBRO INFERIOR', imagen: 'img/productos/protesis12.png', nombre: 'Lámina de Carrera Transtibial Cheetah Sprint', descripcion: 'Ballesta aerodinámica de fibra de carbono aeroespacial de grado militar diseñada para atletas.', specs: ['Carbono Aeroespacial', '92% Retorno Elástico'], disponibilidad: true }
];

// Arreglo global para almacenar lo que descargamos de Firebase
let productosActuales = [];

// 2. Referencias al DOM
const contenedorProductos = document.getElementById('contenedor-productos');
const contadorModelos = document.getElementById('contador-modelos');
const botonesFiltro = document.querySelectorAll('.filter-btn');

// 3. Función para renderizar tarjetas
function renderizarCatalogo(productos) {
    contenedorProductos.innerHTML = '';
    contadorModelos.textContent = `${productos.length} modelos`;

    if (productos.length === 0) {
        contenedorProductos.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">No se encontraron dispositivos.</p>';
        return;
    }

    productos.forEach(producto => {
        const htmlTarjeta = `
            <div class="producto-tarjeta">
                <span class="product-tag-top">${producto.etiqueta}</span>
                <div class="product-img-container">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                </div>
                <div class="producto-contenido">
                    <h3>${producto.nombre}</h3>
                    <p>${producto.descripcion}</p>
                    <div class="product-specs">
                        <span>${producto.specs[0]}</span>
                        <span>${producto.specs[1]}</span>
                    </div>
                    <p style="margin-top: 10px; font-weight: 600; color: ${producto.disponibilidad ? 'var(--primary-color)' : 'red'};">
                        ${producto.disponibilidad ? 'Disponible' : 'No disponible'}
                    </p>
                    <a href="contacto.html" class="btn-consultar">Consultar disponibilidad</a>
                </div>
            </div>
        `;
        contenedorProductos.insertAdjacentHTML('beforeend', htmlTarjeta);
    });
}

// 4. Lógica de Filtros 
botonesFiltro.forEach(boton => {
    boton.addEventListener('click', (e) => {
        e.preventDefault();
        
        botonesFiltro.forEach(b => b.classList.remove('active'));
        boton.classList.add('active');

        const categoriaFiltro = boton.getAttribute('href').substring(1);

        let productosFiltrados = productosActuales;
        if (categoriaFiltro !== 'todos') {
            productosFiltrados = productosActuales.filter(p => p.categoria === categoriaFiltro);
        }

        renderizarCatalogo(productosFiltrados);
    });
});

// 5. Carga asíncrona desde Firebase
async function inicializarCatalogo() {
    try {
        // Mensaje de carga mientras esperamos a Firebase
        contenedorProductos.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">Cargando catálogo...</p>';

        const productosRef = collection(db, 'productos');
        let snapshot = await getDocs(productosRef);

        // Si la base de datos está vacía, sembramos los datos iniciales
        if (snapshot.empty) {
            console.log("Subiendo catálogo inicial a Firebase...");
            for (const prod of productosMock) {
                await addDoc(productosRef, prod);
            }
            snapshot = await getDocs(productosRef); // Volver a descargar
        }

        // Mapear los documentos a nuestro arreglo
        productosActuales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Renderizar la vista
        renderizarCatalogo(productosActuales);

    } catch (error) {
        console.error("Error cargando el catálogo:", error);
        contenedorProductos.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">Error al cargar los productos. Por favor, revisa tu conexión.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarCatalogo();
});