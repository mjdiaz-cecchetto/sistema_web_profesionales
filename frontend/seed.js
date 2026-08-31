/**
 * Genera db.json con datos de ejemplo y fechas relativas al día actual.
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

const db = {
  profile: {
    nombre: 'Dra. Elena Ramos',
    titulo: 'Psicología Clínica · Adultos',
    avatarUrl: 'dra-elena.jpg',
    bannerUrl: '',
    whatsapp: '5491123456789',
    frasePrincipal: 'Un espacio seguro para tu bienestar emocional y mental',
    biografia:
      'Soy psicóloga clínica con más de 10 años de experiencia, especializada en Terapia Cognitivo-Conductual (TCC). Mi objetivo es brindarte un espacio seguro, empático y libre de prejuicios donde podamos trabajar juntos para entender tus emociones, superar de la mejor manera tus dificultades y mejorar tu calidad de vida.',
    modalidad: 'Atención presencial en Palermo y Belgrano, y consultas Online para todo el mundo.',
    direcciones: [
      {
        tipo: 'Consultorio Palermo',
        detalle: 'Atención presencial - Lun, Mié y Vie',
        direccion: 'Av. Santa Fe 3200 (a metros de Av. Coronel Díaz), Palermo, CABA',
        mapLink: 'https://maps.google.com',
        icono: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
      },
      {
        tipo: 'Centro Médico Belgrano',
        detalle: 'Consultas presenciales - Mar y Jue',
        direccion: 'Av. Cabildo 1500 (cerca de Estación José Hernández), Belgrano, CABA',
        mapLink: 'https://maps.google.com',
        icono: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
      },
      {
        tipo: 'Consulta Online',
        detalle: 'Videollamadas - Flexibilidad horaria',
        direccion: 'Enlace seguro mediante Google Meet / Zoom enviado antes de la sesión',
        mapLink: '',
        icono: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
      }
    ],
    areas: [
      {
        nombre: 'Ansiedad y Estrés',
        descripcion: 'Herramientas prácticas para manejar la sobrecarga emocional y ataques de pánico.',
        icono: 'M13 10V3L4 14h7v7l9-11h-7z',
        detalle:
          'La terapia cognitivo-conductual ofrece tasas de éxito muy altas en ansiedad. Trabajamos identificando pensamientos distorsionados y desarrollando respuestas adaptativas.'
      },
      {
        nombre: 'Desarrollo Personal',
        descripcion: 'Trabajo focalizado en la autoestima, toma de decisiones difíciles y asertividad.',
        icono:
          'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        detalle: 'Ideal para personas que buscan conocerse mejor, potenciar sus habilidades interpersonales o reorientar su carrera.'
      },
      {
        nombre: 'Terapia de Pareja',
        descripcion: 'Resolución de conflictos y construcción de vínculos afectivos más saludables.',
        icono:
          'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        detalle: 'Brindo un espacio neutral de escucha activa para identificar patrones destructivos y mejorar la empatía.'
      }
    ]
  },

  availability: {
    days: [
      { day: 'Lunes', dayIndex: 1, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
      { day: 'Martes', dayIndex: 2, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
      { day: 'Miércoles', dayIndex: 3, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
      { day: 'Jueves', dayIndex: 4, active: true, slots: ['17:00', '18:00', '19:00', '20:00'] },
      { day: 'Viernes', dayIndex: 5, active: true, slots: ['08:00', '09:00', '10:00', '11:00', '17:00', '18:00', '19:00', '20:00'] },
      { day: 'Sábado', dayIndex: 6, active: false, slots: [] },
      { day: 'Domingo', dayIndex: 0, active: false, slots: [] }
    ]
  },

  services: [
    {
      id: 'srv-1',
      name: 'Consulta',
      description: 'Consulta general de psicología, ya sea primera vez o de seguimiento.',
      durationMinutes: 60,
      price: 50
    },
    {
      id: 'srv-2',
      name: 'Prescripción de Receta',
      description: 'Sesión breve orientada a la evaluación y prescripción de medicación.',
      durationMinutes: 30,
      price: 30
    },
    {
      id: 'srv-3',
      name: 'Terapia de Pareja',
      description: 'Sesión conjunta orientada a la resolución de conflictos del vínculo.',
      durationMinutes: 60,
      price: 65
    }
  ],

  healthInsurances: [
    { id: 'hi-1', name: 'Particular (Sin cobertura)' },
    { id: 'hi-2', name: 'OSDE' },
    { id: 'hi-3', name: 'Swiss Medical' },
    { id: 'hi-4', name: 'Galeno' },
    { id: 'hi-5', name: 'Sancor Salud' },
    { id: 'hi-6', name: 'Medifé' },
    { id: 'hi-7', name: 'IOMA' }
  ],

  appointments: [
    { id: 'apt-1', serviceName: 'Consulta', patientName: 'Sofía Álvarez', patientEmail: 'sofia.alvarez@email.com', patientPhone: '1123456001', patientDni: '30123456', date: fechaLocal(-5), time: '10:00', status: 'CANCELLED', notes: 'Canceló por viaje.', location: 'Consultorio Palermo', healthInsurance: 'OSDE' },
    { id: 'apt-2', serviceName: 'Consulta', patientName: 'Diego Torres', patientEmail: 'diego.t@email.com', patientPhone: '1123456002', patientDni: '31123456', date: fechaLocal(-2), time: '14:00', status: 'CONFIRMED', notes: 'Sesión de seguimiento.', location: 'Centro Médico Belgrano', healthInsurance: 'Swiss Medical' },
    { id: 'apt-3', serviceName: 'Terapia de Pareja', patientName: 'Lucía y Marcos', patientEmail: 'lucia.marcos@email.com', patientPhone: '1123456003', patientDni: '32123456', date: fechaLocal(-1), time: '18:00', status: 'CONFIRMED', notes: 'Primera sesión conjunta.', location: 'Consulta Online', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-4', serviceName: 'Consulta', patientName: 'Martín Spinetta', patientEmail: 'martin.spin@gmail.com', patientPhone: '1123456789', patientDni: '38123456', date: fechaLocal(0), time: '09:00', status: 'CONFIRMED', notes: 'Paciente indica que está con picos de estrés laboral elevados.', location: 'Consultorio Palermo', healthInsurance: 'OSDE' },
    { id: 'apt-5', serviceName: 'Desarrollo Personal', patientName: 'Carla Ruiz', patientEmail: 'carla.ruiz@email.com', patientPhone: '1123456005', patientDni: '33123456', date: fechaLocal(0), time: '15:00', status: 'CONFIRMED', notes: '', location: 'Centro Médico Belgrano', healthInsurance: 'Galeno' },
    { id: 'apt-6', serviceName: 'Prescripción de Receta', patientName: 'Tomás Gómez', patientEmail: 'tomas.g@email.com', patientPhone: '1123456006', patientDni: '34123456', date: fechaLocal(0), time: '17:30', status: 'PENDING', notes: 'Renovación de medicación.', location: 'Consulta Online', healthInsurance: 'OSDE' },
    { id: 'apt-7', serviceName: 'Consulta', patientName: 'Laura Giménez', patientEmail: 'laurag@live.com.ar', patientPhone: '1198765432', patientDni: '35987654', date: fechaLocal(1), time: '09:00', status: 'CONFIRMED', notes: 'Primera visita presencial.', location: 'Centro Médico Belgrano', healthInsurance: 'Swiss Medical' },
    { id: 'apt-8', serviceName: 'Terapia de Pareja', patientName: 'Ana y Juan', patientEmail: 'ana.juan@email.com', patientPhone: '1123456008', patientDni: '36123456', date: fechaLocal(1), time: '16:00', status: 'PENDING', notes: '', location: 'Consultorio Palermo', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-9', serviceName: 'Consulta', patientName: 'Andrés Mendoza', patientEmail: 'andres.men@outlook.com', patientPhone: '1133334444', patientDni: '40111222', date: fechaLocal(2), time: '11:00', status: 'CONFIRMED', notes: 'Sesión online rápida.', location: 'Consulta Online', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-10', serviceName: 'Desarrollo Personal', patientName: 'Valentina Silva', patientEmail: 'valen.silva@email.com', patientPhone: '1123456010', patientDni: '37123456', date: fechaLocal(3), time: '10:30', status: 'CONFIRMED', notes: '', location: 'Centro Médico Belgrano', healthInsurance: 'OSDE' },
    { id: 'apt-11', serviceName: 'Consulta', patientName: 'Julián Castro', patientEmail: 'julian.castro@email.com', patientPhone: '1123456011', patientDni: '38123457', date: fechaLocal(4), time: '19:00', status: 'PENDING', notes: 'Consulta sobre estrés y ansiedad.', location: 'Consulta Online', healthInsurance: 'Swiss Medical' },
    { id: 'apt-12', serviceName: 'Prescripción de Receta', patientName: 'Mariana López', patientEmail: 'mariana.l@email.com', patientPhone: '1123456012', patientDni: '39123456', date: fechaLocal(5), time: '08:30', status: 'CANCELLED', notes: 'El paciente reprogramó para la próxima semana.', location: 'Consultorio Palermo', healthInsurance: 'Galeno' },
    { id: 'apt-13', serviceName: 'Consulta', patientName: 'Esteban Rey', patientEmail: 'esteban.rey@email.com', patientPhone: '1123456013', patientDni: '40123456', date: fechaLocal(7), time: '14:00', status: 'CONFIRMED', notes: '', location: 'Centro Médico Belgrano', healthInsurance: 'OSDE' },
    { id: 'apt-14', serviceName: 'Terapia de Pareja', patientName: 'Clara y Federico', patientEmail: 'clara.fede@email.com', patientPhone: '1123456014', patientDni: '41123456', date: fechaLocal(10), time: '18:30', status: 'CONFIRMED', notes: '', location: 'Consulta Online', healthInsurance: 'Particular (Sin cobertura)' },
    { id: 'apt-15', serviceName: 'Desarrollo Personal', patientName: 'Sebastián Ríos', patientEmail: 'sebas.rios@email.com', patientPhone: '1123456015', patientDni: '42123456', date: fechaLocal(14), time: '16:00', status: 'PENDING', notes: 'Primera entrevista.', location: 'Consultorio Palermo', healthInsurance: 'Swiss Medical' }
  ],

  patients: []
};

// Generar pacientes únicos a partir de los turnos (DNI como clave)
const vistos = new Map();
db.appointments.forEach((appt, i) => {
  if (!vistos.has(appt.patientDni)) {
    vistos.set(appt.patientDni, {
      id: 'pat-' + appt.patientDni,
      nombre: appt.patientName,
      email: appt.patientEmail,
      telefono: appt.patientPhone,
      dni: appt.patientDni,
      obraSocial: appt.healthInsurance,
      fechaAlta: fechaLocal(-30 + i)
    });
  }
});
db.patients = Array.from(vistos.values());

db.blockedDates = [];

const destino = path.join(__dirname, 'db.json');
fs.writeFileSync(destino, JSON.stringify(db, null, 2), 'utf8');
console.log(`✔ db.json generado en ${destino}`);
console.log(`  ${db.appointments.length} turnos · ${db.patients.length} pacientes · fechas relativas a hoy (${fechaLocal(0)})`);
