const API_ENDPOINT = "/api/chegadas";

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
    if (!resposta.ok) throw new Error('Erro ao consultar API backend');
    const data = await resposta.json();
    const voos = data.flights || [];

    if (voos.length === 0) {
      message.textContent = 'Nenhuma chegada encontrada.';
      return;
    }

    for (const voo of voos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${voo.ident ?? '-'}</td>
        <td>${voo.aircraft_registration ?? '-'}</td>
        <td>${voo.aircraft_type ?? '-'}</td>
        <td>${voo.origin?.code_iata ?? '-'}</td>
        <td>${voo.scheduled_in ?? '-'}</td>
        <td>${voo.estimated_in ?? '-'}</td>
        <td>${voo.status ?? '-'}</td>
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
