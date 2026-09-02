import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-staff',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Piquera — staff</h1>
      <p><a class="btn btn-primary" routerLink="/staff/escanear">Escanear QR</a> <a class="btn btn-secondary" routerLink="/staff/dia">Día de hoy</a></p>
    </div>
  `,
})
export class StaffPageComponent {}
