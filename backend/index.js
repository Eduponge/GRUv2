import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: "https://eduponge.github.io" // coloque o domínio do seu frontend aqui
}));

// Proxy endpoint para chegadas em SBGR
app.get("/api/chegadas", async (req, res) => {
  try {
    const response = await fetch("https://aeroapi.flightaware.com/aeroapi/airports/SBGR/flights/arrivals", {
      headers: {
        "Authorization": `Bearer ${process.env.AEROAPI_KEY}`
      }
    });

    // Passa o status e os dados de volta ao frontend
    res.status(response.status);
    // Se o conteúdo for JSON, parse e envie como JSON
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao consultar a AeroAPI", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
