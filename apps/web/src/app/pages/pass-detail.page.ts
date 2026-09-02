import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { euros, Pass } from '../shared/models';
import { QrComponent } from '../shared/qr.component';
import { StampChartComponent } from '../shared/chart.component';

@Component({
  selector: 'app-pass-detail',
  imports: [RouterLink, QrComponent, StampChartComponent],
  template: `
    <div class="wrap">
      @if (pass(); as p) {
        <h1>{{ p.code }}</h1>
        <p>{{ p.startsOn }} — {{ p.endsOn }} · {{ euros(p.totalCents) }} (líneas {{ euros(p.linesSum || p.totalCents) }})</p>
        <ul>
          @for (l of p.lines; track l.id) {
            <li>{{ l.label }} × {{ l.qty }} — {{ euros(l.subtotalCents) }}</li>
          }
        </ul>
        <app-qr [svg]="p.qrSvg" [url]="p.qrUrl" [code]="p.code" />
        @if (series().length) {
          <h2>Sellos</h2>
          <app-stamp-chart [series]="series()" />
        }
        <p><a class="btn btn-secondary" routerLink="/mis-pases">Volver</a></p>
      }
    </div>
  `,
})
export class PassDetailPageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly pass = signal<Pass | null>(null);
  readonly series = signal<{ date: string; count: number }[]>([]);
  readonly euros = euros;
  constructor() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.api.myPass(code).subscribe((p) => this.pass.set(p));
    this.api.myCheckIns().subscribe((r) => this.series.set(r.series14d));
  }
}
