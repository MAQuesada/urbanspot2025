import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserLogin, UserCreate } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;
  private userUpdatedSubject = new Subject<User | null>();
  public userUpdated$ = this.userUpdatedSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Load user from localStorage on init
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Asegurar que el ID esté normalizado
        if (parsed._id && !parsed.id) {
          parsed.id = parsed._id;
        }
        this.currentUser = parsed;
      } catch (error) {
        console.error('❌ Error al cargar usuario desde localStorage:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  login(credentials: UserLogin): Promise<User> {
    return new Promise((resolve, reject) => {
      this.apiService.authenticateUser(credentials).subscribe({
        next: (userData: any) => {
          // Normalizar el ID: puede venir como _id o id
          const user: User = {
            id: userData.id || userData._id,
            name: userData.name,
            email: userData.email,
            poi_score: userData.poi_score || 0,
            photo_score: userData.photo_score || 0,
            total_score: userData.total_score || 0,
            created_at: userData.created_at,
            updated_at: userData.updated_at
          };
          this.currentUser = user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.userUpdatedSubject.next(user);
          resolve(user);
        },
        error: (error) => {
          console.error('❌ Error en login:', error);
          reject(error);
        }
      });
    });
  }

  register(userData: UserCreate): Promise<User> {
    return new Promise((resolve, reject) => {
      this.apiService.createUser(userData).subscribe({
        next: (userData: any) => {
          // Normalizar el ID: puede venir como _id o id
          const user: User = {
            id: userData.id || userData._id,
            name: userData.name,
            email: userData.email,
            poi_score: userData.poi_score || 0,
            photo_score: userData.photo_score || 0,
            total_score: userData.total_score || 0,
            created_at: userData.created_at,
            updated_at: userData.updated_at
          };
          this.currentUser = user;
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.userUpdatedSubject.next(user);
          resolve(user);
        },
        error: (error) => {
          console.error('❌ Error en registro:', error);
          reject(error);
        }
      });
    });
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.userUpdatedSubject.next(null);
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  async refreshUser(): Promise<void> {
    // Recargar el usuario desde la API para obtener los puntos actualizados
    if (!this.currentUser?.id) return;
    
    try {
      const updatedUser = await new Promise<any>((resolve, reject) => {
        this.apiService.getUser(this.currentUser!.id).subscribe({
          next: (user: any) => {
            // Normalizar el ID
            const normalizedUser: User = {
              id: user.id || user._id,
              name: user.name,
              email: user.email,
              poi_score: user.poi_score || 0,
              photo_score: user.photo_score || 0,
              total_score: user.total_score || 0,
              created_at: user.created_at,
              updated_at: user.updated_at
            };
            resolve(normalizedUser);
          },
          error: reject
        });
      });
      
      this.currentUser = updatedUser;
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      this.userUpdatedSubject.next(updatedUser);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
    }
  }
}

