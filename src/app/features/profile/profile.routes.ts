import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () => 
      import('./profile/profile.component').then(m => m.ProfileComponent)
  }
];