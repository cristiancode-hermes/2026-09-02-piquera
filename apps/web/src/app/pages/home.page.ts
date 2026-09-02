import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, HomeDto } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (loading()) {
        <div class="skeleton" aria-hidden="true"></div>
      } @else if (error()) {
        <section class="state-screen">
          <h1>No pudimos abrir el colmenar</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (home(); as h) {
        <section class="hero-copy">
          <h1>La piquera abre al vecino</h1>
          <p class="lede">Bono de 7 días, un sello por jornada y tarro cuando cierra la mielada. Desde {{ euros(h.fromPriceCents) }}.</p>
          <p><a class="btn btn-primary" routerLink="/bono">Comprar bono</a> <a class="btn btn-secondary" routerLink="/colmenares">Ver patios</a></p>
        </section>
        <div class="widget-board">
          <section class="nectar-widget">
            <h2>Índice de néctar</h2>
            <p class="muted">Sellos de los últimos 14 días en el colmenar.</p>
            <div class="nectar-bars" role="img" [attr.aria-label]="'Néctar semanal, total ' + h.nectar">
              @for (p of h.series14d; track p.date) {
                <div class="nectar-col">
                  <div class="nectar-bar" [style.height.px]="barH(p.count, h.series14d)" [attr.title]="p.date + ': ' + p.count + ' sellos'"></div>
                  <span class="nectar-x">{{ p.date.slice(8) }}</span>
                </div>
              }
            </div>
          </section>
          <section class="open-list">
            <h2>Patios de hoy</h2>
            @if (!h.yardsOpen.length) {
              <p class="muted">Hoy no hay patios publicados.</p>
            } @else {
              <ul>
                @for (y of h.yardsOpen; track y.slug) {
                  <li>
                    <a [routerLink]="['/colmenares', y.slug]">{{ y.name }}</a>
                    <span>{{ y.status === 'closed' ? 'Cerrado' : y.remaining + ' huecos de sello' }}</span>
                  </li>
                }
              </ul>
            }
          </section>
          <section class="jar-widget">
            <h2>Mielada</h2>
            @if (h.harvest; as hv) {
              <p>{{ hv.jarsRemaining }} tarros · mínimo {{ hv.minStamps }} sellos</p>
              <a class="btn btn-secondary" routerLink="/mielada">Reclamar tarro</a>
            } @else {
              <p class="muted">No hay mielada abierta.</p>
            }
          </section>
        </div>
      }
    </div>
  `,
})
export class HomePageComponent {
  private readonly api = inject(ApiService);
  readonly home = signal<HomeDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly euros = euros;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.home().subscribe({
      next: (h) => {
        this.home.set(h);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('El colmenar no responde.');
        this.loading.set(false);
      },
    });
  }

  barH(count: number, series: { count: number }[]): number {
    const max = Math.max(1, ...series.map((s) => s.count));
    return 8 + (count / max) * 72;
  }
}
