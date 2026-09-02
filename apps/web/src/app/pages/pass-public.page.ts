import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass } from '../shared/models';
import { QrComponent } from '../shared/qr.component';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-pass-public',
  imports: [RouterLink, QrComponent],
  template: `
    <div class="wrap" style="padding:32px 0">
      <button class="theme-toggle" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'"></button>
      @if (loading()) { <div class="skeleton"></div> }
      @else if (error()) {
        <section class="state-screen">
          <h1>Pase no válido</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/">Ir al colmenar</a>
        </section>
      } @else if (pass(); as p) {
        <h1>Pase {{ p.code }}</h1>
        <p>{{ p.startsOn }} — {{ p.endsOn }} · {{ p.status }}</p>
        <app-qr [svg]="p.qrSvg" [url]="p.qrUrl" [code]="p.code" />
      }
    </div>
  `,
})
export class PassPublicPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly theme = inject(ThemeService);
  readonly pass = signal<Pass | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.publicPass(code).subscribe({
      next: (p) => { this.pass.set(p); this.loading.set(false); },
      error: () => { this.error.set('Ese código no corresponde a un pase.'); this.loading.set(false); },
    });
  }
}
