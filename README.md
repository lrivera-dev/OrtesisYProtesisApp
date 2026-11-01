# Gestión de solicitudes de órtesis y prótesis

Aplicación web para que clientes consulten el catálogo de OrtoVida y soliciten una evaluación o un producto. El personal podrá revisar las solicitudes y actualizar su estado para que cada cliente pueda consultar el avance.

Este proyecto amplía el sitio estático desarrollado para el Desafío Práctico I de Desarrollo Web. La aplicación se desarrollará como parte del **Desafío Práctico II — Desarrollo Web I**, Ingeniería de Software y Negocios Digitales, ESEN.

> **Estado:** propuesta y desarrollo en curso. El sitio estático existente sirve como base visual; las funciones de autenticación, persistencia y gestión descritas aquí deben implementarse y verificarse antes de la entrega.

## Problema que resuelve

El sitio informativo permite conocer los servicios y productos, pero no permite enviar una solicitud con una cuenta, dar seguimiento a su estado ni gestionar las solicitudes desde el personal de OrtoVida. Esta aplicación busca organizar ese flujo en un solo lugar.

## Roles

- **Cliente:** se registra e inicia sesión, consulta el catálogo, crea solicitudes y consulta o actualiza las propias cuando su estado lo permita.
- **Personal:** consulta las solicitudes recibidas, agrega notas de seguimiento y actualiza sus estados. También administra los productos del catálogo.

El registro público creará cuentas de cliente. El rol de personal será asignado de forma controlada, no elegido por el usuario durante el registro. Los permisos deberán aplicarse en las reglas de seguridad de Firebase, además de adaptar la interfaz al rol.

## Procesos principales

1. **Catálogo y solicitud:** el cliente consulta los productos o servicios y envía una solicitud relacionada con un producto o servicio seleccionado.
2. **Revisión y seguimiento:** el personal revisa la solicitud y actualiza el estado. El cliente puede consultar el avance desde su cuenta.
3. **Administración del catálogo:** el personal crea, consulta, actualiza o elimina productos disponibles.

Estados de solicitud propuestos: `Pendiente de revisión`, `En revisión`, `Requiere información`, `Aprobada`, `En desarrollo`, `Lista para entrega`, `Completada` y `Rechazada`. El equipo puede ajustar estos estados al implementar el flujo.

## Entidades principales

- **Productos:** nombre, descripción, categoría, imagen y disponibilidad.
- **Solicitudes:** cliente, producto o servicio solicitado, descripción, estado, fecha de creación y notas de seguimiento.
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

El sitio de partida contiene estas páginas y estilos:

- `index.html` — página de inicio
- `productos.html` — catálogo estático
- `nosotros.html` — información de la organización
- `contacto.html` — formulario estático de contacto, candidato a convertirse en formulario de solicitud
- `css/` — hojas de estilo por página y estilos compartidos
- `img/` — imágenes del sitio

Durante la ampliación se agregarán módulos JavaScript para la configuración de Firebase, autenticación, acceso a datos y comportamiento de la interfaz. La estructura final se documentará cuando esté implementada.

## Requisitos para probar la aplicación

La versión actual del sitio estático puede abrirse en un navegador. Para ejecutar las funciones que dependen de Firebase será necesario configurar el proyecto de Firebase y sus credenciales de aplicación.

1. Clona el repositorio del equipo.
2. Configura un proyecto de Firebase con Authentication y Cloud Firestore.
3. Completa la configuración de Firebase en el módulo de configuración de la aplicación, sin incluir credenciales privilegiadas.
4. Sirve los archivos con un servidor local estático, por ejemplo Live Server en Visual Studio Code.
5. Usa las cuentas de demostración que se proporcionarán durante la entrega. No publiques contraseñas en este repositorio.

> Las instrucciones definitivas, configuración requerida y credenciales de demostración se añadirán cuando la integración esté lista.

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