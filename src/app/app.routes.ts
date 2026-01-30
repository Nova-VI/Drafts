import { Routes } from '@angular/router';
import { profileRoutes } from './features/profile/profile.routes';
import { authRoutes } from './features/auth/auth.routes';
import { articlesRoutes } from './features/articles/articles.routes';
// search routes removed
import { notificationsRoutes } from './features/notifications/notifications.routes';

export const routes: Routes = [
	{ path: '', redirectTo: '/articles', pathMatch: 'full' },
	{
		path: 'about',
		loadComponent: () =>
			import('./features/static/pages/about/about.page').then((m) => m.AboutPage),
	},
	{
		path: 'privacy',
		loadComponent: () =>
			import('./features/static/pages/privacy/privacy.page').then((m) => m.PrivacyPage),
	},
	{
		path: 'contact',
		loadComponent: () =>
			import('./features/static/pages/contact/contact.page').then((m) => m.ContactPage),
	},
	...authRoutes,
	...profileRoutes,
	...articlesRoutes,
	// search routes removed
	...notificationsRoutes,
];
