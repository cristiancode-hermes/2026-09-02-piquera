import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-admin',
  template: `
    <div class="wrap">
      <h1>Admin</h1>
      @if (stats(); as s) {
        <p>Pases {{ s.passes }} · sellos {{ s.stamps }} · tarros {{ s.jars }}</p>
      }
    </div>
  `,
})
export class AdminPageComponent {
  private readonly api = inject(ApiService);
  readonly stats = signal<any>(null);
  constructor() {
    this.api.adminStats().subscribe((s) => this.stats.set(s));
  }
}
