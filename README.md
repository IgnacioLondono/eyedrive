# eyedrive

Nube personal con interfaz web, API en Node.js, PostgreSQL y archivos en volumen Docker. Cada usuario tiene su propia unidad aislada.

## Requisitos

- Docker y Docker Compose (o Portainer con soporte para **Stacks** desde `docker-compose.yml`).

## Puesta en marcha en el servidor

Los datos se guardan en:

```
/srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Eyedrive/
├── postgres/   # base de datos
└── uploads/    # archivos subidos (carpeta por usuario: uploads/{user-id}/)
```

1. Clona o copia el proyecto al servidor.
2. Crea las carpetas de datos:

```bash
sudo mkdir -p /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Eyedrive/postgres
sudo mkdir -p /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Eyedrive/uploads
sudo chown -R 999:999 /srv/dev-disk-by-uuid-a5b4e34c-5e9b-430c-93ad-0473fe6143d2/data/Etc/Eyedrive
```

3. Copia `.env.example` a `.env` y configura SMTP y contraseña de PostgreSQL.
4. Levanta los contenedores:

```bash
docker compose up -d --build
```

La aplicación queda en el puerto **9990** (nginx delante de Node.js).

## Arquitectura

```
Internet / Cloudflare → nginx:80 (puerto 9990) → app:3000 → PostgreSQL
```

Nginx actúa como proxy inverso (imagen propia en `nginx/` con la config incluida, sin montar archivos sueltos — compatible con Portainer).

## Autenticación

- **Registro**: nombre, correo y contraseña → código de 6 dígitos por email → confirmación.
- **Inicio de sesión**: correo y contraseña.
- **Recuperar contraseña** (`/recuperar.html`): correo → código por email → nueva contraseña.
- **Verificación en 2 pasos** (`/cuenta.html`): app autenticadora en el teléfono (TOTP), código por correo o códigos de respaldo al iniciar sesión.
- **Mi cuenta** (`/cuenta.html`): cambiar nombre, contraseña, teléfono, 2FA, cerrar sesión.

Sin SMTP configurado, los códigos se imprimen en los logs del contenedor (solo para desarrollo).

## Portainer

1. **Stacks → Add stack** (o edita el stack existente)
2. Conecta el repositorio `https://github.com/IgnacioLondono/eyedrive` o pega el `docker-compose.yml`
3. En **Environment variables** del stack, añade (no hace falta archivo `.env`):

| Variable | Ejemplo |
|----------|---------|
| `APP_URL` | `https://eyedrive.nicolaslondono.uk` |
| `POSTGRES_PASSWORD` | una clave segura |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `tu-correo@gmail.com` |
| `SMTP_PASS` | contraseña de aplicación |
| `SMTP_FROM` | `Eyedrive <tu-correo@gmail.com>` |
| `SESSION_DAYS` | `30` |

4. **Deploy the stack**

## Desarrollo local (sin Docker)

Necesitas Node.js 18+ y PostgreSQL. Instala dependencias (`npm install`), configura `DATABASE_URL` y `.env`, y ejecuta `npm start`.
