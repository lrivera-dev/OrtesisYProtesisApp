# Gestión de solicitudes de órtesis y prótesis

Aplicación web para que clientes consulten el catálogo de OrtoVida y soliciten coordinar una evaluación. El personal acuerda la cita, registra cuándo se atendió y administra el catálogo.

Este proyecto amplía el sitio estático desarrollado para el Desafío Práctico I de Desarrollo Web. La aplicación se desarrollará como parte del **Desafío Práctico II — Desarrollo Web I**, Ingeniería de Software y Negocios Digitales, ESEN.

> **Estado:** módulos de autenticación, catálogo y solicitudes implementados. Falta completar la verificación integral con las reglas publicadas y preparar la demo final.

## Problema que resuelve

El sitio informativo permite conocer los servicios y productos, pero no permite enviar una solicitud con una cuenta, dar seguimiento a su estado ni gestionar las solicitudes desde el personal de OrtoVida. Esta aplicación busca organizar ese flujo en un solo lugar.

## Roles

- **Cliente:** se registra e inicia sesión, consulta el catálogo, solicita una evaluación de un producto o general, indica sus horarios preferidos y consulta el estado y la fecha confirmada.
- **Personal:** consulta solicitudes en una tabla, coordina y confirma citas, registra si fueron atendidas y administra los productos del catálogo.

El registro público creará cuentas de cliente. El rol de personal será asignado de forma controlada, no elegido por el usuario durante el registro. Los permisos deberán aplicarse en las reglas de seguridad de Firebase, además de adaptar la interfaz al rol.

## Procesos principales

1. **Catálogo y solicitud:** el cliente consulta los productos y solicita coordinar una evaluación relacionada con un producto o una evaluación general.
2. **Coordinación y seguimiento:** el personal contacta al cliente, registra el horario acordado y marca la evaluación como atendida. El cliente consulta el estado desde su cuenta.
3. **Administración del catálogo:** el personal crea, consulta, actualiza o elimina productos disponibles.

Estados de solicitud: `Pendiente`, `Propuesta enviada`, `Cita confirmada`, `Atendida` y `Cancelada`. La solicitud coordina una evaluación y toma de medidas; no representa una compra ni una orden de fabricación.

## Entidades principales

- **Productos:** nombre, descripción, categoría, imagen y disponibilidad.
- **Solicitudes:** cliente, producto de interés, teléfono, disponibilidad preferida, descripción, estado, fecha de cita y notas de seguimiento.
- **Perfiles:** usuario autenticado, nombre y rol asignado.

Las solicitudes estarán relacionadas con el cliente que las creó y, cuando corresponda, con el producto solicitado. Para la demostración se utilizarán datos ficticios; no se pretende almacenar expedientes ni diagnósticos médicos.

## Tecnología

- HTML5 semántico
- CSS3 (Flexbox, CSS Grid y diseño adaptable)
- JavaScript nativo con módulos ES
- Firebase Authentication para registro e inicio de sesión
- Cloud Firestore para persistencia remota y reglas de seguridad
- Servicio de hosting por definir

Firebase es la plataforma propuesta para el proyecto. La aplicación no utilizará frameworks de interfaz como React, Angular o Vue ni un backend propio.

## Estructura actual y organización prevista

El sitio mantiene las páginas públicas originales y añade vistas conectadas a Firebase:

- `index.html` — página de inicio
- `productos.html` — catálogo visual del sitio, con productos cargados desde Firestore
- `nosotros.html` — información de la organización
- `contacto.html` — formulario estático de contacto, candidato a convertirse en formulario de solicitud
- `css/` — hojas de estilo por página y estilos compartidos
- `img/` — imágenes del sitio

Los módulos de autenticación, acceso a Firestore y comportamiento de cada vista están organizados dentro de `js/`.

## Requisitos para probar la aplicación

La aplicación usa el proyecto Firebase configurado en `js/firebase.js`. Para que Authentication y Firestore funcionen, sirve los archivos desde un servidor local y mantén publicadas las reglas correspondientes.

1. Clona el repositorio del equipo.
2. Sirve los archivos con un servidor local estático, por ejemplo Live Server en Visual Studio Code.
3. Usa cuentas de demostración de Firebase Authentication. El personal debe tener `role: "personal"` en `usuarios/{uid}`.
4. Publica `firestore.rules` en el proyecto Firebase antes de probar solicitudes y productos.
5. Si la colección `productos` está vacía, inicia sesión como personal y carga los productos de ejemplo desde **Catálogo**.

