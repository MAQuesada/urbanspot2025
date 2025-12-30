import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { POIDetail } from '../../models/poi.model';
import { Photo } from '../../models/photo.model';

@Component({
  selector: 'app-poi-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div *ngIf="loading" class="loading">Cargando...</div>
      <div *ngIf="!loading && poi" class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <button class="btn btn-secondary" (click)="goBack()">← Volver</button>
          <div *ngIf="isOwner" style="display: flex; gap: 10px;">
            <button class="btn btn-primary" (click)="showEditForm = !showEditForm" [disabled]="deleting">
              {{ showEditForm ? 'Cancelar' : '✏️ Editar POI' }}
            </button>
            <button class="btn btn-danger" (click)="deletePOI()" [disabled]="deleting || editing">
              {{ deleting ? 'Eliminando...' : '🗑️ Eliminar POI' }}
            </button>
          </div>
        </div>

        <div *ngIf="showEditForm && isOwner" class="card" style="background: #f9f9f9; margin-bottom: 20px;">
          <h3>Editar POI</h3>
          <form (ngSubmit)="updatePOI()">
            <div class="form-group">
              <label>Nombre *</label>
              <input type="text" [(ngModel)]="editPOI.name" name="editName" required>
            </div>
            <div class="form-group">
              <label>Descripción *</label>
              <textarea [(ngModel)]="editPOI.description" name="editDescription" required rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Etiquetas (separadas por comas)</label>
              <input type="text" [(ngModel)]="editPOI.tags" name="editTags" placeholder="cultura, turismo, movilidad">
            </div>
            <div *ngIf="editError" class="error">{{ editError }}</div>
            <button type="submit" class="btn btn-primary" [disabled]="editing">
              {{ editing ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </form>
        </div>
        
        <h2>{{ poi.name }}</h2>
        <p><strong>Autor:</strong> {{ poi.author_name || 'Desconocido' }}</p>
        <p><strong>Descripción:</strong> {{ poi.description }}</p>
        <p><strong>Ubicación:</strong> {{ poi.latitude }}, {{ poi.longitude }}</p>
        <p *ngIf="poi.tags.length > 0"><strong>Etiquetas:</strong> {{ poi.tags.join(', ') }}</p>
        
        <div class="rating">
          <span class="rating-value">⭐ {{ poi.average_rating.toFixed(1) }}</span>
          <span>({{ poi.rating_count }} valoraciones)</span>
        </div>

        <img [src]="poi.image_url" alt="{{ poi.name }}" style="max-width: 100%; border-radius: 8px; margin: 20px 0;">

        <div class="card" style="margin-top: 20px;">
          <h3>Valorar este POI</h3>
          <div class="form-group">
            <label>Puntuación (1-10)</label>
            <select [(ngModel)]="ratingScore" name="rating" class="form-group" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
              <option *ngFor="let i of [1,2,3,4,5,6,7,8,9,10]" [value]="i">{{ i }}</option>
            </select>
          </div>
          <button class="btn btn-primary" (click)="ratePOI()" [disabled]="ratingLoading">
            {{ ratingLoading ? 'Valorando...' : 'Valorar' }}
          </button>
          <div *ngIf="ratingError" class="error">{{ ratingError }}</div>
        </div>

        <div class="card" style="margin-top: 20px;">
          <h3>Fotografías ({{ photos.length }})</h3>
          <button class="btn btn-primary" (click)="showUploadForm = !showUploadForm" style="margin-bottom: 20px;">
            {{ showUploadForm ? 'Cancelar' : 'Subir Foto' }}
          </button>

          <div *ngIf="showUploadForm" class="card" style="background: #f9f9f9;">
            <h4>Subir Nueva Foto</h4>
            <form (ngSubmit)="uploadPhoto()">
              <div class="form-group">
                <label>Descripción (opcional)</label>
                <textarea [(ngModel)]="photoDescription" name="description"></textarea>
              </div>
              <div class="form-group">
                <label>Imagen</label>
                <input type="file" (change)="onPhotoFileSelected($event)" accept="image/*" required>
              </div>
              <div *ngIf="uploadError" class="error">{{ uploadError }}</div>
              <button type="submit" class="btn btn-primary" [disabled]="uploadLoading">
                {{ uploadLoading ? 'Subiendo...' : 'Subir Foto' }}
              </button>
            </form>
          </div>

          <div class="photo-gallery" *ngIf="photos.length > 0">
            <div *ngFor="let photo of photos; trackBy: trackByPhotoId" class="photo-item">
              <img [src]="photo.image_url" alt="Photo" (click)="viewPhoto(photo)">
              <div style="padding: 10px;">
                <p *ngIf="photo.description">{{ photo.description }}</p>
                <div class="rating">
                  <span class="rating-value">⭐ {{ photo.average_rating.toFixed(1) }}</span>
                  <span>({{ photo.rating_count }})</span>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                  <label style="font-size: 0.9em;">Valorar (1-10):</label>
                  <select [(ngModel)]="photoRatingScores[photo.id]" 
                          [name]="'photo-rating-' + photo.id"
                          style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 5px;">
                    <option [value]="undefined">Selecciona...</option>
                    <option *ngFor="let i of [1,2,3,4,5,6,7,8,9,10]" [value]="i">{{ i }}</option>
                  </select>
                  <button class="btn btn-primary" style="width: 100%;" 
                          (click)="ratePhoto(photo.id)" 
                          [disabled]="!photoRatingScores[photo.id]">
                    Valorar Foto
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p *ngIf="photos.length === 0">No hay fotografías aún.</p>
        </div>
      </div>
    </div>
  `
})
export class PoiDetailComponent implements OnInit {
  poi: POIDetail | null = null;
  photos: Photo[] = [];
  loading = true;
  showUploadForm = false;
  photoDescription = '';
  selectedPhotoFile: File | null = null;
  uploadLoading = false;
  uploadError = '';
  ratingScore = 5;
  photoRatingScores: { [key: string]: number } = {};
  ratingLoading = false;
  ratingError = '';
  isOwner = false;
  deleting = false;
  showEditForm = false;
  editing = false;
  editError = '';
  editPOI = {
    name: '',
    description: '',
    tags: ''
  };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const poiId = this.route.snapshot.paramMap.get('id');
    if (poiId) {
      this.loadPOI(poiId);
      this.loadPhotos(poiId);
    }
  }

  loadPOI(poiId: string): void {
    this.apiService.getPOI(poiId).subscribe({
      next: (data: any) => {
        // Normalizar ID
        this.poi = {
          ...data,
          id: data.id || data._id,
          author_id: data.author_id || data.author_id
        } as POIDetail;
        
        // Verificar si el usuario actual es el propietario
        const currentUser = this.authService.getCurrentUser();
        this.isOwner = !!(currentUser && currentUser.id && this.poi.author_id === currentUser.id);
        
        // Inicializar formulario de edición
        if (this.isOwner) {
          this.editPOI = {
            name: this.poi.name,
            description: this.poi.description,
            tags: this.poi.tags.join(', ')
          };
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading POI:', error);
        this.loading = false;
      }
    });
  }

  loadPhotos(poiId: string): void {
    this.apiService.getPhotosByPOI(poiId).subscribe({
      next: (data: any[]) => {
        // Normalizar IDs de las fotos
        this.photos = data.map(photo => ({
          ...photo,
          id: photo.id || photo._id,
          poi_id: photo.poi_id || photo.poi_id,
          author_id: photo.author_id || photo.author_id
        } as Photo));
      },
      error: (error) => {
        console.error('Error loading photos:', error);
      }
    });
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedPhotoFile = input.files[0];
    }
  }

  uploadPhoto(): void {
    if (!this.selectedPhotoFile || !this.poi) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.uploadError = 'Usuario no autenticado';
      return;
    }
    const userId = currentUser.id;

    this.uploadLoading = true;
    this.uploadError = '';

    const formData = new FormData();
    formData.append('poi_id', this.poi.id);
    formData.append('author_id', userId);
    formData.append('description', this.photoDescription);
    formData.append('image', this.selectedPhotoFile);

    this.apiService.createPhoto(formData).subscribe({
      next: () => {
        this.showUploadForm = false;
        this.photoDescription = '';
        this.selectedPhotoFile = null;
        this.loadPhotos(this.poi!.id);
        this.uploadLoading = false;
        // Actualizar usuario para reflejar nuevos puntos
        this.authService.refreshUser();
      },
      error: (error) => {
        this.uploadError = error.error?.detail || 'Error al subir foto';
        this.uploadLoading = false;
      }
    });
  }

  ratePOI(): void {
    if (!this.poi) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.ratingError = 'Usuario no autenticado';
      return;
    }
    const userId = currentUser.id;

    this.ratingLoading = true;
    this.ratingError = '';

    const scoreNum = Number(this.ratingScore);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) {
      this.ratingError = 'La puntuación debe ser un número entre 1 y 10';
      this.ratingLoading = false;
      return;
    }

    this.apiService.createRating({
      user_id: userId,
      score: scoreNum,
      target_type: 'poi',
      target_id: this.poi.id
    }).subscribe({
      next: () => {
        this.loadPOI(this.poi!.id);
        this.ratingScore = 5;
        this.ratingLoading = false;
        // Actualizar usuario para reflejar nuevos puntos
        this.authService.refreshUser();
      },
      error: (error) => {
        console.error('Error al valorar POI:', error);
        this.ratingError = error.error?.detail || 'Error al valorar';
        this.ratingLoading = false;
      }
    });
  }

  ratePhoto(photoId: string): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      alert('Usuario no autenticado');
      return;
    }
    const userId = currentUser.id;

    const score = this.photoRatingScores[photoId];
    if (!score || score < 1 || score > 10) {
      alert('Por favor selecciona una puntuación válida (1-10)');
      return;
    }

    const scoreNum = Number(score);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) {
      alert('La puntuación debe ser un número entre 1 y 10');
      return;
    }

    this.apiService.createRating({
      user_id: userId,
      score: scoreNum,
      target_type: 'photo',
      target_id: photoId
    }).subscribe({
      next: () => {
        // Limpiar el score seleccionado
        this.photoRatingScores[photoId] = undefined as any;
        if (this.poi) {
          this.loadPhotos(this.poi.id);
          // Actualizar usuario para reflejar nuevos puntos
          this.authService.refreshUser();
        }
      },
      error: (error) => {
        console.error('Error al valorar foto:', error);
        alert(error.error?.detail || error.message || 'Error al valorar foto');
      }
    });
  }

  viewPhoto(photo: Photo): void {
    window.open(photo.image_url, '_blank');
  }

  trackByPhotoId(index: number, photo: Photo): string {
    return photo.id;
  }

  deletePOI(): void {
    if (!this.poi) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar el POI "${this.poi.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.deleting = true;
    this.apiService.deletePOI(this.poi.id).subscribe({
      next: () => {
        alert('POI eliminado correctamente');
        // Actualizar usuario antes de navegar
        this.authService.refreshUser();
        this.router.navigate(['/map']);
      },
      error: (error) => {
        console.error('Error deleting POI:', error);
        alert(error.error?.detail || 'Error al eliminar el POI');
        this.deleting = false;
      }
    });
  }

  updatePOI(): void {
    if (!this.poi) return;

    this.editing = true;
    this.editError = '';

    // Parsear tags
    const tagsArray = this.editPOI.tags 
      ? this.editPOI.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const updateData: any = {
      name: this.editPOI.name,
      description: this.editPOI.description
    };

    if (tagsArray.length > 0) {
      updateData.tags = tagsArray;
    }

    this.apiService.updatePOI(this.poi.id, updateData).subscribe({
      next: () => {
        this.showEditForm = false;
        this.editing = false;
        // Recargar el POI para ver los cambios
        this.loadPOI(this.poi!.id);
      },
      error: (error) => {
        console.error('Error updating POI:', error);
        this.editError = error.error?.detail || 'Error al actualizar el POI';
        this.editing = false;
      }
    });
  }

  goBack(): void {
    // Intentar volver a la página anterior, o al mapa por defecto
    const previousUrl = document.referrer;
    if (previousUrl && previousUrl.includes(window.location.origin)) {
      window.history.back();
    } else {
      this.router.navigate(['/map']);
    }
  }
}

