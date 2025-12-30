import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="card" style="max-width: 400px; margin: 50px auto;">
        <h2>Iniciar Sesión</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required>
          </div>
          <div *ngIf="error" class="error">{{ error }}</div>
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Iniciando...' : 'Iniciar Sesión' }}
          </button>
        </form>
        <p style="margin-top: 20px; text-align: center;">
          ¿No tienes cuenta? <a routerLink="/register">Regístrate</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.loading = true;

    this.authService.login({ email: this.email, password: this.password })
      .then(() => {
        this.router.navigate(['/map']);
      })
      .catch((error) => {
        this.error = error.error?.detail || 'Error al iniciar sesión';
        this.loading = false;
      });
  }
}

