import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { of, throwError, lastValueFrom } from 'rxjs';
import type { Article } from '../../../shared/models/article.model';
import type { Vote, Voter } from '../../../shared/models/voter.model';
import type { User } from '../../../core/models/user.model';
import { API } from '../../../core/api/api.endpoints';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ArticlesStore {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly isLoading = signal<boolean>(true);
  private readonly error = signal<string | null>(null);
  private readonly items = signal<Article[]>([]);
  private readonly userCache = new Map<string, string>();

  readonly articles = this.items.asReadonly();
  readonly isLoading$ = this.isLoading.asReadonly();
  readonly error$ = this.error.asReadonly();

  constructor() {
    this.loadArticles();
  }

  private loadArticles(): void {
    this.http.get<Article[]>(API.articles.listFull)
      .pipe(
        switchMap((articles) => {
          // Normalize images first
          const normalized = articles.map((a) => this.normalizeArticleImages(a));
          // Then fetch all usernames
          return this.normalizeUsernames(normalized).then(result => result);
        }),
        tap((articles) => {
          this.items.set(articles);
          this.isLoading.set(false);
          this.error.set(null);
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Failed to load articles:', err);
          this.error.set(err.error?.message || 'Failed to load articles');
          this.isLoading.set(false);
        }
      });
  }

  private normalizeImageUrl(url: string): string {
    if (!url) return url;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed;

    // Some backends may return raw base64 without the data: prefix (e.g. starts with iVBOR... for PNG or /9j/ for JPEG)
    const isBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed.replace(/\s+/g, ''));
    if (isBase64 && trimmed.length > 100) {
      // Heuristics for PNG / JPEG signatures
      if (trimmed.startsWith('iVBOR')) return `data:image/png;base64,${trimmed}`;
      if (trimmed.startsWith('/9j/')) return `data:image/jpeg;base64,${trimmed}`;
      // default to PNG if unknown
      return `data:image/png;base64,${trimmed}`;
    }

    // If backend returned an absolute path (starting with /) or a filename, prefix API base
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    if (trimmed.startsWith('/')) return `${base}${trimmed}`;
    return `${base}/${trimmed}`;
  }

  private normalizeArticleImages(article: Article): Article {
    const images = (article.images ?? []).map(img => this.normalizeImageUrl(img));
    const comments = (article.comments ?? []).map((c) => this.normalizeArticleImages(c));
    return { ...article, images, comments };
  }

  private async normalizeUsernames(articles: Article[]): Promise<Article[]> {
    // Collect all unique user IDs
    const userIds = new Set<string>();
    const collectUserIds = (article: Article) => {
      userIds.add(article.owner);
      if (article.comments) {
        article.comments.forEach(collectUserIds);
      }
    };
    articles.forEach(collectUserIds);

    // Fetch usernames for all unique IDs
    const idsToFetch = Array.from(userIds).filter(id => !this.userCache.has(id));
    
    if (idsToFetch.length > 0) {
      await Promise.all(
        idsToFetch.map(id =>
          lastValueFrom(
            this.http.get<User>(API.users.byId(id)).pipe(
              tap(user => {
                this.userCache.set(id, user.username || id);
              }),
              catchError(() => {
                this.userCache.set(id, id);
                return of(null);
              })
            )
          )
        )
      );
    }

    // Apply cached usernames to articles
    return articles.map(a => this.applyUsernames(a));
  }

  private applyUsernames(article: Article): Article {
    const ownerUsername = this.userCache.get(article.owner) || article.owner;
    const comments = (article.comments ?? []).map(c => this.applyUsernames(c));
    return { ...article, ownerUsername, comments };
  }

  getById(id: string): Article | undefined {
    const search = (items: Article[]): Article | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.comments.length > 0) {
          const found = search(item.comments);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.items());
  }

  private updateTree(list: Article[], targetId: string, update: (a: Article) => Article): Article[] {
    let changed = false;
    const next: Article[] = [];

    for (const a of list) {
      let updated = a;

      if (a.id === targetId) {
        updated = update(a);
      } else if (a.comments.length > 0) {
        const updatedChildren = this.updateTree(a.comments, targetId, update);
        if (updatedChildren !== a.comments) {
          updated = { ...a, comments: updatedChildren };
        }
      }

      if (updated !== a) changed = true;
      next.push(updated);
    }

    return changed ? next : list;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private removeFromTree(list: Article[], targetId: string): Article[] {
    let changed = false;
    const next: Article[] = [];

    for (const a of list) {
      if (a.id === targetId) {
        changed = true;
        continue;
      }

      let updated = a;
      if (a.comments.length > 0) {
        const updatedChildren = this.removeFromTree(a.comments, targetId);
        if (updatedChildren !== a.comments) {
          updated = { ...a, comments: updatedChildren };
        }
      }

      if (updated !== a) changed = true;
      next.push(updated);
    }

    return changed ? next : list;
  }

  private newId(prefix: string): string {
    try {
      const uuid = globalThis?.crypto?.randomUUID?.();
      if (uuid) return `${prefix}-${uuid}`;
    } catch {
      // ignore
    }
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
  }

  private currentUserLabel(): string {
    try {
      return globalThis?.localStorage?.getItem('username') ?? 'you';
    } catch {
      return 'you';
    }
  }

  private currentVoterId(): string {
    try {
      return globalThis?.localStorage?.getItem('userId') ?? 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  private myVoteOn(article: Article): Vote {
    const me = this.currentVoterId();
    const record = article.voters.find((v) => v.voterId === me);
    return record?.vote ?? 'null';
  }

  isUpvoted(article: Article): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    return article.voters.find(v => v.voterId === currentUserId)?.vote === 'upvote';
  }

  isDownvoted(article: Article): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    return article.voters.find(v => v.voterId === currentUserId)?.vote === 'downvote';
  }

  canEdit(article: Article): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    return !!currentUserId && article.owner === currentUserId;
  }

  canDelete(article: Article): boolean {
    return this.canEdit(article);
  }

  upvote(articleId: string) {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return;

    const previousState = this.items();
    
    // Optimistic update
    this.items.update((list) =>
      this.updateTree(list, articleId, (a) => {
        const voters: Voter[] = a.voters.filter((v) => v.voterId !== currentUserId);
        const prev = a.voters.find((v) => v.voterId === currentUserId)?.vote ?? 'null';

        if (prev === 'upvote') {
          return {
            ...a,
            upvotes: Math.max(0, a.upvotes - 1),
            voters,
          };
        }

        voters.push({ voterId: currentUserId, vote: 'upvote' });
        return {
          ...a,
          upvotes: a.upvotes + 1,
          downvotes: prev === 'downvote' ? Math.max(0, a.downvotes - 1) : a.downvotes,
          voters,
        };
      })
    );

    // Send to server
    this.http.post<any>(API.articles.upvote(articleId), {})
      .subscribe({
        next: (response) => {
          // Update with server response
          this.items.update((list) =>
            this.updateTree(list, articleId, (a) => ({
              ...a,
              upvotes: response.upvotes,
              downvotes: response.downvotes,
              voters: response.voters,
            }))
          );
        },
        error: (err) => {
          console.error('Failed to upvote:', err);
          // Revert on error
          this.items.set(previousState);
        }
      });
  }

  downvote(articleId: string) {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return;

    const previousState = this.items();
    
    // Optimistic update
    this.items.update((list) =>
      this.updateTree(list, articleId, (a) => {
        const voters: Voter[] = a.voters.filter((v) => v.voterId !== currentUserId);
        const prev = a.voters.find((v) => v.voterId === currentUserId)?.vote ?? 'null';

        if (prev === 'downvote') {
          return {
            ...a,
            downvotes: Math.max(0, a.downvotes - 1),
            voters,
          };
        }

        voters.push({ voterId: currentUserId, vote: 'downvote' });
        return {
          ...a,
          downvotes: a.downvotes + 1,
          upvotes: prev === 'upvote' ? Math.max(0, a.upvotes - 1) : a.upvotes,
          voters,
        };
      })
    );

    // Send to server
    this.http.post<any>(API.articles.downvote(articleId), {})
      .subscribe({
        next: (response) => {
          // Update with server response
          this.items.update((list) =>
            this.updateTree(list, articleId, (a) => ({
              ...a,
              upvotes: response.upvotes,
              downvotes: response.downvotes,
              voters: response.voters,
            }))
          );
        },
        error: (err) => {
          console.error('Failed to downvote:', err);
          // Revert on error
          this.items.set(previousState);
        }
      });
  }

  addArticle(input: { title: string; content: string; images?: File[]; slug?: string | null }): Promise<string> {
    const formData = new FormData();
    formData.append('title', input.title.trim());
    formData.append('content', input.content.trim());
    if (input.slug) {
      formData.append('slug', input.slug);
    }
    if (input.images && input.images.length > 0) {
      input.images.forEach(img => {
        formData.append('images', img);
      });
    }

    return new Promise((resolve, reject) => {
      this.http.post<{ id: string }>(API.articles.create, formData)
        .subscribe({
          next: (response) => {
            this.loadArticles();
            resolve(response.id);
          },
          error: (err) => {
            console.error('Failed to create article:', err);
            reject(err);
          }
        });
    });
  }

  deleteArticle(articleId: string): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) {
      console.error('Must be logged in to delete articles');
      return false;
    }

    const article = this.getById(articleId);
    if (!article) {
      console.error('Article not found');
      return false;
    }

    if (article.owner !== currentUserId) {
      console.error('You can only delete your own articles');
      return false;
    }

    const previousState = this.items();

    // Optimistic delete
    this.items.update((list) => this.removeFromTree(list, articleId));

    this.http.delete<any>(API.articles.delete(articleId))
      .subscribe({
        next: () => {
          console.log('Article deleted successfully');
        },
        error: (err) => {
          console.error('Failed to delete article:', err);
          // Revert on error
          this.items.set(previousState);
        }
      });

    return true;
  }

  addReply(parentId: string, content: string, images: File[] = []) {
    const text = content.trim();
    if (!text) return;

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      console.error('Must be logged in to add comments');
      return;
    }

    // Generate a title for the comment (first 50 chars or "Comment")
    const title = text.substring(0, 50) + (text.length > 50 ? '...' : '');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', text);
    formData.append('fatherId', parentId);
    
    if (images && images.length > 0) {
      images.forEach(img => {
        formData.append('images', img);
      });
    }

    this.http.post<Article>(API.articles.create, formData)
      .subscribe({
        next: (reply) => {
          const normalized = this.normalizeArticleImages(reply);
          // Apply username for the new reply
          const currentUsername = this.authService.currentUser()?.username || currentUser.id;
          this.userCache.set(currentUser.id, currentUsername);
          const withUsername = this.applyUsernames(normalized);
          
          this.items.update((list) =>
            this.updateTree(list, parentId, (a) => ({
              ...a,
              comments: [...a.comments, withUsername],
              updatedAt: new Date().toISOString(),
            }))
          );
        },
        error: (err) => {
          console.error('Failed to add reply:', err);
          if (err.status === 401) {
            console.error('Unauthorized: Please log in to comment');
          }
        }
      });
  }

  deleteComment(commentId: string, parentId: string): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) {
      console.error('Must be logged in to delete comments');
      return false;
    }

    const comment = this.getById(commentId);
    if (!comment) {
      console.error('Comment not found');
      return false;
    }

    if (comment.owner !== currentUserId) {
      console.error('You can only delete your own comments');
      return false;
    }

    const previousState = this.items();

    // Optimistic delete
    this.items.update((list) =>
      this.updateTree(list, parentId, (parent) => ({
        ...parent,
        comments: parent.comments.filter(c => c.id !== commentId),
        updatedAt: new Date().toISOString(),
      }))
    );

    this.http.delete<any>(API.articles.delete(commentId))
      .subscribe({
        next: () => {
          console.log('Comment deleted successfully');
        },
        error: (err) => {
          console.error('Failed to delete comment:', err);
          // Revert on error
          this.items.set(previousState);
        }
      });

    return true;
  }

  private updateArticle(articleId: string, updates: Partial<Article>) {
    const formData = new FormData();
    if (updates.title) {
      formData.append('title', updates.title);
    }
    if (updates.content) {
      formData.append('content', updates.content);
    }
    if (updates.slug) {
      formData.append('slug', updates.slug);
    }

    this.http.patch<Article>(API.articles.update(articleId), formData)
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            this.updateTree(list, articleId, () => updated)
          );
        },
        error: (err) => console.error('Failed to update article:', err)
      });
  }

}
