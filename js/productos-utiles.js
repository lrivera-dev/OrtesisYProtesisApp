// Acepta el nombre usado por el catálogo actual y el campo anterior durante la transición.
export function productoDisponible(producto) {
    return [producto.disponibilidad, producto.disponible]
        .every((valor) => valor === undefined || valor === true);
}
