import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { AdminService, AdminProfile } from '../../services/admin.service';

@Component({
  selector: 'app-perfil-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 animate-fade-in" *ngIf="perfilForm; else loadingTpl">

      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Mi Perfil Público</h1>
          <p class="text-sm text-stone-500 mt-0.5">Administrá la información que ven tus pacientes al agendar turnos.</p>
        </div>
        <a href="/client" target="_blank"
           class="btn-secondary !text-xs !py-2 inline-flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          Ver cómo queda
        </a>
      </div>

      <!-- Alerta de éxito -->
      <div *ngIf="showSuccessAlert()" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center justify-between animate-scale-in">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>Perfil actualizado con éxito. Los cambios ya son visibles en tu página pública.</span>
        </div>
        <button (click)="showSuccessAlert.set(false)" class="text-emerald-500 hover:text-emerald-700 font-bold text-lg leading-none">×</button>
      </div>

      <form [formGroup]="perfilForm" (ngSubmit)="onSubmit()" class="space-y-6">

        <!-- ===== Identidad Visual: Banner + Avatar ===== -->
        <div class="card overflow-hidden">
          <!-- Vista previa del banner -->
          <div class="relative h-44 sm:h-52 group">
            <div class="absolute inset-0 bg-teal-200"></div>
            <div *ngIf="!bannerPreview()" class="absolute inset-0 flex items-center justify-center text-teal-800/70 text-xs font-bold uppercase tracking-widest">Sin banner cargado</div>
            <img *ngIf="bannerPreview()" [src]="bannerPreview()" alt="Banner"
                 class="absolute inset-0 w-full h-full object-cover">
            
            <!-- Botones del banner -->
            <div class="absolute top-4 right-4 flex gap-2">
              <label class="cursor-pointer bg-white/90 backdrop-blur hover:bg-white text-stone-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-stone-200 transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Cambiar banner
                <input type="file" accept="image/*" class="hidden" (change)="onBannerSelected($event)">
              </label>
              <button *ngIf="bannerPreview()" type="button" (click)="removeBanner()"
                      class="bg-white/90 hover:bg-rose-50 hover:text-rose-700 text-stone-600 border border-stone-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
                Quitar
              </button>
            </div>

            <!-- Avatar superpuesto -->
            <div class="absolute -bottom-10 left-6 sm:left-8">
              <div class="relative group/avatar">
                <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white border border-stone-200 bg-stone-100">
                  <img [src]="avatarPreview() || 'dra-elena.jpg'" alt="Foto de perfil" class="w-full h-full object-cover">
                </div>
                <label class="absolute -bottom-2 -right-2 cursor-pointer w-9 h-9 rounded-xl bg-teal-300 text-teal-950 border border-teal-400 flex items-center justify-center hover:bg-teal-400 transition-colors" title="Cambiar foto de perfil">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)">
                </label>
              </div>
            </div>
          </div>

          <!-- Texto ayuda identidad -->
          <div class="pt-14 pb-5 px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="font-extrabold text-stone-900 text-sm">Identidad visual de tu página</h3>
              <p class="text-xs text-stone-400 mt-0.5">
                La foto y el banner se muestran en la página que ven tus pacientes.
                Recomendado: banner de 1600×400px, foto cuadrada de al menos 400px.
              </p>
            </div>
            <p *ngIf="imageError()" class="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {{ imageError() }}
            </p>
          </div>
        </div>

        <!-- ===== Datos básicos ===== -->
        <div class="card p-6 space-y-4">
          <h3 class="card-title pb-3 border-b border-stone-100">Información de Presentación</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="field-label">Nombre Completo</label>
              <input type="text" formControlName="nombre" class="input">
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Título / Especialidad</label>
              <input type="text" formControlName="titulo" class="input">
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="field-label">Frase Destacada (Hero)</label>
            <input type="text" formControlName="frasePrincipal" class="input">
          </div>

          <div class="space-y-1.5">
            <label class="field-label">Biografía Profesional</label>
            <textarea formControlName="biografia" rows="4" class="input resize-none"></textarea>
          </div>

          <div class="space-y-1.5">
            <label class="field-label">Modalidad de Atención</label>
            <input type="text" formControlName="modalidad" class="input"
                   placeholder="Ej. Atención presencial en Palermo y consultas online.">
          </div>
        </div>

        <!-- ===== Lugares de atención ===== -->
        <div class="card p-6 space-y-4">
          <div class="flex justify-between items-center pb-3 border-b border-stone-100">
            <h3 class="card-title">Consultorios y Lugares de Atención</h3>
            <button type="button" (click)="addDireccion()"
                    class="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all">
              + Agregar Consultorio
            </button>
          </div>

          <div formArrayName="direcciones" class="space-y-6 divide-y divide-stone-100">
            <div *ngFor="let item of direccionesFormArray.controls; let idx = index" [formGroupName]="idx"
                 class="pt-5 first:pt-0 flex flex-col gap-4 relative">

              <button type="button" (click)="removeDireccion(idx)"
                      class="absolute top-5 first:top-0 right-0 text-red-500 hover:text-red-700 text-xs font-bold hover:underline">
                Eliminar lugar
              </button>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="field-label">Nombre del Lugar</label>
                  <input type="text" formControlName="tipo" class="input !text-xs" placeholder="Ej. Consultorio Palermo">
                </div>
                <div class="space-y-1.5">
                  <label class="field-label">Detalle de Días</label>
                  <input type="text" formControlName="detalle" class="input !text-xs" placeholder="Ej. Lun, Mié y Vie">
                </div>
                <div class="space-y-1.5">
                  <label class="field-label">Link de Google Maps (Opcional)</label>
                  <input type="text" formControlName="mapLink" class="input !text-xs">
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="field-label">Dirección Física Completa</label>
                <input type="text" formControlName="direccion" class="input !text-xs">
              </div>
            </div>
          </div>
        </div>

        <!-- ===== Especialidades ===== -->
        <div class="card p-6 space-y-4">
          <div class="flex justify-between items-center pb-3 border-b border-stone-100">
            <h3 class="card-title">Especialidades y Áreas de Acompañamiento</h3>
            <button type="button" (click)="addArea()"
                    class="bg-teal-50 hover:bg-teal-100 text-teal-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all">
              + Agregar Especialidad
            </button>
          </div>

          <div formArrayName="areas" class="space-y-6 divide-y divide-stone-100">
            <div *ngFor="let item of areasFormArray.controls; let idx = index" [formGroupName]="idx"
                 class="pt-5 first:pt-0 flex flex-col gap-4 relative">

              <button type="button" (click)="removeArea(idx)"
                      class="absolute top-5 first:top-0 right-0 text-red-500 hover:text-red-700 text-xs font-bold hover:underline">
                Eliminar especialidad
              </button>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="field-label">Nombre de la Especialidad</label>
                  <input type="text" formControlName="nombre" class="input !text-xs" placeholder="Ej. Ansiedad y Estrés">
                </div>
                <div class="space-y-1.5">
                  <label class="field-label">Descripción Breve</label>
                  <input type="text" formControlName="descripcion" class="input !text-xs">
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="field-label">Detalle Clínico Extendido</label>
                <textarea formControlName="detalle" rows="2" class="input !text-xs resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Guardar -->
        <div class="flex justify-end items-center gap-4 pb-2">
          <p *ngIf="perfilForm.invalid" class="text-xs text-stone-400">Completá los campos obligatorios para guardar.</p>
          <button type="submit" [disabled]="perfilForm.invalid || adminService.saving()" class="btn-primary !px-8 !py-3.5">
            {{ adminService.saving() ? 'Guardando…' : 'Guardar Cambios del Perfil' }}
          </button>
        </div>

      </form>
    </div>

    <ng-template #loadingTpl>
      <div class="card p-10 text-center text-sm text-stone-400 animate-fade-in">
        Cargando perfil…
      </div>
    </ng-template>
  `
})
export class PerfilEditorComponent {
  adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  perfilForm!: FormGroup;
  showSuccessAlert = signal(false);
  imageError = signal('');

  avatarPreview = signal<string>('');
  bannerPreview = signal<string>('');

  /** Tamaño máximo de archivo aceptado (5 MB). */
  private readonly MAX_FILE_MB = 5;

  private readonly DEFAULT_PIN_ICON = 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z';
  private readonly DEFAULT_AREA_ICON = 'M13 10V3L4 14h7v7l9-11h-7z';

  get direccionesFormArray(): FormArray {
    return this.perfilForm.get('direcciones') as FormArray;
  }

  get areasFormArray(): FormArray {
    return this.perfilForm.get('areas') as FormArray;
  }

  constructor() {
    // El perfil llega de forma asíncrona: construir el formulario cuando esté disponible.
    let inicializado = false;
    effect(() => {
      const prof = this.adminService.profile();
      if (prof && !inicializado) {
        inicializado = true;
        this.buildForm(prof);
      }
    });
  }

  private buildForm(prof: AdminProfile): void {
    this.perfilForm = this.fb.group({
      nombre: [prof.nombre, [Validators.required, Validators.minLength(3)]],
      titulo: [prof.titulo, Validators.required],
      frasePrincipal: [prof.frasePrincipal, Validators.required],
      biografia: [prof.biografia, Validators.required],
      avatarUrl: [prof.avatarUrl],
      bannerUrl: [prof.bannerUrl || ''],
      modalidad: [prof.modalidad],
      direcciones: this.fb.array([]),
      areas: this.fb.array([])
    });

    this.avatarPreview.set(prof.avatarUrl || '');
    this.bannerPreview.set(prof.bannerUrl || '');

    prof.direcciones?.forEach(dir => {
      this.direccionesFormArray.push(this.fb.group({
        tipo: [dir.tipo, Validators.required],
        detalle: [dir.detalle, Validators.required],
        direccion: [dir.direccion, Validators.required],
        mapLink: [dir.mapLink],
        icono: [dir.icono || this.DEFAULT_PIN_ICON]
      }));
    });

    prof.areas?.forEach(area => {
      this.areasFormArray.push(this.fb.group({
        nombre: [area.nombre, Validators.required],
        descripcion: [area.descripcion, Validators.required],
        icono: [area.icono || this.DEFAULT_AREA_ICON],
        detalle: [area.detalle || '']
      }));
    });
  }

  // ===== Carga de imágenes =====

  onAvatarSelected(event: Event): void {
    this.procesarImagen(event, 512, 512, dataUrl => {
      this.avatarPreview.set(dataUrl);
      this.perfilForm.patchValue({ avatarUrl: dataUrl });
      this.perfilForm.markAsDirty();
    });
  }

  onBannerSelected(event: Event): void {
    this.procesarImagen(event, 1600, 640, dataUrl => {
      this.bannerPreview.set(dataUrl);
      this.perfilForm.patchValue({ bannerUrl: dataUrl });
      this.perfilForm.markAsDirty();
    });
  }

  removeBanner(): void {
    this.bannerPreview.set('');
    this.perfilForm.patchValue({ bannerUrl: '' });
    this.perfilForm.markAsDirty();
  }

  /**
   * Lee el archivo, lo redimensiona en un canvas (manteniendo proporción)
   * y lo convierte a JPEG base64 para persistirlo en la API local.
   */
  private procesarImagen(event: Event, maxW: number, maxH: number, onDone: (dataUrl: string) => void): void {
    this.imageError.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.imageError.set('El archivo seleccionado no es una imagen.');
      input.value = '';
      return;
    }
    if (file.size > this.MAX_FILE_MB * 1024 * 1024) {
      this.imageError.set(`La imagen supera los ${this.MAX_FILE_MB} MB permitidos.`);
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          this.imageError.set('No se pudo procesar la imagen en este navegador.');
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        onDone(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => this.imageError.set('No se pudo leer la imagen seleccionada.');
      img.src = reader.result as string;
    };
    reader.onerror = () => this.imageError.set('No se pudo leer el archivo.');
    reader.readAsDataURL(file);

    // Permite volver a elegir el mismo archivo
    input.value = '';
  }

  // ===== Direcciones y áreas =====

  addDireccion() {
    this.direccionesFormArray.push(this.fb.group({
      tipo: ['', Validators.required],
      detalle: ['', Validators.required],
      direccion: ['', Validators.required],
      mapLink: [''],
      icono: [this.DEFAULT_PIN_ICON]
    }));
  }

  removeDireccion(idx: number) {
    this.direccionesFormArray.removeAt(idx);
  }

  addArea() {
    this.areasFormArray.push(this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['', Validators.required],
      icono: [this.DEFAULT_AREA_ICON],
      detalle: ['']
    }));
  }

  removeArea(idx: number) {
    this.areasFormArray.removeAt(idx);
  }

  onSubmit() {
    if (this.perfilForm.invalid) return;

    this.adminService.saveProfile(this.perfilForm.value);
    this.showSuccessAlert.set(true);
    setTimeout(() => this.showSuccessAlert.set(false), 4000);
  }
}
