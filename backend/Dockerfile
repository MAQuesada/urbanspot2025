# Utilise une image Python légère
FROM python:3.10-slim

# Définit le dossier de travail dans le conteneur
WORKDIR /app

# Copie les dépendances et les installe
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install email-validator

# Copie tout le code du backend
COPY . .

# Ouvre le port 8000
EXPOSE 8000

# Lance le serveur
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]