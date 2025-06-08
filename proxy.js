const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = 'SUA_API_KEY_AQUI'; // coloque sua chave da FlightAware aqui
const PORT = 3000;

app.get('/api/arrivals', async (req, res) => {
  try {
    const response = await fetch('https://aeroapi.flightaware.com/aeroapi/airports/SBGR/flights/arrivals', {
      headers: { 'x-apikey': API_KEY }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy rodando em http://localhost:${PORT}/api/arrivals`);
});
