import { Injectable, signal, computed, PLATFORM_ID, inject as angularInject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { API } from '../api/api.endpoints';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = angularInject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal<boolean>(false);
  
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  
  readonly isAuthenticated = computed(() => 
    !!this.currentUser() && !!this.getToken()
  );
  
  readonly userName = computed(() => 
    this.currentUser()?.username ?? 'Guest'
  );

  constructor() {
    // Defer stored auth check so it doesn't run during DI construction phase.
    // Running it synchronously can cause a circular dependency because
    // `checkStoredAuth` performs an HTTP request which triggers the
    // HTTP interceptors that may inject this service again.
    Promise.resolve().then(() => this.checkStoredAuth());
  }

  login(credentials: LoginRequest): Observable<User> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<AuthResponse>(API.auth.login, credentials).pipe(
      tap(response => {
        if (this.isBrowser) {
          // Some backends return 'Authorization' with the 'Bearer ' prefix.
          // Normalize and store only the raw token value.
          const raw = response.Authorization ?? '';
          const token = raw.replace(/^Bearer\s+/i, '');
          localStorage.setItem('token', token);
        }
      }),
      switchMap(() => this.http.get<User>(API.users.me)),
      tap(user => {
        this.currentUserSignal.set(user);
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterRequest): Observable<User> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<AuthResponse>(API.auth.register, data).pipe(
      tap(response => {
        if (this.isBrowser) {
          const raw = response.Authorization ?? '';
          const token = raw.replace(/^Bearer\s+/i, '');
          localStorage.setItem('token', token);
        }
      }),
      switchMap(() => this.http.get<User>(API.users.me)),
      tap(user => {
        this.currentUserSignal.set(user);
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/signin']);
  }

  updateUser(user: User): void {
    this.currentUserSignal.set(user);
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('token');
    }
    return null;
  }
  isTokenValid(token: string): boolean {
  if (!token) return false;

  try {
    // JWT has 3 parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp) {
      const expiration = payload.exp * 1000; // exp is in seconds
      const now = Date.now();
      
      if (now >= expiration) {
        console.warn('Token expired');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Invalid token format:', error);
    return false;
  }
}
  private checkStoredAuth(): void {
    if (!this.isBrowser) {
      return;
    }
    
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    console.log('[checkStoredAuth] Token exists:', !!token);
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSignal.set(user);
        console.log('[checkStoredAuth] User loaded from storage:', user.username);
      } catch (error) {
        console.error('[checkStoredAuth] Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
    
    if (token) {
      // Verify token is still valid by fetching fresh user data
      this.http.get<User>(API.users.me).subscribe({
        next: user => {
          console.log('[checkStoredAuth] Success - user refreshed:', user.username);
          this.currentUserSignal.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        },
        error: (err) => {
          console.error('[checkStoredAuth] ERROR - clearing token:', err.status);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.currentUserSignal.set(null);
        }
      });
    }
  }
}