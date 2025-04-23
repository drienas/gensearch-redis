FROM node:18-alpine

WORKDIR /app

# Abhängigkeiten installieren
COPY package*.json ./
RUN npm install

# Anwendungscode kopieren
COPY . .

# Port freigeben
EXPOSE 4000

# Anwendung starten
CMD ["npm", "start"] 