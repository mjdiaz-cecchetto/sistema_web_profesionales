import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Selector de sub-vista de la Agenda (Lista / Calendario). */
@Component({
  selector: 'app-agenda-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './agenda-tabs.component.html',
  styleUrl: './agenda-tabs.component.scss'
})
export class AgendaTabsComponent {}
