import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const token = authService.getToken();
    
    // Validate token structure and expiration
    if (token && authService.isTokenValid(token)) {
      return true;
    } else {
      // Token invalid or expired
      authService.logout();
    }
  }

  // Not authenticated - redirect to signin
  router.navigate(['/auth/signin'], {
    queryParams: { returnUrl: state.url }
  });
  
  return false;
};