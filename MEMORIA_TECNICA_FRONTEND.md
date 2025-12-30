# Memoria Técnica - Frontend UrbanSpot

## 1. Tecnologías Empleadas

### 1.1 Lenguajes y Frameworks

- **TypeScript 5.2+**: Lenguaje de programación principal, elegido por su tipado estático, mejor experiencia de desarrollo y detección temprana de errores.
- **Angular 17.0+**: Framework web moderno y completo para construir aplicaciones SPA (Single Page Applications). Seleccionado por:
  - Arquitectura basada en componentes reutilizables
  - Sistema de inyección de dependencias robusto
  - Routing avanzado con lazy loading
  - Gestión de estado reactiva con RxJS
  - Soporte para aplicaciones standalone (sin NgModules)
  - CLI potente para scaffolding y build
- **RxJS 7.8+**: Biblioteca para programación reactiva y manejo asíncrono de datos mediante Observables.

### 1.2 Librerías y Herramientas

- **Leaflet 1.9.4**: Biblioteca JavaScript de código abierto para mapas interactivos.
  - **Decisión técnica**: Leaflet fue elegido sobre Google Maps por ser open-source, ligero, y no requerir API keys costosas. Proporciona funcionalidad completa para mostrar POIs en un mapa.
- **Angular Forms**: Sistema de formularios reactivos y template-driven para gestión de inputs de usuario.
- **Angular Router**: Sistema de routing con lazy loading de componentes para optimizar el rendimiento inicial.

### 1.3 Servicios Cloud Externos

- **AWS S3**: Almacenamiento de imágenes (POIs y fotos).
  - URL: `https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/`
  - Las imágenes se sirven directamente desde S3 mediante URLs públicas.
- **MongoDB Atlas**: Base de datos NoSQL (acceso indirecto a través de la API backend).

### 1.4 Contenedores y Despliegue

- **Docker**: Contenedorización de la aplicación para garantizar consistencia entre entornos.
- **Docker Compose**: Orquestación de servicios y gestión de variables de entorno.
- **Nginx**: Servidor web ligero para servir la aplicación Angular en producción.
  - **Decisión técnica**: Nginx es más eficiente que Node.js para servir archivos estáticos y tiene mejor rendimiento en producción.

### 1.5 Herramientas de Desarrollo

- **Angular CLI**: Herramienta de línea de comandos para desarrollo, build y testing.
- **Node.js 20+**: Entorno de ejecución para desarrollo y build del proyecto.

---

## 2. Descripción Técnica de la Aplicación Web

### 2.1 Arquitectura del Sistema

La aplicación sigue una **arquitectura de componentes y servicios** con separación clara de responsabilidades:

```
┌─────────────────────────────────────────┐
│      Angular Application (SPA)          │
│  (Components, Routing, Guards)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                    │
│  (ApiService, AuthService)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      HTTP Client (RxJS Observables)      │
│  (REST API Communication)                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Backend API (FastAPI)               │
│  (REST Endpoints)                         │
└──────────────────────────────────────────┘
```

### 2.2 Patrón de Diseño: Servicios y Componentes

**Una de las decisiones arquitectónicas más importantes** es la separación entre **componentes de presentación** y **servicios de lógica de negocio**.

#### 2.2.1 Servicio `ApiService`

El servicio `ApiService` (`app/services/api.service.ts`) centraliza toda la comunicación con la API backend:

**Responsabilidades**:

- Carga de configuración desde `config.json` (generado en runtime por Docker)
- Gestión de headers HTTP (incluyendo `X-API-Key`)
- Métodos para todas las operaciones CRUD (POIs, fotos, usuarios, valoraciones)
- Manejo de errores HTTP
- Validación de configuración antes de hacer requests

**Características clave**:

- **Configuración dinámica**: El `config.json` se genera en runtime desde variables de entorno, permitiendo diferentes configuraciones sin rebuild.
- **Inyección de API Key**: La API key se inyecta automáticamente en todos los headers HTTP.
- **Observables**: Todas las operaciones retornan Observables de RxJS para manejo asíncrono.

