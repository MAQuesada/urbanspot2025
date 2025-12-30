export interface Rating {
  id: string;
  user_id: string;
  score: number;
  target_type: 'poi' | 'photo';
  target_id: string;
  created_at: string;
}

export interface RatingCreate {
  user_id: string;
  score: number;
  target_type: 'poi' | 'photo';
  target_id: string;
}

