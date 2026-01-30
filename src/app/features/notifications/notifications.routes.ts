import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const notificationsRoutes: Routes = [
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications.page').then((m) => m.NotificationsPage),
    canActivate: [authGuard],
  },
];