**Beneficios de esta decisión**:

- **Centralización**: Un solo punto de configuración para todas las llamadas API
- **Mantenibilidad**: Cambios en la API se reflejan en un solo lugar
- **Testabilidad**: Fácil mockear el servicio para testing
- **Reutilización**: Todos los componentes usan el mismo servicio

#### 2.2.2 Servicio `AuthService`

El servicio `AuthService` (`app/services/auth.service.ts`) gestiona el estado de autenticación:

**Responsabilidades**:

- Login y registro de usuarios
- Almacenamiento de usuario en `localStorage`
- Gestión de sesión de usuario
- Notificación de cambios mediante RxJS Subject
- Normalización de IDs (`_id` → `id`)

**Características clave**:

- **Persistencia**: El usuario se guarda en `localStorage` para mantener sesión entre recargas
- **Reactividad**: Usa `Subject` para notificar cambios a componentes suscritos
- **Normalización**: Convierte `_id` de MongoDB a `id` para consistencia en frontend
- **Actualización automática**: Método `refreshUser()` para actualizar puntos del usuario

**Beneficios**:

- **Estado global**: El usuario está disponible en toda la aplicación
- **Sincronización**: Los cambios se propagan automáticamente a todos los componentes
- **Persistencia**: La sesión se mantiene entre recargas de página

#### 2.2.3 Componentes

Los componentes siguen el patrón **Smart/Dumb Components**:

- **Smart Components**: Contienen lógica de negocio y se comunican con servicios
  - `MapComponent`: Gestiona el mapa y creación de POIs
  - `ProfileComponent`: Muestra perfil y estadísticas del usuario
  - `PoiDetailComponent`: Detalles de POI con funcionalidades completas
  - `PoiListComponent`: Lista paginada de todos los POIs
  - `RankingComponent`: Tabla de líderes

- **Dumb Components**: Componentes de presentación pura (si los hubiera)

### 2.3 Diseño de la Interfaz de Usuario

#### 2.3.1 Estructura de Navegación

La aplicación utiliza **Angular Router** con las siguientes rutas:

```
/                    → Redirige a /map
/login               → Componente de login
/register           → Componente de registro
/map                 → Mapa interactivo con POIs
/pois                → Lista de todos los POIs
/poi/:id             → Detalles de un POI específico
/profile/:id         → Perfil de usuario
/ranking             → Ranking global de usuarios
```

**Características**:

- **Lazy Loading**: Todos los componentes se cargan bajo demanda para optimizar el bundle inicial
- **Guards**: `authGuard` protege rutas que requieren autenticación
- **Redirección automática**: Usuarios no autenticados son redirigidos a `/login`

#### 2.3.2 Componentes Principales

##### **AppComponent** (`app.component.ts`)

- Componente raíz de la aplicación
- Contiene el navbar con navegación y estado del usuario
- Gestiona la visibilidad del navbar según la ruta
- Se suscribe a actualizaciones del usuario para reflejar cambios en tiempo real

##### **MapComponent** (`components/map/map.component.ts`)

- Muestra mapa interactivo usando Leaflet
- Carga todos los POIs desde la API con paginación (lotes de 1000)
- Permite crear nuevos POIs haciendo clic en el mapa
- Marcadores personalizados según etiquetas del POI
- Navegación a detalles de POI al hacer clic en marcador

##### **PoiListComponent** (`components/poi-list/poi-list.component.ts`)

- Lista paginada de todos los POIs en formato de tarjetas
- Carga todos los POIs con paginación automática
- Navegación a detalles de POI al hacer clic en tarjeta
- Diseño responsive con grid

##### **PoiDetailComponent** (`components/poi-detail/poi-detail.component.ts`)

