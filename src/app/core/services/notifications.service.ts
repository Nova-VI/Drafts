import { Injectable, computed, effect, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API, WS_BASE_URL } from '../api/api.endpoints';
import type { Notification } from '../models/notification.model';
import { AuthService } from './auth.service';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private readonly items = signal<Notification[]>([]);
  private readonly isLoading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);

  private socket: Socket | null = null;
  private loadedOnce = false;

  readonly notifications = this.items.asReadonly();
  readonly isLoading$ = this.isLoading.asReadonly();
  readonly error$ = this.error.asReadonly();
  readonly unreadCount = computed(() =>
    this.items().filter((n) => !n.isRead).length
  );

  constructor() {
    if (this.isBrowser) {
      effect(() => {
        const authed = this.authService.isAuthenticated();
        if (authed) {
          this.connectSocket();
          if (!this.loadedOnce) {
            this.load();
          }
        } else {
          this.disconnectSocket();
          this.loadedOnce = false;
          this.items.set([]);
          this.error.set(null);
        }
      });
    }
  }

  load(): void {
    if (!this.isBrowser) return;
    this.isLoading.set(true);

    this.http.get<Notification[]>(API.notifications.mine).subscribe({
      next: (notifications) => {
        this.items.set(notifications ?? []);
        this.isLoading.set(false);
        this.error.set(null);
        this.loadedOnce = true;
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.error.set(err.error?.message || 'Failed to load notifications');
        this.isLoading.set(false);
      },
    });
  }

  markAsRead(ids: string[]): void {
    if (!ids || ids.length === 0) return;

    const previous = this.items();
    this.items.update((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
    );

    this.http.patch(API.notifications.markAsRead, { ids }).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to mark notifications as read:', err);
        this.items.set(previous);
      },
    });
  }

  markAllRead(): void {
    const unreadIds = this.items()
      .filter((n) => !n.isRead)
      .map((n) => n.id);
    this.markAsRead(unreadIds);
  }

  remove(id: string): void {
    const previous = this.items();
    this.items.update((list) => list.filter((n) => n.id !== id));

    this.http.delete(API.notifications.delete(id)).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to delete notification:', err);
        this.items.set(previous);
      },
    });
  }

  private connectSocket(): void {
    if (!this.isBrowser) return;
    const token = this.authService.getToken();
    if (!token) return;

    if (this.socket) {
      return;
    }

    this.socket = io(WS_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('notification', (payload: Notification) => {
      this.handleIncoming(payload);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });
  }

  private disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleIncoming(notification: Notification): void {
    const existing = this.items().find((n) => n.id === notification.id);
    if (existing) return;

    this.items.update((list) => [notification, ...list]);
  }
}
