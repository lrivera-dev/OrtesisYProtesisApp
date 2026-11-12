export function productoDisponible(producto) {
    return [producto.disponibilidad, producto.disponible]
        .every((valor) => valor === undefined || valor === true);
}
