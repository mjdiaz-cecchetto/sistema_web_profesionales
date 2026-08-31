/**
 * Utilidades de fecha en horario LOCAL (evita el corrimiento de día
 * que produce toISOString() al convertir a UTC).
 */

/** Devuelve una fecha como string YYYY-MM-DD usando la zona horaria local. */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fecha de hoy (local) en formato YYYY-MM-DD. */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}

/** Suma días a la fecha actual y devuelve YYYY-MM-DD local. */
export function addDaysLocal(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/** Convierte 'YYYY-MM-DD' a Date en horario local (00:00). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formatea 'YYYY-MM-DD' como 'DD/MM/YYYY'. */
export function formatDMY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Suma días a una fecha 'YYYY-MM-DD' y devuelve 'YYYY-MM-DD'. */
export function addDaysTo(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/**
 * Suma meses a una fecha 'YYYY-MM-DD' manteniendo el día del mes;
 * si el mes destino es más corto, ajusta al último día (ej. 31 → 30/28).
 */
export function addMonthsClamped(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetMonth = m - 1 + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normMonth + 1, 0).getDate();
  return toLocalDateString(new Date(targetYear, normMonth, Math.min(d, lastDay)));
}

/** Suma minutos a una hora 'HH:mm' y devuelve 'HH:mm'. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
