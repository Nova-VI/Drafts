import { Routes } from '@angular/router';
import { profileRoutes } from './features/profile/profile.routes';
import { authRoutes } from './features/auth/auth.routes';
import { articlesRoutes } from './features/articles/articles.routes';
import { searchRoutes } from './features/search/search.routes';
import { notificationsRoutes } from './features/notifications/notifications.routes';

export const routes: Routes = [
	{ path: '', redirectTo: '/articles', pathMatch: 'full' },
	...authRoutes,
	...profileRoutes,
	...articlesRoutes,
	...searchRoutes,
	...notificationsRoutes,
];
