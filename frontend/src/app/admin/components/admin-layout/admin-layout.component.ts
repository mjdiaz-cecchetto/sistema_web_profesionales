import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen w-screen bg-stone-50 font-sans text-stone-800 flex overflow-hidden">
      
      <!-- Sidebar Desktop -->
      <aside class="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 shrink-0 h-full overflow-y-auto">
        <!-- Sidebar Header -->
        <div class="h-20 flex items-center gap-3 px-6 border-b border-stone-100 bg-stone-50/50 shrink-0">
          <div class="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            S
          </div>
          <div>
            <h2 class="font-extrabold text-stone-900 text-sm tracking-tight">Sistema</h2>
            <p class="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Profesionales</p>
          </div>
        </div>

        <!-- Sidebar Navigation -->
        <nav class="flex-grow p-4 space-y-1">
          <a *ngFor="let item of menuItems" 
             [routerLink]="item.route" 
             routerLinkActive="bg-teal-50 text-teal-700 font-bold border-l-4 border-teal-600"
             class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 rounded-xl hover:bg-stone-50 hover:text-stone-900 transition-all border-l-4 border-transparent">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
            </svg>
            {{ item.label }}
          </a>
        </nav>

        <!-- Sidebar Footer (Professional Profile Quick Card) -->
        <div class="p-4 border-t border-stone-100 bg-stone-50/30 flex items-center gap-3 shrink-0">
          <div class="w-10 h-10 rounded-full overflow-hidden border border-stone-200 shrink-0">
            <img [src]="profileAvatar()" alt="Elena Ramos" class="w-full h-full object-cover">
          </div>
          <div class="min-w-0 flex-grow">
            <h4 class="font-bold text-stone-900 text-xs truncate">{{ profileName() }}</h4>
            <p class="text-[10px] text-stone-400 truncate">{{ profileTitle() }}</p>
          </div>
          <a routerLink="/client" target="_blank" title="Ver Vista Paciente" class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:border-teal-500 hover:text-teal-600 flex items-center justify-center shrink-0 shadow-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      </aside>

      <!-- Sidebar Mobile Backdrop -->
      <div *ngIf="isMobileMenuOpen()" 
           (click)="toggleMobileMenu()" 
           class="md:hidden fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity">
      </div>

      <!-- Sidebar Mobile Drawer -->
      <aside class="md:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-stone-200 z-50 transform transition-transform duration-300 flex flex-col"
             [class.translate-x-0]="isMobileMenuOpen()"
             [class.-translate-x-full]="!isMobileMenuOpen()">
        <!-- Header -->
        <div class="h-20 flex items-center justify-between px-6 border-b border-stone-100 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <div>
              <h2 class="font-extrabold text-stone-900 text-xs tracking-tight">Sistema</h2>
              <p class="text-[9px] text-teal-600 font-bold uppercase tracking-wider">Profesionales</p>
            </div>
          </div>
          <button (click)="toggleMobileMenu()" class="p-1 rounded-lg text-stone-400 hover:bg-stone-50 hover:text-stone-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Nav -->
        <nav class="flex-grow p-4 space-y-1 overflow-y-auto">
          <a *ngFor="let item of menuItems" 
             [routerLink]="item.route" 
             routerLinkActive="bg-teal-50 text-teal-700 font-bold border-l-4 border-teal-600"
             (click)="toggleMobileMenu()"
             class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 rounded-xl hover:bg-stone-50 hover:text-stone-900 transition-all border-l-4 border-transparent">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
            </svg>
            {{ item.label }}
          </a>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-stone-100 bg-stone-50/30 flex items-center gap-3 shrink-0">
          <div class="w-10 h-10 rounded-full overflow-hidden border border-stone-200 shrink-0">
            <img [src]="profileAvatar()" alt="Elena Ramos" class="w-full h-full object-cover">
          </div>
          <div class="min-w-0 flex-grow">
            <h4 class="font-bold text-stone-900 text-xs truncate">{{ profileName() }}</h4>
            <p class="text-[10px] text-stone-400 truncate">{{ profileTitle() }}</p>
          </div>
          <a routerLink="/client" target="_blank" class="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-grow flex flex-col min-w-0 h-full overflow-hidden">
        
        <!-- Header -->
        <header class="h-20 bg-white border-b border-stone-200 px-6 flex justify-between items-center shadow-sm relative z-30 shrink-0">
          <div class="flex items-center gap-3">
            <button (click)="toggleMobileMenu()" class="md:hidden p-2 -ml-2 rounded-lg text-stone-500 hover:bg-stone-50">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h2 class="text-xl font-extrabold text-stone-900 tracking-tight">Panel de Control</h2>
          </div>

          <div class="flex items-center gap-4">
            <!-- Botón Volver al Cliente -->
            <a routerLink="/client" 
               class="hidden sm:inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-stone-200/50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Ver Vista Paciente
            </a>

            <!-- Cerrar Sesión Mock -->
            <button class="bg-teal-600/10 hover:bg-teal-600/15 text-teal-800 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              Cerrar Sesión
            </button>
          </div>
        </header>

        <!-- Child Views Slot -->
        <main class="flex-grow p-6 overflow-y-auto z-10 relative bg-stone-50">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `
})
export class AdminLayoutComponent {
  isMobileMenuOpen = signal(false);

  menuItems = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z' },
    { label: 'Agenda de Turnos', route: '/admin/agenda', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Configurar Disponibilidad', route: '/admin/disponibilidad', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Mi Perfil Público', route: '/admin/perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
  ];

  profileName = signal('Dra. Elena Ramos');
  profileTitle = signal('Psicóloga Clínica');
  profileAvatar = signal('dra-elena.jpg');

  constructor(private adminService: AdminService) {
    // Sincronizar dinámicamente con los cambios hechos en el perfil del admin
    effect(() => {
      const prof = this.adminService.profile();
      this.profileName.set(prof.nombre);
      this.profileTitle.set(prof.titulo);
      this.profileAvatar.set(prof.avatarUrl);
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }
}
