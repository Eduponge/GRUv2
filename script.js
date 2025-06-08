async function carregarChegadas() {
  const API_KEY = document.getElementById('api-key').value.trim();
  const API_URL = 'https://aeroapi.flightaware.com/aeroapi/airports/SBGR/flights/arrivals';

  const message = document.getElementById('message');
  const table = document.getElementById('flights-table');
  const tbody = document.getElementById('flights-body');

  message.textContent = 'Carregando...';
  message.className = 'loading';
  table.style.display = 'none';
  tbody.innerHTML = '';

  if (!API_KEY) {
    message.textContent = 'Por favor, insira sua API Key da FlightAware.';
    return;
  }

  try {
    const resposta = await fetch(API_URL, {
      headers: {
        'x-apikey': API_KEY
      }
    });
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}: ${resposta.statusText}`);
    }
    const dados = await resposta.json();

    // Os voos estão em dados.arrivals (conforme padrão AeroAPI)
    const voos = dados.arrivals || [];
    if (voos.length === 0) {
      message.textContent = 'Nenhuma chegada encontrada.';
      return;
    }

    for (const voo of voos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${voo.ident_icao ?? '-'}</td>
        <td>${voo.registration ?? '-'}</td>
        <td>${voo.aircraft_type ?? '-'}</td>
        <td>${voo.origin?.code_iata ?? '-'}</td>
        <td>${voo.scheduled_in ?? '-'}</td>
        <td>${voo.estimated_in ?? '-'}</td>
        <td>${voo.progress_percent != null ? voo.progress_percent + '%' : '-'}</td>
      `;
      tbody.appendChild(tr);
    }

    message.textContent = '';
    table.style.display = '';
  } catch (erro) {
    message.textContent = 'Erro ao carregar dados: ' + erro.message + (erro.message.includes('CORS') ? ' (CORS bloqueado pela API)' : '');
    message.className = 'error';
  }
}
