import { Routes } from '@angular/router';

import { authRoutes } from './features/auth/auth.routes';
import { articlesRoutes } from './features/articles/articles.routes';
import { searchRoutes } from './features/search/search.routes';
import { notificationsRoutes } from './features/notifications/notifications.routes';

export const routes: Routes = [
	...authRoutes,
	...articlesRoutes,
	...searchRoutes,
	...notificationsRoutes,
];
