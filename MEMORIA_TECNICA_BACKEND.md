# Memoria Técnica - Backend UrbanSpot

## 1. Tecnologías Empleadas

### 1.1 Lenguajes y Frameworks

- **Python 3.11**: Lenguaje de programación principal, elegido por su sintaxis clara, ecosistema robusto y excelente soporte para desarrollo asíncrono.
- **FastAPI 0.104+**: Framework web moderno y de alto rendimiento para construir APIs REST. Seleccionado por:
  - Generación automática de documentación interactiva (Swagger/OpenAPI)
  - Soporte nativo para operaciones asíncronas
  - Validación automática de datos con Pydantic
  - Alto rendimiento comparable a Node.js y Go
- **Uvicorn**: Servidor ASGI de alto rendimiento para ejecutar la aplicación FastAPI.

### 1.2 Base de Datos y Almacenamiento

- **MongoDB Atlas**: Base de datos NoSQL en la nube para almacenar:
  - Usuarios y sus credenciales
  - Puntos de interés (POIs)
  - Fotografías (metadatos)
  - Valoraciones
  - Sistema de puntuación y gamificación
  
  **Decisión técnica**: MongoDB fue elegido por su flexibilidad para manejar documentos JSON, escalabilidad horizontal, y su capacidad para almacenar estructuras de datos anidadas sin necesidad de esquemas rígidos.

- **Motor 3.3+**: Driver asíncrono oficial de MongoDB para Python, permitiendo operaciones no bloqueantes.

- **AWS S3**: Servicio de almacenamiento de objetos para fotografías y archivos multimedia.
  
  **Decisión técnica**: S3 fue seleccionado por su alta disponibilidad, escalabilidad automática, y costos reducidos para almacenamiento de archivos estáticos. La integración mediante `boto3` permite gestión eficiente de archivos.

### 1.3 Seguridad y Autenticación

- **Passlib con bcrypt**: Biblioteca para hashing seguro de contraseñas.
  - **Decisión técnica**: bcrypt es un algoritmo de hashing robusto que incluye salt automático y es resistente a ataques de fuerza bruta. La limitación de 72 bytes es manejada explícitamente en la validación.

- **API Key Authentication**: Sistema de autenticación basado en API Key mediante header `X-API-Key`.
  - **Decisión técnica**: Implementado como medida de seguridad básica para proteger los endpoints. En producción, se recomienda implementar OAuth 2.0 completo (actualmente preparado en configuración pero no implementado).

### 1.4 Validación y Serialización

- **Pydantic 2.5+**: Biblioteca para validación de datos y serialización.
  - Validación automática de tipos
  - Validación de email, coordenadas geográficas, etc.
  - Serialización automática a JSON

### 1.5 Contenedores y Despliegue

- **Docker**: Contenedorización de la aplicación para garantizar consistencia entre entornos.
- **Docker Compose**: Orquestación de servicios y gestión de variables de entorno.
- **UV**: Gestor de paquetes Python moderno y rápido, utilizado en el proceso de build del Dockerfile.

### 1.6 Servicios Cloud Externos

- **MongoDB Atlas**: Base de datos gestionada en la nube
  - URL: `https://www.mongodb.com/cloud/atlas`
  - Conexión mediante URI: `mongodb+srv://...`

- **AWS S3**: Almacenamiento de objetos
  - URL: `https://aws.amazon.com/s3/`
  - Región configurable (por defecto: `us-east-1`)

---

## 2. Descripción Técnica de la Aplicación Web

### 2.1 Arquitectura del Sistema

La aplicación sigue una **arquitectura en capas** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│  (Routes, Middleware, Dependencies)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                    │
│  (Business Logic, Gamification)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Storage Abstraction Layer          │
│  (Protocols: DataDB, FileDB)            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼──────┐      ┌───────▼──────┐
│ MongoDB  │      │   AWS S3      │
│  Atlas   │      │  (Storage)    │
└──────────┘      └───────────────┘
```

### 2.2 Patrón de Diseño: Protocolos (Interfaces)

**Una de las decisiones arquitectónicas más importantes** es el uso de **protocolos (interfaces abstractas)** para abstraer las implementaciones de base de datos y almacenamiento de archivos.

#### 2.2.1 Protocolo `DataDB`

El protocolo `DataDB` (`app/utils/protocols.py`) define una interfaz abstracta para operaciones de base de datos:

```python
class DataDB(ABC):
    async def connect() -> None
    async def disconnect() -> None
    async def create(collection, document) -> Dict
    async def read_one(collection, filter_dict) -> Optional[Dict]
    async def read_many(collection, filter_dict, skip, limit, sort_dict) -> List[Dict]
    async def update_one(collection, filter_dict, update_dict) -> bool
    async def delete_one(collection, filter_dict) -> bool
    async def aggregate(collection, pipeline) -> List[Dict]
