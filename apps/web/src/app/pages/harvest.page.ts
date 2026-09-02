import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Harvest, humanizeApiError } from '../shared/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-harvest',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mielada</h1>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (!harvest()) {
        <section class="state-screen">
          <h2>No hay mielada abierta</h2>
          <p class="lede">Cuando el colmenar cierra una cosecha, aparece aquí el tarro.</p>
          <a class="btn btn-primary" routerLink="/colmenares">Ver patios</a>
        </section>
      } @else if (harvest(); as h) {
        <p class="lede">{{ h.yardName || 'Patio' }} · {{ h.startsOn }} — {{ h.endsOn }} · mínimo {{ h.minStamps }} sellos · {{ h.jarsRemaining }}/{{ h.jarsTotal }} tarros.</p>
        @if (ctaError()) { <p class="hold-error" role="alert">{{ ctaError() }}</p> }
        @if (ok()) { <p>Tarro reclamado. Recógelo en la piquera.</p> }
        @if (auth.isAuthenticated()) {
          <button class="btn btn-primary" id="claim-action" type="button" [disabled]="busy()" (click)="claim(h.id)">Reclamar tarro</button>
        } @else {
          <a class="btn btn-primary" routerLink="/login" [queryParams]="{ returnUrl: '/mielada' }">Entrar para reclamar</a>
        }
      }
    </div>
  `,
})
export class HarvestPageComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly harvest = signal<Harvest | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly ctaError = signal('');
  readonly ok = signal(false);
  constructor() {
    this.api.harvest().subscribe({
      next: (h) => { this.harvest.set(h); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  claim(id: string) {
    this.ctaError.set('');
    this.busy.set(true);
    this.api.claim(id).subscribe({
      next: () => { this.busy.set(false); this.ok.set(true); this.api.harvest().subscribe((h) => this.harvest.set(h)); },
      error: (err) => {
        this.busy.set(false);
        this.ctaError.set(humanizeApiError(err));
        queueMicrotask(() => document.getElementById('claim-action')?.scrollIntoView({ block: 'center' }));
      },
    });
  }
}
