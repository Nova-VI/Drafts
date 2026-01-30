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
  readonly filters = signal({ text: '', author: '', since: '' });

  readonly articles = computed(() => {
    const f = this.filters();
    const all = this.store.articles();
    // no filters -> return all
    if (!f.text && !f.author && !f.since) return all;

    const q = (f.text || '').trim().toLowerCase();

    return all.filter((a) => {
      // author filter (matches ownerUsername or owner fields)
      if (f.author) {
        const author = String(a.ownerUsername ?? a.owner ?? '').toLowerCase();
        if (!author.includes(f.author.toLowerCase())) return false;
      }

      // since filter (ISO date prefix) - article.createdAt should be comparable
      if (f.since) {
        const artDate = new Date(a.createdAt);
        const sinceDate = new Date(f.since);
        if (isNaN(artDate.getTime()) || isNaN(sinceDate.getTime()) || artDate < sinceDate) return false;
      }

      // full-text filter across title/content/slug
      if (q) {
        const haystack = `${a.title} ${a.content} ${a.ownerUsername ?? a.owner} ${a.slug ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
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
    // parse simple filter tokens from the input (author:, since:YYYY-MM-DD)
    const raw = value || '';
    // regex supports quoted values e.g. author:"John Doe"
    const tokenRe = /(author|owner|since):(\"[^\"]+\"|'[^']+'|[^\s]+)/gi;
    const filters = { text: raw, author: '', since: '' };
    let m: RegExpExecArray | null;
    const consumed: string[] = [];
    while ((m = tokenRe.exec(raw))) {
      const key = m[1].toLowerCase();
      let val = m[2];
      if (!val) continue;
      // strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      consumed.push(m[0]);
      if (key === 'author' || key === 'owner') filters.author = val;
      if (key === 'since') filters.since = val;
    }

    // remaining text is raw minus consumed tokens
    let text = raw;
    for (const c of consumed) text = text.replace(c, '');
    filters.text = text.trim();

    this.filters.set(filters);
    // debug
    // eslint-disable-next-line no-console
    console.log('Search setQuery parsed filters:', filters);
  }

  setAuthor(value: string) {
    const f = this.filters();
    this.filters.set({ ...f, author: value.trim() });
    // eslint-disable-next-line no-console
    console.log('Search setAuthor:', value);
  }

  setSince(value: string) {
    const f = this.filters();
    this.filters.set({ ...f, since: value.trim() });
    // eslint-disable-next-line no-console
    console.log('Search setSince:', value);
  }
}