- Muestra detalles completos de un POI
- Galería de fotos asociadas al POI
- Funcionalidad de subir nuevas fotos
- Sistema de valoración (POI y fotos) con desplegables de 1-10
- Edición y eliminación de POI (solo si el usuario es el autor)
- Eliminación de fotos (solo si el usuario es el autor)

##### **ProfileComponent** (`components/profile/profile.component.ts`)

- Muestra perfil completo del usuario
- Estadísticas: puntos totales, POIs creados, fotos subidas
- Lista de POIs creados por el usuario con enlaces a detalles
- Lista de fotos subidas por el usuario con enlaces a POIs
- Carga paginada de datos para manejar grandes volúmenes

##### **RankingComponent** (`components/ranking/ranking.component.ts`)

- Tabla de ranking global de usuarios
- Ordenado por `total_score` descendente
- Muestra nombre, email y puntos totales

##### **LoginComponent** y **RegisterComponent**

- Formularios de autenticación y registro
- Validación de campos
- Redirección automática después de login/registro exitoso

### 2.4 Gestión de Estado

#### 2.4.1 Estado de Usuario

- **Almacenamiento**: `localStorage` con clave `currentUser`
- **Sincronización**: `AuthService` notifica cambios mediante `Subject`
- **Actualización**: Se actualiza automáticamente después de operaciones (crear POI, subir foto, valorar)

#### 2.4.2 Estado de Componentes

- Cada componente gestiona su propio estado local
- Los datos se cargan desde la API en `ngOnInit()`
- Los componentes se actualizan reactivamente cuando cambian los datos

