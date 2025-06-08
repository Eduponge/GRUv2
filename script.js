// Altere a URL abaixo caso sua API esteja hospedada em outro endereço
const API_URL = '/airports/SBGR/arrivals';

async function carregarChegadas() {
  const message = document.getElementById('message');
  const table = document.getElementById('flights-table');
  const tbody = document.getElementById('flights-body');
  message.textContent = 'Carregando...';
  table.style.display = 'none';
  tbody.innerHTML = '';

  try {
    const resposta = await fetch(API_URL);
    if (!resposta.ok) throw new Error('Erro ao consultar API');
    const dados = await resposta.json();

    if (!Array.isArray(dados) || dados.length === 0) {
      message.textContent = 'Nenhuma chegada encontrada.';
      return;
    }

    for (const voo of dados) {
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
    message.textContent = 'Erro ao carregar dados: ' + erro.message;
    message.className = 'error';
  }
}

window.onload = carregarChegadas;