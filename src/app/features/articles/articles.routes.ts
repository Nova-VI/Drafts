import { Routes } from '@angular/router';

export const articlesRoutes: Routes = [
	{
		path: 'articles',
		loadComponent: () =>
			import('./pages/article-feed/article-feed.page').then((m) => m.ArticleFeedPage),
	},
];