### 2.5 Estructura de Carpetas

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts          # Componente raíz y navbar
│   │   ├── app.config.ts             # Configuración de la aplicación
│   │   ├── app.routes.ts             # Definición de rutas
│   │   ├── components/               # Componentes de la aplicación
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── map/
│   │   │   ├── poi-list/
│   │   │   ├── poi-detail/
│   │   │   ├── profile/
│   │   │   └── ranking/
│   │   ├── guards/                   # Route guards
│   │   │   └── auth.guard.ts
│   │   ├── models/                   # Interfaces TypeScript
│   │   │   ├── user.model.ts
│   │   │   ├── poi.model.ts
│   │   │   ├── photo.model.ts
│   │   │   └── rating.model.ts
│   │   └── services/                 # Servicios de lógica de negocio
│   │       ├── api.service.ts
│   │       └── auth.service.ts
│   ├── assets/                        # Archivos estáticos
│   │   └── config.json               # Generado en runtime por Docker
│   ├── environments/                  # Configuración de entornos
│   │   └── environment.ts
│   ├── index.html                     # HTML principal
│   └── styles.css                     # Estilos globales
├── Dockerfile                         # Build multi-stage
├── entrypoint.sh                     # Script para generar config.json
├── nginx.conf                        # Configuración de Nginx
├── package.json                      # Dependencias npm
└── angular.json                      # Configuración de Angular CLI
```

---

## 3. Funcionalidad Implementada

### 3.1 Autenticación y Registro

#### 3.1.1 Registro de Usuario

- Formulario de registro con validación
- Campos: nombre, email, contraseña
- Validación de email y contraseña
- Redirección automática al mapa después del registro
- Almacenamiento de usuario en `localStorage`

#### 3.1.2 Inicio de Sesión

- Formulario de login con email y contraseña
- Validación de credenciales contra la API
- Almacenamiento de sesión en `localStorage`
- Redirección automática al mapa después del login

#### 3.1.3 Gestión de Sesión

- Persistencia de sesión entre recargas de página
- Actualización automática de puntos del usuario
- Logout con limpieza de sesión
- Protección de rutas con `authGuard`

### 3.2 Visualización de POIs

#### 3.2.1 Mapa Interactivo

- Mapa Leaflet centrado en Málaga (por defecto)
- Carga de todos los POIs desde la API con paginación
- Marcadores personalizados según etiquetas del POI
- Popups con información básica del POI
- Navegación a detalles al hacer clic en marcador o popup
- Visualización de coordenadas al hacer clic en el mapa

#### 3.2.2 Lista de POIs

- Vista de lista con tarjetas para cada POI
- Carga paginada de todos los POIs (lotes de 1000)
- Información mostrada: nombre, descripción, imagen, rating
- Navegación a detalles al hacer clic en tarjeta
- Diseño responsive con grid

#### 3.2.3 Detalles de POI

- Información completa del POI
- Imagen principal del POI
- Información del autor
- Rating promedio y número de valoraciones
- Galería de fotos asociadas
- Ubicación geográfica (coordenadas)

### 3.3 Creación y Gestión de POIs

#### 3.3.1 Crear POI

- Formulario de creación desde el mapa
- Selección de ubicación haciendo clic en el mapa
- Campos: nombre, descripción, etiquetas, imagen
- Validación de campos requeridos
- Subida de imagen a través de FormData
- Actualización automática de puntos del usuario
- Navegación automática a detalles del POI creado

#### 3.3.2 Editar POI

- Formulario de edición visible solo si el usuario es el autor
- Campos editables: nombre, descripción, etiquetas
- Validación de campos
- Actualización en tiempo real después de guardar

#### 3.3.3 Eliminar POI

- Botón de eliminación visible solo si el usuario es el autor
- Confirmación antes de eliminar
- Eliminación de POI y recursos asociados
- Redirección al mapa después de eliminar
- Actualización automática de puntos del usuario

### 3.4 Gestión de Fotografías

#### 3.4.1 Subir Foto

- Formulario de subida desde detalles de POI
- Campos: descripción (opcional), archivo de imagen
- Validación de archivo requerido
- Subida mediante FormData
- Actualización automática de la galería
- Actualización automática de puntos del usuario

#### 3.4.2 Visualizar Fotos

- Galería de fotos en detalles de POI
- Visualización en modal al hacer clic en foto
- Información de cada foto: descripción, rating, autor
- Enlaces a POI desde fotos en perfil de usuario

#### 3.4.3 Eliminar Foto

- Botón de eliminación visible solo si el usuario es el autor
- Confirmación antes de eliminar
- Actualización automática de la galería

### 3.5 Sistema de Valoraciones

#### 3.5.1 Valorar POI

- Desplegable de puntuación (1-10)
- Validación de puntuación seleccionada
- Envío de valoración a la API
- Actualización automática de rating del POI
- Actualización automática de puntos del usuario

#### 3.5.2 Valorar Foto

- Desplegable de puntuación (1-10) por cada foto
- Validación de puntuación seleccionada
- Envío de valoración a la API
- Actualización automática de rating de la foto
- Actualización automática de puntos del usuario

### 3.6 Perfil de Usuario

#### 3.6.1 Información del Perfil

- Nombre y email del usuario
- Puntos totales, POIs creados, fotos subidas
- Actualización automática de puntos en tiempo real

#### 3.6.2 POIs Creados

- Lista de todos los POIs creados por el usuario
- Carga paginada para manejar grandes volúmenes
- Enlaces a detalles de cada POI
- Información: nombre, descripción, imagen, rating

#### 3.6.3 Fotos Subidas

- Lista de todas las fotos subidas por el usuario
- Carga desde todos los POIs con paginación
- Enlaces al POI asociado de cada foto
- Información: descripción, rating, POI asociado

### 3.7 Ranking Global

#### 3.7.1 Tabla de Líderes

- Lista de usuarios ordenados por `total_score`
- Información: nombre, email, puntos totales
- Carga desde la API con límite configurable

### 3.8 Navegación y UX

#### 3.8.1 Navbar

- Logo de la aplicación (imagen desde S3)
- Enlaces de navegación: Mapa, Lista de POIs, Ranking
- Enlace a perfil del usuario autenticado
- Información del usuario: nombre y puntos totales
- Botón de logout
- Ocultación automática en páginas de login/registro

#### 3.8.2 Actualización Automática

- Puntos del usuario se actualizan automáticamente después de:
  - Crear POI
  - Subir foto
  - Valorar POI
  - Valorar foto
  - Eliminar POI
- Sincronización mediante RxJS Subject

---

## 4. Descripción de la API Desarrollada y URLs de APIs Externas

### 4.1 API Backend Utilizada

El frontend consume la **API REST desarrollada en FastAPI** (backend). Todos los endpoints requieren autenticación mediante header `X-API-Key`.

#### 4.1.1 Endpoints de Usuarios

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| POST | `/users/` | Registro de nuevos usuarios |
| POST | `/users/authenticate` | Login de usuarios |
| GET | `/users/{user_id}` | Obtener información de usuario |
| GET | `/users/{user_id}/profile` | Obtener perfil completo con estadísticas |
| GET | `/users/ranking/global` | Obtener ranking de usuarios |

#### 4.1.2 Endpoints de POIs

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| POST | `/pois/` | Crear nuevo POI (con imagen) |
| GET | `/pois/` | Listar POIs con paginación |
| GET | `/pois/{poi_id}` | Obtener detalles de un POI |
| PUT | `/pois/{poi_id}` | Actualizar POI existente |
| DELETE | `/pois/{poi_id}` | Eliminar POI |

#### 4.1.3 Endpoints de Fotos

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| POST | `/photos/` | Subir foto a un POI |
| GET | `/photos/poi/{poi_id}` | Obtener fotos de un POI |
| GET | `/photos/{photo_id}` | Obtener detalles de una foto |
| DELETE | `/photos/{photo_id}` | Eliminar foto |

#### 4.1.4 Endpoints de Valoraciones

| Método | Endpoint | Uso en Frontend |
|--------|----------|-----------------|
| POST | `/ratings/` | Crear valoración (POI o foto) |
| GET | `/ratings/{rating_id}` | Obtener valoración específica |
| DELETE | `/ratings/{rating_id}` | Eliminar valoración |

### 4.2 Configuración de la API

La URL base de la API y la API Key se configuran mediante `config.json`, generado en runtime por Docker desde variables de entorno:

```json
{
  "apiUrl": "http://localhost:8000",
  "apiKey": "tu-api-key-aqui"
}
```

**Decisión técnica**: Esta configuración dinámica permite diferentes entornos (desarrollo, producción) sin necesidad de rebuild de la aplicación.

### 4.3 URLs de APIs Externas Utilizadas

#### 4.3.1 AWS S3

- **URL de almacenamiento**: `https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/`
- **Uso**:
  - Imágenes de POIs: `{bucket}/pois/{filename}`
  - Imágenes de fotos: `{bucket}/photos/{filename}`
  - Logo de la aplicación: `{bucket}/20251230_002924_e880896d.png`
- **Acceso**: URLs públicas, las imágenes se sirven directamente desde S3

#### 4.3.2 Leaflet CDN

- **CSS**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- **Uso**: Estilos para el mapa interactivo
- **Nota**: Leaflet se instala como dependencia npm, pero los estilos se cargan desde CDN en `index.html`

#### 4.3.3 MongoDB Atlas

- **Acceso indirecto**: A través de la API backend
- **Uso**: Almacenamiento de datos (usuarios, POIs, fotos, valoraciones)
- **No hay conexión directa** desde el frontend por seguridad

### 4.4 Autenticación

Todas las peticiones HTTP (excepto las públicas) incluyen el header:

```
X-API-Key: {api-key}
```

La API key se obtiene de `config.json` y se inyecta automáticamente en todos los headers HTTP mediante `ApiService`.

---

## 5. Instrucciones de Instalación y Despliegue

### 5.1 Requisitos Previos

- **Docker** y **Docker Compose** instalados
- **Node.js 20+** (solo para desarrollo local, no necesario en Docker)
- Variables de entorno configuradas

### 5.2 Configuración Local (Desarrollo)

#### 5.2.1 Instalación de Dependencias

```bash
cd frontend
npm install
```

#### 5.2.2 Configuración de Variables de Entorno

Crear archivo `src/assets/config.json` manualmente (solo para desarrollo local):

```json
{
  "apiUrl": "http://localhost:8000",
  "apiKey": "tu-api-key-aqui"
}
```

**Nota**: En Docker, este archivo se genera automáticamente desde variables de entorno.

#### 5.2.3 Ejecución en Desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

### 5.3 Despliegue con Docker

#### 5.3.1 Configuración en `docker-compose.yml`

El frontend se configura mediante variables de entorno:

```yaml
frontend:
  build: ./frontend
  ports:
    - "80:80"
  environment:
    - API_URL=http://backend:8000
    - API_KEY=tu-api-key-aqui
  depends_on:
    - backend
