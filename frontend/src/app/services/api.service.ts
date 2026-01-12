import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // CONFIGURATION EN DUR (Hardcoded)
  // Plus besoin de charger config.json, on met les valeurs directement ici.
  private apiUrl: string = 'https://urbanspot2025.vercel.app';
  private apiKey: string = 'some-secret-key-1203092ejrfmwps;dklnmc';

  constructor(private http: HttpClient) {
    // Le constructeur est vide, plus de chargement asynchrone complexe !
    console.log('ApiService initialized with API URL:', this.apiUrl);
  }

  // Helper pour les headers JSON
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    });
  }

  // Helper pour les headers FormData (upload d'images)
  private getHeadersFormData(): HttpHeaders {
    return new HttpHeaders({
      'X-API-Key': this.apiKey
    });
    // Note: On ne met pas Content-Type ici, le navigateur le mettra automatiquement avec le boundary
  }

  // --- USERS ---

  createUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/`, user, { headers: this.getHeaders() });
  }

  authenticateUser(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/authenticate`, credentials, { headers: this.getHeaders() });
  }

  getUser(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`, { headers: this.getHeaders() });
  }

  getUserProfile(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/profile`, { headers: this.getHeaders() });
  }

  getGlobalRanking(limit: number = 100): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/ranking/global?limit=${limit}`, { headers: this.getHeaders() });
  }

  // --- POIs ---

  createPOI(formData: FormData): Observable<any> {
    // Le backend attend les infos en query params
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const author_id = formData.get('author_id') as string;
    const tags = formData.get('tags') as string | null;
    
    // On prépare l'image seule
    const imageFormData = new FormData();
    const imageFile = formData.get('image') as File;
    imageFormData.append('image', imageFile);
    
    // Construction de l'URL
    let url = `${this.apiUrl}/pois/?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&latitude=${latitude}&longitude=${longitude}&author_id=${encodeURIComponent(author_id)}`;
    if (tags) {
      url += `&tags=${encodeURIComponent(tags)}`;
    }
    
    return this.http.post(url, imageFormData, { headers: this.getHeadersFormData() });
  }

  getPOIs(skip: number = 0, limit: number = 100, tags?: string): Observable<any> {
    let url = `${this.apiUrl}/pois/?skip=${skip}&limit=${limit}`;
    if (tags) {
      url += `&tags=${tags}`;
    }
    return this.http.get(url, { headers: this.getHeaders() });
  }

  getPOI(poiId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/pois/${poiId}`, { headers: this.getHeaders() });
  }

  updatePOI(poiId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/pois/${poiId}`, data, { headers: this.getHeaders() });
  }

  deletePOI(poiId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pois/${poiId}`, { headers: this.getHeaders() });
  }

  // --- PHOTOS ---

  createPhoto(formData: FormData): Observable<any> {
    const poi_id = formData.get('poi_id') as string;
    const author_id = formData.get('author_id') as string;
    const description = formData.get('description') as string || '';
    
    const imageFormData = new FormData();
    const imageFile = formData.get('image') as File;
    if (imageFile) {
      imageFormData.append('image', imageFile);
    }
    
    let url = `${this.apiUrl}/photos/?poi_id=${encodeURIComponent(poi_id)}&author_id=${encodeURIComponent(author_id)}`;
    if (description && description.trim()) {
      url += `&description=${encodeURIComponent(description)}`;
    }
    
    return this.http.post(url, imageFormData, { headers: this.getHeadersFormData() });
  }

  getPhotosByPOI(poiId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/photos/poi/${poiId}`, { headers: this.getHeaders() });
  }

  getPhoto(photoId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/photos/${photoId}`, { headers: this.getHeaders() });
  }

  deletePhoto(photoId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/photos/${photoId}`, { headers: this.getHeaders() });
  }

  // --- RATINGS ---

  createRating(rating: any): Observable<any> {
    const scoreNum = Number(rating.score);
    const ratingData = {
      user_id: String(rating.user_id).trim(),
      score: scoreNum,
      target_type: String(rating.target_type).trim(),
      target_id: String(rating.target_id).trim()
    };
    
    return this.http.post(`${this.apiUrl}/ratings/`, ratingData, { headers: this.getHeaders() });
  }

  getRating(ratingId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/ratings/${ratingId}`, { headers: this.getHeaders() });
  }

  deleteRating(ratingId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ratings/${ratingId}`, { headers: this.getHeaders() });
  }
}