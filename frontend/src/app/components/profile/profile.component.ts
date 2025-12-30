import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UserProfile } from '../../models/user.model';
import { POI } from '../../models/poi.model';
import { Photo } from '../../models/photo.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <button class="btn btn-secondary" (click)="router.navigate(['/map'])">← Volver al Mapa</button>
      
      <div *ngIf="loading" class="loading">Cargando perfil...</div>
      <div *ngIf="!loading && profile" class="card">
        <h2>{{ profile.name }}</h2>
        <p><strong>Email:</strong> {{ profile.email }}</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
          <div class="card" style="background: #e3f2fd;">
            <h3>Puntos POI</h3>
            <p style="font-size: 24px; font-weight: bold; color: #1976d2;">{{ profile.poi_score }}</p>
            <p>{{ profile.poi_count }} POIs creados</p>
          </div>
          <div class="card" style="background: #f3e5f5;">
            <h3>Puntos Fotos</h3>
            <p style="font-size: 24px; font-weight: bold; color: #7b1fa2;">{{ profile.photo_score }}</p>
            <p>{{ profile.photo_count }} fotos subidas</p>
          </div>
          <div class="card" style="background: #fff3e0;">
            <h3>Puntuación Total</h3>
            <p style="font-size: 32px; font-weight: bold; color: #f57c00;">⭐ {{ profile.total_score }}</p>
            <p>{{ profile.rating_count }} valoraciones dadas</p>
          </div>
        </div>

        <!-- POIs creados por el usuario -->
        <div class="card" style="margin-top: 30px;">
          <h3>POIs Creados ({{ userPOIs.length }})</h3>
          <div *ngIf="loadingPOIs" class="loading">Cargando POIs...</div>
          <div *ngIf="!loadingPOIs && userPOIs.length === 0" style="padding: 20px; text-align: center; color: #666;">
            Este usuario aún no ha creado ningún POI.
          </div>
          <div *ngIf="!loadingPOIs && userPOIs.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
            <div *ngFor="let poi of userPOIs" class="card" style="cursor: pointer; transition: transform 0.2s;" 
                 (click)="router.navigate(['/poi', poi.id])"
                 onmouseover="this.style.transform='scale(1.02)'" 
                 onmouseout="this.style.transform='scale(1)'">
              <img [src]="poi.image_url" [alt]="poi.name" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
              <h4 style="margin: 10px 0;">{{ poi.name }}</h4>
              <p style="color: #666; font-size: 0.9em; margin: 5px 0;">{{ poi.description.length > 100 ? poi.description.substring(0, 100) + '...' : poi.description }}</p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span>⭐ {{ poi.average_rating.toFixed(1) }} ({{ poi.rating_count }})</span>
                <span style="font-size: 0.85em; color: #666;">{{ poi.tags.join(', ') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fotos subidas por el usuario -->
        <div class="card" style="margin-top: 30px;">
          <h3>Fotos Subidas ({{ userPhotos.length }})</h3>
          <div *ngIf="loadingPhotos" class="loading">Cargando fotos...</div>
          <div *ngIf="!loadingPhotos && userPhotos.length === 0" style="padding: 20px; text-align: center; color: #666;">
            Este usuario aún no ha subido ninguna foto.
          </div>
          <div *ngIf="!loadingPhotos && userPhotos.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; margin-top: 20px;">
            <div *ngFor="let photo of userPhotos" class="card" style="cursor: pointer; padding: 0; overflow: hidden;"
                 (click)="viewPhoto(photo)">
              <img [src]="photo.image_url" alt="Photo" style="width: 100%; height: 200px; object-fit: cover;">
              <div style="padding: 10px;">
                <p *ngIf="photo.description" style="font-size: 0.9em; margin: 5px 0;">{{ photo.description.length > 50 ? photo.description.substring(0, 50) + '...' : photo.description }}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                  <span>⭐ {{ photo.average_rating.toFixed(1) }} ({{ photo.rating_count }})</span>
                  <a [routerLink]="['/poi', photo.poi_id]" (click)="$event.stopPropagation()" style="font-size: 0.85em; color: #007bff;">Ver POI</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  userPOIs: POI[] = [];
  userPhotos: Photo[] = [];
  loading = true;
  loadingPOIs = true;
  loadingPhotos = true;
  userId: string = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.userId = userId;
      this.loadProfile(userId);
      this.loadUserPOIs(userId);
      this.loadUserPhotos(userId);
    } else {
      console.error('No se proporcionó userId en la ruta');
      this.loading = false;
    }
  }

  loadProfile(userId: string): void {
    this.apiService.getUserProfile(userId).subscribe({
      next: (data: UserProfile) => {
        this.profile = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.loading = false;
      }
    });
  }

  loadUserPOIs(userId: string): void {
    // Obtener todos los POIs y filtrar por author_id
    // El backend limita a 1000, haremos múltiples peticiones si es necesario
    this.loadAllPOIs(userId, 0, []);
  }

  private loadAllPOIs(userId: string, skip: number, accumulatedPOIs: POI[]): void {
    this.apiService.getPOIs(skip, 1000).subscribe({
      next: (data: any[]) => {
        // Normalizar IDs
        const normalizedPOIs = data.map(poi => ({
          ...poi,
          id: poi.id || poi._id,
          author_id: poi.author_id || poi.author_id
        } as POI));
        
        // Agregar a la lista acumulada
        accumulatedPOIs.push(...normalizedPOIs);
        
        // Si recibimos menos de 1000, significa que no hay más
        if (normalizedPOIs.length < 1000) {
          // Filtrar por author_id
          this.userPOIs = accumulatedPOIs.filter(poi => poi.author_id === userId);
          this.loadingPOIs = false;
        } else {
          // Hay más POIs, cargar el siguiente lote
          this.loadAllPOIs(userId, skip + 1000, accumulatedPOIs);
        }
      },
      error: (error) => {
        console.error('Error loading user POIs:', error);
        // Aún así, intentar filtrar lo que tenemos
        this.userPOIs = accumulatedPOIs.filter(poi => poi.author_id === userId);
        this.loadingPOIs = false;
      }
    });
  }

  loadUserPhotos(userId: string): void {
    // Obtener todos los POIs primero para luego obtener las fotos de cada uno
    // El backend limita a 1000, haremos múltiples peticiones si es necesario
    this.loadAllPOIsForPhotos(userId, 0, []);
  }

  private loadAllPOIsForPhotos(userId: string, skip: number, accumulatedPOIs: POI[]): void {
    this.apiService.getPOIs(skip, 1000).subscribe({
      next: (pois: any[]) => {
        // Normalizar IDs
        const normalizedPOIs = pois.map(poi => ({
          ...poi,
          id: poi.id || poi._id
        } as POI));
        
        // Agregar a la lista acumulada
        accumulatedPOIs.push(...normalizedPOIs);
        
        // Si recibimos menos de 1000, significa que no hay más
        if (normalizedPOIs.length < 1000) {
          // Ahora cargar fotos de todos los POIs acumulados
          this.loadPhotosFromPOIs(accumulatedPOIs, userId);
        } else {
          // Hay más POIs, cargar el siguiente lote
          this.loadAllPOIsForPhotos(userId, skip + 1000, accumulatedPOIs);
        }
      },
      error: (error) => {
        console.error('Error loading POIs for photos:', error);
        // Aún así, intentar cargar fotos de lo que tenemos
        if (accumulatedPOIs.length > 0) {
          this.loadPhotosFromPOIs(accumulatedPOIs, userId);
        } else {
          this.loadingPhotos = false;
        }
      }
    });
  }

  private loadPhotosFromPOIs(pois: POI[], userId: string): void {
    const allPhotos: Photo[] = [];
    let loadedCount = 0;
    const totalPOIs = pois.length;

    if (totalPOIs === 0) {
      this.loadingPhotos = false;
      return;
    }

    pois.forEach(poi => {
      this.apiService.getPhotosByPOI(poi.id).subscribe({
        next: (photos: any[]) => {
          // Normalizar IDs de fotos
          const normalizedPhotos = photos.map(photo => ({
            ...photo,
            id: photo.id || photo._id,
            author_id: photo.author_id || photo.author_id,
            poi_id: photo.poi_id || photo.poi_id
          } as Photo));
          const userPhotosForPOI = normalizedPhotos.filter(photo => photo.author_id === userId);
          allPhotos.push(...userPhotosForPOI);
          loadedCount++;
          
          if (loadedCount === totalPOIs) {
            this.userPhotos = allPhotos;
            this.loadingPhotos = false;
          }
        },
        error: (error) => {
          console.error(`Error loading photos for POI ${poi.id}:`, error);
          loadedCount++;
          if (loadedCount === totalPOIs) {
            this.userPhotos = allPhotos;
            this.loadingPhotos = false;
          }
        }
      });
    });
  }

  viewPhoto(photo: Photo): void {
    window.open(photo.image_url, '_blank');
  }
}

