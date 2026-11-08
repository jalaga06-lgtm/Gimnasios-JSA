# Sistema de Gestión Integral para Gimnasio

Implementación de la arquitectura del documento: **monolito modular** con
React + TypeScript (frontend), NestJS + TypeScript (backend), PostgreSQL con Prisma y Docker.

## Ejecutar con Docker

```bash
docker compose up --build
```

Al arrancar, el backend crea solo los usuarios y datos de prueba (variable `SEED_DEMO` en `docker-compose.yml`).
Para comprobar que todo responde abre http://localhost:3000/api/health: debe mostrar `{"status":"ok","users":4}`.
Si el login falla, revisa los registros con `docker compose logs backend`.

- Web: http://localhost:8080
- API: http://localhost:3000/api

## Ejecutar en desarrollo

```bash
# base de datos
docker compose up -d db

# backend
cd backend
cp .env.example .env
npm install
npx prisma db push && npx prisma db seed
npm run start:dev

# frontend (otra terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173 (usa proxy a /api)
```

## Cuentas de prueba (seed)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@gym.com | Admin123* |
| Recepcionista | recepcion@gym.com | Recep123* |
| Entrenador | entrenador@gym.com | Entrena123* |
| Cliente | cliente@gym.com | Cliente123* |

Documentos de clientes para probar el acceso: `1075001` (vigente), `1075002` (vencida), `1075003` (sin membresía).

## Estructura (un módulo por componente del documento)

| Módulo backend | Requerimiento | Roles |
| --- | --- | --- |
| `users` | RF01 | Administrador |
| `clients` | RF02 | Administrador, Recepcionista |
| `memberships` (planes y membresías) | RF03, RF04 | Administrador, Recepcionista; Cliente consulta las suyas |
| `access` | RF05 | Recepcionista; Cliente consulta el suyo |
| `trainers` | Gestión de entrenadores | Administrador, Entrenador |
| `routines` | RF06 | Entrenador; Cliente consulta |
| `classes` | RF07 | Administrador, Entrenador; Cliente consulta |
| `bookings` | RF07 | Cliente, Recepcionista |
| `reports` | RF08 | Administrador |
| `audit` | RF9, RNF05 | Administrador |
| `auth` + `common/auth.ts` | RNF03, RNF04 | Todos |

Decisiones tomadas del documento:

- **Roles (RNF03):** un guard global valida el JWT y el rol de cada endpoint con `@Roles(...)`.
- **Intentos fallidos (RNF04):** 5 intentos incorrectos bloquean la cuenta 15 minutos.
- **Reservas:** solo se pueden reservar clases con la membresía activa y con cupo disponible.
- **Vigencia:** una membresía activa cuya fecha de fin ya pasó se trata como vencida.
- **Auditoría:** las operaciones administrativas y los accesos quedan en `AuditLog`.

## Notas

- El contenedor del backend usa `prisma db push` para crear las tablas. Para producción, genera
  migraciones con `npx prisma migrate dev` y cambia el comando a `prisma migrate deploy`.
- Cambia `JWT_SECRET` en `docker-compose.yml` antes de desplegar.
- No incluye pruebas automáticas.
