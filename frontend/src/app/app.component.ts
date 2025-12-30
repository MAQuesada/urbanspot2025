import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { User } from './models/user.model';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav class="nav" *ngIf="showNav">
      <div class="nav-content">
        <h1 style="display: flex; align-items: center; gap: 10px; margin: 0;">
          <a routerLink="/map" style="text-decoration: none; color: #007bff; display: flex; align-items: center; gap: 10px;">
            <img src="https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/20251230_002924_e880896d.png" 
                 alt="UrbanSpot Logo" 
                 style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;">
            <span>UrbanSpot</span>
          </a>
        </h1>
        <ul class="nav-links">
          <li><a routerLink="/map" routerLinkActive="active">Mapa</a></li>
          <li><a routerLink="/pois" routerLinkActive="active">Lista de POIs</a></li>
          <li><a routerLink="/ranking" routerLinkActive="active">Ranking</a></li>
          <li *ngIf="currentUser">
            <a [routerLink]="['/profile', currentUser.id]" routerLinkActive="active">
              Mi Perfil
            </a>
          </li>
          <li *ngIf="currentUser" class="user-info">
            <span>{{ currentUser.name }}</span>
            <span class="rating-value">⭐ {{ currentUser.total_score }}</span>
            <button class="btn btn-secondary" (click)="logout()">Salir</button>
          </li>
          <li *ngIf="!currentUser">
            <a routerLink="/login">Iniciar Sesión</a>
          </li>
        </ul>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .nav {
      background: white;
      padding: 15px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .nav-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-content h1 {
      margin: 0;
      color: #007bff;
    }
    .nav-links {
      display: flex;
      gap: 20px;
      list-style: none;
      align-items: center;
    }
    .nav-links a {
      text-decoration: none;
      color: #333;
      font-weight: 500;
    }
    .nav-links a:hover, .nav-links a.active {
      color: #007bff;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .rating-value {
      font-weight: bold;
      color: #ffc107;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  showNav = true;
  private routerSubscription?: Subscription;
  private userUpdateSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    // Actualizar usuario cuando cambie la ruta
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
        // Recargar usuario desde localStorage para asegurar que esté actualizado
        this.updateCurrentUser();
        // Ocultar nav en login/register
        const url = this.router.url;
        this.showNav = !url.includes('/login') && !url.includes('/register');
      });
    
    // Suscribirse a actualizaciones del usuario
    this.userUpdateSubscription = this.authService.userUpdated$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  private updateCurrentUser(): void {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed._id && !parsed.id) {
          parsed.id = parsed._id;
        }
        this.currentUser = parsed;
      } catch (error) {
        console.error('Error al parsear usuario:', error);
        this.currentUser = this.authService.getCurrentUser();
      }
    } else {
      this.currentUser = this.authService.getCurrentUser();
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.userUpdateSubscription) {
      this.userUpdateSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
    this.currentUser = null;
  }
}
