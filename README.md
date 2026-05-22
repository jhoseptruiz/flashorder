# FlashOrder POS 🚀

Sistema POS y de gestión de producción omnicanal universal.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Frontend | React |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker (local) / Nativo (producción) |

## Estructura del proyecto

```
ProyectoGPS/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Lógica de negocio por recurso
│   │   ├── routes/         # Definición de endpoints
│   │   ├── middlewares/    # Auth, validación, errores
│   │   ├── services/       # Lógica de dominio (compositor, webhooks)
│   │   ├── db/             # Conexión a PostgreSQL y schema
│   │   └── utils/          # Helpers reutilizables
│   ├── config/             # Configuración de la app
│   ├── .env.example        # Plantilla de variables de entorno
│   └── package.json
├── frontend/
│   └── src/
└── README.md
```

## Variables de entorno

Copia `backend/.env.example` a `backend/.env` y ajusta los valores.

## Ramas de desarrollo

| Rama | Propósito |
|---|---|
| `main` | Producción |
| `dev` | Integración |
| `jhosept` | Desarrollo personal |
