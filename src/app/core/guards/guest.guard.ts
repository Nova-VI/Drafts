import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[GuestGuard] Running...', {
    isAuthenticated: authService.isAuthenticated(),
    hasToken: !!authService.getToken(),
    currentUser: authService.currentUser()
  });

  // Check if user is NOT authenticated
  if (!authService.isAuthenticated()) {
    console.log('[GuestGuard] User NOT authenticated - allowing access');
    return true; // Allow access (user is guest)
  }

  // User is already logged in - redirect to articles
  console.log('[GuestGuard] User IS authenticated - redirecting to /articles');
  router.navigate(['/articles']);
  return false; // Block access to auth pages
};