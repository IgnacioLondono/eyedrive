# Frontend legacy (HTML estático)

Copia de seguridad del frontend anterior a la migración a Next.js.

**Ubicación actual del frontend:** `web/` (Next.js 16).

Estos archivos ya no se sirven en producción. Express delega toda la UI a Next.js; los redirects de rutas `.html` están en `server.js` (`LEGACY_HTML`).

Para consultar el comportamiento antiguo, revisa los scripts aquí. No hace falta restaurar nada en una carpeta `public/` en la raíz del proyecto.
