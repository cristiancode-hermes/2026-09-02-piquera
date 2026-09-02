import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { humanizeApiError, Yard } from '../shared/models';

@Component({
  selector: 'app-stamp',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Sello de hoy</h1>
      <p class="lede">Un patio, un día civil (Madrid). El segundo sello choca junto al botón.</p>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (!yards().length) {
        <section class="state-screen">
          <h2>No hay patios</h2>
          <a class="btn btn-primary" routerLink="/colmenares">Ver colmenar</a>
        </section>
      } @else {
        <div class="picker">
          @for (y of yards(); track y.id) {
            <button class="btn btn-secondary" type="button" (click)="choose(y)" [disabled]="y.todayStatus === 'closed'">
              {{ y.name }} · {{ y.todayStatus }}
            </button>
          }
        </div>
        @if (ok()) { <p class="muted">Sello anotado.</p> }
        @if (ctaError()) { <p class="hold-error" id="stamp-action" role="alert">{{ ctaError() }}</p> }
        <button class="btn btn-primary" id="stamp-action" type="button" [disabled]="!yardId() || busy()" (click)="stamp()">
          {{ busy() ? 'Sellando…' : 'Sellar hoy' }}
        </button>
      }
    </div>
  `,
})
export class StampPageComponent {
  private readonly api = inject(ApiService);
  readonly yards = signal<Yard[]>([]);
  readonly yardId = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly ctaError = signal('');
  readonly ok = signal(false);
  constructor() {
    this.api.yards().subscribe({
      next: (r) => { this.yards.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  choose(y: Yard) { this.yardId.set(y.id); this.ctaError.set(''); }
  stamp() {
    this.ctaError.set('');
    this.ok.set(false);
    this.busy.set(true);
    this.api.stamp(this.yardId()).subscribe({
      next: () => { this.busy.set(false); this.ok.set(true); },
      error: (err) => {
        this.busy.set(false);
        this.ctaError.set(humanizeApiError(err));
        queueMicrotask(() => document.getElementById('stamp-action')?.scrollIntoView({ block: 'center' }));
      },
    });
  }
}
