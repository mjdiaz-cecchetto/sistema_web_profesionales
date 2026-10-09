export const environment = {
  production: false,
  /**
   * Muestra las cards con credenciales de demostración en /login.
   * PONER EN false (o quitar) antes de mostrar el sistema fuera del equipo.
   */
  demoCredenciales: false,
  /**
   * API simulada (json-server). La siguen usando las pantallas que todavía no
   * están conectadas a Laravel.
   */
  apiUrl: 'http://localhost:3000',
  /**
   * API real (Laravel). Ruta relativa: mismo dominio que el frontend. En
   * desarrollo `ng serve` la reenvía a Laravel (proxy.conf.mjs).
   */
  backendUrl: '/api'
};
