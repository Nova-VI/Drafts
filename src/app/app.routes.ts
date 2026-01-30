import { Routes } from '@angular/router';
import { profileRoutes } from './features/profile/profile.routes';
import { authRoutes } from './features/auth/auth.routes';
import { articlesRoutes } from './features/articles/articles.routes';
// search routes removed
import { notificationsRoutes } from './features/notifications/notifications.routes';

export const routes: Routes = [
	{ path: '', redirectTo: '/articles', pathMatch: 'full' },
	...authRoutes,
	...profileRoutes,
	...articlesRoutes,
	// search routes removed
	...notificationsRoutes,
];
