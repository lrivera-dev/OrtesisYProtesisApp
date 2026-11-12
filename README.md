# Gestión de solicitudes de órtesis y prótesis

Aplicación web para que clientes consulten el catálogo de OrtoVida y soliciten coordinar una evaluación. El personal acuerda la cita, registra cuándo se atendió y administra el catálogo.

Este proyecto amplía el sitio estático desarrollado para el Desafío Práctico I de Desarrollo Web. Fue desarrollado como parte del **Desafío Práctico II — Desarrollo Web I**, Ingeniería de Software y Negocios Digitales, ESEN.

**Aplicación publicada:** https://lrivera-dev.github.io/OrtesisYProtesisApp/

## Problema que resuelve

El sitio informativo permite conocer los servicios y productos, pero no permite enviar una solicitud con una cuenta, dar seguimiento a su estado ni gestionar las solicitudes desde el personal de OrtoVida. Esta aplicación organiza ese flujo en un solo lugar.

## Roles

- **Cliente:** se registra e inicia sesión, consulta el catálogo, solicita una evaluación de un producto o general, indica sus horarios preferidos y consulta el estado y la fecha confirmada.
- **Personal:** consulta solicitudes en una tabla, coordina y confirma citas, registra si fueron atendidas y administra los productos del catálogo.

El registro público crea cuentas de cliente. El rol de personal se asigna de forma controlada desde la consola de Firebase, nunca durante el registro. Los permisos se aplican en las reglas de seguridad de Firestore, además de adaptar la interfaz al rol.

## Procesos principales

1. **Catálogo y solicitud:** el cliente consulta los productos y solicita coordinar una evaluación relacionada con un producto o una evaluación general.
2. **Coordinación y seguimiento:** el personal registra el horario acordado o propone otro y marca la evaluación como atendida. El cliente consulta el estado desde su cuenta.
3. **Administración del catálogo:** el personal crea, consulta, actualiza o elimina productos disponibles.

Estados de solicitud: `Pendiente`, `Propuesta enviada`, `Cita confirmada`, `Atendida` y `Cancelada`. La solicitud coordina una evaluación y toma de medidas; no representa una compra ni una orden de fabricación.

## Entidades principales

- **Productos:** nombre, descripción, categoría, imagen y disponibilidad.
- **Solicitudes:** cliente, producto de interés, teléfono, disponibilidad preferida, descripción, estado, fecha de cita y notas de seguimiento.
- **Perfiles (usuarios):** usuario autenticado, nombre y rol asignado.

Las solicitudes están relacionadas con el cliente que las creó y, cuando corresponda, con el producto solicitado. Para la demostración se utilizan datos ficticios; no se almacenan expedientes ni diagnósticos médicos.

## Tecnología

- HTML5 semántico
- CSS3 (Flexbox, CSS Grid y diseño adaptable)
- JavaScript nativo con módulos ES
- Firebase Authentication para registro e inicio de sesión
- Cloud Firestore para persistencia remota y reglas de seguridad
- Hosting: GitHub Pages (sitio estático)

La aplicación no utiliza frameworks de interfaz como React, Angular o Vue ni un backend propio.

## Estructura

El sitio mantiene las páginas públicas originales y añade vistas conectadas a Firebase y Firestore:

- `index.html` — página de inicio
- `productos.html` — catálogo con productos cargados desde Firestore
- `nosotros.html` — información de la organización
- `contacto.html` — información y formulario de contacto
- `css/` — hojas de estilo por página y estilos compartidos
- `img/` — imágenes del sitio

Los módulos de autenticación, acceso a Firestore y comportamiento de cada vista están organizados dentro de `js/`.

## Cómo probar la aplicación

**Versión publicada:** abre https://lrivera-dev.github.io/OrtesisYProtesisApp/. Las credenciales de prueba (una cuenta `cliente` y una cuenta `personal`) se entregan por Moodle; no se publican en este repositorio.

1. Como **cliente**: entra a *Productos*, presiona **Agendar evaluación**, completa fecha, teléfono y descripción y envía la solicitud. Revisa su estado en *Mis solicitudes*.
2. Como **personal**: en *Solicitudes* abre **Ver detalle**, confirma la fecha o propone otra con una nota. En *Catálogo* agrega, edita, elimina o cambia la disponibilidad de productos.
3. De nuevo como **cliente**: acepta el horario propuesto o envía otra fecha.

