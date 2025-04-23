if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { verifyToken } = require("./jwt");

// API-Zugangsdaten aus Umgebungsvariablen
const API_USER = process.env.API_USER || null;
if (!API_USER) {
  console.log(`No API_USER found in environment variables`);
  process.exit(0);
}

const API_PW = process.env.API_PW || null;
if (!API_PW) {
  console.log(`No API_PW found in environment variables`);
  process.exit(0);
}

/**
 * Middleware für die Authentifizierung
 * Unterstützt sowohl Basic Auth als auch Bearer Token
 */
const authFlow = (req, res, next) => {
  // Prüfen, ob ein Authorization-Header existiert
  if (!req.headers.authorization) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "No authorization token found",
    });
  }

  // Authorization-Header aufteilen
  const parts = req.headers.authorization.split(" ");

  // Prüfen, ob der Header das richtige Format hat
  if (parts.length !== 2) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Invalid authorization format",
    });
  }

  let valid = false;
  let data = null;
  const token = parts[1];

  // Je nach Auth-Typ unterschiedlich verarbeiten
  switch (parts[0]) {
    case "Basic":
      // Basic Auth überprüfen
      const expectedToken = Buffer.from(`${API_USER}:${API_PW}`).toString(
        "base64"
      );
      data = null;
      valid = expectedToken === token;
      break;
    case "Bearer":
    default:
      // Bearer Token (JWT) überprüfen
      let tokenResult = verifyToken(token);
      valid = tokenResult.valid;
      data = tokenResult.data;
      break;
  }

  // Wenn die Authentifizierung fehlschlägt
  if (!valid) {
    return res.status(401).json({
      status: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
  }

  // Bei erfolgreicher Authentifizierung weitermachen
  next();
};

module.exports = { authFlow };
