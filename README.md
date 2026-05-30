# eyedrive

Nube personal con interfaz web, API en Node.js, PostgreSQL y archivos en volumen Docker. Cada usuario tiene su propia unidad aislada.

## Requisitos

- Docker y Docker Compose (o Portainer con soporte para **Stacks** desde `docker-compose.yml`).

## Puesta en marcha en el servidor

Los datos se guardan en:

```
/srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Nacho/
├── postgres/   # base de datos
└── uploads/    # archivos subidos
```

1. Clona o copia el proyecto al servidor.
2. Crea las carpetas de datos:

```bash
sudo mkdir -p /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Nacho/postgres
sudo mkdir -p /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Nacho/uploads
sudo chown -R 999:999 /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Nacho
```

3. Copia `.env.example` a `.env` y configura SMTP y contraseña de PostgreSQL.
4. Levanta los contenedores:

```bash
docker compose up -d --build
```

La aplicación queda en el puerto **9990**.

## Autenticación

- **Registro**: el usuario introduce su correo → recibe un código de 6 dígitos → confirma y crea su cuenta.
- **Inicio de sesión**: mismo flujo con código enviado al correo registrado.
- **Mi cuenta** (`/cuenta.html`): cambiar nombre, ver correo, cerrar sesión.

Sin SMTP configurado, los códigos se imprimen en los logs del contenedor (solo para desarrollo).

## Portainer

1. **Stacks → Add stack**
2. Sube el `docker-compose.yml` o conecta el repositorio
3. Añade las variables de `.env.example` en el stack

Variables útiles: `APP_URL`, `POSTGRES_PASSWORD`, `SMTP_*`.

## Desarrollo local (sin Docker)

Necesitas Node.js 18+ y PostgreSQL. Instala dependencias (`npm install`), configura `DATABASE_URL` y `.env`, y ejecuta `npm start`.