```

#### 5.3.2 Build y Ejecución

```bash
# Desde la raíz del proyecto
docker-compose build frontend
docker-compose up -d frontend
```

#### 5.3.3 Proceso de Build

1. **Stage 1 (Builder)**:
   - Instala dependencias npm
   - Compila la aplicación Angular
   - Genera archivos estáticos en `dist/urbanspot/browser`

2. **Stage 2 (Production)**:
   - Copia archivos compilados a imagen Nginx
   - Configura Nginx para servir la aplicación
   - Ejecuta `entrypoint.sh` para generar `config.json`

#### 5.3.4 Script `entrypoint.sh`

El script `entrypoint.sh` se ejecuta al iniciar el contenedor y:

1. Lee variables de entorno `API_URL` y `API_KEY`
2. Genera `config.json` en `/usr/share/nginx/html/assets/`
3. Inicia Nginx

### 5.4 Despliegue en Producción

#### Opción 1: Docker en Servidor

1. **Configurar servidor**:
   - Instalar Docker y Docker Compose
   - Configurar firewall (puerto 80 o el que se use)

2. **Subir código**:

   ```bash
   git clone <repo-url>
   cd practica
   ```

3. **Configurar variables de entorno en `docker-compose.yml`**:

   ```yaml
   environment:
     - API_URL=https://api.tudominio.com
     - API_KEY=tu-api-key-de-produccion
   ```

4. **Construir y ejecutar**:

   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

5. **Configurar reverse proxy** (Nginx, Traefik) para:
   - SSL/TLS (HTTPS)
   - Dominio personalizado
   - Rate limiting

#### Opción 2: Plataformas PaaS

##### **Vercel**

1. Instalar Vercel CLI: `npm i -g vercel`
2. Configurar variables de entorno en dashboard:
   - `API_URL`
   - `API_KEY`
3. Desplegar: `vercel --prod`

**Nota**: Requiere adaptar el build para generar `config.json` desde variables de entorno.

##### **Netlify**

1. Conectar repositorio en Netlify
2. Configurar build command: `npm run build`
3. Configurar variables de entorno en dashboard
4. Desplegar automáticamente desde Git

##### **GitHub Pages**

1. Configurar GitHub Actions para build
2. Generar `config.json` desde secrets
3. Desplegar a GitHub Pages

#### Opción 3: Servidor Estático + CDN

1. **Build local o en CI/CD**:

   ```bash
   npm run build
   ```

2. **Generar `config.json` manualmente** con valores de producción

3. **Subir a servidor estático**:
   - AWS S3 + CloudFront
   - Google Cloud Storage + CDN
   - Azure Blob Storage + CDN

### 5.5 Configuración de Nginx

El archivo `nginx.conf` configura Nginx para:

- Servir archivos estáticos de Angular
- Redirigir todas las rutas a `index.html` (SPA routing)
- Configurar headers de seguridad
- Configurar compresión gzip

### 5.6 Verificación Post-Despliegue

1. **Verificar que la aplicación carga**: `http://localhost` (o URL de producción)
2. **Verificar `config.json`**: `http://localhost/assets/config.json` debe existir
3. **Probar login/registro**: Verificar que la comunicación con la API funciona
4. **Probar creación de POI**: Verificar que las imágenes se suben correctamente
5. **Verificar mapa**: Verificar que los POIs se cargan y muestran en el mapa

