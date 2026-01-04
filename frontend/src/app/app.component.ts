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
        <!-- LOGO -->
        <h1 style="display: flex; align-items: center; gap: 10px; margin: 0; z-index: 5001;">
          <a routerLink="/map" (click)="closeMenu()" style="text-decoration: none; color: #007bff; display: flex; align-items: center; gap: 10px;">
            <img src="https://urbanspot-bucket-2025.s3.eu-central-1.amazonaws.com/20251230_002924_e880896d.png" 
                 alt="UrbanSpot Logo" 
                 style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px;">
            <span>UrbanSpot</span>
          </a>
        </h1>

        <!-- BOTÓN HAMBURGUESA -->
        <div class="hamburger" (click)="toggleMenu()" [class.active]="isMenuOpen">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <!-- ENLACES DE NAVEGACIÓN -->
        <ul class="nav-links" [class.active]="isMenuOpen">
          <li><a routerLink="/map" routerLinkActive="active" (click)="closeMenu()">Mapa</a></li>
          <li><a routerLink="/pois" routerLinkActive="active" (click)="closeMenu()">Lista de POIs</a></li>
          <li><a routerLink="/ranking" routerLinkActive="active" (click)="closeMenu()">Ranking</a></li>
          
          <li *ngIf="currentUser">
            <a [routerLink]="['/profile', currentUser.id]" routerLinkActive="active" (click)="closeMenu()">
              Mi Perfil
            </a>
          </li>
          
          <li *ngIf="currentUser" class="user-info">
            <span class="user-name">{{ currentUser.name }}</span>
            <span class="rating-value">⭐ {{ currentUser.total_score }}</span>
            <button class="btn btn-secondary logout-btn" (click)="logout()">Cerrar Sesión</button>
          </li>
          
          <li *ngIf="!currentUser">
            <a routerLink="/login" (click)="closeMenu()">Iniciar Sesión</a>
          </li>
        </ul>
      </div>
    </nav>
    <router-outlet></router-outlet>
  `,
  styles: [`
    /* 
       IMPORTANTE: Leaflet usa z-index 1000. 
       Nosotros usaremos 5000 para estar siempre encima. 
    */
    .nav {
      background: white;
      padding: 15px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
      z-index: 5000; /* Aumentado para superar al mapa */
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
      font-size: 1.5rem;
    }
    .nav-links {
      display: flex;
      gap: 20px;
      list-style: none;
      align-items: center;
      margin: 0;
      padding: 0;
    }
    .nav-links a {
      text-decoration: none;
      color: #333;
      font-weight: 500;
      transition: color 0.3s;
    }
    .nav-links a:hover, .nav-links a.active {
      color: #007bff;
    }
    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .rating-value {
      font-weight: bold;
      color: #ffc107;
    }
    .logout-btn {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    /* ESTILOS DEL BOTÓN HAMBURGUESA */
    .hamburger {
      display: none;
      flex-direction: column;
      cursor: pointer;
      gap: 5px;
      /* Este debe ser el más alto de todos para poder clicarlo siempre */
      z-index: 5002; 
    }
    .hamburger span {
      width: 25px;
      height: 3px;
      background-color: #333;
      transition: all 0.3s ease;
      border-radius: 2px;
    }
    .hamburger.active span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 6px);
    }
    .hamburger.active span:nth-child(2) {
      opacity: 0;
    }
    .hamburger.active span:nth-child(3) {
      transform: rotate(-45deg) translate(5px, -6px);
    }

    /* RESPONSIVE: MÓVILES */
    @media (max-width: 768px) {
      .hamburger {
        display: flex;
      }
      
      .nav-links {
        position: fixed;
        top: 0;
        right: -100%;
        height: 100vh;
        width: 100%; /* Ocupa toda la pantalla */
        background-color: white; /* Fondo blanco sólido para tapar lo de atrás */
        
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-shadow: -2px 0 5px rgba(0,0,0,0.1);
        transition: right 0.3s ease-in-out;
        
        /* Z-INDEX SUPREMO: Más alto que el mapa (1000) y que el nav base (5000) */
        z-index: 5001; 
        
        padding-top: 60px;
        gap: 30px;
      }
      
      .nav-links.active {
        right: 0;
      }
      
      .nav-links a {
        font-size: 1.5rem;
        display: block;
        padding: 10px;
      }

      .user-info {
        flex-direction: column;
        gap: 15px;
        margin-top: 20px;
        border-top: 1px solid #eee;
        padding-top: 20px;
        width: 80%;
        text-align: center;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  showNav = true;
  isMenuOpen = false;
  private routerSubscription?: Subscription;
  private userUpdateSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
        this.updateCurrentUser();
        const url = this.router.url;
        this.showNav = !url.includes('/login') && !url.includes('/register');
        this.closeMenu();
      });
    
    this.userUpdateSubscription = this.authService.userUpdated$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
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
    this.closeMenu();
    this.authService.logout();
    this.currentUser = null;
  }
}