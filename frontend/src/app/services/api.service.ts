import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, from, switchMap } from 'rxjs';

interface AppConfig {
  apiUrl: string;
  apiKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl: string = '';
  private apiKey: string = '';
  private configPromise: Promise<void>;
  private configLoaded: boolean = false;

  constructor(private http: HttpClient) {
    // Load config immediately and store the promise
    this.configPromise = this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      // Load config.json from assets (runtime configuration in Docker)
      const config = await firstValueFrom(
        this.http.get<AppConfig>('/assets/config.json', { responseType: 'json' })
      );
      
      if (config?.apiUrl) {
        this.apiUrl = config.apiUrl;
      } else {
        console.error('API URL is missing in config.json');
      }
      
      if (config?.apiKey) {
        this.apiKey = config.apiKey.trim();
      } else {
        console.error('API Key is missing in config.json');
      }
      
      this.configLoaded = true;
    } catch (error: any) {
      console.error('Failed to load config.json:', error?.message || 'Unknown error');
      throw new Error('Failed to load API configuration. Check that config.json exists and contains apiUrl and apiKey.');
    }
  }

  private async ensureConfigLoaded(): Promise<void> {
    if (!this.configLoaded) {
      await this.configPromise;
    }
  }

  private getHeaders(): HttpHeaders {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    };
    
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('API Key is empty when creating headers');
      throw new Error('API Key is not configured. Check config.json and docker-compose.yml');
    }
    
    // Add API Key header - using exact header name as expected by backend
    headers['X-API-Key'] = this.apiKey.trim();
    
    const httpHeaders = new HttpHeaders(headers);
    return httpHeaders;
  }

  private getHeadersFormData(): HttpHeaders {
    const headers: { [key: string]: string } = {};
    
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.error('API Key is empty when creating FormData headers');
      throw new Error('API Key is not configured. Check config.json and docker-compose.yml');
    }
    
    // Add API Key header - using exact header name as expected by backend
    headers['X-API-Key'] = this.apiKey.trim();
    
    const httpHeaders = new HttpHeaders(headers);
    return httpHeaders;
  }

  // Helper method to ensure config is loaded before making requests
  private makeRequest<T>(requestFn: () => Observable<T>): Observable<T> {
    return from(this.ensureConfigLoaded()).pipe(
      switchMap(() => {
        if (!this.apiKey || this.apiKey.trim() === '') {
          console.error('API Key is empty when making request');
          throw new Error('API Key is not configured');
        }
        return requestFn();
      })
    );
  }

  // Users
  createUser(user: any): Observable<any> {
    return this.makeRequest(() => 
      this.http.post(`${this.apiUrl}/users/`, user, { headers: this.getHeaders() })
    );
  }

  authenticateUser(credentials: any): Observable<any> {
    return this.makeRequest(() => 
      this.http.post(`${this.apiUrl}/users/authenticate`, credentials, { headers: this.getHeaders() })
    );
  }

  getUser(userId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/users/${userId}`, { headers: this.getHeaders() })
    );
  }

  getUserProfile(userId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/users/${userId}/profile`, { headers: this.getHeaders() })
    );
  }

  getGlobalRanking(limit: number = 100): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/users/ranking/global?limit=${limit}`, { headers: this.getHeaders() })
    );
  }

  // POIs
  createPOI(formData: FormData): Observable<any> {
    // El backend espera los parámetros como query parameters, no en el FormData body
    // Extraer los parámetros del FormData y construir la URL
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const author_id = formData.get('author_id') as string;
    const tags = formData.get('tags') as string | null;
    
    // Crear nuevo FormData solo con la imagen
    const imageFormData = new FormData();
    const imageFile = formData.get('image') as File;
    imageFormData.append('image', imageFile);
    
    // Construir URL con query parameters
    let url = `${this.apiUrl}/pois/?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&latitude=${latitude}&longitude=${longitude}&author_id=${encodeURIComponent(author_id)}`;
    if (tags) {
      url += `&tags=${encodeURIComponent(tags)}`;
    }
    
    return this.makeRequest(() => 
      this.http.post(url, imageFormData, { headers: this.getHeadersFormData() })
    );
  }

  getPOIs(skip: number = 0, limit: number = 100, tags?: string): Observable<any> {
    return this.makeRequest(() => {
      let url = `${this.apiUrl}/pois/?skip=${skip}&limit=${limit}`;
      if (tags) {
        url += `&tags=${tags}`;
      }
      return this.http.get(url, { headers: this.getHeaders() });
    });
  }

  getPOI(poiId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/pois/${poiId}`, { headers: this.getHeaders() })
    );
  }

  updatePOI(poiId: string, data: any): Observable<any> {
    return this.makeRequest(() => 
      this.http.put(`${this.apiUrl}/pois/${poiId}`, data, { headers: this.getHeaders() })
    );
  }

  deletePOI(poiId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.delete(`${this.apiUrl}/pois/${poiId}`, { headers: this.getHeaders() })
    );
  }

  // Photos
  createPhoto(formData: FormData): Observable<any> {
    // El backend espera poi_id, author_id y description como query parameters
    const poi_id = formData.get('poi_id') as string;
    const author_id = formData.get('author_id') as string;
    const description = formData.get('description') as string || '';
    
    // Crear nuevo FormData solo con la imagen
    const imageFormData = new FormData();
    const imageFile = formData.get('image') as File;
    if (imageFile) {
      imageFormData.append('image', imageFile);
    }
    
    // Construir URL con query parameters (poi_id es requerido como query param, no en el body)
    let url = `${this.apiUrl}/photos/?poi_id=${encodeURIComponent(poi_id)}&author_id=${encodeURIComponent(author_id)}`;
    if (description && description.trim()) {
      url += `&description=${encodeURIComponent(description)}`;
    }
    
    return this.makeRequest(() => 
      this.http.post(url, imageFormData, { headers: this.getHeadersFormData() })
    );
  }

  getPhotosByPOI(poiId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/photos/poi/${poiId}`, { headers: this.getHeaders() })
    );
  }

  getPhoto(photoId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/photos/${photoId}`, { headers: this.getHeaders() })
    );
  }

  deletePhoto(photoId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.delete(`${this.apiUrl}/photos/${photoId}`, { headers: this.getHeaders() })
    );
  }

  // Ratings
  createRating(rating: any): Observable<any> {
    // Validar todos los campos
    if (!rating.user_id || !rating.target_id || !rating.target_type) {
      console.error('Datos de valoración incompletos');
      throw new Error('Datos de valoración incompletos');
    }
    
    const scoreNum = Number(rating.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      console.error('Score inválido');
      throw new Error('Score debe ser un número entre 0 y 10');
    }
    
    const ratingData = {
      user_id: String(rating.user_id).trim(),
      score: scoreNum,
      target_type: String(rating.target_type).trim(),
      target_id: String(rating.target_id).trim()
    };
    
    return this.makeRequest(() => 
      this.http.post(`${this.apiUrl}/ratings/`, ratingData, { headers: this.getHeaders() })
    );
  }

  getRating(ratingId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.get(`${this.apiUrl}/ratings/${ratingId}`, { headers: this.getHeaders() })
    );
  }

  deleteRating(ratingId: string): Observable<any> {
    return this.makeRequest(() => 
      this.http.delete(`${this.apiUrl}/ratings/${ratingId}`, { headers: this.getHeaders() })
    );
  }
}
