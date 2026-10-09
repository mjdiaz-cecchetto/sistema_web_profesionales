import { ObraSocial, PARTICULAR, ProfessionalProfile } from './models';

/** true (o ausente en datos viejos) = el profesional atiende particulares. */
export function aceptaParticular(prof: ProfessionalProfile): boolean {
  return prof.aceptaParticular !== false;
}

/** Obras sociales ACTIVAS de la cuenta que atiende el profesional, en el orden de la lista. */
export function obrasSocialesDeProfesional(prof: ProfessionalProfile, obrasCuenta: ObraSocial[]): ObraSocial[] {
  const ids = new Set(prof.obrasSociales ?? []);
  return obrasCuenta
    .filter(o => o.activo !== false && ids.has(o.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Coberturas que puede elegir un paciente para un turno con ese profesional:
 * "Particular" (si lo acepta) y sus obras sociales activas.
 */
export function coberturasDeProfesional(prof: ProfessionalProfile, obrasCuenta: ObraSocial[]): string[] {
  return [
    ...(aceptaParticular(prof) ? [PARTICULAR] : []),
    ...obrasSocialesDeProfesional(prof, obrasCuenta).map(o => o.nombre)
  ];
}
