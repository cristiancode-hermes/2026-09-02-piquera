import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, PassProduct } from '../shared/models';

@Component({
  selector: 'app-products',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Bonos de 7 días</h1>
      <p class="lede">Desde {{ euros(fromPrice()) }}. El cobro confirma el pase al momento: no hay retención de franja.</p>
      @if (loading()) { <div class="skeleton"></div> }
      @else {
        <div class="product-list">
          @for (p of products(); track p.id) {
            <article class="card">
              <div class="card-body">
                <h2>{{ p.name }}</h2>
                <p>{{ p.durationDays }} días naturales · {{ euros(p.priceCents) }}</p>
                <a class="btn btn-primary" [routerLink]="['/checkout']" [queryParams]="{ productId: p.id }">Elegir</a>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class ProductsPageComponent {
  private readonly api = inject(ApiService);
  readonly products = signal<PassProduct[]>([]);
  readonly loading = signal(true);
  readonly euros = euros;
  readonly fromPrice = computed(() => {
    const items = this.products();
    if (!items.length) return 0;
    return Math.min(...items.map((p) => p.priceCents));
  });
  constructor() {
    this.api.products().subscribe({
      next: (r) => { this.products.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
