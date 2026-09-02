import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { StampChartComponent } from '../shared/chart.component';

@Component({
  selector: 'app-staff-day',
  imports: [StampChartComponent],
  template: `
    <div class="wrap">
      <h1>Hoy en la piquera</h1>
      @if (data(); as d) {
        <app-stamp-chart [series]="d.series14d || []" label="Sellos 14 días" />
        <ul>
          @for (y of d.yards || []; track y.id) {
            <li>{{ y.name }} · {{ y.todayStatus }} · {{ y.todayCount }}/{{ y.todayCapacity }}
              <button class="btn btn-ghost" type="button" (click)="close(y.id)">Cerrar hoy</button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class StaffDayPageComponent {
  private readonly api = inject(ApiService);
  readonly data = signal<any>(null);
  constructor() { this.refresh(); }
  refresh() { this.api.staffToday().subscribe((d) => this.data.set(d)); }
  close(id: string) {
    this.api.patchYardDay(id, { status: 'closed' }).subscribe(() => this.refresh());
  }
}