---

## 6. Limitaciones de la Solución y Mejoras Futuras

### 6.1 Limitaciones Actuales

#### 6.1.1 Autenticación

- **Limitación**: No hay gestión de tokens JWT o refresh tokens
- **Impacto**: La sesión se mantiene solo en `localStorage`, vulnerable a XSS
- **Riesgo**: Si el `localStorage` se compromete, el atacante tiene acceso completo

#### 6.1.2 Validación de Archivos

- **Limitación**: No se valida el tipo MIME real de las imágenes en el frontend
- **Impacto**: Posible subida de archivos maliciosos
- **Riesgo**: Seguridad y almacenamiento innecesario

#### 6.1.3 Tamaño de Archivos

- **Limitación**: No hay límite explícito de tamaño de archivo en el frontend
- **Impacto**: Posible subida de archivos muy grandes
- **Riesgo**: Problemas de rendimiento y costos de almacenamiento

#### 6.1.4 Paginación en Frontend

- **Limitación**: La paginación se maneja cargando todos los datos en lotes
- **Impacto**: Para grandes volúmenes, se cargan muchos datos en memoria
- **Riesgo**: Rendimiento degradado con muchos POIs/fotos

#### 6.1.5 Manejo de Errores

- **Limitación**: Manejo de errores básico, principalmente con `alert()`
- **Impacto**: Experiencia de usuario no óptima
- **Riesgo**: Errores críticos pueden no ser manejados adecuadamente

