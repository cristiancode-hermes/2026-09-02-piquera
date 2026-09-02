import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-stamp-chart',
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" role="img" [attr.aria-label]="label()">
      <line [attr.x1]="pad" [attr.y1]="height - pad" [attr.x2]="width - pad" [attr.y2]="height - pad" stroke="currentColor" />
      <line [attr.x1]="pad" [attr.y1]="pad" [attr.x2]="pad" [attr.y2]="height - pad" stroke="currentColor" />
      @for (p of points(); track p.date) {
        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="currentColor">
          <title>{{ p.date }}: {{ p.count }} sellos</title>
        </circle>
      }
      @for (p of points(); track p.date; let i = $index) {
        @if (i % 2 === 0) {
          <text [attr.x]="p.x" [attr.y]="height - 4" font-size="10" text-anchor="middle">{{ p.date.slice(8) }}</text>
        }
      }
    </svg>
  `,
})
export class StampChartComponent {
  readonly series = input<{ date: string; count: number }[]>([]);
  readonly label = input('Sellos 14 días');
  readonly width = 560;
  readonly height = 160;
  readonly pad = 28;
  readonly points = computed(() => {
    const s = this.series();
    const max = Math.max(1, ...s.map((p) => p.count));
    const innerW = this.width - this.pad * 2;
    const innerH = this.height - this.pad * 2;
    return s.map((p, i) => ({
      ...p,
      x: this.pad + (s.length <= 1 ? innerW / 2 : (i / (s.length - 1)) * innerW),
      y: this.pad + innerH - (p.count / max) * innerH,
    }));
  });
}
