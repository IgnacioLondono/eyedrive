# eyedrive (eyedcomundrive)

Nube personal con interfaz web, API en Node.js, PostgreSQL y archivos en volumen Docker.

## Requisitos

- Docker y Docker Compose (o Portainer con soporte para **Stacks** desde `docker-compose.yml`).

## Puesta en marcha

En la raíz del repositorio:

```bash
docker compose up -d --build
```

La aplicación queda en el puerto **9990** (mapea `9990:3000` en el contenedor `app`).

## Portainer

1. **Stacks → Add stack**
2. **Repository**: URL `https://github.com/IgnacioLondono/eyedrive` y rama `main` (o sube el `docker-compose.yml` manualmente)
3. **Build** debe ejecutarse en el contexto que incluya `Dockerfile` y el código (clon del repo o subida al host)

Variables útiles: ver `docker-compose.yml` (`MAX_FILE_BYTES`, `MAX_FILES_PER_REQUEST`, credenciales de PostgreSQL). **Cambia la contraseña** de la base de datos en entornos expuestos.

## Desarrollo local (sin Docker)

Necesitas Node.js 18+ y PostgreSQL. Copia el proyecto, instala dependencias (`npm install`), configura `DATABASE_URL` y ejecuta `npm start`.
