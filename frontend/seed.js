/**
 * Genera db.json con DOS CUENTAS independientes (multi-tenant):
 *
 *   1. Consultorio "Centro Médico San Martín" (5 profesionales, varias especialidades)
 *      Login: admin@centrosanmartin.com.ar / consultorio123
 *      Página pública: /c/centro-san-martin
 *
 *   2. Profesional independiente "Dra. Elena Ramos" (Psicología)
 *      Login: elena.ramos@gmail.com / elena123
 *      Página pública: /p/dra-elena-ramos
 *
 * Las fechas de los turnos son relativas al día en que se corre el seed.
 * Uso:  npm run seed   (pisa el db.json existente)
 */
const fs = require('fs');
const path = require('path');

function fechaLocal(diasDesdeHoy) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Iconos (paths SVG de Heroicons)
const PIN = 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z';
const EDIFICIO = 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
const VIDEO = 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
const RAYO = 'M13 10V3L4 14h7v7l9-11h-7z';
const LIBRO = 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';
const CORAZON = 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';

const CSM = 'cta-consultorio-sm';
const ELE = 'cta-elena-ramos';

// Sede única del centro (los 5 profesionales atienden ahí)
const SEDE_CSM = {
  tipo: 'Centro Médico San Martín',
  detalle: 'Atención presencial con turno previo',
  direccion: 'Av. Balbín 2450 (ex Av. Mitre), San Martín, Buenos Aires',
  mapLink: 'https://maps.google.com',
  icono: EDIFICIO
};
const ONLINE = (detalle) => ({
  tipo: 'Consulta Online',
  detalle,
  direccion: 'Enlace seguro mediante Google Meet / Zoom enviado antes de la consulta',
  mapLink: '',
  icono: VIDEO
});

