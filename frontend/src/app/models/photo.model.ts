export interface Photo {
  id: string;
  poi_id: string;
  image_url: string;
  description?: string;
  author_id: string;
  rating_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface PhotoDetail extends Photo {
  author_name?: string;
  poi_name?: string;
}

