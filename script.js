const API_HOSTS = [
  "https://gruv2.onrender.com",
  "http://44.226.145.213:10000",
  "http://54.187.200.255:10000",
  "http://34.213.214.55:10000",
  "http://35.164.95.156:10000",
  "http://44.230.95.183:10000",
  "http://44.229.200.200:10000"
];

function fetchWithTimeout(resource, options = {}) {
  const { timeout = 5000 } = options;
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout ao conectar')), timeout)
    )
  ]);
}

async function fetchFromFirstAvailable(urls) {
  for (const url of urls) {
    try {
      const resp = await fetchWithTimeout(url, { timeout: 5000 });
      if (resp.ok) return resp;
    } catch (e) {
      // ignora e tenta o próximo
    }
  }
  throw new Error("Nenhum dos endpoints respondeu.");
}

async function carregarChegadas() {
  const message = document.getElementById('message');
  const table = document.getElementById('flights-table');
  const tbody = document.getElementById('flights-body');
  message.textContent = 'Carregando...';
  message.className = 'loading';
  table.style.display = 'none';
  tbody.innerHTML = '';

  try {
    const resposta = await fetchFromFirstAvailable(API_HOSTS);
    const voos = await resposta.json();

    if (!Array.isArray(voos) || voos.length === 0) {
      message.textContent = 'Nenhuma chegada encontrada.';
      return;
    }

    for (const voo of voos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${voo.flight_number ?? '-'}</td>
        <td>${voo.registration ?? '-'}</td>
        <td>${voo.aircraft_type ?? '-'}</td>
        <td>${voo.origin ?? '-'}</td>
        <td>${voo.scheduled_in ?? voo.scheduled_arrival ?? '-'}</td>
        <td>${voo.estimated_in ?? voo.estimated_arrival ?? '-'}</td>
        <td>${voo.progress_percent != null ? voo.progress_percent + '%' : '-'}</td>
      `;
      tbody.appendChild(tr);
    }

    message.textContent = '';
    table.style.display = '';
  } catch (erro) {
    message.textContent = 'Erro ao carregar dados: ' + erro.message;
    message.className = 'error';
  }
}
