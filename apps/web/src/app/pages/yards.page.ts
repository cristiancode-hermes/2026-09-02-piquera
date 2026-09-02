import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, Yard } from '../shared/models';

@Component({
  selector: 'app-yards',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Patios de colmenas</h1>
      <p class="lede">Cuatro floras. El «desde» es el bono más barato activo, no un precio pintado.</p>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (error()) {
        <section class="state-screen">
          <h2>No cargaron los patios</h2>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!yards().length) {
        <section class="state-screen">
          <h2>El colmenar está en trashumancia</h2>
          <p class="lede">Vuelve en unos días.</p>
        </section>
      } @else {
        <div class="yard-mosaic">
          @for (y of yards(); track y.id) {
            <a class="yard-card" [class]="'layout-' + y.layout" [routerLink]="['/colmenares', y.slug]">
              <figure>
                <img [src]="y.imagePath" [alt]="y.caption" width="800" height="450" />
                <figcaption>{{ y.caption }}</figcaption>
              </figure>
              <div class="card-body">
                <h2>{{ y.name }}</h2>
                <p>{{ y.description }}</p>
                <p class="muted">{{ y.hiveCount }} colmenas · hoy {{ y.todayStatus }} · desde {{ euros(y.fromPriceCents || 0) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class YardsPageComponent {
  private readonly api = inject(ApiService);
  readonly yards = signal<Yard[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly euros = euros;
  constructor() { this.load(); }
  load() {
    this.loading.set(true);
    this.api.yards().subscribe({
      next: (r) => { this.yards.set(r.items); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron listar los patios.'); this.loading.set(false); },
    });
  }
}
