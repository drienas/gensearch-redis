// Dotenv nur in Nicht-Produktionsumgebungen laden
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const Redis = require("ioredis");
const { v4: uuidv4 } = require("uuid");
const { authFlow } = require("./authFlow");
const { createToken } = require("./jwt");

// API-Zugangsdaten aus Umgebungsvariablen
const API_USER = process.env.API_USER;
const API_PW = process.env.API_PW;

// Redis-Konfiguration
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_USERNAME = process.env.REDIS_USERNAME || "";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

// Express-App initialisieren
const app = express();
const PORT = process.env.PORT || 4000;

// Redis-Clients
const publisher = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
});

const subscriber = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
});

// Middleware
app.use(morgan("[:date] :method :url :status - :response-time ms"));
app.use(cors());
app.use(express.json());

// Authentication Middleware für alle Routen außer dem Health-Check
app.use((req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  authFlow(req, res, next);
});

// Timeout für Anfragen (10 Sekunden)
const REQUEST_TIMEOUT = 10000;

// Speicher für ausstehende Anfragen
const pendingRequests = new Map();

// Health-Check-Endpunkt
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Suchendpunkt für Fahrzeuge
app.get("/search/vehicles", async (req, res) => {
  try {
    const search = req.query.search;
    const mapped = req.query.mapped;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Kein Suchbegriff in den Abfrageparametern gefunden",
        hits: [],
      });
    }

    const requestId = uuidv4();
    const requestData = {
      id: requestId,
      type: "vehicles",
      search,
      mapped,
    };

    // Anfrage an Redis senden
    const result = await sendRequestAndWaitForResponse(requestData);

    if (!result) {
      return res.status(504).json({
        success: false,
        message: "Zeitüberschreitung bei der Anfrage",
        hits: [],
      });
    }

    // Immer den Status des Backends exakt übernehmen
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Fehler bei der Fahrzeugsuche:", error);
    return res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
      hits: [],
    });
  }
});

// Suchendpunkt für Kunden
app.get("/search/customers", async (req, res) => {
  try {
    const search = req.query.search;
    const mapped = req.query.mapped;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Kein Suchbegriff in den Abfrageparametern gefunden",
        hits: [],
      });
    }

    const requestId = uuidv4();
    const requestData = {
      id: requestId,
      type: "customers",
      search,
      mapped,
    };

    // Anfrage an Redis senden
    const result = await sendRequestAndWaitForResponse(requestData);

    if (!result) {
      return res.status(504).json({
        success: false,
        message: "Zeitüberschreitung bei der Anfrage",
        hits: [],
      });
    }

    // Immer den Status des Backends exakt übernehmen
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Fehler bei der Kundensuche:", error);
    return res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
      hits: [],
    });
  }
});

// Kombinierter Suchendpunkt
app.get("/search", async (req, res) => {
  try {
    const search = req.query.search;
    const mapped = req.query.mapped;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Kein Suchbegriff in den Abfrageparametern gefunden",
        hits: [],
      });
    }

    const requestId = uuidv4();
    const requestData = {
      id: requestId,
      type: "combined",
      search,
      mapped,
    };

    // Anfrage an Redis senden
    const result = await sendRequestAndWaitForResponse(requestData);

    if (!result) {
      return res.status(504).json({
        success: false,
        message: "Zeitüberschreitung bei der Anfrage",
        hits: [],
      });
    }

    // Immer den Status des Backends exakt übernehmen
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Fehler bei der kombinierten Suche:", error);
    return res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
      hits: [],
    });
  }
});

// Suchendpunkt für Kunden-ID
app.get("/search/customerId", async (req, res) => {
  try {
    const search = req.query.search;
    const mapped = req.query.mapped;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Keine Kunden-ID in den Abfrageparametern gefunden",
        hit: null,
      });
    }

    const requestId = uuidv4();
    const requestData = {
      id: requestId,
      type: "customerId",
      search,
      mapped,
    };

    // Anfrage an Redis senden
    const result = await sendRequestAndWaitForResponse(requestData);

    if (!result) {
      return res.status(504).json({
        success: false,
        message: "Zeitüberschreitung bei der Anfrage",
        hit: null,
      });
    }

    // Wenn wir einen Treffer haben, formatieren wir die Antwort entsprechend
    if (result.status === 200 && result.data) {
      return res.status(200).json({
        success: true,
        hit: result.data,
      });
    }

    // Wenn kein Treffer gefunden wurde
    return res.status(404).json({
      success: false,
      message: "Kein Kunde mit dieser ID gefunden",
      hit: null,
    });
  } catch (error) {
    console.error("Fehler bei der Kunden-ID-Suche:", error);
    return res.status(500).json({
      success: false,
      message: "Interner Serverfehler",
      error: error.message,
      hit: null,
    });
  }
});

// Endpunkt zur Token-Generierung (nur mit Basic Auth zugänglich)
app.post("/token", (req, res) => {
  // Nur Basic Auth erlauben (nicht Bearer Token)
  const authHeader = req.headers.authorization || "";
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Basic") {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Only Basic Authentication is allowed for token generation",
    });
  }

  const token = parts[1];
  const expectedToken = Buffer.from(`${API_USER}:${API_PW}`).toString("base64");

  if (token !== expectedToken) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
  }

  // Optional: Informationen aus dem Request-Body verwenden
  const handle = req.body.handle || "external-client";

  // JWT-Token generieren
  const jwt = createToken(handle);

  // Token zurückgeben
  res.json({
    token: jwt,
    type: "Bearer",
    // Kein expires_in, da der Token nicht abläuft
  });
});

// Sendet eine Anfrage an Redis und wartet auf eine Antwort
async function sendRequestAndWaitForResponse(requestData) {
  return new Promise((resolve) => {
    const requestId = requestData.id;

    // Timer für Timeout
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve(null);
    }, REQUEST_TIMEOUT);

    // Anfrage speichern
    pendingRequests.set(requestId, {
      resolve,
      timeoutId,
    });

    // Anfrage an Redis senden
    publisher.publish("search_requests", JSON.stringify(requestData));
  });
}

// Bei Antworten vom Backend
subscriber.subscribe("search_responses", (err) => {
  if (err) {
    console.error("Fehler beim Abonnieren des Kanals:", err);
    return;
  }
  console.log('Kanal "search_responses" abonniert');
});

subscriber.on("message", (channel, message) => {
  if (channel === "search_responses") {
    try {
      const response = JSON.parse(message);
      const requestId = response.id;

      // Prüfen, ob die Anfrage noch gültig ist
      if (pendingRequests.has(requestId)) {
        const { resolve, timeoutId } = pendingRequests.get(requestId);

        // Timer löschen
        clearTimeout(timeoutId);

        // Anfrage aus dem Speicher entfernen
        pendingRequests.delete(requestId);

        // Antwort zurückgeben
        resolve(response);
      }
    } catch (error) {
      console.error("Fehler beim Verarbeiten der Antwort:", error);
    }
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Externer Server läuft auf Port ${PORT}`);
});
