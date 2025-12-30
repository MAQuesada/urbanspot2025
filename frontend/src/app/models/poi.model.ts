export interface POI {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  tags: string[];
  image_url: string;
  author_id: string;
  rating_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface POIDetail extends POI {
  author_name?: string;
  photo_count: number;
}

export interface POICreate {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  tags: string[];
  image_url: string;
  author_id: string;
}

