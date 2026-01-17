# Technical Documentation: PaaS Deployment Architecture (Vercel)

## 1. Executive Summary & Architecture
This document outlines the deployment strategy for the **UrbanSpot** platform. The solution utilizes a **Decoupled Architecture**, where the Frontend and Backend are deployed as separate microservices on the Vercel PaaS (Platform as a Service) ecosystem.

### Architectural Diagram
* **Client Layer:** Angular 16+ SPA (Single Page Application).
* **Compute Layer:** Python FastAPI running on Vercel Serverless Functions.
* **Data Persistence Layer:** MongoDB Atlas (NoSQL Cloud Database).
* **Media Storage Layer:** ImgBB API (External Object Storage).

---

## 2. Backend Deployment (FastAPI)

The backend logic resides in the `/backend` directory. Unlike traditional servers (VPS), this is deployed as **Serverless Functions**.

### 2.1 Configuration: `vercel.json`
To bridge the gap between Vercel's edge network and the Python runtime, a `vercel.json` configuration file was implemented at the root.

* **Logic:** It routes all HTTP traffic matching `/api/*` and `/docs` to the Python handler.
* **Entrypoint:** The standard WSGI application instance (`app`) is exposed via `index.py`.

### 2.2 Dependency Management
Vercel automatically detects the `requirements.txt` file.
* **Key Libraries Installed:** `fastapi`, `uvicorn`, `pymongo`, `python-multipart` (for image handling), `requests` (for ImgBB communication).

### 2.3 Required Environment Variables (Backend)
These secrets are strictly configured in the **Vercel Project Settings > Environment Variables**. They are **not** hardcoded in the source code for security reasons.

| Variable Name | Description | Value Format Example |
| :--- | :--- | :--- |
| `MONGODB_URI` | The connection string for the MongoDB Atlas Cluster. Must include username/password. | `mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority` |
| `SECRET_KEY` | A cryptographic string used to sign and verify JWT Auth Tokens. | `09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7` |
| `IMGBB_API_KEY` | The private API Key provided by ImgBB to authorize image uploads. | `38b37c09d25e094faa6ca25...` |

---

## 3. Frontend Deployment (Angular)

The user interface resides in the `/frontend` directory. It is served as a static site via Vercel's Global CDN.

### 3.1 Build Pipeline
Vercel detects the Angular framework and applies the following build settings:
* **Build Command:** `ng build --configuration production` (Optimizes code and minimizes bundles).
* **Output Directory:** `dist/urbanspot-frontend` (The folder containing compiled HTML/JS/CSS).

### 3.2 SPA Routing (The 404 Fix)
Since Angular is a Single Page Application, refreshing a page like `/home` or `/profile` would normally cause a 404 error on a static host.
* **Solution:** A rewrite rule is configured to redirect all navigation requests back to `index.html`, allowing the Angular Router to handle the view.

### 3.3 Connection to Backend
The frontend must know where the backend lives.
* **File Modified:** `src/environments/environment.prod.ts`
* **Configuration:**
    ```typescript
    export const environment = {
      production: true,
      apiUrl: '[https://urbanspot2025.vercel.app](https://urbanspot2025.vercel.app)' // Directs API calls to the Vercel Backend
    };
    ```

---

## 4. Third-Party Integrations & External Services

To overcome the stateless nature of Serverless architecture, the project relies on external APIs for persistence.

### 4.1 Storage Strategy (ImgBB API)

**4.1.1 The Technical Challenge: Ephemeral Filesystems**
Vercel Serverless Functions run in a containerized environment (AWS Lambda under the hood). These containers have a **Read-Only** file system, except for a temporary `/tmp` directory. However, the `/tmp` directory is **ephemeral**: files stored there are deleted immediately once the function execution ends or the container spins down.

**4.1.2 The Solution: Remote Object Storage**
We integrated ImgBB as an external object storage provider. This offloads the heavy lifting of image hosting and CDN delivery.

**4.1.3 Implementation Workflow**
The image upload process follows a strict data pipeline to ensure no files are written to the Vercel disk:

