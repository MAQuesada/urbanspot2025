# Documentation Technique : Déploiement PaaS (Vercel)

## 1. Introduction et Architecture
Ce document détaille la procédure de déploiement de la solution **UrbanSpot** sur la plateforme PaaS **Vercel**. L'architecture choisie est de type "Serverless" pour le backend et "Single Page Application" (SPA) pour le frontend.

### Architecture Cloud
* **Frontend :** Framework Angular 16+, déployé comme site statique avec réécriture d'URL.
* **Backend :** Framework FastAPI (Python), déployé via Vercel Serverless Functions.
* **Base de Données :** MongoDB Atlas (Cloud).
* **Stockage Média :** Intégration de l'API externe ImgBB pour le stockage des images.

---

## 2. Déploiement du Backend (API)

Le backend est situé dans le dossier `/backend`. Vercel détecte automatiquement le fichier `requirements.txt` pour installer les dépendances Python.

### Configuration requise (`vercel.json`)
Pour que FastAPI fonctionne sur Vercel, un fichier de configuration spécifique a été créé à la racine du backend pour rediriger le trafic HTTP vers l'application Python.

**Points clés de la configuration :**
1.  **Runtime :** Python 3.9 (Version supportée par Vercel).
2.  **Entrypoint :** `index.py` ou `main.py` (handler WSGI).
3.  **Routes :** Configuration des routes API (`/api/*`) et de la documentation Swagger (`/docs`).

### Variables d'Environnement (Secrets)
Les clés suivantes doivent être configurées dans l'onglet **Settings > Environment Variables** du projet Vercel :
* `MONGODB_URI` : URL de connexion sécurisée au cluster MongoDB Atlas.
* `SECRET_KEY` : Clé de hachage pour la sécurisation des tokens JWT.
* `IMGBB_API_KEY` : Clé API pour l'upload des images vers les serveurs ImgBB.

---

## 3. Déploiement du Frontend (Angular)

Le frontend est situé dans le dossier `/frontend`. Le déploiement nécessite une compilation AOT (Ahead-of-Time).

### Paramètres de Build (Vercel)
* **Framework Preset :** Angular
* **Build Command :** `ng build --configuration production`
* **Output Directory :** `dist/urbanspot-frontend` (Dossier généré par Angular).

### Gestion du Routing (SPA)
Pour éviter les erreurs 404 lors du rafraîchissement des pages (problème classique des SPA), une règle de réécriture a été ajoutée :
* Toutes les requêtes sont redirigées vers `index.html` pour laisser le routeur Angular gérer l'affichage.

### Connexion avec le Backend
Une modification a été apportée au service API du frontend (`api.service.ts`) pour pointer vers l'URL de production :
* **URL de Développement :** `http://localhost:8000`
* **URL de Production :** `https://urbanspot2025.vercel.app`

---

## 4. Liens de Production

Le déploiement est actuellement actif et fonctionnel aux adresses suivantes :

| Service | URL d'accès | Statut |
| :--- | :--- | :--- |
| **Application Web** | [https://urbanspot-frontend.vercel.app](https://urbanspot-frontend.vercel.app) | ✅ En ligne |
| **API Backend** | [https://urbanspot2025.vercel.app](https://urbanspot2025.vercel.app) | ✅ En ligne |
| **Documentation API** | [https://urbanspot2025.vercel.app/docs](https://urbanspot2025.vercel.app/docs) | ✅ En ligne |

---

## 5. Résolution de Problèmes (Troubleshooting)

Durant le déploiement, plusieurs défis ont été résolus :
1.  **Erreurs CORS :** Configuration du middleware CORSMiddleware dans FastAPI pour autoriser les requêtes provenant du domaine frontend Vercel.
2.  **Environment Hardcoding :** Adaptation du code Angular pour utiliser l'URL HTTPS du backend au lieu de localhost.
3.  **Persistance des images :** Intégration réussie de ImgBB car le système de fichiers de Vercel est éphémère (lecture seule).