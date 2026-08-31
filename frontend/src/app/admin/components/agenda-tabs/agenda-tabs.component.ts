import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Selector de sub-vista de la Agenda (Lista / Calendario). */
@Component({
  selector: 'app-agenda-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-2xl p-1 w-full sm:w-auto">
      <a routerLink="/admin/agenda/lista" routerLinkActive="segment-active"
         class="segment flex-1 sm:flex-initial justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
        Lista
      </a>
      <a routerLink="/admin/agenda/calendario" routerLinkActive="segment-active"
         class="segment flex-1 sm:flex-initial justify-center">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        Calendario
      </a>
    </div>
  `
})
export class AgendaTabsComponent {}
