import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, Pass } from '../shared/models';

@Component({
  selector: 'app-my-passes',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mis pases</h1>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (!items().length) {
        <section class="state-screen">
          <h2>Aún no tienes bono</h2>
          <p class="lede">Elige un bono de 7 días para sellar en los patios.</p>
          <a class="btn btn-primary" routerLink="/bono">Ver bonos</a>
        </section>
      } @else {
        <div class="list">
          @for (p of items(); track p.id) {
            <a class="card" [routerLink]="['/mis-pases', p.code]">
              <div class="card-body">
                <p class="code">{{ p.code }}</p>
                <p>{{ p.startsOn }} — {{ p.endsOn }} · {{ p.stampCount }} sellos · {{ euros(p.totalCents) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class MyPassesPageComponent {
  private readonly api = inject(ApiService);
  readonly items = signal<Pass[]>([]);
  readonly loading = signal(true);
  readonly euros = euros;
  constructor() {
    this.api.mine().subscribe({
      next: (r) => { this.items.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
