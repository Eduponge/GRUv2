const API_ENDPOINT = "https://gruv2.onrender.com/";

async function carregarChegadas() {
  const message = document.getElementById('message');
  const table = document.getElementById('flights-table');
  const tbody = document.getElementById('flights-body');
  message.textContent = 'Carregando...';
  message.className = 'loading';
  table.style.display = 'none';
  tbody.innerHTML = '';

  try {
    const resposta = await fetch(API_ENDPOINT);
    if (!resposta.ok) throw new Error('Erro ao consultar API backend Java');
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

window.onload = carregarChegadas;