No publiques contraseñas ni credenciales privilegiadas en este repositorio.

## Módulo de solicitudes y seguimiento

- `productos.html` — catálogo público dinámico. Cada producto disponible lleva a `mis-solicitudes.html?producto=ID` para solicitar una evaluación.
- `mis-solicitudes.html` — vista del cliente: formulario para coordinar una evaluación y su historial. Permite cancelar, editar o eliminar mientras el estado lo permite.
- `panel-personal.html` — vista de solicitudes del personal: indicadores, filtros y tabla. El detalle permite acordar fecha y hora, reprogramar con una nota, marcar la evaluación como atendida o cancelar.
- `gestion-catalogo.html` — vista independiente del personal para buscar, filtrar, crear, editar, eliminar y cambiar la disponibilidad de productos; el formulario aparece al agregar o editar.
- `js/mis-solicitudes.js`, `js/panel-personal.js` y `js/gestion-catalogo.js` — protegen las vistas por rol (`protegerPagina`, `configurarCerrarSesion`) e inician cada módulo.
- `js/catalogo.js` — genera las tarjetas del catálogo público desde Firestore sin escribir en la base de datos.
- `js/gestion-productos.js` y `js/productos-iniciales.js` — CRUD del catálogo y datos de ejemplo que solo el personal puede cargar.
- `js/solicitudes/` — `estados.js` (flujo y reglas de negocio), `validaciones.js`, `procesamiento.js` (búsqueda, filtros, orden e indicadores), `solicitudes-datos.js` (servicio de Firestore: cada función devuelve `{ exito, data }` o `{ exito: false, error }`), `sesion.js` (usuario y perfil), `ui-comun.js`, `vista-cliente.js` y `vista-personal.js` (interfaz).
- `firestore.rules` — reglas de acceso para `usuarios`, `productos` y `solicitudes`.

Documento `solicitudes/{id}`: `clienteId`, `clienteNombre`, `clienteEmail`, `tipo` (`producto` | `evaluacion`), `productoId`, `productoNombre`, `telefono`, `preferenciaHorario`, `descripcion`, `fechaPreferida`, `fechaPropuesta`, `fechaCita`, `estado`, `notas` (lista de `{ texto, autor, estado, fecha }`), `creadoEn`, `actualizadoEn`.

Flujo: el cliente envía una fecha y hora preferidas con un selector de calendario. El personal puede confirmarlas directamente o enviar una alternativa (`Propuesta enviada`). El cliente acepta la propuesta para confirmar la cita o envía otra fecha, que vuelve a `Pendiente` para revisión. Al finalizar, el personal la marca como `Atendida`; cliente o personal pueden cancelarla antes. Así se coordina desde la aplicación sin depender de una llamada.

Las reglas verifican además: cada cliente autenticado con perfil `cliente` crea y consulta sus solicitudes; el producto relacionado debe existir y estar disponible; el personal no puede cambiar los datos del cliente ni saltarse estados; solo confirma citas con una fecha válida; las notas solo se agregan (no se editan ni borran); una evaluación atendida no puede reabrirse. El rol se lee de `usuarios/{uid}.role` (`cliente` o `personal`).

Datos de demostración: el catálogo ofrece al personal cargar los 12 productos de ejemplo cuando la colección está vacía. Si un cliente no tiene solicitudes, "Mis solicitudes" ofrece el botón **Crear solicitudes de ejemplo**, que genera tres solicitudes ficticias a su nombre.

## Seguridad y datos

- Las reglas de Firestore deben restringir a cada cliente a sus propias solicitudes.
- El personal podrá consultar y actualizar las solicitudes según su rol.
- Solo el personal podrá administrar productos.
- El rol de personal no se asignará desde el formulario de registro público.
- La configuración pública del SDK puede estar en el cliente; no se incluirán claves privadas, contraseñas ni credenciales privilegiadas.
- Se usarán datos ficticios para la evaluación.

## Equipo y colaboración

- Luis Rivera
- Rogelio
- Davo

Los tres integrantes deben realizar contribuciones identificables y sustanciales en el historial de GitHub, comprender los módulos del proyecto y poder explicar el funcionamiento completo de la aplicación.

El equipo organizará el trabajo con ramas para las funcionalidades y revisiones entre integrantes antes de integrarlas en la rama principal.

## Publicación

**URL de la aplicación:** pendiente de publicación.

La URL se añadirá cuando el despliegue esté realizado y se hayan verificado autenticación, permisos y persistencia en la versión publicada.
