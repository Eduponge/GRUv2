import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Proxy endpoint para chegadas em SBGR
app.get("/api/chegadas", async (req, res) => {
  try {
    const response = await fetch("https://aeroapi.flightaware.com/aeroapi/airports/SBGR/flights/arrivals", {
      headers: {
        "x-apikey": process.env.AEROAPI_KEY
      }
    });

    // repassa status e dados brutos para o frontend
    res.status(response.status);
    response.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar a AeroAPI", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});