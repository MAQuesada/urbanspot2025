import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { POI } from '../../models/poi.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>Mapa de POIs</h2>
          <button class="btn" 
        [class.btn-danger]="showCreateForm" 
        [class.btn-primary]="!showCreateForm" 
        (click)="showCreateForm = !showCreateForm">
  {{ showCreateForm ? 'Cancelar' : 'Crear POI' }}
</button>
        </div>

        <div *ngIf="showCreateForm" class="card" style="margin-bottom: 20px;">
          <h3>Crear Nuevo POI</h3>
          <p style="color: #666; margin-bottom: 15px;">
            💡 Haz clic en el mapa para seleccionar la ubicación del POI
          </p>
          <form (ngSubmit)="createPOI()">
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="newPOI.name" name="name" required>
            </div>
            <div class="form-group">
              <label>Descripción *</label>
              <textarea [(ngModel)]="newPOI.description" name="description" required rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Etiquetas (separadas por comas)</label>
              <input type="text" [(ngModel)]="newPOI.tags" name="tags" placeholder="cultura, turismo, movilidad">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label>Latitud *</label>
                <input type="number" [(ngModel)]="newPOI.latitude" name="latitude" step="0.000001" required readonly style="background: #f5f5f5;">
                <small style="color: #666;">Selecciona en el mapa</small>
              </div>
              <div class="form-group">
                <label>Longitud *</label>
                <input type="number" [(ngModel)]="newPOI.longitude" name="longitude" step="0.000001" required readonly style="background: #f5f5f5;">
                <small style="color: #666;">Selecciona en el mapa</small>
              </div>
            </div>
            <div class="form-group">
              <label>Imagen *</label>
              <input type="file" (change)="onFileSelected($event)" accept="image/*" required>
            </div>
            <div *ngIf="error" class="error">{{ error }}</div>
            <button type="submit" class="btn btn-primary" [disabled]="loading || !newPOI.latitude || !newPOI.longitude">
              {{ loading ? 'Creando...' : 'Crear POI' }}
            </button>
          </form>
        </div>

        <div id="map" class="map-container"></div>
      </div>
    </div>
  `
})
export class MapComponent implements OnInit, OnDestroy {
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  pois: POI[] = [];
  showCreateForm = false;
  loading = false;
  error = '';
  selectedFile: File | null = null;

  newPOI = {
    name: '',
    description: '',
    tags: '',
    latitude: 0,
    longitude: 0
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      this.initMap();
      this.loadPOIs();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  initMap(): void {
    // Default to Málaga, Spain
    this.map = L.map('map').setView([36.7213, -4.4214], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Marker for new POI location
    let newPOIMarker: L.Marker | null = null;

    // Update coordinates when clicking on map
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.newPOI.latitude = e.latlng.lat;
      this.newPOI.longitude = e.latlng.lng;
      
      // Remove existing marker if any
      if (newPOIMarker) {
        this.map!.removeLayer(newPOIMarker);
      }
      
      // Add new marker at clicked location
      newPOIMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(this.map!);
      
      newPOIMarker.bindPopup('Ubicación seleccionada para el nuevo POI').openPopup();
    });
  }

  loadPOIs(): void {
    // Cargar todos los POIs mediante paginación (el backend limita a 1000 por petición)
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
          this.addMarkers();
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
          this.addMarkers();
        }
      }
    });
  }

  addMarkers(): void {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Iconos por tipo de etiqueta
    const getIconColor = (tags: string[]): string => {
      if (!tags || tags.length === 0) return 'blue';
      const tag = tags[0].toLowerCase();
      if (tag.includes('cultura') || tag.includes('turismo')) return 'red';
      if (tag.includes('movilidad') || tag.includes('transporte')) return 'green';
      if (tag.includes('energía') || tag.includes('sostenibilidad')) return 'orange';
      return 'blue';
    };

    this.pois.forEach(poi => {
      const iconColor = getIconColor(poi.tags);
      const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${iconColor}.png`;
      
      const customIcon = L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([poi.latitude, poi.longitude], { icon: customIcon })
        .addTo(this.map!)
        .bindPopup(`
          <div style="min-width: 200px;">
            <strong style="font-size: 16px;">${poi.name}</strong><br>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">
              ${poi.description.length > 80 ? poi.description.substring(0, 80) + '...' : poi.description}
            </p>
            <div style="margin: 8px 0;">
              <span style="color: #ffc107; font-weight: bold;">⭐ ${poi.average_rating.toFixed(1)}</span>
              <span style="color: #666; font-size: 12px;"> (${poi.rating_count} valoraciones)</span>
            </div>
            ${poi.tags.length > 0 ? `<div style="margin: 5px 0;">
              <span style="font-size: 11px; color: #666;">🏷️ ${poi.tags.slice(0, 3).join(', ')}</span>
            </div>` : ''}
            <a href="/poi/${poi.id}" style="display: inline-block; margin-top: 8px; padding: 5px 10px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
              Ver detalles →
            </a>
          </div>
        `);

      marker.on('click', () => {
        this.router.navigate(['/poi', poi.id]);
      });

      this.markers.push(marker);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
    }
  }

  createPOI(): void {
    if (!this.selectedFile) {
      this.error = 'Por favor selecciona una imagen';
      return;
    }

    if (!this.newPOI.latitude || !this.newPOI.longitude) {
      this.error = 'Por favor selecciona una ubicación en el mapa';
      return;
    }

    // Verificar autenticación
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.error = 'Usuario no autenticado. Por favor inicia sesión.';
      this.router.navigate(['/login']);
      return;
    }

    const userId = currentUser.id;
    if (!userId) {
      console.error('User ID no encontrado en usuario autenticado');
      this.error = 'Error: ID de usuario no encontrado. Por favor inicia sesión nuevamente.';
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.error = '';

    const formData = new FormData();
    formData.append('name', this.newPOI.name);
    formData.append('description', this.newPOI.description);
    formData.append('latitude', this.newPOI.latitude.toString());
    formData.append('longitude', this.newPOI.longitude.toString());
    formData.append('author_id', userId);
    if (this.newPOI.tags) {
      formData.append('tags', this.newPOI.tags);
    }
    formData.append('image', this.selectedFile);

    this.apiService.createPOI(formData).subscribe({
      next: (poi) => {
        this.showCreateForm = false;
        this.newPOI = { name: '', description: '', tags: '', latitude: 0, longitude: 0 };
        this.selectedFile = null;
        this.loadPOIs();
        this.loading = false;
        // Actualizar usuario para reflejar nuevos puntos
        this.authService.refreshUser();
        // Navegar al POI recién creado
        this.router.navigate(['/poi', poi.id]);
      },
      error: (error) => {
        this.error = error.error?.detail || 'Error al crear POI';
        this.loading = false;
      }
    });
  }
}


