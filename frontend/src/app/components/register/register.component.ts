import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="card" style="max-width: 400px; margin: 50px auto;">
        <h2>Registro</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" [(ngModel)]="name" name="name" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Contraseña (mínimo 6 caracteres)</label>
            <input type="password" [(ngModel)]="password" name="password" required minlength="6">
          </div>
          <div *ngIf="error" class="error">{{ error }}</div>
          <div *ngIf="success" class="success">{{ success }}</div>
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'Registrando...' : 'Registrarse' }}
          </button>
        </form>
        <p style="margin-top: 20px; text-align: center;">
          ¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  error = '';
  success = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.error = '';
    this.success = '';
    this.loading = true;

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      this.loading = false;
      return;
    }

    this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password
    })
      .then((user) => {
        this.success = 'Registro exitoso. Redirigiendo...';
        // El usuario ya está guardado en AuthService
        setTimeout(() => {
          this.router.navigate(['/map']);
        }, 1000);
      })
      .catch((error) => {
        this.error = error.error?.detail || error.message || 'Error al registrarse';
        this.loading = false;
      });
  }
}

