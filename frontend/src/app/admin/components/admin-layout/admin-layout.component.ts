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
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  adminService = inject(AdminService);
  auth = inject(AuthService);
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

  volverAGestion() {
    this.auth.dejarDeImpersonar();
    this.router.navigate(['/gestion']);
  }

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
