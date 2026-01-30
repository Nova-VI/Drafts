import { Injectable } from '@angular/core';

export interface SearchResult {
  id: string;
  title: string;
  excerpt?: string;
  author?: string;
  date?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  // Minimal in-memory mock data. Replace with real backend calls.
  private items: SearchResult[] = Array.from({ length: 18 }).map((_, i) => ({
    id: String(i + 1),
    title: `Example result ${i + 1}`,
    excerpt: `This is a short excerpt for example result ${i + 1}.`,
    author: i % 3 === 0 ? 'Nora' : i % 3 === 1 ? 'Alex' : 'Sam',
    date: new Date(Date.now() - i * 86400000).toISOString(),
    tags: i % 2 === 0 ? ['angular', 'frontend'] : ['drafts', 'example']
  }));

  async search(q: string, filters?: { author?: string; tags?: string[]; since?: string; fields?: string[] }) {
    const term = (q || '').trim();

    // Prefer backend search when available
    try {
      if (term) {
        // call article search endpoint (title search). Backend may return Article[]; adapt to SearchResult.
        const url = API.articles.search(encodeURIComponent(term));
        const resp = await firstValueFrom(this.http.get<any[]>(url));
        let results: SearchResult[] = (resp || []).map(r => ({
          id: r.id || r._id || String(r.id),
          title: r.title || r.name || '',
          excerpt: r.excerpt || r.summary || r.content?.slice?.(0, 200) || '',
          author: r.author?.name || r.author || r.owner || undefined,
          date: r.date || r.createdAt || r.publishedAt || undefined,
          tags: r.tags || []
        }));

        // Apply client-side filters for fields/tags/author/since
        const fields = filters?.fields && filters.fields.length ? filters.fields : ['title', 'excerpt', 'author', 'tags'];
        if (term) {
          const qLower = term.toLowerCase();
          results = results.filter(it => fields.some(f => {
            if (f === 'title') return (it.title || '').toLowerCase().includes(qLower);
            if (f === 'excerpt') return (it.excerpt || '').toLowerCase().includes(qLower);
            if (f === 'author') return (it.author || '').toLowerCase().includes(qLower);
            if (f === 'tags') return (it.tags || []).some(t => t.toLowerCase().includes(qLower));
            return false;
          }));
        }

        if (filters?.author) {
          results = results.filter(r => r.author === filters.author);
        }
        if (filters?.tags && filters.tags.length) {
          results = results.filter(r => (r.tags || []).some(t => filters.tags!.includes(t)));
        }
        const since = filters?.since;
        if (since) results = results.filter(r => new Date(r.date || 0) >= new Date(since));

        return { total: results.length, items: results };
      }
      // if no term, return paginated/filtered items from backend if endpoint available
      // fallback to in-memory
      await this.delay(80);
      let results = this.items.slice();
      if (filters?.author) results = results.filter(r => r.author === filters.author);
      if (filters?.tags && filters.tags.length) results = results.filter(r => (r.tags || []).some(t => filters.tags!.includes(t)));
      const since = filters?.since;
      if (since) results = results.filter(r => new Date(r.date || 0) >= new Date(since));
      return { total: results.length, items: results };
    } catch (err) {
      // on error, fall back to in-memory search
      await this.delay(120);
      const qLower = (q || '').toLowerCase().trim();
      const fields = filters?.fields && filters.fields.length ? filters.fields : ['title', 'excerpt', 'author', 'tags'];

      let results = this.items.filter(it => {
        if (!qLower) return true;
        return fields.some(f => {
          if (f === 'title') return (it.title || '').toLowerCase().includes(qLower);
          if (f === 'excerpt') return (it.excerpt || '').toLowerCase().includes(qLower);
          if (f === 'author') return (it.author || '').toLowerCase().includes(qLower);
          if (f === 'tags') return (it.tags || []).some(t => t.toLowerCase().includes(qLower));
          return false;
        });
      });

      if (filters?.author) results = results.filter(r => r.author === filters.author);
      if (filters?.tags && filters.tags.length) results = results.filter(r => (r.tags || []).some(t => filters.tags!.includes(t)));
      const since = filters?.since;
      if (since) results = results.filter(r => new Date(r.date || 0) >= new Date(since));
      return { total: results.length, items: results };
    }
  }

    let results = this.items.filter(it => {
      if (!qLower) return true;
      return fields.some(f => {
        if (f === 'title') return (it.title || '').toLowerCase().includes(qLower);
        if (f === 'excerpt') return (it.excerpt || '').toLowerCase().includes(qLower);
        if (f === 'author') return (it.author || '').toLowerCase().includes(qLower);
        if (f === 'tags') return (it.tags || []).some(t => t.toLowerCase().includes(qLower));
        return false;
      });
    });
    if (filters?.author) {
      results = results.filter(r => r.author === filters.author);
    }
    if (filters?.tags && filters.tags.length) {
      results = results.filter(r => (r.tags || []).some(t => filters.tags!.includes(t)));
    }
    const since = filters?.since;
    if (since) results = results.filter(r => new Date(r.date || 0) >= new Date(since));
    return { total: results.length, items: results };
  }

  async suggestions(prefix: string) {
    await this.delay(80);
    if (!prefix) return [];
    const p = prefix.toLowerCase();
    const titles = this.items.map(i => i.title).filter(t => t.toLowerCase().includes(p));
    return Array.from(new Set(titles)).slice(0, 6);
  }

  private delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
}
