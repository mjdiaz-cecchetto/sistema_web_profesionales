import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { AdminService, AdminProfile, LocationConfig, SpecialtyConfig } from '../../services/admin.service';

@Component({
  selector: 'app-perfil-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado -->
      <div>
        <h1 class="text-2xl font-black text-stone-900 tracking-tight">Mi Perfil Público</h1>
        <p class="text-sm text-stone-500">Administrá la información que verán tus pacientes cuando ingresen a agendar turnos.</p>
      </div>

      <!-- Alertas de Éxito -->
      <div *ngIf="showSuccessAlert()" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Perfil actualizado con éxito. Los cambios ya son visibles en la página del cliente.</span>
        </div>
        <button (click)="showSuccessAlert.set(false)" class="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
      </div>

      <form [formGroup]="perfilForm" (ngSubmit)="onSubmit()" class="space-y-6">
        
        <!-- Bloque 1: Datos Básicos -->
        <div class="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4">
          <h3 class="font-bold text-stone-900 text-base pb-2 border-b border-stone-100 flex items-center gap-2">
            <span class="w-1 h-5 bg-teal-600 rounded-full"></span>
            Información de Presentación
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Nombre -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-stone-500 uppercase">Nombre Completo</label>
              <input type="text" formControlName="nombre" 
                     class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            </div>
            
            <!-- Título -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-stone-500 uppercase">Título / Especialidad Médica</label>
              <input type="text" formControlName="titulo" 
                     class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
            </div>
          </div>

          <!-- Frase Principal -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-stone-500 uppercase">Frase Destacada (Hero)</label>
            <input type="text" formControlName="frasePrincipal" 
                   class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all">
          </div>

          <!-- Biografía -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-stone-500 uppercase">Biografía Profesional</label>
            <textarea formControlName="biografia" rows="4" 
                      class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:bg-white focus:outline-none transition-all resize-none"></textarea>
          </div>
        </div>

        <!-- Bloque 2: Lugares de Atención -->
        <div class="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 class="font-bold text-stone-900 text-base flex items-center gap-2">
              <span class="w-1 h-5 bg-teal-600 rounded-full"></span>
              Consultorios y Lugares de Atención
            </h3>
            <button type="button" (click)="addDireccion()" 
                    class="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              + Agregar Consultorio
            </button>
          </div>

          <div formArrayName="direcciones" class="space-y-6 divide-y divide-stone-100">
            <div *ngFor="let item of direccionesFormArray.controls; let idx = index" [formGroupName]="idx" 
                 class="pt-5 first:pt-0 flex flex-col gap-4 relative">
              
              <!-- Botón de Borrado -->
              <button type="button" (click)="removeDireccion(idx)" 
                      class="absolute top-0 right-0 text-red-500 hover:text-red-700 text-xs font-bold hover:underline first:top-5">
                Eliminar lugar
              </button>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Tipo -->
                <div class="space-y-1">
                  <label class="text-xs font-bold text-stone-400 uppercase">Nombre del Lugar (Ej. Consultorio Palermo)</label>
                  <input type="text" formControlName="tipo" 
                         class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
                </div>
                <!-- Detalle -->
                <div class="space-y-1">
                  <label class="text-xs font-bold text-stone-400 uppercase">Detalle Días (Ej. Lun, Mié y Vie)</label>
                  <input type="text" formControlName="detalle" 
                         class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
                </div>
                <!-- Google Maps Link -->
                <div class="space-y-1">
                  <label class="text-xs font-bold text-stone-400 uppercase">Link de Google Maps (Opcional)</label>
                  <input type="text" formControlName="mapLink" 
                         class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
                </div>
              </div>

              <!-- Dirección Física -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-stone-400 uppercase">Dirección Física Completa</label>
                <input type="text" formControlName="direccion" 
                       class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
              </div>

            </div>
          </div>
        </div>

        <!-- Bloque 3: Especialidades -->
        <div class="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-stone-100">
            <h3 class="font-bold text-stone-900 text-base flex items-center gap-2">
              <span class="w-1 h-5 bg-teal-600 rounded-full"></span>
              Especialidades y Áreas de Acompañamiento
            </h3>
            <button type="button" (click)="addArea()" 
                    class="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              + Agregar Especialidad
            </button>
          </div>

          <div formArrayName="areas" class="space-y-6 divide-y divide-stone-100">
            <div *ngFor="let item of areasFormArray.controls; let idx = index" [formGroupName]="idx" 
                 class="pt-5 first:pt-0 flex flex-col gap-4 relative">
              
              <!-- Botón de Borrado -->
              <button type="button" (click)="removeArea(idx)" 
                      class="absolute top-0 right-0 text-red-500 hover:text-red-700 text-xs font-bold hover:underline first:top-5">
                Eliminar especialidad
              </button>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Nombre Especialidad -->
                <div class="space-y-1">
                  <label class="text-xs font-bold text-stone-400 uppercase">Nombre Especialidad (Ej. Ansiedad)</label>
                  <input type="text" formControlName="nombre" 
                         class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
                </div>
                <!-- Icono SVG (Path) -->
                <div class="space-y-1">
                  <label class="text-xs font-bold text-stone-400 uppercase">Path Icono SVG (Ej. M13 10V3L4 14...)</label>
                  <input type="text" formControlName="icono" 
                         class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
                </div>
              </div>

              <!-- Descripción Básica -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-stone-400 uppercase">Descripción Breve (Listados)</label>
                <input type="text" formControlName="descripcion" 
                       class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none">
              </div>

              <!-- Detalle Clínico Extendido -->
              <div class="space-y-1">
                <label class="text-xs font-bold text-stone-400 uppercase">Detalle Clínico Extendido (Desplegable)</label>
                <textarea formControlName="detalle" rows="2" 
                          class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 focus:bg-white focus:outline-none resize-none"></textarea>
              </div>

            </div>
          </div>
        </div>

        <!-- Botón Guardar Todo -->
        <div class="flex justify-end gap-3">
          <button type="submit" 
                  [disabled]="perfilForm.invalid"
                  class="bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-md transition-all">
            Guardar Cambios del Perfil
          </button>
        </div>

      </form>

    </div>
  `
})
export class PerfilEditorComponent implements OnInit {
  perfilForm!: FormGroup;
  showSuccessAlert = signal(false);

  get direccionesFormArray(): FormArray {
    return this.perfilForm.get('direcciones') as FormArray;
  }

  get areasFormArray(): FormArray {
    return this.perfilForm.get('areas') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    const prof = this.adminService.profile();
    
    // Inicializar formulario
    this.perfilForm = this.fb.group({
      nombre: [prof.nombre, [Validators.required, Validators.minLength(3)]],
      titulo: [prof.titulo, Validators.required],
      frasePrincipal: [prof.frasePrincipal, Validators.required],
      biografia: [prof.biografia, Validators.required],
      avatarUrl: [prof.avatarUrl],
      modalidad: [prof.modalidad],
      direcciones: this.fb.array([]),
      areas: this.fb.array([])
    });

    // Cargar consultorios
    prof.direcciones.forEach(dir => {
      this.direccionesFormArray.push(this.fb.group({
        tipo: [dir.tipo, Validators.required],
        detalle: [dir.detalle, Validators.required],
        direccion: [dir.direccion, Validators.required],
        mapLink: [dir.mapLink],
        icono: [dir.icono || 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z']
      }));
    });

    // Cargar especialidades
    prof.areas.forEach(area => {
      this.areasFormArray.push(this.fb.group({
        nombre: [area.nombre, Validators.required],
        descripcion: [area.descripcion, Validators.required],
        icono: [area.icono || 'M13 10V3L4 14h7v7l9-11h-7z'],
        detalle: [area.detalle || '']
      }));
    });
  }

  addDireccion() {
    this.direccionesFormArray.push(this.fb.group({
      tipo: ['', Validators.required],
      detalle: ['', Validators.required],
      direccion: ['', Validators.required],
      mapLink: [''],
      icono: ['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z']
    }));
  }

  removeDireccion(idx: number) {
    this.direccionesFormArray.removeAt(idx);
  }

  addArea() {
    this.areasFormArray.push(this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      icono: ['M13 10V3L4 14h7v7l9-11h-7z'],
      detalle: ['']
    }));
  }

  removeArea(idx: number) {
    this.areasFormArray.removeAt(idx);
  }

  onSubmit() {
    if (this.perfilForm.invalid) return;
    
    // Guardar en localStorage
    this.adminService.saveProfile(this.perfilForm.value);
    this.showSuccessAlert.set(true);
    
    // Desaparecer alerta después de 4 segundos
    setTimeout(() => {
      this.showSuccessAlert.set(false);
    }, 4000);
  }
}
