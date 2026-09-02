import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, Yard } from '../shared/models';

@Component({
  selector: 'app-yard-detail',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (loading()) { <div class="skeleton"></div> }
      @else if (error()) {
        <section class="state-screen">
          <h1>Patio no encontrado</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/colmenares">Volver a patios</a>
        </section>
      } @else if (yard(); as y) {
        <article>
          <figure class="hero-figure">
            <img [src]="y.imagePath" [alt]="y.caption" width="800" height="450" />
            <figcaption>{{ y.caption }}</figcaption>
          </figure>
          <h1>{{ y.name }}</h1>
          <p class="lede">{{ y.description }}</p>
          <p>Hoy: {{ y.today?.status }} · aforo {{ y.today?.checkInCount }}/{{ y.today?.capacityOverride ?? y.capacity }}</p>
          <p>Desde {{ euros(y.fromPriceCents || 0) }}</p>
          <p><a class="btn btn-primary" routerLink="/sello">Sellar hoy aquí</a> <a class="btn btn-secondary" routerLink="/bono">Comprar bono</a></p>
        </article>
      }
    </div>
  `,
})
export class YardDetailPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly yard = signal<Yard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly euros = euros;
  constructor() {
    this.route.paramMap.subscribe(() => this.load());
  }
  load() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading.set(true);
    this.error.set('');
    this.api.yard(slug).subscribe({
      next: (y) => { this.yard.set(y); this.loading.set(false); },
      error: () => { this.error.set('Ese patio no está en el colmenar.'); this.loading.set(false); },
    });
  }
}
