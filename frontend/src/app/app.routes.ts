import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/map',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'map',
    loadComponent: () => import('./components/map/map.component').then(m => m.MapComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pois',
    loadComponent: () => import('./components/poi-list/poi-list.component').then(m => m.PoiListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'poi/:id',
    loadComponent: () => import('./components/poi-detail/poi-detail.component').then(m => m.PoiDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ranking',
    loadComponent: () => import('./components/ranking/ranking.component').then(m => m.RankingComponent),
    canActivate: [authGuard]
  }
];

