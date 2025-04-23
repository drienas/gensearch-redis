# DA-Bridge External

Dieser Server dient als externe Schnittstelle für die DA-Bridge. Er nimmt Suchanfragen entgegen und leitet sie über Redis an den internen DA-Bridge-Server weiter, der im Intranet läuft.

## Funktionsweise

1. Der externe Server nimmt HTTP-Anfragen unter den Endpoints `/search`, `/search/vehicles` und `/search/customers` entgegen.
2. Er leitet diese Anfragen über Redis an den internen Server weiter.
3. Der interne Server verarbeitet die Anfragen und sendet die Ergebnisse zurück an den externen Server.
4. Der externe Server gibt die Ergebnisse als HTTP-Antwort zurück.

## Einrichtung

1. Redis-Server einrichten (standardmäßig wird `jobrouter6:6379` verwendet)
2. Umgebungsvariablen konfigurieren:
   ```
   PORT=4000
   REDIS_HOST=jobrouter6
   REDIS_PORT=6379
   REDIS_USERNAME=
   REDIS_PASSWORD=
   API_USER=bridge-external
   API_PW=secure-access-token
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```
3. Abhängigkeiten installieren: `npm install`
4. Server starten: `npm start`

## API-Endpoints

Alle Endpoints (außer `/health`) erfordern Authentifizierung mit Basic Auth oder Bearer Token.

### Fahrzeugsuche

```
GET /search/vehicles?search=SUCHBEGRIFF&mapped=true|false
```

### Kundensuche

```
GET /search/customers?search=SUCHBEGRIFF&mapped=true|false
```

### Kombinierte Suche

```
GET /search?search=SUCHBEGRIFF&mapped=true|false
```

Der Parameter `mapped` steuert, ob die Ergebnisse im Original-Format oder im gensearch-Format zurückgegeben werden. Standardmäßig ist er auf `true` gesetzt.

## Authentication

Die API unterstützt zwei Arten der Authentifizierung:

### 1. Basic Authentication

Der Authorization-Header muss wie folgt formatiert sein:

```
Authorization: Basic <Base64(API_USER:API_PW)>
```

Beispiel für curl:

```
curl -X GET "http://localhost:4000/search?search=BMW" \
  -H "Authorization: Basic YnJpZGdlLWV4dGVybmFsOnNlY3VyZS1hY2Nlc3MtdG9rZW4="
```

Oder mit expliziten Benutzernamen und Passwort:

```
curl -X GET "http://localhost:4000/search?search=BMW" \
  -u "bridge-external:secure-access-token"
```

### 2. Bearer Token (JWT)

Der Authorization-Header muss wie folgt formatiert sein:

```
Authorization: Bearer <JWT-Token>
```

Beispiel für curl:

```
curl -X GET "http://localhost:4000/search?search=BMW" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Token-Generierung

Die API bietet einen Endpoint zum Generieren von JWT-Tokens. Dieser Endpoint ist nur über Basic Authentication zugänglich:

```
POST /token
Authorization: Basic <Base64(API_USER:API_PW)>
Content-Type: application/json

{
  "handle": "client-identifier" // Optional
}
```

Beispiel mit curl:

```
curl -X POST "http://localhost:4000/token" \
  -H "Content-Type: application/json" \
  -u "bridge-external:secure-access-token" \
  -d '{"handle":"my-client"}'
```

Die Antwort enthält das Token und den Typ:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer"
}
```

**Hinweis:** Die generierten Tokens haben keine Ablaufzeit und bleiben unbegrenzt gültig.

Alternativ kann ein Token auch manuell mit Node.js generiert werden:

```javascript
const jwt = require("jsonwebtoken");
const token = jwt.sign(
  { handle: "user-id" },
  "your-super-secret-jwt-key-change-in-production"
);
console.log(token);
```

## Docker

Der Server kann auch mit Docker ausgeführt werden:

```
docker build -t da-bridge-external .
docker run -p 4000:4000 \
  -e REDIS_HOST=jobrouter6 \
  -e REDIS_PORT=6379 \
  -e API_USER=bridge-external \
  -e API_PW=secure-access-token \
  -e JWT_SECRET=your-super-secret-jwt-key-change-in-production \
  da-bridge-external
```