```

**Implementación actual**: `MongoDBDataDB` (`app/utils/mongodb_storage.py`)

**Beneficios de esta decisión**:

- **Desacoplamiento**: La lógica de negocio no depende de MongoDB específicamente
- **Intercambiabilidad**: Se puede cambiar a PostgreSQL, Firestore, DynamoDB, etc., sin modificar servicios
- **Testabilidad**: Fácil crear mocks para testing
- **Mantenibilidad**: Cambios en la implementación de BD no afectan el resto del código

#### 2.2.2 Protocolo `FileDB`

El protocolo `FileDB` define una interfaz para almacenamiento de archivos:

```python
class FileDB(ABC):
    async def upload_file(file_content, file_name, content_type, folder) -> str
    async def delete_file(file_url) -> bool
    async def get_file_url(file_path) -> str
```

**Implementación actual**: `S3FileDB` (`app/utils/s3_storage.py`)

**Beneficios**:

- **Flexibilidad**: Se puede cambiar a Google Cloud Storage, Azure Blob Storage, o almacenamiento local sin tocar la lógica de negocio
- **Consistencia**: Misma interfaz independientemente del proveedor
- **Escalabilidad**: Fácil migrar a otro servicio si S3 no cumple requisitos

#### 2.2.3 Clase `Storage`

La clase `Storage` (`app/utils/storage.py`) actúa como **facade** que combina ambas abstracciones:

```python
class Storage:
    def __init__(self, file_db: FileDB, data_db: DataDB):
        self.file_db = file_db
        self.data_db = data_db
```

**Decisión de diseño**: Esta clase centraliza el acceso a ambos sistemas de almacenamiento, simplificando la inyección de dependencias en los servicios.

### 2.3 Diseño de la Base de Datos

#### 2.3.1 Colecciones MongoDB

La base de datos `urbanspot` contiene las siguientes colecciones:

##### **Colección: `users`**

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (único)",
  "hashed_password": "string",
  "poi_score": "int (default: 0)",
  "photo_score": "int (default: 0)",
  "total_score": "int (default: 0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Índices recomendados**:

- `email`: único
- `total_score`: para ranking eficiente

##### **Colección: `pois`**

```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "latitude": "float (-90 a 90)",
  "longitude": "float (-180 a 180)",
  "tags": ["string"],
  "image_url": "string (URL S3)",
  "author_id": "string (ref users._id)",
  "rating_count": "int (default: 0)",
  "average_rating": "float (0-10, default: 0.0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Índices recomendados**:

- `author_id`: para búsquedas por autor
- `tags`: para filtrado por etiquetas
- `{latitude, longitude}`: índice geoespacial para búsquedas por proximidad (futuro)

##### **Colección: `photos`**

