# Farmacia del Este

Aplicación web de gestión interna para organizar el trabajo diario de una farmacia: tareas del equipo, calendario, avisos, productos y pedidos desde una misma interfaz.

[Ver el caso de estudio en mi portfolio](https://jeremiashiltpeletti.com/farmacia-del-este/)

## El problema

En una farmacia conviven tareas con distintos responsables y horarios, pedidos a proveedores, consultas sobre productos y comunicaciones internas. Cuando esa información queda repartida entre notas, mensajes y planillas, cuesta ver qué está pendiente y quién se encarga de cada cosa.

## La solución

Desarrollé una interfaz con un panel de seguimiento y módulos específicos para registrar y consultar esa actividad. El repositorio contiene una **versión demostrativa local** de la aplicación: permite recorrer los flujos con datos de ejemplo y conserva los cambios en el navegador.

### Funcionalidades incluidas

- **Tareas:** creación, asignación a integrantes, prioridades, categorías, horarios, estados, listas de verificación y filtros.
- **Calendario y avisos:** vista de tareas y eventos, notas del equipo y recordatorios mientras la aplicación está abierta.
- **Panel:** resumen de tareas y actividad del equipo.
- **Productos y pedidos:** catálogo, búsqueda, pedidos a proveedores y seguimiento de estados por pedido y por producto.
- **Códigos de barras:** validación y búsqueda en el catálogo local o de referencia; importación de referencias mediante JSON con revisión previa.
- **Clientes y compensatorios:** registro de clientes y seguimiento de días compensatorios en los módulos correspondientes.
- **Interfaz adaptable:** navegación para escritorio y móvil, con manifiesto de instalación web.

## Tecnologías y organización

- **React + TypeScript** para la interfaz y el estado compartido.
- **Vite + Tailwind CSS** para el desarrollo y los estilos.
- **React Router** para las secciones de la aplicación.
- **localForage** para persistir los datos de la demo en el navegador.
- **Express** para servir la compilación en un entorno Node.

El proyecto se desarrolló con apoyo de **Google AI Studio**. En este código, `mockFirestore.ts` implementa una capa local que imita parte de la API de Firestore; `firebase.ts` contiene funciones de reemplazo. Aunque Firebase figura entre las dependencias, **esta versión no sincroniza datos con Firebase ni entre dispositivos**. Tampoco se ejecuta un modelo de IA como parte del flujo de la aplicación publicada en este repositorio.

## Ejecutar en local

Necesitás Node.js y npm.

```bash
git clone https://github.com/JeremiasHiltPeletti/Farmacia-del-Este.git
cd Farmacia-del-Este
npm ci
npm run dev
```

Abrí la dirección que indique Vite (la configuración usa el puerto 3000). Para generar y revisar una compilación:

```bash
npm run build
npm run preview
```

La demo incluye perfiles y registros iniciales de ejemplo. La pantalla de ingreso indica el PIN de demostración.

## Alcance de esta versión

Los datos se almacenan en el navegador del dispositivo; borrar sus datos del sitio puede eliminar los cambios de la demo. El PIN y los roles se resuelven en el cliente y **no constituyen autenticación segura**. Las notificaciones funcionan en el contexto de la aplicación abierta; el envío push y las integraciones externas están desactivados o implementados como funciones de reemplazo. Por eso, este repositorio debe entenderse como demostración del producto y su interfaz, no como un sistema listo para operar con datos reales de clientes o pacientes.

---

Desarrollado por [Jeremias Hilt Peletti](https://jeremiashiltpeletti.com/).

