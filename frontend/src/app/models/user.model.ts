export interface User {
  id: string;
  name: string;
  email: string;
  poi_score: number;
  photo_score: number;
  total_score: number;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  poi_score: number;
  photo_score: number;
  total_score: number;
  poi_count: number;
  photo_count: number;
  rating_count: number;
}