#### 6.1.6 Estado Global

- **Limitación**: No hay gestión de estado global (Redux, NgRx)
- **Impacto**: Estado duplicado entre componentes
- **Riesgo**: Inconsistencias de datos

#### 6.1.7 Caché

- **Limitación**: No hay sistema de caché para datos de la API
- **Impacto**: Todas las peticiones van directamente a la API
- **Riesgo**: Latencia y consumo innecesario de recursos

#### 6.1.8 Optimización de Imágenes

- **Limitación**: Las imágenes se muestran en tamaño completo
- **Impacto**: Carga lenta en conexiones lentas
- **Riesgo**: Mala experiencia de usuario

#### 6.1.9 Búsqueda y Filtros

- **Limitación**: No hay búsqueda de POIs por nombre o descripción
- **Impacto**: Difícil encontrar POIs específicos
- **Riesgo**: Funcionalidad limitada

#### 6.1.10 Responsive Design

- **Limitación**: Diseño responsive básico
- **Impacto**: Experiencia no óptima en dispositivos móviles
- **Riesgo**: Usabilidad limitada en móviles

### 6.2 Mejoras Futuras

#### 6.2.1 Autenticación y Seguridad

- [ ] Implementar **JWT tokens** con refresh tokens
- [ ] **HttpOnly cookies** para almacenar tokens
- [ ] **CSRF protection** para formularios
- [ ] **Sanitización de inputs** para prevenir XSS
- [ ] **Content Security Policy (CSP)** headers

#### 6.2.2 Validación y Seguridad de Archivos

- [ ] Validación de tipo MIME real (magic bytes)
- [ ] Límite de tamaño de archivo (ej: 10MB)
- [ ] Preview de imagen antes de subir
- [ ] Compresión de imágenes antes de subir
- [ ] Redimensionamiento automático de imágenes grandes

#### 6.2.3 Gestión de Estado

- [ ] Implementar **NgRx** o **Akita** para estado global
- [ ] Caché de datos de la API
- [ ] Optimistic updates para mejor UX
- [ ] Estado persistente entre sesiones

#### 6.2.4 Funcionalidades de Búsqueda y Filtrado

