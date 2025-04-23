if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const SECRET = process.env.JWT_SECRET || null;
if (!SECRET) {
  console.log(`No JWT secret found in environment variables`);
  process.exit(0);
}

const jwt = require("jsonwebtoken");

/**
 * Erstellt ein neues JWT-Token ohne Ablaufzeit
 * @param {string} handle - Die Benutzer-ID oder ein anderer Identifier
 * @returns {string} - Das signierte JWT-Token
 */
const createToken = (handle) =>
  jwt.sign(
    {
      handle,
      // Kein expiresIn, damit der Token nicht abläuft
    },
    SECRET
  );

/**
 * Überprüft ein JWT-Token
 * @param {string} token - Das zu überprüfende Token
 * @returns {Object} - Objekt mit valid (boolean) und data (Object|null)
 */
const verifyToken = (token) => {
  let valid = false;
  let data = null;
  try {
    data = jwt.verify(token, SECRET);
    valid = true;
  } catch (err) {
    data = null;
    valid = false;
  } finally {
    return {
      valid,
      data,
    };
  }
};

module.exports = { createToken, verifyToken };
