# FlightAware AeroAPI Proxy Example

Este projeto demonstra como consumir a FlightAware AeroAPI de forma segura usando um backend Node.js/Express como proxy. O frontend é estático e nunca expõe sua chave de API.

## Como usar

1. Clone o repositório
2. Crie um arquivo `backend/.env` com o conteúdo:
   ```
   AEROAPI_KEY=coloque_sua_chave_aqui
   ```
3. Rode `npm install` dentro de `backend`
4. Rode o backend: `npm start` ou `node index.js`
5. Abra `frontend/index.html` no browser (ajuste CORS/path se colocar em produção)

**Nunca exponha sua chave no frontend ou em repositórios públicos!**
Adicione sempre o arquivo `.env` ao `.gitignore` para evitar vazamentos.
