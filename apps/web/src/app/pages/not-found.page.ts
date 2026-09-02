import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap state-screen">
      <h1>Camino sin colmenas</h1>
      <p class="lede">Esa ruta no está en el colmenar.</p>
      <a class="btn btn-primary" routerLink="/">Volver</a>
    </div>
  `,
})
export class NotFoundPageComponent {}
