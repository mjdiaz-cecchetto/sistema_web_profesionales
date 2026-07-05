import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  
  faqs = [
    {
      question: '¿Necesito instalar algún programa?',
      answer: 'No. Psicora es una plataforma web para psicólogos que centraliza la gestión de tu práctica profesional en un solo lugar. Desde cualquier computadora, tablet o teléfono puedes acceder a tu agenda y pacientes.',
      open: false
    },
    {
      question: '¿La información de mis pacientes está segura?',
      answer: 'Sí. La seguridad y la confidencialidad son una prioridad. La información clínica y los datos sensibles de tus pacientes están protegidos para que solo tú puedas acceder a ellos.',
      open: false
    },
    {
      question: '¿Puedo usar mi propia agenda de horarios?',
      answer: 'Sí. Puedes compartir tu perfil profesional y permitir que los pacientes soliciten turnos únicamente según los horarios y días que tengas disponibles y configurados en el sistema.',
      open: false
    },
    {
      question: '¿Tiene algún costo de uso?',
      answer: 'Nuestra plataforma es gratis durante la versión Beta y no requiere tarjeta de crédito para comenzar. Podés crear tu cuenta y configurar tu perfil desde el primer ingreso.',
      open: false
    }
  ];

  toggleFaq(index: number) {
    this.faqs[index].open = !this.faqs[index].open;
  }
}