- [ ] **Búsqueda full-text** de POIs por nombre/descripción
- [ ] **Filtros avanzados**: por etiquetas, rating, fecha
- [ ] **Búsqueda geográfica**: POIs cercanos a ubicación
- [ ] **Ordenamiento**: por fecha, rating, nombre
- [ ] **Búsqueda en tiempo real** con debounce

#### 6.2.5 Optimización de Rendimiento

- [ ] **Lazy loading de imágenes** (intersection observer)
- [ ] **Virtual scrolling** para listas grandes
- [ ] **Service Workers** para caché offline
- [ ] **Code splitting** más agresivo
- [ ] **Tree shaking** optimizado
- [ ] **Compresión de assets** (gzip, brotli)

#### 6.2.6 Mejoras de UX

- [ ] **Notificaciones toast** en lugar de `alert()`
- [ ] **Loading skeletons** durante carga de datos
- [ ] **Error boundaries** para manejo de errores
- [ ] **Confirmaciones modales** elegantes
- [ ] **Feedback visual** para todas las acciones
- [ ] **Modo oscuro** (dark mode)

#### 6.2.7 Funcionalidades Adicionales

- [ ] **Favoritos**: Marcar POIs como favoritos
- [ ] **Compartir POIs**: Enlaces compartibles
- [ ] **Comentarios**: Sistema de comentarios en POIs
- [ ] **Notificaciones**: Push notifications para eventos
- [ ] **Mapa de calor**: Visualización de densidad de POIs
- [ ] **Rutas**: Crear rutas entre POIs
- [ ] **Exportar datos**: Descargar POIs en JSON/CSV

#### 6.2.8 Testing

- [ ] **Tests unitarios** para servicios y componentes
- [ ] **Tests de integración** para flujos completos
- [ ] **Tests E2E** con Cypress o Playwright
- [ ] **Cobertura de código** > 80%
- [ ] **Tests de accesibilidad** (a11y)

#### 6.2.9 Accesibilidad

- [ ] **ARIA labels** completos
- [ ] **Navegación por teclado** completa
- [ ] **Screen reader** compatible
- [ ] **Contraste de colores** WCAG AA
- [ ] **Focus management** adecuado

#### 6.2.10 Internacionalización

- [ ] **i18n** (Angular i18n) para múltiples idiomas
- [ ] **Formateo de fechas** según locale
- [ ] **Formateo de números** según locale

#### 6.2.11 PWA (Progressive Web App)

- [ ] **Service Worker** para funcionamiento offline
- [ ] **Web App Manifest** para instalación
- [ ] **Push notifications**
- [ ] **Background sync**

#### 6.2.12 Monitoreo y Analytics

- [ ] **Error tracking** (Sentry, Rollbar)
- [ ] **Analytics** (Google Analytics, Plausible)
- [ ] **Performance monitoring** (Web Vitals)
- [ ] **User session recording** (opcional)

---

## 7. Conclusiones

El frontend de UrbanSpot ha sido desarrollado siguiendo **principios de arquitectura moderna** con Angular, utilizando **componentes reutilizables**, **servicios centralizados** y **routing avanzado**. La separación entre componentes de presentación y servicios de lógica de negocio facilita:

- **Mantenibilidad**: Código organizado y fácil de entender
- **Escalabilidad**: Fácil agregar nuevas funcionalidades
- **Testabilidad**: Servicios y componentes pueden testearse independientemente
- **Reutilización**: Servicios centralizados evitan duplicación de código

La solución actual cubre todos los requisitos básicos del caso de estudio, proporcionando una interfaz de usuario completa para gestionar POIs, fotos, valoraciones y visualizar rankings. La integración con el backend mediante API REST es robusta y la configuración dinámica mediante `config.json` permite flexibilidad en diferentes entornos.

Las mejoras futuras propuestas permitirían llevar la aplicación a un nivel de producción empresarial, mejorando la seguridad, rendimiento, accesibilidad y experiencia de usuario.

---

**Autor**: [Tu Nombre]  
**Fecha**: [Fecha Actual]  
**Versión**: 1.0.0
