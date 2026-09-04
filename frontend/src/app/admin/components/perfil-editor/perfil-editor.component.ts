import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { AdminService, AdminProfile } from '../../services/admin.service';
import { ProfesionalPickerComponent } from '../profesional-picker/profesional-picker.component';

@Component({
  selector: 'app-perfil-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProfesionalPickerComponent, RouterModule],
  templateUrl: './perfil-editor.component.html',
  styleUrl: './perfil-editor.component.scss'
})
export class PerfilEditorComponent {
  adminService = inject(AdminService);

  /** Página pública donde el paciente ve este perfil. */
  linkPublico(): (string | undefined)[] {
    const c = this.adminService.cuenta();
    if (!c) return ['/'];
    if (c.tipo === 'profesional') return ['/p', c.slug];
    return ['/c', c.slug, 'p', this.adminService.focoId()];
  }
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
    // Construir el formulario cuando el perfil está disponible,
    // y reconstruirlo si cambia el profesional en foco (modo consultorio).
    let idAnterior = '';
    effect(() => {
      const prof = this.adminService.profile();
      if (prof && prof.id !== idAnterior) {
        idAnterior = prof.id;
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
      whatsapp: [prof.whatsapp || ''],
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
