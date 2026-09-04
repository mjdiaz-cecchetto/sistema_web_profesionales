import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div *ngIf="isOpen" 
         class="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6"
         style="background-color: rgba(0,0,0,0.4); backdrop-filter: blur(4px);">
      
      <!-- Contenedor principal -->
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
           style="animation: slide-up 0.3s ease-out forwards;">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <h3 class="text-lg font-black text-stone-800">{{ title }}</h3>
          <button (click)="close()" 
                  class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <!-- Body con scroll -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f5f5f4;
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #d6d3d1;
      border-radius: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #a8a29e;
    }
  `]
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Modal';
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.isOpen = false;
    this.closeModal.emit();
  }
}
