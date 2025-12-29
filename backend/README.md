# UrbanSpot Backend

Backend API para UrbanSpot - Plataforma colaborativa de descubrimiento de puntos de interés urbanos.

## Tecnologías

- **FastAPI**: Framework web moderno y rápido para construir APIs
- **Pydantic**: Validación de datos y configuración
- **Motor**: Driver asíncrono para MongoDB
- **Boto3**: SDK de AWS para S3
- **UV**: Gestor de dependencias y entornos virtuales

## Estructura del Proyecto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Punto de entrada de la aplicación
│   ├── config.py               # Configuración con Pydantic Settings
│   ├── models/                 # Modelos Pydantic
│   │   ├── user.py
│   │   ├── poi.py
│   │   ├── photo.py
│   │   └── rating.py
│   ├── routes/                  # Endpoints de la API
│   │   ├── users.py
│   │   ├── pois.py
│   │   ├── photos.py
│   │   └── ratings.py
│   ├── services/                # Lógica de negocio
│   │   ├── user_service.py
│   │   ├── poi_service.py
│   │   ├── photo_service.py
│   │   ├── rating_service.py
│   │   └── gamification.py
│   └── utils/                   # Utilidades
│       ├── protocols.py         # Protocolos FileDB y DataDB
│       ├── s3_storage.py         # Implementación S3
│       ├── mongodb_storage.py    # Implementación MongoDB
│       ├── storage.py            # Clase Storage
│       ├── dependencies.py       # Dependencias FastAPI
│       └── auth.py               # Autenticación API Key
├── pyproject.toml               # Configuración del proyecto y dependencias
├── .env.example                 # Ejemplo de variables de entorno
└── README.md
```

## Instalación

### Prerrequisitos

- Python 3.11 o superior
- UV instalado (`pip install uv` o `curl -LsSf https://astral.sh/uv/install.sh | sh`)

### Pasos

1. **Crear entorno virtual con UV:**
   ```bash
   cd backend
   uv venv
   ```

2. **Activar el entorno virtual:**
   ```bash
   # En macOS/Linux:
   source .venv/bin/activate
   
   # En Windows:
   .venv\Scripts\activate
   ```

3. **Instalar dependencias:**
   ```bash
   uv pip install -e .
   ```

4. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` con tus credenciales:
   - MongoDB Atlas URI
   - AWS S3 credentials
   - API Key para autenticación

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del backend con las siguientes variables:

```env
# App Configuration
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
MONGODB_DATABASE=urbanspot

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# OAuth Configuration (for future frontend integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Ejecución

### Desarrollo

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Producción

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

La API estará disponible en `http://localhost:8000`

Documentación interactiva (Swagger): `http://localhost:8000/docs`
Documentación alternativa (ReDoc): `http://localhost:8000/redoc`

## API Endpoints

### Autenticación

Todas las rutas requieren el header `X-API-Key` con el valor configurado en `API_KEY`.

### Usuarios

- `POST /users/` - Crear usuario
- `GET /users/{user_id}` - Obtener usuario por ID
- `GET /users/{user_id}/profile` - Obtener perfil de usuario
- `GET /users/ranking/global` - Obtener ranking global

### POIs (Puntos de Interés)

- `POST /pois/` - Crear POI (con imagen)
- `GET /pois/` - Listar todos los POIs
- `GET /pois/{poi_id}` - Obtener POI por ID
- `PUT /pois/{poi_id}` - Actualizar POI
- `DELETE /pois/{poi_id}` - Eliminar POI

### Fotos

- `POST /photos/` - Subir foto a un POI
- `GET /photos/poi/{poi_id}` - Obtener fotos de un POI
- `GET /photos/{photo_id}` - Obtener foto por ID
- `DELETE /photos/{photo_id}` - Eliminar foto

### Valoraciones

- `POST /ratings/` - Crear valoración (POI o foto)
- `GET /ratings/{rating_id}` - Obtener valoración por ID
- `DELETE /ratings/{rating_id}` - Eliminar valoración

## Sistema de Gamificación

El sistema otorga puntos automáticamente:

- **Crear POI**: +20 puntos
- **POI con valoración media > 7**: +10 puntos
- **Subir foto**: +5 puntos
- **Foto con valoración media > 7**: +10 puntos
- **Valorar contenido**: +1 punto

## Arquitectura

### Protocolos

El sistema utiliza protocolos (ABC) para abstraer el almacenamiento:

- **FileDB**: Protocolo para almacenamiento de archivos (implementado con S3)
- **DataDB**: Protocolo para base de datos (implementado con MongoDB)

### Storage

La clase `Storage` recibe instancias de los protocolos y gestiona:
- Almacenamiento de archivos (imágenes) en S3
- Operaciones de base de datos en MongoDB Atlas

### Servicios

Cada servicio encapsula la lógica de negocio:
- Validaciones
- Cálculos (puntuaciones, rankings)
- Integración con gamificación
- Gestión de relaciones entre entidades

## Desarrollo

### Formato de código

El proyecto usa `black` y `ruff` para formateo y linting:

```bash
# Formatear código
black app/

# Linting
ruff check app/
```

## Notas

- La autenticación OAuth 2.0 se manejará desde el frontend
- El backend actualmente usa API Key para proteger los endpoints
- Las imágenes se almacenan en S3 y las URLs se guardan en MongoDB
- El sistema calcula automáticamente las valoraciones medias y actualiza los puntos de los usuarios
