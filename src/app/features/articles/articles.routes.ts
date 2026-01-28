import { Routes } from '@angular/router';

export const articlesRoutes: Routes = [
	{
		path: 'articles',
		children: [
			{
				path: '',
				pathMatch: 'full',
				loadComponent: () =>
					import('./pages/article-feed/article-feed.page').then((m) => m.ArticleFeedPage),
			},
			{
				path: ':id',
				loadComponent: () =>
					import('./pages/article-detail/article-detail.page').then((m) => m.ArticleDetailPage),
			},
		],
	},
];