const db = {
  // ===== Administradores de la PLATAFORMA (back-office /gestion) =====
  administradores: [
    {
      id: 'adm-1',
      nombre: 'Matias',
      email: 'admin@plataforma.com',
      password: 'admin123'
    }
  ],

  // ===== Planes de membresía de la plataforma =====
  planes: [
    {
      id: 'plan-demo',
      nombre: 'Demo',
      precioMensual: 0,
      descripcion: 'Para conocer el sistema. Sin cobro.',
      maxProfesionales: 1,
      activo: true
    },
    {
      id: 'plan-profesional',
      nombre: 'Profesional',
      precioMensual: 15000,
      descripcion: 'Profesional independiente: agenda, pacientes y página pública.',
      maxProfesionales: 1,
      activo: true
    },
    {
      id: 'plan-consultorio',
      nombre: 'Consultorio',
      precioMensual: 40000,
      descripcion: 'Centros con equipo: hasta 10 profesionales, página del centro.',
      maxProfesionales: 10,
      activo: true
    }
  ],

  // ===== Cuentas (tenants): cada una con su login y su página pública =====
  cuentas: [
    {
      id: CSM,
      tipo: 'consultorio',
      email: 'admin@centrosanmartin.com.ar',
      password: 'consultorio123',
      nombre: 'Centro Médico San Martín',
      slug: 'centro-san-martin',
      descripcion: 'Centro de salud interdisciplinario en el corazón de San Martín. Psicología, psiquiatría, odontología, nutrición y kinesiología en un mismo lugar, con turnos online y atención con las principales obras sociales.',
      bannerUrl: '',
      estado: 'activa',
      plan: 'plan-consultorio',
      fechaAlta: fechaLocal(-120)
    },
    {
      id: ELE,
      tipo: 'profesional',
      email: 'elena.ramos@gmail.com',
      password: 'elena123',
      nombre: 'Dra. Elena Ramos',
      slug: 'dra-elena-ramos',
      descripcion: 'Psicóloga clínica de adultos. Atención presencial en Palermo y Belgrano, y consultas online.',
      bannerUrl: '',
      estado: 'activa',
      plan: 'plan-profesional',
      fechaAlta: fechaLocal(-45)
    }
  ],

  professionals: [
    // ===== Centro Médico San Martín =====
    {
      id: 'prof-funes',
      cuentaId: CSM,
      activo: true,
      especialidad: 'Psicología',
      nombre: 'Lic. Carolina Funes',
      titulo: 'Psicología Clínica · Adultos',
      avatarUrl: '',
      bannerUrl: '',
      whatsapp: '5491161234870',
      frasePrincipal: 'Terapia basada en evidencia, a tu ritmo y sin vueltas',
      biografia: 'Licenciada en Psicología (UBA), con formación de posgrado en Terapia Cognitivo-Conductual. Hace 8 años acompaño a adultos en tratamientos por ansiedad, estados depresivos y crisis vitales, combinando el trabajo presencial en el centro con seguimiento online.',
      modalidad: 'Atención presencial en el Centro Médico San Martín y consultas online.',
      direcciones: [SEDE_CSM, ONLINE('Videollamadas - Mié y Vie')],
      areas: [
        { nombre: 'Ansiedad y Pánico', descripcion: 'Herramientas concretas para recuperar el control frente a la ansiedad.', icono: RAYO, detalle: 'Trabajo con TCC y exposición gradual, con tareas entre sesiones y objetivos medibles.' },
        { nombre: 'Depresión', descripcion: 'Acompañamiento en estados de ánimo bajos y pérdida de motivación.', icono: CORAZON, detalle: 'Activación conductual y reestructuración cognitiva, coordinado con psiquiatría cuando hace falta.' },
        { nombre: 'Crisis Vitales', descripcion: 'Duelos, separaciones, cambios laborales y decisiones difíciles.', icono: LIBRO, detalle: 'Un espacio para ordenar lo que pasa y decidir con más claridad.' }
      ]
    },
    {
      id: 'prof-lema',
      cuentaId: CSM,
      activo: true,
      especialidad: 'Psiquiatría',
      nombre: 'Dr. Gustavo Lema',
      titulo: 'Médico Psiquiatra · M.N. 98.734',
      avatarUrl: '',
      bannerUrl: '',
      whatsapp: '5491155418223',
      frasePrincipal: 'Diagnóstico serio y tratamiento con seguimiento cercano',
      biografia: 'Médico (UBA) especialista en Psiquiatría. Me dedico a la evaluación diagnóstica y al tratamiento farmacológico de adultos, trabajando en equipo con los psicólogos del centro. Priorizo explicarte cada decisión del tratamiento con claridad.',
      modalidad: 'Atención presencial en el Centro Médico San Martín y controles online.',
      direcciones: [SEDE_CSM, ONLINE('Controles de seguimiento - Jue')],
      areas: [
        { nombre: 'Evaluación Diagnóstica', descripcion: 'Primera consulta completa con devolución y plan de tratamiento.', icono: LIBRO, detalle: 'Entrevista clínica en profundidad de 45 minutos, con informe para tu terapeuta si lo autorizás.' },
        { nombre: 'Tratamiento Farmacológico', descripcion: 'Indicación y ajuste de medicación con controles periódicos.', icono: RAYO, detalle: 'Controles cada 4 a 6 semanas, con recetas digitales para tu obra social.' }
      ]
    },
    {
      id: 'prof-rios',
      cuentaId: CSM,
      activo: true,
      especialidad: 'Odontología',
      nombre: 'Od. Paula Ríos',
      titulo: 'Odontóloga General · M.P. 41.208',
      avatarUrl: '',
      bannerUrl: '',
      whatsapp: '5491144906517',
      frasePrincipal: 'Odontología sin dolor y sin sustos: te explico todo antes',
      biografia: 'Odontóloga (UNLP) con 12 años de ejercicio. Hago odontología general y estética: controles, limpiezas, arreglos y blanqueamientos. Trabajo con técnicas mínimamente invasivas y turnos puntuales para que no pierdas la mañana en la sala de espera.',
      modalidad: 'Atención únicamente presencial en el Centro Médico San Martín.',
      direcciones: [SEDE_CSM],
      areas: [
        { nombre: 'Odontología General', descripcion: 'Controles, caries, extracciones simples y urgencias.', icono: RAYO, detalle: 'Diagnóstico con radiografía digital en el mismo turno cuando hace falta.' },
        { nombre: 'Limpieza y Prevención', descripcion: 'Limpiezas profundas, flúor y plan de prevención personalizado.', icono: CORAZON, detalle: 'Recomendada cada 6 meses. Incluye revisión completa de encías.' },
        { nombre: 'Estética Dental', descripcion: 'Blanqueamientos y carillas para mejorar tu sonrisa.', icono: LIBRO, detalle: 'Presupuesto por escrito y sin compromiso en la primera consulta.' }
      ]
    },
    {
      id: 'prof-salas',
      cuentaId: CSM,
      activo: true,
      especialidad: 'Nutrición',
      nombre: 'Lic. Diego Salas',
      titulo: 'Nutricionista · M.N. 10.552',
      avatarUrl: '',
      bannerUrl: '',
      whatsapp: '5491133287465',
      frasePrincipal: 'Planes que se adaptan a tu vida, no al revés',
      biografia: 'Licenciado en Nutrición (UBA), especializado en nutrición clínica y deportiva. Trabajo con planes flexibles y seguimiento por aplicación, sin dietas imposibles. Atiendo también pacientes con diabetes, hipertensión y colesterol elevado derivados por sus médicos.',
      modalidad: 'Atención presencial en el Centro Médico San Martín y seguimiento online.',
      direcciones: [SEDE_CSM, ONLINE('Controles de seguimiento - Lun y Mié')],
      areas: [
        { nombre: 'Descenso de Peso', descripcion: 'Planes realistas con seguimiento quincenal y ajustes.', icono: RAYO, detalle: 'Sin alimentos prohibidos: educación alimentaria y hábitos sostenibles.' },
        { nombre: 'Nutrición Clínica', descripcion: 'Diabetes, hipertensión, dislipemias y salud digestiva.', icono: CORAZON, detalle: 'Trabajo coordinado con tu médico de cabecera y tus análisis de laboratorio.' }
      ]
    },
    {
      id: 'prof-vega',
      cuentaId: CSM,
      activo: true,
      especialidad: 'Kinesiología',
      nombre: 'Lic. Martín Vega',
      titulo: 'Kinesiólogo Fisiatra · M.N. 15.980',
      avatarUrl: '',
      bannerUrl: '',
      whatsapp: '5491162059841',
      frasePrincipal: 'Recuperá el movimiento con un plan de trabajo claro',
      biografia: 'Kinesiólogo fisiatra (UBA) orientado a rehabilitación traumatológica y deportiva. Sesiones individuales de 45 minutos con trabajo activo: nada de quedarte 20 minutos solo con el magneto. Plan de ejercicios para tu casa incluido.',
      modalidad: 'Atención únicamente presencial en el Centro Médico San Martín.',
      direcciones: [SEDE_CSM],
      areas: [
        { nombre: 'Rehabilitación Traumatológica', descripcion: 'Post-quirúrgicos, esguinces, fracturas y lesiones de rodilla y hombro.', icono: RAYO, detalle: 'Evaluación funcional inicial y objetivos por etapas hasta el alta.' },
        { nombre: 'Kinesiología Deportiva', descripcion: 'Recuperación de lesiones deportivas y prevención de recaídas.', icono: CORAZON, detalle: 'Trabajo de fuerza y retorno progresivo a la actividad.' }
      ]
    },

    // ===== Dra. Elena Ramos (cuenta independiente) =====
    {
      id: 'prof-elena',
      cuentaId: ELE,
      activo: true,
      especialidad: 'Psicología',
      nombre: 'Dra. Elena Ramos',
      titulo: 'Psicología Clínica · Adultos',
      avatarUrl: 'dra-elena.jpg',
      bannerUrl: '',
      whatsapp: '5491123456789',
      frasePrincipal: 'Un espacio seguro para tu bienestar emocional y mental',
      biografia: 'Soy psicóloga clínica con más de 10 años de experiencia, especializada en Terapia Cognitivo-Conductual (TCC). Mi objetivo es brindarte un espacio seguro, empático y libre de prejuicios donde podamos trabajar juntos para entender tus emociones, superar de la mejor manera tus dificultades y mejorar tu calidad de vida.',
      modalidad: 'Atención presencial en Palermo y Belgrano, y consultas Online para todo el mundo.',
      direcciones: [
        { tipo: 'Consultorio Palermo', detalle: 'Atención presencial - Lun, Mié y Vie', direccion: 'Av. Santa Fe 3200 (a metros de Av. Coronel Díaz), Palermo, CABA', mapLink: 'https://maps.google.com', icono: PIN },
        { tipo: 'Centro Médico Belgrano', detalle: 'Consultas presenciales - Mar y Jue', direccion: 'Av. Cabildo 1500 (cerca de Estación José Hernández), Belgrano, CABA', mapLink: 'https://maps.google.com', icono: EDIFICIO },
        ONLINE('Videollamadas - Flexibilidad horaria')
      ],
      areas: [
        { nombre: 'Ansiedad y Estrés', descripcion: 'Herramientas prácticas para manejar la sobrecarga emocional y ataques de pánico.', icono: RAYO, detalle: 'La terapia cognitivo-conductual ofrece tasas de éxito muy altas en ansiedad. Trabajamos identificando pensamientos distorsionados y desarrollando respuestas adaptativas.' },
        { nombre: 'Desarrollo Personal', descripcion: 'Trabajo focalizado en la autoestima, toma de decisiones difíciles y asertividad.', icono: LIBRO, detalle: 'Ideal para personas que buscan conocerse mejor, potenciar sus habilidades interpersonales o reorientar su carrera.' },
        { nombre: 'Terapia de Pareja', descripcion: 'Resolución de conflictos y construcción de vínculos afectivos más saludables.', icono: CORAZON, detalle: 'Brindo un espacio neutral de escucha activa para identificar patrones destructivos y mejorar la empatía.' }
      ]
    }
  ],

  availabilities: [
    {
      id: 'prof-funes',
      cuentaId: CSM,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['09:00', '10:00', '11:00', '12:00'] },
        { day: 'Martes', dayIndex: 2, active: true, slots: ['14:00', '15:00', '16:00', '17:00', '18:00'] },
        { day: 'Miércoles', dayIndex: 3, active: true, slots: ['09:00', '10:00', '11:00', '17:00', '18:00'] },
        { day: 'Jueves', dayIndex: 4, active: false, slots: [] },
        { day: 'Viernes', dayIndex: 5, active: true, slots: ['09:00', '10:00', '11:00', '12:00'] },
        { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    },
    {
      id: 'prof-lema',
      cuentaId: CSM,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:30', '09:15', '10:00', '10:45', '11:30'] },
        { day: 'Martes', dayIndex: 2, active: false, slots: [] },
        { day: 'Miércoles', dayIndex: 3, active: true, slots: ['08:30', '09:15', '10:00', '10:45'] },
        { day: 'Jueves', dayIndex: 4, active: true, slots: ['15:00', '15:45', '16:30', '17:15', '18:00'] },
        { day: 'Viernes', dayIndex: 5, active: false, slots: [] },
        { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    },
    {
      id: 'prof-rios',
      cuentaId: CSM,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:00', '08:45', '09:30', '10:15', '11:00', '11:45'] },
        { day: 'Martes', dayIndex: 2, active: true, slots: ['14:00', '14:45', '15:30', '16:15', '17:00'] },
        { day: 'Miércoles', dayIndex: 3, active: false, slots: [] },
        { day: 'Jueves', dayIndex: 4, active: true, slots: ['08:00', '08:45', '09:30', '10:15', '11:00'] },
        { day: 'Viernes', dayIndex: 5, active: true, slots: ['14:00', '14:45', '15:30', '16:15'] },
        { day: 'Sábado', dayIndex: 6, active: true, slots: ['09:00', '09:45', '10:30', '11:15'] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    },
    {
      id: 'prof-salas',
      cuentaId: CSM,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['16:00', '16:45', '17:30', '18:15', '19:00'] },
        { day: 'Martes', dayIndex: 2, active: false, slots: [] },
        { day: 'Miércoles', dayIndex: 3, active: true, slots: ['16:00', '16:45', '17:30', '18:15', '19:00'] },
        { day: 'Jueves', dayIndex: 4, active: false, slots: [] },
        { day: 'Viernes', dayIndex: 5, active: true, slots: ['09:00', '09:45', '10:30', '11:15'] },
        { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    },
    {
      id: 'prof-vega',
      cuentaId: CSM,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '15:00', '16:00', '17:00'] },
        { day: 'Martes', dayIndex: 2, active: true, slots: ['08:00', '09:00', '10:00', '11:00'] },
        { day: 'Miércoles', dayIndex: 3, active: true, slots: ['15:00', '16:00', '17:00', '18:00'] },
        { day: 'Jueves', dayIndex: 4, active: true, slots: ['08:00', '09:00', '10:00', '11:00'] },
        { day: 'Viernes', dayIndex: 5, active: false, slots: [] },
        { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    },
    {
      id: 'prof-elena',
      cuentaId: ELE,
      days: [
        { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
        { day: 'Martes', dayIndex: 2, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
        { day: 'Miércoles', dayIndex: 3, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
        { day: 'Jueves', dayIndex: 4, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
        { day: 'Viernes', dayIndex: 5, active: true, slots: ['08:00', '09:00', '10:00', '11:00'] },
        { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
        { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
      ]
    }
  ],

  // Precios de referencia en pesos argentinos (2026)
  services: [
    // Centro Médico San Martín
    { id: 'srv-csm-1', cuentaId: CSM, profesionalId: 'prof-funes', name: 'Consulta Psicológica', description: 'Sesión individual de psicoterapia para adultos, primera vez o seguimiento.', durationMinutes: 60, price: 55000 },
    { id: 'srv-csm-2', cuentaId: CSM, profesionalId: 'prof-funes', name: 'Primera Entrevista', description: 'Entrevista de admisión para conocer tu situación y definir el plan de trabajo.', durationMinutes: 60, price: 48000 },
    { id: 'srv-csm-3', cuentaId: CSM, profesionalId: 'prof-lema', name: 'Consulta Psiquiátrica', description: 'Evaluación diagnóstica completa con devolución y plan de tratamiento.', durationMinutes: 45, price: 90000 },
    { id: 'srv-csm-4', cuentaId: CSM, profesionalId: 'prof-lema', name: 'Control de Medicación', description: 'Control breve de tratamiento en curso, con receta digital.', durationMinutes: 20, price: 55000 },
    { id: 'srv-csm-5', cuentaId: CSM, profesionalId: 'prof-rios', name: 'Consulta Odontológica', description: 'Revisión completa, diagnóstico y presupuesto sin cargo de los tratamientos.', durationMinutes: 30, price: 30000 },
    { id: 'srv-csm-6', cuentaId: CSM, profesionalId: 'prof-rios', name: 'Limpieza Dental', description: 'Limpieza profunda con ultrasonido, pulido y aplicación de flúor.', durationMinutes: 45, price: 65000 },
    { id: 'srv-csm-7', cuentaId: CSM, profesionalId: 'prof-rios', name: 'Arreglo de Caries', description: 'Restauración con composite del color de tu diente.', durationMinutes: 45, price: 85000 },
    { id: 'srv-csm-8', cuentaId: CSM, profesionalId: 'prof-salas', name: 'Primera Consulta Nutricional', description: 'Evaluación completa, antropometría y entrega del plan alimentario.', durationMinutes: 45, price: 45000 },
    { id: 'srv-csm-9', cuentaId: CSM, profesionalId: 'prof-salas', name: 'Control Nutricional', description: 'Control de seguimiento con ajustes del plan.', durationMinutes: 30, price: 32000 },
    { id: 'srv-csm-10', cuentaId: CSM, profesionalId: 'prof-vega', name: 'Sesión de Kinesiología', description: 'Sesión individual de rehabilitación de 45 minutos con trabajo activo.', durationMinutes: 45, price: 28000 },
    { id: 'srv-csm-11', cuentaId: CSM, profesionalId: 'prof-vega', name: 'Evaluación Kinésica Inicial', description: 'Evaluación funcional completa con plan de tratamiento por etapas.', durationMinutes: 60, price: 38000 },

    // Dra. Elena Ramos
    { id: 'srv-ele-1', cuentaId: ELE, profesionalId: 'prof-elena', name: 'Consulta', description: 'Consulta general de psicología, ya sea primera vez o de seguimiento.', durationMinutes: 60, price: 60000 },
    { id: 'srv-ele-2', cuentaId: ELE, profesionalId: 'prof-elena', name: 'Terapia de Pareja', description: 'Sesión conjunta orientada a la resolución de conflictos del vínculo.', durationMinutes: 60, price: 75000 }
  ],

  healthInsurances: [
    { id: 'hi-1', name: 'Particular (Sin cobertura)' },
    { id: 'hi-2', name: 'OSDE' },
    { id: 'hi-3', name: 'Swiss Medical' },
    { id: 'hi-4', name: 'Galeno' },
    { id: 'hi-5', name: 'Sancor Salud' },
    { id: 'hi-6', name: 'Medifé' },
    { id: 'hi-7', name: 'IOMA' },
    { id: 'hi-8', name: 'PAMI' },
    { id: 'hi-9', name: 'OSECAC' },
    { id: 'hi-10', name: 'Unión Personal' }
  ],

  appointments: [
    // ===== Centro Médico San Martín =====
    { id: 'apt-csm-1', cuentaId: CSM, profesionalId: 'prof-funes', serviceName: 'Consulta Psicológica', patientName: 'Romina Ferreyra', patientEmail: 'rominaferreyra84@gmail.com', patientPhone: '1160254871', patientDni: '31485296', date: fechaLocal(-3), time: '15:00', status: 'CONFIRMED', notes: 'Sesión de seguimiento.', location: 'Centro Médico San Martín', healthInsurance: 'OSECAC' },
    { id: 'apt-csm-2', cuentaId: CSM, profesionalId: 'prof-rios', serviceName: 'Limpieza Dental', patientName: 'Hugo Benítez', patientEmail: 'hbenitez1958@hotmail.com', patientPhone: '1144762903', patientDni: '12958374', date: fechaLocal(-2), time: '09:30', status: 'CONFIRMED', notes: 'Paciente de PAMI, trae orden.', location: 'Centro Médico San Martín', healthInsurance: 'PAMI' },
    { id: 'apt-csm-3', cuentaId: CSM, profesionalId: 'prof-vega', serviceName: 'Sesión de Kinesiología', patientName: 'Federico Acosta', patientEmail: 'fedeacosta92@gmail.com', patientPhone: '1157983041', patientDni: '36741852', date: fechaLocal(-1), time: '09:00', status: 'CONFIRMED', notes: 'Post-quirúrgico LCA, sesión 6 de 12.', location: 'Centro Médico San Martín', healthInsurance: 'OSDE' },
    { id: 'apt-csm-4', cuentaId: CSM, profesionalId: 'prof-lema', serviceName: 'Consulta Psiquiátrica', patientName: 'Marta Villalba', patientEmail: 'marta.villalba@yahoo.com.ar', patientPhone: '1149035782', patientDni: '17203948', date: fechaLocal(0), time: '10:00', status: 'CONFIRMED', notes: 'Derivada por la Lic. Funes.', location: 'Centro Médico San Martín', healthInsurance: 'IOMA' },
    { id: 'apt-csm-5', cuentaId: CSM, profesionalId: 'prof-rios', serviceName: 'Consulta Odontológica', patientName: 'Julieta Paredes', patientEmail: 'julipardes@gmail.com', patientPhone: '1132478569', patientDni: '40185263', date: fechaLocal(0), time: '14:45', status: 'PENDING', notes: 'Dolor en muela de juicio inferior derecha.', location: 'Centro Médico San Martín', healthInsurance: 'Swiss Medical' },
    { id: 'apt-csm-6', cuentaId: CSM, profesionalId: 'prof-vega', serviceName: 'Sesión de Kinesiología', patientName: 'Federico Acosta', patientEmail: 'fedeacosta92@gmail.com', patientPhone: '1157983041', patientDni: '36741852', date: fechaLocal(1), time: '09:00', status: 'CONFIRMED', notes: 'Post-quirúrgico LCA, sesión 7 de 12.', location: 'Centro Médico San Martín', healthInsurance: 'OSDE' },
    { id: 'apt-csm-7', cuentaId: CSM, profesionalId: 'prof-salas', serviceName: 'Primera Consulta Nutricional', patientName: 'Verónica Ludueña', patientEmail: 'vero.luduena@gmail.com', patientPhone: '1165042183', patientDni: '33629471', date: fechaLocal(1), time: '17:30', status: 'PENDING', notes: 'Derivada por cardiólogo, hipertensión.', location: 'Centro Médico San Martín', healthInsurance: 'Galeno' },
    { id: 'apt-csm-8', cuentaId: CSM, profesionalId: 'prof-funes', serviceName: 'Primera Entrevista', patientName: 'Nicolás Ferrero', patientEmail: 'nicoferrero01@gmail.com', patientPhone: '1170392485', patientDni: '43512087', date: fechaLocal(2), time: '10:00', status: 'PENDING', notes: 'Pidió turno por ansiedad ante exámenes.', location: 'Centro Médico San Martín', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-csm-9', cuentaId: CSM, profesionalId: 'prof-lema', serviceName: 'Control de Medicación', patientName: 'Marta Villalba', patientEmail: 'marta.villalba@yahoo.com.ar', patientPhone: '1149035782', patientDni: '17203948', date: fechaLocal(9), time: '15:45', status: 'PENDING', notes: 'Control a 10 días del inicio del tratamiento.', location: 'Centro Médico San Martín', healthInsurance: 'IOMA' },
    { id: 'apt-csm-10', cuentaId: CSM, profesionalId: 'prof-rios', serviceName: 'Arreglo de Caries', patientName: 'Hugo Benítez', patientEmail: 'hbenitez1958@hotmail.com', patientPhone: '1144762903', patientDni: '12958374', date: fechaLocal(3), time: '08:45', status: 'CONFIRMED', notes: 'Pieza 26, detectada en la limpieza.', location: 'Centro Médico San Martín', healthInsurance: 'PAMI' },
    { id: 'apt-csm-11', cuentaId: CSM, profesionalId: 'prof-salas', serviceName: 'Control Nutricional', patientName: 'Pablo Giordano', patientEmail: 'pgiordano@outlook.com', patientPhone: '1158741296', patientDni: '29384756', date: fechaLocal(4), time: '18:15', status: 'CONFIRMED', notes: 'Control mensual, va bajando bien.', location: 'Centro Médico San Martín', healthInsurance: 'Medifé' },
    { id: 'apt-csm-12', cuentaId: CSM, profesionalId: 'prof-funes', serviceName: 'Consulta Psicológica', patientName: 'Romina Ferreyra', patientEmail: 'rominaferreyra84@gmail.com', patientPhone: '1160254871', patientDni: '31485296', date: fechaLocal(4), time: '15:00', status: 'CONFIRMED', notes: 'Sesión semanal.', location: 'Centro Médico San Martín', healthInsurance: 'OSECAC' },
    { id: 'apt-csm-13', cuentaId: CSM, profesionalId: 'prof-vega', serviceName: 'Evaluación Kinésica Inicial', patientName: 'Silvia Cáceres', patientEmail: 'silvia.caceres62@gmail.com', patientPhone: '1141936758', patientDni: '16849302', date: fechaLocal(5), time: '10:00', status: 'PENDING', notes: 'Hombro doloroso, trae resonancia.', location: 'Centro Médico San Martín', healthInsurance: 'Unión Personal' },
    { id: 'apt-csm-14', cuentaId: CSM, profesionalId: 'prof-rios', serviceName: 'Consulta Odontológica', patientName: 'Camila Ortega', patientEmail: 'cami.ortega@gmail.com', patientPhone: '1163805247', patientDni: '42058613', date: fechaLocal(-6), time: '16:15', status: 'CANCELLED', notes: 'Canceló por trabajo, va a reprogramar.', location: 'Centro Médico San Martín', healthInsurance: 'Sancor Salud' },
    { id: 'apt-csm-15', cuentaId: CSM, profesionalId: 'prof-lema', serviceName: 'Consulta Psiquiátrica', patientName: 'Oscar Medina', patientEmail: 'oscarmedina55@yahoo.com.ar', patientPhone: '1152309864', patientDni: '20174958', date: fechaLocal(8), time: '09:15', status: 'PENDING', notes: 'Primera consulta.', location: 'Centro Médico San Martín', healthInsurance: 'OSDE' },

    // ===== Dra. Elena Ramos =====
    { id: 'apt-ele-1', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Sofía Álvarez', patientEmail: 'sofialvarez.psi@gmail.com', patientPhone: '1123456001', patientDni: '30123456', date: fechaLocal(-5), time: '10:00', status: 'CANCELLED', notes: 'Canceló por viaje.', location: 'Consultorio Palermo', healthInsurance: 'OSDE' },
    { id: 'apt-ele-2', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Diego Torres', patientEmail: 'diegotorres78@gmail.com', patientPhone: '1123456002', patientDni: '31123456', date: fechaLocal(-2), time: '18:00', status: 'CONFIRMED', notes: 'Sesión de seguimiento.', location: 'Centro Médico Belgrano', healthInsurance: 'Swiss Medical' },
    { id: 'apt-ele-3', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Terapia de Pareja', patientName: 'Lucía Benavídez', patientEmail: 'lu.benavidez@gmail.com', patientPhone: '1123456003', patientDni: '32123456', date: fechaLocal(-1), time: '19:00', status: 'CONFIRMED', notes: 'Primera sesión conjunta.', location: 'Consulta Online', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-ele-4', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Martín Spinetta', patientEmail: 'martin.spin@gmail.com', patientPhone: '1123456789', patientDni: '38123456', date: fechaLocal(0), time: '09:00', status: 'CONFIRMED', notes: 'Paciente indica que está con picos de estrés laboral elevados.', location: 'Consultorio Palermo', healthInsurance: 'OSDE' },
    { id: 'apt-ele-5', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Laura Giménez', patientEmail: 'laurag@live.com.ar', patientPhone: '1198765432', patientDni: '35987654', date: fechaLocal(1), time: '09:00', status: 'CONFIRMED', notes: 'Primera visita presencial.', location: 'Centro Médico Belgrano', healthInsurance: 'Swiss Medical' },
    { id: 'apt-ele-6', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Andrés Mendoza', patientEmail: 'andres.men@outlook.com', patientPhone: '1133334444', patientDni: '40111222', date: fechaLocal(2), time: '11:00', status: 'CONFIRMED', notes: 'Sesión online.', location: 'Consulta Online', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-ele-7', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Julián Castro', patientEmail: 'julian.castro@gmail.com', patientPhone: '1123456011', patientDni: '38123457', date: fechaLocal(4), time: '19:00', status: 'PENDING', notes: 'Consulta sobre estrés y ansiedad.', location: 'Consulta Online', healthInsurance: 'Swiss Medical' },
    { id: 'apt-ele-8', cuentaId: ELE, profesionalId: 'prof-elena', serviceName: 'Consulta', patientName: 'Esteban Rey', patientEmail: 'esteban.rey@gmail.com', patientPhone: '1123456013', patientDni: '40123456', date: fechaLocal(7), time: '18:00', status: 'CONFIRMED', notes: '', location: 'Centro Médico Belgrano', healthInsurance: 'OSDE' }
  ],

  patients: []
};

// Pacientes únicos por cuenta a partir de los turnos (padrón POR CUENTA)
const vistos = new Map();
db.appointments.forEach((appt, i) => {
  const clave = appt.cuentaId + '|' + appt.patientDni;
  if (!vistos.has(clave)) {
    vistos.set(clave, {
      id: 'pat-' + appt.cuentaId + '-' + appt.patientDni,
      cuentaId: appt.cuentaId,
      nombre: appt.patientName,
      email: appt.patientEmail,
      telefono: appt.patientPhone,
      dni: appt.patientDni,
      obraSocial: appt.healthInsurance,
      fechaAlta: fechaLocal(-45 + i * 2)
    });
  }
});
db.patients = Array.from(vistos.values());

db.blockedDates = [
  // El Dr. Lema viaja a un congreso
  { id: 'blk-lema-1', cuentaId: CSM, profesionalId: 'prof-lema', startDate: fechaLocal(12), endDate: fechaLocal(14), reason: 'Congreso Argentino de Psiquiatría' }
];

// Período (YYYY-MM) desplazado n meses desde hoy
function periodo(mesesAtras) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - mesesAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fechaEnPeriodo(mesesAtras, dia) {
  return `${periodo(mesesAtras)}-${String(dia).padStart(2, '0')}`;
}

// ===== Cobros registrados (mock manual): CSM al día, Elena adeuda el mes actual =====
db.pagos = [
  { id: 'pago-1', cuentaId: CSM, periodo: periodo(3), fecha: fechaEnPeriodo(3, 5), monto: 40000, medio: 'transferencia', notas: 'Primer mes' },
  { id: 'pago-2', cuentaId: CSM, periodo: periodo(2), fecha: fechaEnPeriodo(2, 4), monto: 40000, medio: 'transferencia' },
  { id: 'pago-3', cuentaId: CSM, periodo: periodo(1), fecha: fechaEnPeriodo(1, 6), monto: 40000, medio: 'mercadopago' },
  { id: 'pago-4', cuentaId: CSM, periodo: periodo(0), fecha: fechaEnPeriodo(0, 3), monto: 40000, medio: 'mercadopago' },
  { id: 'pago-5', cuentaId: ELE, periodo: periodo(1), fecha: fechaEnPeriodo(1, 9), monto: 15000, medio: 'transferencia' }
];

const destino = path.join(__dirname, 'db.json');
fs.writeFileSync(destino, JSON.stringify(db, null, 2), 'utf8');
console.log(`✔ db.json generado en ${destino} (hoy: ${fechaLocal(0)})`);
console.log(`  · Administrador de la plataforma → admin@plataforma.com / admin123 · /gestion`);
for (const c of db.cuentas) {
  const profs = db.professionals.filter(p => p.cuentaId === c.id).length;
  const turnos = db.appointments.filter(a => a.cuentaId === c.id).length;
  const pacientes = db.patients.filter(p => p.cuentaId === c.id).length;
  const url = c.tipo === 'consultorio' ? `/c/${c.slug}` : `/p/${c.slug}`;
  console.log(`  · ${c.nombre} [${c.tipo}] → ${c.email} / ${c.password} · ${profs} prof · ${turnos} turnos · ${pacientes} pacientes · ${url}`);
}