1.  **Client-Side (Angular):** The user selects a file (`File` object). It is sent as `multipart/form-data` to the FastAPI backend.
2.  **In-Memory Buffer (FastAPI):** The backend receives the file using FastAPI's `UploadFile`. Crucially, the file is read into RAM (using `await file.read()`) rather than saved to disk.
3.  **API Forwarding:** The binary data is immediately POSTed to the ImgBB endpoint (`https://api.imgbb.com/1/upload`) using the `requests` library and the secure `IMGBB_API_KEY`.
4.  **Response Parsing:** ImgBB processes the image and returns a JSON response containing the direct display URL (`data.url`) and the delete URL.
5.  **Database Linking:** Only the remote URL (string) is stored in the MongoDB document, keeping the database lightweight.

---

### 4.2 Database Access (MongoDB Atlas)

**4.2.1 Network Security & Whitelisting**
Vercel's serverless infrastructure does not use static IP addresses. A deployment region (e.g., `cdg1` - Paris) uses a vast range of dynamic IPs that change frequently.
* **Configuration:** The MongoDB Atlas Network Access whitelist is set to `0.0.0.0/0` (Anywhere).
* **Security Mitigation:** While broad network access is generally discouraged, security is enforced via **SCRAM-SHA-256 authentication**. Strong, random passwords are used in the `MONGODB_URI`, and traffic is encrypted via TLS 1.2.

**4.2.2 Connection Pooling in Serverless**
A critical challenge in serverless environments is "Connection Storms." If 100 users hit the API simultaneously, 100 separate Lambda instances might start, potentially opening 100 separate connections to MongoDB.
* **Strategy:** The application initializes the MongoDB client (`MongoClient`) strictly once at the global scope level (outside the request handler).
* **Benefit:** This allows Vercel to reuse the database connection across subsequent requests handled by the same container ("Warm Start"), significantly reducing latency and preventing database connection limits from being reached.

## 5. Production Environment & Verification

### 5.1 Active Deployments
The Continuous Deployment (CD) pipeline is currently active. Every commit pushed to the `main` branch automatically triggers a build and redeploy to the production environment. Vercel automatically manages SSL/TLS certificates (HTTPS) for all domains.

| Component | Production Endpoint | Environment | Status |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | [https://urbanspot-frontend.vercel.app](https://urbanspot-frontend.vercel.app) | `Production` | ✅ **Online (200 OK)** |
| **Backend API** | [https://urbanspot2025.vercel.app](https://urbanspot2025.vercel.app) | `Production` | ✅ **Online (200 OK)** |
| **Swagger UI** | [https://urbanspot2025.vercel.app/docs](https://urbanspot2025.vercel.app/docs) | `Production` | ✅ **Interactive** |

### 5.2 Verification Protocol
To validate the integrity of the PaaS deployment, the following manual tests were conducted:

**A. API Health Check**
* **Method:** GET Request to `https://urbanspot2025.vercel.app/`
* **Expected Result:** A JSON response `{"message": "Hello World"}` or similar status message confirming the Python runtime is active and responsive.
* **Latency:** Average response time < 300ms (Cold Start may vary).

**B. Database Connection Test**
* **Method:** Accessing the `/docs` endpoint and executing a `GET /users` or `GET /posts` request.
* **Success Criteria:** The API returns a list of objects from MongoDB Atlas, confirming that the `MONGODB_URI` environment variable is correctly injected and the whitelist configuration allows the connection.

**C. Static Asset Delivery**
* **Method:** Loading the Frontend URL in Incognito Mode.
* **Success Criteria:** The Angular application loads without 404 errors on refresh, confirming the **Rewrite Rules** in `vercel.json` are correctly handling the SPA routing.


## 6. Troubleshooting Log

### Issue 1: CORS Policy Blocking
* **Symptom:** Frontend requests blocked with "Access-Control-Allow-Origin" error.
* **Resolution:** Configured `CORSMiddleware` in FastAPI (`main.py`) to explicitly allow the origin `https://urbanspot-frontend.vercel.app`.

### Issue 2: Image Upload Failure
* **Symptom:** Images uploaded to the `/tmp` folder were disappearing.
* **Resolution:** Migrated storage logic to ImgBB API to ensure persistence outside the serverless container.