```json
{
  "_id": "ObjectId",
  "poi_id": "string (ref pois._id)",
  "author_id": "string (ref users._id)",
  "image_url": "string (URL S3)",
  "description": "string (opcional)",
  "rating_count": "int (default: 0)",
  "average_rating": "float (0-10, default: 0.0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Índices recomendados**:

- `poi_id`: para obtener fotos de un POI
- `author_id`: para estadísticas de usuario

##### **Colección: `ratings`**

```json
{
  "_id": "ObjectId",
  "user_id": "string (ref users._id)",
  "target_type": "string ('poi' | 'photo')",
  "target_id": "string (ref pois._id o photos._id)",
  "score": "int (0-10)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**Índices recomendados**:

- `{target_type, target_id}`: compuesto, para obtener valoraciones de un elemento
- `{user_id, target_type, target_id}`: compuesto único, para evitar duplicados

#### 2.3.2 Decisiones de Diseño de BD

1. **NoSQL sobre SQL**: MongoDB permite flexibilidad en esquemas y escalabilidad horizontal sin necesidad de migraciones complejas.

2. **Referencias por ID**: Se almacenan IDs como strings en lugar de referencias ObjectId para simplificar la serialización JSON.

3. **Denormalización controlada**: Se almacenan `rating_count` y `average_rating` en POIs y fotos para evitar cálculos costosos en cada consulta.

4. **Timestamps automáticos**: `created_at` y `updated_at` se gestionan automáticamente en el protocolo `DataDB`.

### 2.4 Estructura de Carpetas

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Punto de entrada FastAPI
│   ├── config.py            # Configuración con Pydantic Settings
│   ├── models/              # Modelos Pydantic
│   │   ├── user.py
│   │   ├── poi.py
│   │   ├── photo.py
│   │   └── rating.py
│   ├── routes/              # Endpoints de la API
│   │   ├── users.py
│   │   ├── pois.py
│   │   ├── photos.py
│   │   └── ratings.py
│   ├── services/            # Lógica de negocio
│   │   ├── user_service.py
│   │   ├── poi_service.py
│   │   ├── photo_service.py
│   │   ├── rating_service.py
│   │   └── gamification.py
│   └── utils/               # Utilidades y abstracciones
│       ├── protocols.py     # Protocolos DataDB y FileDB
│       ├── storage.py       # Clase Storage
│       ├── mongodb_storage.py
│       ├── s3_storage.py
│       ├── dependencies.py
│       ├── auth.py
│       └── security.py
├── pyproject.toml           # Dependencias y configuración
└── README.md
```

---

## 3. Funcionalidad Implementada

### 3.1 Gestión de Usuarios

#### 3.1.1 Creación de Usuario (`POST /users/`)

- **Propósito**: Registrar nuevos usuarios en el sistema
- **Validaciones**:
  - Email único
  - Contraseña mínimo 6 caracteres
  - Contraseña máximo 72 bytes (limitación bcrypt)
  - Email válido (validación Pydantic)
- **Proceso**:
  1. Validar datos de entrada
  2. Verificar email no existente
  3. Hashear contraseña con bcrypt
  4. Crear usuario con puntuaciones inicializadas en 0
  5. Retornar usuario (sin contraseña)

#### 3.1.2 Autenticación (`POST /users/authenticate`)

- **Propósito**: Verificar credenciales y obtener información del usuario
- **Proceso**:
  1. Buscar usuario por email
  2. Verificar contraseña con bcrypt
  3. Retornar usuario si es válido, 401 si no

#### 3.1.3 Obtener Usuario (`GET /users/{user_id}`)

- **Propósito**: Obtener información básica de un usuario
- **Uso**: Para mostrar perfiles, autor de POIs, etc.

#### 3.1.4 Perfil de Usuario (`GET /users/{user_id}/profile`)

- **Propósito**: Obtener perfil completo con estadísticas de contribuciones
- **Información adicional**:
  - Número de POIs creados
  - Número de fotos subidas
  - Número de valoraciones dadas
  - Puntuaciones por categoría

#### 3.1.5 Ranking Global (`GET /users/ranking/global`)

- **Propósito**: Obtener ranking de usuarios ordenado por `total_score`
- **Parámetros**:
  - `limit`: Número máximo de usuarios (1-1000, default: 100)
- **Uso**: Tabla de líderes para gamificación

### 3.2 Gestión de POIs (Puntos de Interés)

#### 3.2.1 Crear POI (`POST /pois/`)

- **Propósito**: Crear un nuevo punto de interés
- **Parámetros**:
  - `name`: Nombre del POI
  - `description`: Descripción
  - `latitude`: Latitud (-90 a 90)
  - `longitude`: Longitud (-180 a 180)
  - `author_id`: ID del usuario creador
  - `tags`: Etiquetas separadas por comas (opcional)
  - `image`: Archivo de imagen (multipart/form-data)
- **Proceso**:
  1. Validar coordenadas geográficas
  2. Subir imagen a S3 (carpeta `pois/`)
  3. Obtener URL de la imagen
  4. Crear POI en MongoDB
  5. **Otorgar 20 puntos** al autor (gamificación)
  6. Retornar POI creado

#### 3.2.2 Listar POIs (`GET /pois/`)

- **Propósito**: Obtener lista de POIs con paginación y filtrado
- **Parámetros**:
  - `skip`: Número de registros a saltar (paginación)
  - `limit`: Máximo de registros (1-1000, default: 100)
  - `tags`: Filtro por etiquetas (separadas por comas)
- **Orden**: Por fecha de creación (más recientes primero)

#### 3.2.3 Obtener POI (`GET /pois/{poi_id}`)

- **Propósito**: Obtener detalles completos de un POI
- **Información adicional**:
  - Nombre del autor
  - Número de fotos asociadas

#### 3.2.4 Actualizar POI (`PUT /pois/{poi_id}`)

- **Propósito**: Modificar información de un POI existente
- **Campos actualizables**: name, description, tags, latitude, longitude
- **Nota**: No se puede cambiar la imagen principal (requeriría nuevo endpoint)

#### 3.2.5 Eliminar POI (`DELETE /pois/{poi_id}`)

- **Propósito**: Eliminar un POI y sus recursos asociados
- **Proceso**:
  1. Eliminar todas las fotos asociadas (de BD y S3)
  2. Eliminar imagen principal del POI (de S3)
  3. Eliminar POI de la base de datos
  4. **Nota**: Las valoraciones se mantienen (para estadísticas históricas)

### 3.3 Gestión de Fotografías

#### 3.3.1 Subir Foto (`POST /photos/`)

- **Propósito**: Añadir una nueva fotografía a un POI existente
- **Parámetros**:
  - `poi_id`: ID del POI
  - `author_id`: ID del usuario
  - `description`: Descripción opcional
  - `image`: Archivo de imagen
- **Proceso**:
  1. Verificar que el POI existe
  2. Subir imagen a S3 (carpeta `photos/`)
  3. Crear registro de foto en MongoDB
  4. **Otorgar 5 puntos** al autor (gamificación)
  5. Retornar foto creada

#### 3.3.2 Obtener Fotos de un POI (`GET /photos/poi/{poi_id}`)

- **Propósito**: Obtener todas las fotos asociadas a un POI
- **Uso**: Mostrar galería de fotos en el frontend

#### 3.3.3 Obtener Foto (`GET /photos/{photo_id}`)

- **Propósito**: Obtener detalles de una foto específica
- **Información**: Incluye estadísticas de valoración

#### 3.3.4 Eliminar Foto (`DELETE /photos/{photo_id}`)

- **Propósito**: Eliminar una foto
- **Proceso**:
  1. Eliminar archivo de S3
  2. Eliminar registro de la base de datos

### 3.4 Sistema de Valoraciones

#### 3.4.1 Crear Valoración (`POST /ratings/`)

- **Propósito**: Valorar un POI o una foto
- **Validaciones**:
  - Usuario no puede valorar sus propias contribuciones
  - Usuario no puede valorar el mismo elemento dos veces
  - Puntuación entre 0 y 10
- **Proceso**:
  1. Verificar que el elemento (POI/foto) existe
  2. Verificar que el usuario no es el autor
  3. Verificar que no existe valoración previa
  4. Crear valoración
  5. Recalcular `rating_count` y `average_rating` del elemento
  6. **Otorgar 1 punto** al usuario que valora
  7. **Verificar bonus**: Si `average_rating > 7`, otorgar 10 puntos adicionales al autor

#### 3.4.2 Obtener Valoración (`GET /ratings/{rating_id}`)

- **Propósito**: Obtener información de una valoración específica

#### 3.4.3 Eliminar Valoración (`DELETE /ratings/{rating_id}`)

- **Propósito**: Eliminar una valoración
- **Proceso**:
  1. Eliminar valoración
  2. Recalcular estadísticas del elemento valorado

### 3.5 Sistema de Gamificación

El servicio `GamificationService` gestiona la asignación de puntos:

- **Crear POI**: +20 puntos (`poi_score`)
- **POI con rating > 7**: +10 puntos adicionales (`poi_score`)
- **Subir foto**: +5 puntos (`photo_score`)
- **Foto con rating > 7**: +10 puntos adicionales (`photo_score`)
- **Dar valoración**: +1 punto (no se acumula en subtotales, solo en `total_score`)

**Decisión de diseño**: Los puntos se actualizan de forma asíncrona después de cada acción, manteniendo consistencia en tiempo real.

---

## 4. Descripción de la API Desarrollada

### 4.1 Endpoints de la API

#### **Base URL**: `http://localhost:8000` (desarrollo) o según despliegue

#### 4.1.1 Endpoints de Usuarios (`/users`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/users/` | Crear nuevo usuario | API Key |
| POST | `/users/authenticate` | Autenticar usuario | API Key |
| GET | `/users/{user_id}` | Obtener usuario | API Key |
| GET | `/users/{user_id}/profile` | Obtener perfil completo | API Key |
| GET | `/users/ranking/global` | Ranking de usuarios | API Key |

#### 4.1.2 Endpoints de POIs (`/pois`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/pois/` | Crear POI (con imagen) | API Key |
| GET | `/pois/` | Listar POIs (con filtros) | API Key |
| GET | `/pois/{poi_id}` | Obtener POI detallado | API Key |
| PUT | `/pois/{poi_id}` | Actualizar POI | API Key |
| DELETE | `/pois/{poi_id}` | Eliminar POI | API Key |

#### 4.1.3 Endpoints de Fotos (`/photos`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/photos/` | Subir foto a un POI | API Key |
| GET | `/photos/poi/{poi_id}` | Obtener fotos de un POI | API Key |
| GET | `/photos/{photo_id}` | Obtener foto detallada | API Key |
| DELETE | `/photos/{photo_id}` | Eliminar foto | API Key |

#### 4.1.4 Endpoints de Valoraciones (`/ratings`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/ratings/` | Crear valoración | API Key |
| GET | `/ratings/{rating_id}` | Obtener valoración | API Key |
| DELETE | `/ratings/{rating_id}` | Eliminar valoración | API Key |

#### 4.1.5 Endpoints Generales

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/` | Información de la API | No |
| GET | `/health` | Health check | No |
| GET | `/docs` | Documentación Swagger | No |
| GET | `/redoc` | Documentación ReDoc | No |

### 4.2 Autenticación

Todos los endpoints (excepto `/`, `/health`, `/docs`, `/redoc`) requieren autenticación mediante **API Key**.

**Header requerido**:

```
X-API-Key: your-api-key-here
```

**Configuración**: La API Key se define en la variable de entorno `API_KEY`.

### 4.3 Documentación Interactiva

FastAPI genera automáticamente documentación interactiva:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### 4.4 URLs de APIs Externas Utilizadas

#### 4.4.1 MongoDB Atlas

- **URL de conexión**: Configurada mediante variable de entorno `MONGODB_URI`
- **Formato**: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
- **Documentación**: <https://www.mongodb.com/docs/atlas/>

#### 4.4.2 AWS S3

- **Endpoint de almacenamiento**: `https://{bucket-name}.s3.{region}.amazonaws.com/{key}`
- **Región configurable**: Por defecto `us-east-1`
- **Documentación**: <https://docs.aws.amazon.com/s3/>

**Nota**: No se utilizan APIs REST externas adicionales. El sistema es autocontenido excepto por los servicios de almacenamiento.

---

## 5. Instrucciones de Instalación y Despliegue

### 5.1 Requisitos Previos

- **Docker** y **Docker Compose** instalados
- Cuenta en **MongoDB Atlas** (gratuita disponible)
- Cuenta en **AWS** con acceso a S3 (o servicio de almacenamiento compatible)
- Variables de entorno configuradas

### 5.2 Configuración de MongoDB Atlas

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear un cluster (nivel gratuito disponible)
3. Crear un usuario de base de datos
4. Configurar IP whitelist (0.0.0.0/0 para desarrollo, IP específica para producción)
5. Obtener la connection string:

   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```

### 5.3 Configuración de AWS S3

1. Crear cuenta en AWS (si no se tiene)
2. Crear un bucket S3:
   - Nombre único globalmente
   - Región preferida (ej: `us-east-1`)
   - Configurar permisos de acceso público si se requiere
3. Crear usuario IAM con permisos S3:
   - Política: `AmazonS3FullAccess` (o permisos más restrictivos)
   - Obtener Access Key ID y Secret Access Key

### 5.4 Configuración Local

1. **Clonar o descargar el proyecto**

2. **Crear archivo `.env` en la raíz del proyecto**:

   ```env
   # App Configuration
   LOG_LEVEL=INFO
   SECRET_KEY=tu-clave-secreta-muy-segura-aqui
   API_KEY=tu-api-key-para-autenticacion

   # MongoDB Atlas Configuration
   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/urbanspot?retryWrites=true&w=majority
   MONGODB_DATABASE=urbanspot

   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=tu-access-key-id
   AWS_SECRET_ACCESS_KEY=tu-secret-access-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=nombre-de-tu-bucket
   ```

3. **Construir y ejecutar con Docker Compose**:

   ```bash
   # Construir la imagen
   docker-compose build

   # Iniciar el contenedor
   docker-compose up -d

   # Ver logs
   docker-compose logs -f backend
   ```

4. **Verificar que funciona**:
   - API: <http://localhost:8000>
   - Health check: <http://localhost:8000/health>
   - Documentación: <http://localhost:8000/docs>

### 5.5 Despliegue en Producción

#### Opción 1: Docker en Servidor

1. **Configurar servidor** (VPS, EC2, etc.):
   - Instalar Docker y Docker Compose
   - Configurar firewall (puerto 8000 o el que se use)

2. **Subir código al servidor**:

   ```bash
   git clone <repo-url>
   cd practica
   ```

3. **Configurar `.env` con credenciales de producción**

4. **Iniciar con política de reinicio**:

   ```bash
   RESTART_POLICY=always docker-compose up -d
   ```

5. **Configurar reverse proxy** (Nginx, Traefik) para:
   - SSL/TLS (HTTPS)
   - Dominio personalizado
   - Rate limiting

#### Opción 2: Plataformas PaaS

##### **Heroku**

1. Instalar Heroku CLI
2. Crear aplicación: `heroku create urbanspot-api`
3. Configurar variables de entorno: `heroku config:set KEY=value`
4. Desplegar: `git push heroku main`

##### **Fly.io**

1. Instalar Fly CLI
2. Inicializar: `fly launch`
3. Configurar secrets: `fly secrets set KEY=value`
4. Desplegar: `fly deploy`

##### **Railway**

1. Conectar repositorio en Railway
2. Configurar variables de entorno en el dashboard
3. Desplegar automáticamente desde Git

### 5.6 Verificación Post-Despliegue

1. **Health check**: `GET /health` debe retornar `{"status": "healthy"}`
2. **Crear usuario de prueba**: `POST /users/`
3. **Autenticar**: `POST /users/authenticate`
4. **Verificar documentación**: `/docs` debe cargar correctamente

---

## 6. Limitaciones de la Solución y Mejoras Futuras

### 6.1 Limitaciones Actuales

#### 6.1.1 Autenticación

- **Limitación**: Sistema de autenticación basado únicamente en API Key
- **Impacto**: No hay gestión de sesiones, tokens JWT, o OAuth 2.0 completo
- **Riesgo**: Si la API Key se compromete, todo el acceso está en riesgo

#### 6.1.2 Validación de Archivos

- **Limitación**: No se valida el tipo MIME real de las imágenes, solo el header
- **Impacto**: Posible subida de archivos maliciosos disfrazados como imágenes
- **Riesgo**: Seguridad y almacenamiento innecesario

#### 6.1.3 Tamaño de Archivos

- **Limitación**: No hay límite explícito de tamaño de archivo
- **Impacto**: Posible consumo excesivo de almacenamiento S3
- **Riesgo**: Costos elevados y problemas de rendimiento

#### 6.1.4 Búsqueda Geográfica

- **Limitación**: No hay búsqueda por proximidad geográfica
- **Impacto**: No se pueden encontrar POIs cercanos a una ubicación
- **Riesgo**: Funcionalidad limitada para aplicación móvil

#### 6.1.5 Paginación

- **Limitación**: Paginación básica con `skip` y `limit`
- **Impacto**: Ineficiente para grandes volúmenes de datos
- **Riesgo**: Rendimiento degradado con muchos registros

#### 6.1.6 Caché

- **Limitación**: No hay sistema de caché implementado
- **Impacto**: Todas las consultas van directamente a MongoDB
- **Riesgo**: Latencia y costos de MongoDB Atlas

#### 6.1.7 Rate Limiting

- **Limitación**: No hay límite de peticiones por usuario/IP
- **Impacto**: Vulnerable a ataques de fuerza bruta o abuso
- **Riesgo**: Seguridad y disponibilidad del servicio

#### 6.1.8 Logging y Monitoreo

- **Limitación**: Logging básico, sin sistema de monitoreo
- **Impacto**: Difícil detectar problemas en producción
- **Riesgo**: Tiempo de respuesta lento ante incidentes

#### 6.1.9 Eliminación de Archivos

- **Limitación**: Al eliminar POIs/fotos, no se verifica que el archivo en S3 se eliminó correctamente
- **Impacto**: Posible acumulación de archivos huérfanos en S3
- **Riesgo**: Costos de almacenamiento innecesarios

#### 6.1.10 Transacciones

- **Limitación**: No hay transacciones para operaciones complejas
- **Impacto**: Posible inconsistencia si falla una operación parcial
- **Riesgo**: Integridad de datos comprometida

### 6.2 Mejoras Futuras

#### 6.2.1 Autenticación y Autorización

- [ ] Implementar **OAuth 2.0 completo** (Google, GitHub, etc.)
- [ ] Implementar **JWT tokens** para sesiones
- [ ] Sistema de **refresh tokens**
- [ ] **Autorización basada en roles** (RBAC)
- [ ] **2FA** (autenticación de dos factores)

#### 6.2.2 Validación y Seguridad

- [ ] Validación de tipo MIME real de archivos (magic bytes)
- [ ] Límite de tamaño de archivo (ej: 10MB por imagen)
- [ ] **Sanitización de imágenes** (redimensionar, comprimir)
- [ ] **Rate limiting** por usuario/IP
- [ ] **CORS** configurado específicamente (no `*`)
- [ ] **HTTPS** obligatorio en producción

#### 6.2.3 Funcionalidades de Búsqueda

- [ ] **Búsqueda geográfica** por proximidad (índices 2dsphere de MongoDB)
- [ ] **Búsqueda full-text** en nombres y descripciones
- [ ] **Filtros avanzados** (rango de fechas, rango de ratings, etc.)
- [ ] **Paginación con cursor** en lugar de skip/limit

#### 6.2.4 Rendimiento y Escalabilidad

- [ ] **Sistema de caché** (Redis) para consultas frecuentes
- [ ] **CDN** para servir imágenes desde S3
- [ ] **Índices optimizados** en MongoDB
- [ ] **Conexión pooling** optimizado
- [ ] **Compresión de respuestas** (gzip)

#### 6.2.5 Monitoreo y Observabilidad

- [ ] **Logging estructurado** (JSON logs)
- [ ] **Métricas** (Prometheus, Grafana)
- [ ] **Tracing distribuido** (OpenTelemetry)
- [ ] **Alertas** para errores y latencia alta
- [ ] **Health checks avanzados** (verificar BD, S3, etc.)

#### 6.2.6 Funcionalidades Adicionales

- [ ] **Notificaciones** cuando un POI/foto recibe valoración
- [ ] **Sistema de reportes** para contenido inapropiado
- [ ] **Moderación de contenido** (admin puede eliminar/editar)
- [ ] **Historial de cambios** (auditoría)
- [ ] **Exportación de datos** (JSON, CSV)
- [ ] **API de estadísticas** (POIs más valorados, usuarios más activos, etc.)

#### 6.2.7 Arquitectura

- [ ] **Cola de trabajos** (Celery, RQ) para tareas asíncronas
- [ ] **WebSockets** para actualizaciones en tiempo real
- [ ] **Microservicios** si el sistema crece (separar gamificación, notificaciones, etc.)
- [ ] **Event sourcing** para auditoría completa

#### 6.2.8 Testing

- [ ] **Tests unitarios** para servicios
- [ ] **Tests de integración** para endpoints
- [ ] **Tests E2E** para flujos completos
- [ ] **Cobertura de código** > 80%

#### 6.2.9 DevOps

- [ ] **CI/CD pipeline** (GitHub Actions, GitLab CI)
- [ ] **Docker multi-stage** optimizado (ya implementado parcialmente)
- [ ] **Kubernetes** para orquestación en producción
- [ ] **Backups automáticos** de MongoDB
- [ ] **Versionado de API** (`/v1/`, `/v2/`)

---

## 7. Conclusiones

El backend de UrbanSpot ha sido desarrollado siguiendo **principios de diseño sólidos**, especialmente mediante el uso de **protocolos (interfaces)** que permiten cambiar las implementaciones de base de datos y almacenamiento sin afectar la lógica de negocio. Esta arquitectura facilita:

- **Mantenibilidad**: Código organizado en capas claras
- **Escalabilidad**: Fácil migrar a otros servicios cloud
- **Testabilidad**: Interfaces permiten mocks sencillos
- **Extensibilidad**: Nuevas funcionalidades se integran fácilmente

La solución actual cubre todos los requisitos básicos del caso de estudio, con un sistema de gamificación funcional, gestión completa de POIs, fotos y valoraciones, y una API REST bien documentada. Las mejoras futuras propuestas permitirían llevar el sistema a un nivel de producción empresarial.

---

**Autor**: [Tu Nombre]  
**Fecha**: [Fecha Actual]  
**Versión**: 1.0.0
