// Proxy de `ng serve` (solo desarrollo): /api va al backend Laravel.
// Así el frontend y la API comparten dominio y la sesión por cookie funciona
// sin CORS. En Docker el destino es el nginx del compose; fuera de Docker,
// Laravel en localhost:8000 (API_PROXY_TARGET lo cambia).
const destino = process.env.API_PROXY_TARGET || 'http://localhost:8000';

export default {
  '/api': {
    target: destino,
    secure: false,
    changeOrigin: false,
    logLevel: 'warn'
  }
};
