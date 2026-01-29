import { Injectable, signal, computed, PLATFORM_ID, inject as angularInject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
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
    this.checkStoredAuth();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<AuthResponse>(API.auth.login, credentials).pipe(
      tap(response => {
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
        }
        this.currentUserSignal.set(response.user);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    
    return this.http.post<AuthResponse>(API.auth.register, data).pipe(
      tap(response => {
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
        }
        this.currentUserSignal.set(response.user);
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
  console.log('[checkStoredAuth] Token exists:', !!token);
  
  if (token) {
    // Interceptor automatically adds Authorization header
    this.http.get<User>(API.users.me).subscribe({
      next: user => {
        console.log('[checkStoredAuth] Success - user loaded:', user.username);
        this.currentUserSignal.set(user);
      },
      error: (err) => {
        console.error('[checkStoredAuth] ERROR - clearing token:', err.status);
        localStorage.removeItem('token');
        this.currentUserSignal.set(null);
      }
    });
  }
}
}