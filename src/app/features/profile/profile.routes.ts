import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const profileRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () => 
      import('./profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile/:username',
    loadComponent: () => 
      import('./profile/profile.component').then(m => m.ProfileComponent)
  }
];