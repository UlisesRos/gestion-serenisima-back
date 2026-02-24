// routes/health.js
// Endpoint simple para verificar si el servidor está online
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.head('/', (req, res) => {
  res.status(200).end();
});

module.exports = router;