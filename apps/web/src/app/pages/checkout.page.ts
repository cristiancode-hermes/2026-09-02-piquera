import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Addon, euros, humanizeApiError, PassProduct } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap checkout">
      <div>
        <h1>Pagar el bono</h1>
        <p class="lede">El total se calcula antes de pulsar. Al pagar, el pase queda confirmado.</p>
        @if (loading()) { <div class="skeleton"></div> }
        @else {
          <fieldset class="picker">
            <legend>Bono</legend>
            @for (p of products(); track p.id) {
              <label>
                <input type="radio" name="product" [value]="p.id" [ngModel]="productId()" (ngModelChange)="productId.set($event)" />
                {{ p.name }} — {{ euros(p.priceCents) }}
              </label>
            }
          </fieldset>
          <fieldset class="picker">
            <legend>Extras</legend>
            @for (a of addons(); track a.id) {
              <label>
                <input type="checkbox" [ngModel]="selected().has(a.id)" (ngModelChange)="toggle(a.id, $event)" />
                {{ a.name }} — {{ euros(a.priceCents) }}
              </label>
            }
          </fieldset>
        }
      </div>
      <aside class="summary">
        <h2>Resumen</h2>
        <ul>
          @for (l of lines(); track l.label) {
            <li><span>{{ l.label }}</span><span>{{ euros(l.cents) }}</span></li>
          }
          <li><strong>Total</strong><strong>{{ euros(total()) }}</strong></li>
        </ul>
        @if (ctaError()) {
          <p class="hold-error" role="alert">{{ ctaError() }}</p>
        }
        <button class="btn btn-primary" id="checkout-action" type="button" [disabled]="busy() || !productId()" (click)="pay()">
          {{ busy() ? 'Cobrando…' : 'Pagar ahora' }}
        </button>
        <p><a routerLink="/bono">Volver</a></p>
      </aside>
    </div>
  `,
})
export class CheckoutPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly products = signal<PassProduct[]>([]);
  readonly addons = signal<Addon[]>([]);
  readonly productId = signal('');
  readonly selected = signal(new Set<string>());
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly ctaError = signal('');
  readonly euros = euros;

  readonly lines = computed(() => {
    const out: { label: string; cents: number }[] = [];
    const p = this.products().find((x) => x.id === this.productId());
    if (p) out.push({ label: p.name, cents: p.priceCents });
    for (const a of this.addons()) {
      if (this.selected().has(a.id)) out.push({ label: a.name, cents: a.priceCents });
    }
    return out;
  });
  readonly total = computed(() => this.lines().reduce((s, l) => s + l.cents, 0));

  constructor() {
    const pre = this.route.snapshot.queryParamMap.get('productId') || '';
    this.api.products().subscribe((r) => {
      this.products.set(r.items);
      this.productId.set(pre || r.items[0]?.id || '');
      this.loading.set(false);
    });
    this.api.addons().subscribe((r) => this.addons.set(r.items));
  }

  toggle(id: string, on: boolean) {
    const next = new Set(this.selected());
    if (on) next.add(id); else next.delete(id);
    this.selected.set(next);
  }

  pay() {
    this.ctaError.set('');
    this.busy.set(true);
    this.api.checkout({ productId: this.productId(), addonIds: [...this.selected()] }).subscribe({
      next: (pass) => {
        this.busy.set(false);
        void this.router.navigate(['/confirmacion', pass.code]);
      },
      error: (err) => {
        this.busy.set(false);
        this.ctaError.set(humanizeApiError(err));
        queueMicrotask(() => document.getElementById('checkout-action')?.scrollIntoView({ block: 'center' }));
      },
    });
  }
}
