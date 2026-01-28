import { Routes } from '@angular/router';

export const authRoutes: Routes = [
 {
    path: 'auth/signin',
    loadComponent: () => import('./signin/signin.component').then(m => m.SigninComponent)
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./signup/signup.component').then(m => m.SignupComponent)
  }

];
