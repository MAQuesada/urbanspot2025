import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { UserProfile } from '../../models/user.model';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="card">
        <h2>Ranking Global</h2>
        <div *ngIf="loading" class="loading">Cargando ranking...</div>
        <div *ngIf="!loading">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Posición</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Usuario</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Puntos POI</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Puntos Fotos</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Total</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Contribuciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of ranking; let i = index" 
                  [style.background]="i < 3 ? '#fff9c4' : 'white'"
                  style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold;">
                  {{ i + 1 }}
                  <span *ngIf="i === 0">🥇</span>
                  <span *ngIf="i === 1">🥈</span>
                  <span *ngIf="i === 2">🥉</span>
                </td>
                <td style="padding: 12px;">
                  <a [routerLink]="['/profile', user.id]" style="color: #007bff; text-decoration: none;">
                    {{ user.name }}
                  </a>
                </td>
                <td style="padding: 12px;">{{ user.poi_score }}</td>
                <td style="padding: 12px;">{{ user.photo_score }}</td>
                <td style="padding: 12px; font-weight: bold; color: #f57c00;">⭐ {{ user.total_score }}</td>
                <td style="padding: 12px;">
                  {{ user.poi_count }} POIs, {{ user.photo_count }} fotos
                </td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="ranking.length === 0" style="text-align: center; padding: 20px; color: #666;">
            No hay usuarios en el ranking aún.
          </p>
        </div>
      </div>
    </div>
  `
})
export class RankingComponent implements OnInit {
  ranking: UserProfile[] = [];
  loading = true;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRanking();
  }

  loadRanking(): void {
    this.apiService.getGlobalRanking(100).subscribe({
      next: (data: UserProfile[]) => {
        this.ranking = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading ranking:', error);
        this.loading = false;
      }
    });
  }
}