**Ejecución local:** la aplicación usa el proyecto Firebase configurado en `js/firebase.js`. Sirve los archivos desde un servidor estático (los módulos ES no funcionan abriendo el HTML con doble clic) y mantén publicadas las reglas.

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
- `gestion-catalogo.html` — vista del personal para buscar, filtrar, crear, editar, eliminar y cambiar la disponibilidad de productos.
- `js/mis-solicitudes.js`, `js/panel-personal.js` y `js/gestion-catalogo.js` — protegen las vistas por rol (`protegerPagina`, `configurarCerrarSesion`) e inician cada módulo.
- `js/catalogo.js` — genera las tarjetas del catálogo público desde Firestore sin escribir en la base de datos.
- `js/gestion-productos.js` y `js/productos-iniciales.js` — CRUD del catálogo y datos de ejemplo que solo el personal puede cargar.
- `js/solicitudes/` — `estados.js` (flujo y reglas de negocio), `validaciones.js`, `procesamiento.js` (búsqueda, filtros, orden e indicadores), `solicitudes-datos.js` (servicio de Firestore: cada función devuelve `{ exito, data }` o `{ exito: false, error }`), `sesion.js` (usuario y perfil), `ui-comun.js`, `vista-cliente.js` y `vista-personal.js` (interfaz).
- `firestore.rules` — reglas de acceso para `usuarios`, `productos` y `solicitudes`.

### Imágenes de productos

El plan gratuito no permitía habilitar Cloud Storage, por lo que las imágenes que sube el personal se guardan como texto. `convertirABase64` (`js/gestion-productos.js`) usa `FileReader.readAsDataURL` para convertir el archivo en una Data URL Base64, que se almacena en el campo `imagen` del producto y se muestra directamente con el atributo `src` de `<img>`. Como un documento de Firestore admite como máximo 1 MiB y Base64 ocupa cerca de un 33 % más que el archivo original, el formulario rechaza imágenes de más de 700 KB. Los productos de ejemplo usan rutas a `img/productos/`.

### Documento de solicitud

`solicitudes/{id}`: `clienteId`, `clienteNombre`, `clienteEmail`, `tipo` (`producto` | `evaluacion`), `productoId`, `productoNombre`, `telefono`, `preferenciaHorario`, `descripcion`, `fechaPreferida`, `fechaPropuesta`, `fechaCita`, `estado`, `notas` (lista de `{ texto, autor, estado, fecha }`), `creadoEn`, `actualizadoEn`.

Flujo: el cliente envía una fecha y hora preferidas con un selector de calendario. El personal puede confirmarlas directamente o enviar una alternativa (`Propuesta enviada`). El cliente acepta la propuesta para confirmar la cita o envía otra fecha, que vuelve a `Pendiente` para revisión. Al finalizar, el personal la marca como `Atendida`; cliente o personal pueden cancelarla antes.

Las reglas verifican además: cada cliente autenticado con perfil `cliente` crea y consulta sus solicitudes; el producto relacionado debe existir y estar disponible; el personal no puede cambiar los datos del cliente ni saltarse estados; solo confirma citas con una fecha válida; las notas solo se agregan (no se editan ni borran); una evaluación atendida no puede reabrirse. El rol se lee de `usuarios/{uid}.role` (`cliente` o `personal`).

Datos de demostración: el catálogo ofrece al personal cargar los 12 productos de ejemplo cuando la colección está vacía. Si un cliente no tiene solicitudes, "Mis solicitudes" ofrece el botón **Crear solicitudes de ejemplo**, que genera tres solicitudes ficticias a su nombre.

## Seguridad y datos

- Las reglas de Firestore restringen a cada cliente a sus propias solicitudes.
- El personal puede consultar y actualizar las solicitudes según su rol.
- Solo el personal puede administrar productos.
- El rol de personal no se asigna desde el formulario de registro público.
- La configuración pública del SDK puede estar en el cliente; no se incluyen claves privadas, contraseñas ni credenciales privilegiadas.
- Se usan datos ficticios para la evaluación.

## Equipo y colaboración

- Luis Rivera — autenticación, protección de vistas por rol, navegación y coordinación de horarios.
- Rogelio — catálogo dinámico, CRUD de productos, imágenes en Base64 y rediseño de acceso.
- David Argueta (Davo) — estados, validaciones y procesamiento de solicitudes, servicio de Firestore, vistas del cliente y del personal y reglas de seguridad.

El equipo trabajó con ramas por funcionalidad (`feature/auth-roles`, `feature/catalogo-crud`) integradas mediante pull requests en la rama principal.

## Publicación

**URL de la aplicación:** https://lrivera-dev.github.io/OrtesisYProtesisApp/

El dominio del hosting está agregado en *Firebase Authentication → Dominios autorizados* y las reglas de `firestore.rules` están publicadas en el proyecto, por lo que autenticación, permisos y persistencia funcionan también en la versión publicada.