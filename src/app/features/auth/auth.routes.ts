import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const authRoutes: Routes = [
  {
    path: 'auth/signin',
    loadComponent: () => import('./signin/signin.component').then(m => m.SigninComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./signup/signup.component').then(m => m.SignupComponent),
    canActivate: [guestGuard]
  }
];