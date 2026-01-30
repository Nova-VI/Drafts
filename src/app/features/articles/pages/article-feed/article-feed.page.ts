import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { Article } from '../../../../shared/models/article.model';
import { ArticlesStore } from '../../data/articles.store';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'drafts-article-feed-page',
  imports: [CommonModule, RouterModule, RelativeTimePipe],
  templateUrl: './article-feed.page.html',
  styleUrl: './article-feed.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFeedPage {
  readonly store = inject(ArticlesStore);
  readonly authService = inject(AuthService);

  readonly query = signal('');

  readonly articles = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.store.articles();
    if (!q) return all;

    return all.filter((a) => {
      const haystack = `${a.title} ${a.content} ${a.owner} ${a.slug ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  excerptOf(article: Article): string {
    const text = (article.content ?? '').replace(/\s+/g, ' ').trim();
    if (text.length <= 140) return text;
    return `${text.slice(0, 140)}…`;
  }

  readingMinutesOf(article: Article): number {
    const text = (article.content ?? '').trim();
    if (!text) return 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  setQuery(value: string) {
    this.query.set(value);
  }
}
