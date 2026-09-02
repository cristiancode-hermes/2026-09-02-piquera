import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { humanizeApiError, Yard } from '../shared/models';

@Component({
  selector: 'app-staff-scan',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <h1>Escanear</h1>
      <p class="lede">Acepta código o URL del pase.</p>
      <label for="code">Código o URL</label>
      <input id="code" autocomplete="off" [ngModel]="code()" (ngModelChange)="code.set($event)" />
      <label for="yard">Patio</label>
      <select id="yard" [ngModel]="yardId()" (ngModelChange)="yardId.set($event)">
        @for (y of yards(); track y.id) {
          <option [value]="y.id">{{ y.name }}</option>
        }
      </select>
      @if (ctaError()) { <p class="hold-error" role="alert">{{ ctaError() }}</p> }
      @if (ok()) { <p>Sello de staff anotado.</p> }
      <button class="btn btn-primary" type="button" (click)="go()">Sellar</button>
    </div>
  `,
})
export class StaffScanPageComponent {
  private readonly api = inject(ApiService);
  readonly code = signal('');
  readonly yardId = signal('');
  readonly yards = signal<Yard[]>([]);
  readonly ctaError = signal('');
  readonly ok = signal(false);
  constructor() {
    this.api.yards().subscribe((r) => {
      this.yards.set(r.items);
      this.yardId.set(r.items[0]?.id || '');
    });
  }
  go() {
    this.ctaError.set('');
    this.ok.set(false);
    this.api.scan({ codeOrUrl: this.code(), yardId: this.yardId(), action: 'stamp' }).subscribe({
      next: () => this.ok.set(true),
      error: (err) => this.ctaError.set(humanizeApiError(err)),
    });
  }
}
