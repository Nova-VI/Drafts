import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Network Error: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            authService.logout();
            errorMessage = 'Session expired. Please sign in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to access this resource.';
            router.navigate(['/articles']);
            break;
          case 404:
            errorMessage = error.error?.message || 'Resource not found.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          case 0:
            errorMessage = 'Cannot connect to server. Please check your connection.';
            break;
          default:
            errorMessage = error.error?.message || `HTTP Error: ${error.status}`;
        }
      }

      console.error('[Error Interceptor]', errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
};