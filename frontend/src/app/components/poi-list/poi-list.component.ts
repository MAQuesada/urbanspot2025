import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { POI } from '../../models/poi.model';

@Component({
  selector: 'app-poi-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>Lista de POIs</h2>
          <button class="btn btn-secondary" (click)="router.navigate(['/map'])">← Volver al Mapa</button>
        </div>

        <div *ngIf="loading" class="loading">Cargando POIs...</div>
        
        <div *ngIf="!loading && pois.length === 0" style="padding: 40px; text-align: center; color: #666;">
          <p>No hay POIs disponibles aún.</p>
          <button class="btn btn-primary" (click)="router.navigate(['/map'])">Crear el primer POI</button>
        </div>

        <div *ngIf="!loading && pois.length > 0" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
          <div *ngFor="let poi of pois" 
               class="card" 
               style="cursor: pointer; transition: transform 0.2s; padding: 0; overflow: hidden;"
               (click)="viewPOI(poi.id)"
               onmouseover="this.style.transform='scale(1.02)'" 
               onmouseout="this.style.transform='scale(1)'">
            <img [src]="poi.image_url" [alt]="poi.name" style="width: 100%; height: 200px; object-fit: cover;">
            <div style="padding: 15px;">
              <h3 style="margin: 0 0 10px 0; color: #333;">{{ poi.name }}</h3>
              <p style="color: #666; font-size: 0.9em; margin: 5px 0; line-height: 1.4;">
                {{ poi.description.length > 120 ? poi.description.substring(0, 120) + '...' : poi.description }}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                <div>
                  <span style="color: #ffc107; font-weight: bold; font-size: 1.1em;">⭐ {{ poi.average_rating.toFixed(1) }}</span>
                  <span style="color: #666; font-size: 0.85em; margin-left: 5px;">({{ poi.rating_count }})</span>
                </div>
                <div style="font-size: 0.85em; color: #666;">
                  <span *ngIf="poi.tags.length > 0">🏷️ {{ poi.tags.slice(0, 2).join(', ') }}</span>
                </div>
              </div>
              <div style="margin-top: 10px; text-align: right;">
                <a [routerLink]="['/poi', poi.id]" (click)="$event.stopPropagation()" 
                   style="color: #007bff; text-decoration: none; font-size: 0.9em; font-weight: 500;">
                  Ver detalles →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PoiListComponent implements OnInit {
  pois: POI[] = [];
  loading = true;

  constructor(
    private apiService: ApiService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadAllPOIs(0, []);
  }

  private loadAllPOIs(skip: number, accumulatedPOIs: POI[]): void {
    this.apiService.getPOIs(skip, 1000).subscribe({
      next: (data: any[]) => {
        // Normalizar los IDs de los POIs
        const normalizedPOIs = data.map(poi => ({
          ...poi,
          id: poi.id || poi._id,
          author_id: poi.author_id || poi.author_id
        } as POI));
        
        // Agregar a la lista acumulada
        accumulatedPOIs.push(...normalizedPOIs);
        
        // Si recibimos menos de 1000, significa que no hay más POIs
        if (normalizedPOIs.length < 1000) {
          this.pois = accumulatedPOIs;
          this.loading = false;
        } else {
          // Hay más POIs, cargar el siguiente lote
          this.loadAllPOIs(skip + 1000, accumulatedPOIs);
        }
      },
      error: (error) => {
        console.error('Error loading POIs:', error);
        // Aún así, mostrar los POIs que se pudieron cargar
        if (accumulatedPOIs.length > 0) {
          this.pois = accumulatedPOIs;
        }
        this.loading = false;
      }
    });
  }

  viewPOI(poiId: string): void {
    this.router.navigate(['/poi', poiId]);
  }
}

