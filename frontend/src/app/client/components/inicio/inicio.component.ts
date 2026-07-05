import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html'
})
export class InicioComponent {
  // Estos datos vendrán de la base de datos en un futuro
  profesional = signal({
    nombre: 'Dra. Elena Ramos',
    titulo: 'Psicología Clínica · Adultos',
    avatarUrl: 'https://ui-avatars.com/api/?name=Elena+Ramos&background=0D8B95&color=fff&size=256',
    frasePrincipal: 'Bienestar emocional y mental',
    biografia: 'Soy psicóloga clínica con más de 10 años de experiencia, especializada en Terapia Cognitivo-Conductual (TCC). Mi objetivo es brindarte un espacio seguro, empático y libre de prejuicios donde podamos trabajar juntos para entender tus emociones y mejorar tu calidad de vida. Creo firmemente que todos tenemos las herramientas para sanar, a veces solo necesitamos un guía para encontrarlas.',
    modalidad: 'Atención presencial en Palermo (CABA) y consultas Online para todo el mundo.',
    areas: [
      {
        nombre: 'Ansiedad y Estrés',
        descripcion: 'Herramientas prácticas para manejar la sobrecarga emocional y ataques de pánico.',
        icono: 'M13 10V3L4 14h7v7l9-11h-7z'
      },
      {
        nombre: 'Desarrollo Personal',
        descripcion: 'Trabajo en autoestima, toma de decisiones y definición de proyectos de vida.',
        icono: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
      },
      {
        nombre: 'Terapia de Pareja',
        descripcion: 'Resolución de conflictos, mejora de la comunicación y vínculos afectivos.',
        icono: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
      }
    ]
  });
}
