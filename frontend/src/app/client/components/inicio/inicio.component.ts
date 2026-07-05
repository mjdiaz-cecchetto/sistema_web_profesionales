import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent {
  // Datos del profesional - cargados con la foto generada y detalles enriquecidos
  profesional = signal({
    nombre: 'Dra. Elena Ramos',
    titulo: 'Psicología Clínica · Adultos',
    avatarUrl: 'dra-elena.jpg', // Imagen local guardada en public/
    frasePrincipal: 'Un espacio seguro para tu bienestar emocional y mental',
    biografia: 'Soy psicóloga clínica con más de 10 años de experiencia, especializada en Terapia Cognitivo-Conductual (TCC). Mi objetivo es brindarte un espacio seguro, empático y libre de prejuicios donde podamos trabajar juntos para entender tus emociones, superar de la mejor manera tus dificultades y mejorar tu calidad de vida.',
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
        detalle: 'La terapia cognitivo-conductual ofrece tasas de éxito muy altas en ansiedad. Trabajamos identificando pensamientos distorsionados y desarrollando respuestas adaptativas.'
      },
      {
        nombre: 'Desarrollo Personal',
        descripcion: 'Trabajo focalizado en la autoestima, toma de decisiones difíciles y asertividad.',
        icono: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        detalle: 'Ideal para personas que buscan conocerse mejor, potenciar sus habilidades interpersonales o reorientar su carrera.'
      },
      {
        nombre: 'Terapia de Pareja',
        descripcion: 'Resolución de conflictos y construcción de vínculos afectivos más saludables.',
        icono: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        detalle: 'Brindo un espacio neutral de escucha activa para identificar patrones destructivos y mejorar la empatía.'
      }
    ]
  });

  // Especialidad seleccionada en el acordeón del frontend
  especialidadActiva = signal<number | null>(null);

  // Turnos rápidos simulados para incentivar la acción directa
  turnosRapidos = signal([
    { fecha: 'Hoy', hora: '17:00', label: 'Tarde' },
    { fecha: 'Mañana', hora: '09:00', label: 'Mañana' },
    { fecha: 'Lunes', hora: '11:00', label: 'Mañana' }
  ]);

  toggleSpecialty(index: number) {
    if (this.especialidadActiva() === index) {
      this.especialidadActiva.set(null);
    } else {
      this.especialidadActiva.set(index);
    }
  }
}

