import { ChangeDetectionStrategy, Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { Article } from '../../../../core/models/article.model';
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
  // dropdown state for quick-date selector
  readonly relativeOptions = [
    { value: '', label: 'All dates' },
    { value: 'last_hour', label: 'Last hour' },
    { value: 'today', label: 'Today' },
    { value: 'last_24h', label: 'Last 24 hours' },
    { value: 'last_week', label: 'Last week' },
    { value: 'last_month', label: 'Last month' },
  ];
  readonly relativeOpen = signal(false);
  readonly selectedRelative = signal('All dates');

  private _docClickHandler = (e: Event) => {
    try {
      const root = document.querySelector('.relative-dropdown');
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      this.relativeOpen.set(false);
    } catch {
      /* ignore */
    }
  };
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
        // Parse since date (accepts YYYY-MM-DD from <input type="date" or any ISO)
        let sinceDate: Date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(f.since)) {
          // ensure start of day local time
          sinceDate = new Date(f.since + 'T00:00:00');
        } else {
          sinceDate = new Date(f.since);
        }

        // Parse article createdAt which may be ISO string or epoch millis string/number
        let artDate: Date;
        const ca = a.createdAt;
        if (typeof ca === 'number' || (/^\d+$/.test(String(ca)))) {
          artDate = new Date(Number(ca));
        } else {
          artDate = new Date(String(ca));
        }

        if (isNaN(artDate.getTime()) || isNaN(sinceDate.getTime()) || artDate.getTime() < sinceDate.getTime()) return false;
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
    // start from existing filters so we don't wipe manual inputs
    const existing = this.filters();
    // regex supports quoted values e.g. author:"John Doe" (since tokens removed)
    const tokenRe = /(author|owner):(\"[^\"]+\"|'[^']+'|[^\s]+)/gi;
    const filters = { text: raw, author: existing.author || '', since: existing.since || '' };
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
    }

    // remaining text is raw minus consumed tokens
    let text = raw;
    for (const c of consumed) text = text.replace(c, '');
    filters.text = text.trim();

    this.filters.set({ ...existing, ...filters });
    // debug
    // eslint-disable-next-line no-console
    console.log('Search setQuery parsed filters (merged):', { ...existing, ...filters });
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

  setSinceRelative(range: string) {
    if (!range) {
      this.setSince('');
      return;
    }
    const now = new Date();
    let sinceDate: Date | null = null;
    switch (range) {
      case 'last_hour':
        sinceDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'today':
        sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last_24h':
        sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_week':
        sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_month':
        sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        sinceDate = null;
    }

    if (!sinceDate) return this.setSince('');

    // For 'today' keep date-only (start of day). For other relative ranges
    // keep the full ISO timestamp so time-based comparisons (like last hour)
    // work correctly.
    let value: string;
    if (range === 'today') {
      value = sinceDate.toISOString().slice(0, 10);
    } else {
      value = sinceDate.toISOString();
    }
    this.setSince(value);
    // eslint-disable-next-line no-console
    console.log('Search setSinceRelative:', range, value);
    const opt = this.relativeOptions.find(o => o.value === range);
    this.selectedRelative.set(opt ? opt.label : 'All dates');
  }

  toggleRelativeOpen() {
    this.relativeOpen.update(v => !v);
  }

  ngOnDestroy(): void {
    try { document.removeEventListener('click', this._docClickHandler, { capture: true } as any); } catch {}
  }
}
