import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-stone-50 font-sans text-stone-800 flex flex-col">
      <!-- Navbar Dummy -->
      <header class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-stone-100 px-6 py-4 flex justify-between items-center">
        <h1 class="text-xl font-semibold text-teal-700 tracking-tight">Dra. Elena Ramos</h1>
        <nav>
          <a routerLink="/client/booking" class="bg-teal-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
            Agendar Consulta
          </a>
        </nav>
      </header>

      <!-- Hero Section -->
      <main class="flex-grow flex flex-col items-center justify-center px-4 py-20 text-center animate-fade-in">
        <img src="https://ui-avatars.com/api/?name=Elena+Ramos&background=0D8B95&color=fff&size=128" alt="Dra. Elena Ramos" class="rounded-full h-32 w-32 shadow-lg mb-8 border-4 border-white object-cover">
        
        <h2 class="text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">Bienestar emocional y mental</h2>
        <p class="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Especialista en terapia cognitivo-conductual. Acompañando procesos de ansiedad, estrés y desarrollo personal en un espacio seguro y confidencial.
        </p>

        <a routerLink="/client/booking" class="inline-flex items-center bg-teal-600 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-teal-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          Reservar tu sesión
          <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </a>
      </main>
      
      <!-- Footer Dummy -->
      <footer class="bg-white border-t border-stone-100 py-8 text-center text-stone-400 text-sm">
        <p>&copy; 2026 Dra. Elena Ramos. Todos los derechos reservados.</p>
      </footer>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.8s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class LandingHomeComponent {}
