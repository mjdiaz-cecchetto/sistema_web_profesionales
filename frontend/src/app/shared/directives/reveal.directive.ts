import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Revela el elemento con una transición suave cuando entra en pantalla.
 * Uso: <section reveal> · con retardo: <div reveal [revealDelay]="150">
 * Respeta prefers-reduced-motion (los estilos viven en styles.scss).
 */
@Directive({
  selector: '[reveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Retardo de la transición en milisegundos (para escalonar elementos). */
  @Input() revealDelay = 0;
  /** Dirección de entrada: 'up' (default), 'left', 'right' o 'zoom'. */
  @Input() revealFrom: 'up' | 'left' | 'right' | 'zoom' = 'up';

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const nodo: HTMLElement = this.el.nativeElement;
    nodo.classList.add('reveal');
    if (this.revealFrom !== 'up') {
      nodo.classList.add(`reveal-${this.revealFrom}`);
    }
    if (this.revealDelay > 0) {
      nodo.style.transitionDelay = `${this.revealDelay}ms`;
    }

    if (typeof IntersectionObserver === 'undefined') {
      nodo.classList.add('reveal-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            nodo.classList.add('reveal-visible');
            this.observer?.unobserve(nodo);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    this.observer.observe(nodo);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
