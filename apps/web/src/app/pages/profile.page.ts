import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p>{{ u.username }} · {{ u.email }} · {{ u.role }}</p>
        <p>Puntos de piquera (sellos): {{ u.points }}</p>
        <p><a class="btn btn-secondary" routerLink="/mis-pases">Mis pases</a></p>
      }
    </div>
  `,
})
export class ProfilePageComponent {
  readonly auth = inject(AuthService);
}
