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

  private checkStoredAuth(): void {
    if (!this.isBrowser) {
      return;
    }
    
    const token = localStorage.getItem('token');
    
    if (token) {
      this.http.get<User>(API.users.me, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: user => this.currentUserSignal.set(user),
        error: () => {
          localStorage.removeItem('token');
          this.currentUserSignal.set(null);
        }
      });
    }
  }
}