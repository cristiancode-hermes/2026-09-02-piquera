import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card-page">
      <button class="theme-toggle auth-theme" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'">
        <span aria-hidden="true">◐</span>
      </button>
      <div class="auth-card">
        <p class="brand-word">Piquera</p>
        <h1>Alta de vecino</h1>
        <form (ngSubmit)="submit()">
          <label for="username">Usuario</label>
          <input id="username" name="username" autocomplete="off" [ngModel]="username()" (ngModelChange)="username.set($event)" />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="off" [ngModel]="email()" (ngModelChange)="email.set($event)" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password" [ngModel]="password()" (ngModelChange)="password.set($event)" />
          @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">Crear cuenta</button>
        </form>
        <p class="auth-alt">¿Ya tienes pase? <a routerLink="/login">Entrar</a></p>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (!this.username() || !this.email() || this.password().length < 8) {
      this.error.set('Usuario, email y contraseña de 8 caracteres.');
      return;
    }
    this.auth.register({ username: this.username(), email: this.email(), password: this.password() }).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => this.error.set('No se pudo registrar. Prueba otro usuario.'),
    });
  }
}
