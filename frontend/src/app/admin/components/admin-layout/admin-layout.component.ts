import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../../core/auth.service';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  children?: { label: string; route: string }[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen w-screen bg-stone-50 font-sans text-stone-700 flex overflow-hidden">

      <!-- ===== Sidebar Desktop (blanco) ===== -->
      <aside class="hidden md:flex flex-col w-[264px] bg-white border-r border-stone-200 shrink-0 h-full overflow-y-auto">

        <!-- Logo -->
        <div class="h-20 flex items-center gap-3 px-6 shrink-0 border-b border-stone-100">
          <div class="w-10 h-10 rounded-xl bg-teal-200 border border-teal-300 flex items-center justify-center text-teal-900 font-extrabold text-lg">
            S
          </div>
          <div>
            <h2 class="font-extrabold text-stone-800 text-sm tracking-tight leading-none">Sistema</h2>
            <p class="text-[10px] text-teal-700 font-bold uppercase tracking-[0.18em] mt-1">Profesionales</p>
          </div>
        </div>

        <!-- Navegación -->
        <nav class="flex-grow px-4 py-5 space-y-1">
          <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Gestión</p>

          <ng-container *ngFor="let item of menuVisibles()">
            <a [routerLink]="item.route"
               routerLinkActive="bg-teal-100 !text-teal-900"
               [routerLinkActiveOptions]="{ exact: false }"
               class="flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-stone-500 rounded-xl hover:bg-stone-100 hover:text-stone-800 transition-colors">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
              </svg>
              {{ item.label }}
            </a>

            <!-- Sub-items -->
            <div *ngIf="item.children" class="ml-7 pl-4 border-l border-stone-200 space-y-0.5 py-1">
              <a *ngFor="let child of item.children"
                 [routerLink]="child.route"
                 routerLinkActive="!text-teal-800 !font-bold bg-teal-50"
                 class="block px-3 py-2 text-xs font-semibold text-stone-400 rounded-lg hover:text-stone-700 hover:bg-stone-50 transition-colors">
                {{ child.label }}
              </a>
            </div>
          </ng-container>
        </nav>

        <!-- Footer perfil -->
        <div class="p-4 shrink-0 border-t border-stone-100">
          <div class="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-teal-200 shrink-0 bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-xs">
              <img *ngIf="avatar()" [src]="avatar()" alt="Foto de perfil" class="w-full h-full object-cover">
              <ng-container *ngIf="!avatar()">{{ iniciales(nombre()) }}</ng-container>
            </div>
            <div class="min-w-0 flex-grow">
              <h4 class="font-bold text-stone-800 text-xs truncate">{{ nombre() }}</h4>
              <p class="text-[10px] text-stone-400 truncate">{{ titulo() }}</p>
            </div>
            <a [routerLink]="linkPublico()" target="_blank" title="Ver página pública"
               class="w-8 h-8 rounded-lg bg-white border border-stone-200 hover:bg-teal-100 hover:border-teal-300 text-stone-400 hover:text-teal-800 flex items-center justify-center shrink-0 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
        </div>
      </aside>

      <!-- ===== Backdrop móvil ===== -->
      <div *ngIf="isMobileMenuOpen()"
           (click)="toggleMobileMenu()"
           class="md:hidden fixed inset-0 bg-stone-500/30 backdrop-blur-sm z-40 transition-opacity">
      </div>

      <!-- ===== Drawer móvil (blanco) ===== -->
      <aside class="md:hidden fixed inset-y-0 left-0 w-[280px] bg-white border-r border-stone-200 z-50 transform transition-transform duration-300 flex flex-col"
             [class.translate-x-0]="isMobileMenuOpen()"
             [class.-translate-x-full]="!isMobileMenuOpen()">
        <div class="h-16 flex items-center justify-between px-5 shrink-0 border-b border-stone-100">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-teal-200 border border-teal-300 flex items-center justify-center text-teal-900 font-extrabold">S</div>
            <div>
              <h2 class="font-extrabold text-stone-800 text-xs tracking-tight leading-none">Sistema</h2>
              <p class="text-[9px] text-teal-700 font-bold uppercase tracking-[0.18em] mt-1">Profesionales</p>
            </div>
          </div>
          <button (click)="toggleMobileMenu()" class="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <nav class="flex-grow px-4 py-4 space-y-1 overflow-y-auto">
          <ng-container *ngFor="let item of menuVisibles()">
            <a [routerLink]="item.route"
               routerLinkActive="bg-teal-100 !text-teal-900"
               [routerLinkActiveOptions]="{ exact: false }"
               (click)="toggleMobileMenu()"
               class="flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-stone-500 rounded-xl hover:bg-stone-100 hover:text-stone-800 transition-colors">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon"></path>
              </svg>
              {{ item.label }}
            </a>
            <div *ngIf="item.children" class="ml-7 pl-4 border-l border-stone-200 space-y-0.5 py-1">
              <a *ngFor="let child of item.children"
                 [routerLink]="child.route"
                 routerLinkActive="!text-teal-800 !font-bold bg-teal-50"
                 (click)="toggleMobileMenu()"
                 class="block px-3 py-2.5 text-xs font-semibold text-stone-400 rounded-lg hover:text-stone-700 hover:bg-stone-50 transition-colors">
                {{ child.label }}
              </a>
            </div>
          </ng-container>
        </nav>

        <div class="p-4 shrink-0 border-t border-stone-100">
          <div class="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-teal-200 shrink-0 bg-teal-100 flex items-center justify-center text-teal-800 font-extrabold text-xs">
              <img *ngIf="avatar()" [src]="avatar()" alt="Foto de perfil" class="w-full h-full object-cover">
              <ng-container *ngIf="!avatar()">{{ iniciales(nombre()) }}</ng-container>
            </div>
            <div class="min-w-0 flex-grow">
              <h4 class="font-bold text-stone-800 text-xs truncate">{{ nombre() }}</h4>
              <p class="text-[10px] text-stone-400 truncate">{{ titulo() }}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- ===== Contenido ===== -->
      <div class="flex-grow flex flex-col min-w-0 h-full overflow-hidden">

        <!-- Header -->
        <header class="h-16 md:h-20 bg-white border-b border-stone-200 px-4 md:px-6 flex justify-between items-center relative z-30 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <button (click)="toggleMobileMenu()" class="md:hidden p-2 -ml-1 rounded-lg text-stone-500 hover:bg-stone-100">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div class="min-w-0">
              <h2 class="text-base md:text-lg font-extrabold text-stone-800 tracking-tight leading-none truncate">Panel de Control</h2>
              <p class="hidden sm:block text-[11px] text-stone-400 font-medium mt-1 truncate">
                {{ adminService.cuenta()?.nombre }}
                <span class="text-teal-700 font-bold">· {{ adminService.esConsultorio() ? 'Consultorio' : 'Cuenta profesional' }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 md:gap-3 shrink-0">

            <!-- Selector global de profesional (solo en modo consultorio) -->
            <div *ngIf="adminService.esConsultorio()" class="relative">
              <button (click)="selectorAbierto.set(!selectorAbierto())"
                      class="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl pl-1.5 pr-3 py-1.5 transition-colors">
                <span class="w-7 h-7 rounded-full overflow-hidden bg-teal-200 border border-teal-300 flex items-center justify-center text-[9px] font-extrabold text-teal-900 shrink-0">
                  <ng-container *ngIf="seleccionEsTodos()">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </ng-container>
                  <ng-container *ngIf="!seleccionEsTodos()">
                    <img *ngIf="seleccionAvatar()" [src]="seleccionAvatar()" class="w-full h-full object-cover">
                    <ng-container *ngIf="!seleccionAvatar()">{{ seleccionIniciales() }}</ng-container>
                  </ng-container>
                </span>
                <span class="hidden md:block text-xs font-extrabold text-teal-900 max-w-[140px] truncate">{{ seleccionLabel() }}</span>
                <svg class="w-3.5 h-3.5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </button>

              <!-- Menú -->
              <div *ngIf="selectorAbierto()" class="absolute right-0 top-[calc(100%+6px)] w-60 bg-white border border-stone-200 rounded-2xl shadow-lift z-50 overflow-hidden animate-scale-in">
                <button (click)="elegir('ALL')"
                        [ngClass]="seleccionEsTodos() ? 'bg-teal-50 text-teal-900' : 'text-stone-600 hover:bg-stone-50'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors text-left">
                  <span class="w-7 h-7 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </span>
                  Todos los profesionales
                </button>
                <div class="border-t border-stone-100"></div>
                <button *ngFor="let p of adminService.profesionalesActivos()"
                        (click)="elegir(p.id)"
                        [ngClass]="adminService.seleccionId() === p.id ? 'bg-teal-50 text-teal-900' : 'text-stone-600 hover:bg-stone-50'"
                        class="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors text-left">
                  <span class="w-7 h-7 rounded-full overflow-hidden bg-teal-200 border border-teal-300 flex items-center justify-center text-[9px] font-extrabold text-teal-900 shrink-0">
                    <img *ngIf="p.avatarUrl" [src]="p.avatarUrl" class="w-full h-full object-cover">
                    <ng-container *ngIf="!p.avatarUrl">{{ iniciales(p.nombre) }}</ng-container>
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate">{{ p.nombre }}</span>
                    <span class="block text-[9px] text-stone-400 font-semibold truncate">{{ p.titulo }}</span>
                  </span>
                </button>
              </div>
            </div>

            <a [routerLink]="linkPublico()" target="_blank" class="hidden sm:inline-flex btn-secondary !py-2 !px-4 !text-xs items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Ver página pública
            </a>
            <button (click)="cerrarSesion()" class="btn-ghost">
              Cerrar Sesión
            </button>
          </div>
        </header>

        <!-- Aviso de API caída -->
        <div *ngIf="adminService.apiError()"
             class="bg-rose-100 border-b border-rose-200 text-rose-800 text-xs font-semibold px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0 z-20">
          <div class="flex items-center gap-2 min-w-0">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <span class="truncate">No se pudo conectar con la API local. Ejecutá <code class="bg-rose-200/70 px-1.5 py-0.5 rounded font-mono">npm run api</code> y reintentá.</span>
          </div>
          <button (click)="adminService.loadAll()" class="bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1 rounded-lg font-bold shrink-0 transition-colors">
            Reintentar
          </button>
        </div>

        <!-- Vistas hijas -->
        <main class="flex-grow p-4 md:p-6 lg:p-8 overflow-y-auto z-10 relative">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `
})
export class AdminLayoutComponent {
  adminService = inject(AdminService);
  private auth = inject(AuthService);
  private router = inject(Router);

  isMobileMenuOpen = signal(false);

  /** "Mi Equipo" solo tiene sentido para cuentas de tipo consultorio. */
  menuVisibles = computed(() =>
    this.menuItems.filter(item => item.route !== '/admin/equipo' || this.adminService.esConsultorio())
  );

  /** Página pública de la cuenta: /c/{slug} (consultorio) o /p/{slug} (profesional). */
  linkPublico = computed(() => {
    const c = this.adminService.cuenta();
    if (!c) return ['/'];
    return [c.tipo === 'consultorio' ? '/c' : '/p', c.slug];
  });

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      route: '/admin/dashboard',
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z'
    },
    {
      label: 'Mi Equipo',
      route: '/admin/equipo',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      label: 'Agenda de Turnos',
      route: '/admin/agenda',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      children: [
        { label: 'Lista', route: '/admin/agenda/lista' },
        { label: 'Calendario', route: '/admin/agenda/calendario' }
      ]
    },
    {
      label: 'Servicios',
      route: '/admin/servicios',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
    },
    {
      label: 'Mis Pacientes',
      route: '/admin/pacientes',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM19 8v6M22 11h-6'
    },
    {
      label: 'Disponibilidad',
      route: '/admin/disponibilidad',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      label: 'Mi Perfil Público',
      route: '/admin/perfil',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    }
  ];

  selectorAbierto = signal(false);

  seleccionEsTodos = computed(() => this.adminService.seleccionId() === 'ALL');
  seleccionLabel = computed(() => {
    const sel = this.adminService.seleccionId();
    if (sel === 'ALL') return 'Todos los profesionales';
    return this.adminService.nombreDe(sel) || 'Profesional';
  });
  seleccionAvatar = computed(() => {
    const sel = this.adminService.seleccionId();
    return sel === 'ALL' ? '' : (this.adminService.profesionalPorId(sel)?.avatarUrl || '');
  });
  seleccionIniciales = computed(() => this.iniciales(this.seleccionLabel()));

  elegir(id: string) {
    this.adminService.seleccionId.set(id);
    this.selectorAbierto.set(false);
  }

  iniciales(nombre: string): string {
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }

  nombre = computed(() => this.adminService.cuenta()?.nombre ?? 'Cargando…');
  titulo = computed(() => {
    const c = this.adminService.cuenta();
    if (!c) return '';
    return c.tipo === 'consultorio' ? c.email : (this.adminService.profile()?.titulo ?? '');
  });
  avatar = computed(() => this.adminService.profile()?.avatarUrl || '');

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }
}
