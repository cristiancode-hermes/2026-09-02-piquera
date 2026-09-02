import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass } from '../shared/models';
import { QrComponent } from '../shared/qr.component';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink, QrComponent],
  template: `
    <div class="wrap">
      @if (loading()) { <div class="skeleton"></div> }
      @else if (error()) {
        <section class="state-screen">
          <h1>No encontramos el pase</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-pases">Mis pases</a>
        </section>
      } @else if (pass(); as p) {
        <h1>Bono confirmado</h1>
        <p class="lede">Válido {{ p.startsOn }} — {{ p.endsOn }}. Enseña este QR en la piquera.</p>
        <app-qr [svg]="p.qrSvg" [url]="p.qrUrl" [code]="p.code" />
        <p><a class="btn btn-secondary" [routerLink]="['/mis-pases', p.code]">Ver detalle</a> <a class="btn btn-primary" routerLink="/sello">Sellar hoy</a></p>
      }
    </div>
  `,
})
export class ConfirmPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly pass = signal<Pass | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.myPass(code).subscribe({
      next: (p) => { this.pass.set(p); this.loading.set(false); },
      error: () => { this.error.set('El pase no está en tu cuenta.'); this.loading.set(false); },
    });
  }
}
