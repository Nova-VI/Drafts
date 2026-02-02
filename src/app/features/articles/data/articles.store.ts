import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap, map, catchError } from 'rxjs/operators';
import { of, lastValueFrom } from 'rxjs';
import type { Article } from '../../../core/models/article.model';
import type { Vote, Voter } from '../../../core/models/voter.model';
import type { User } from '../../../core/models/user.model';
import { API } from '../../../core/api/api.endpoints';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

type BackendUser = { id: string; username?: string; email?: string };
type BackendImage = { path?: string; filename?: string; createdAt?: string | Date };
type BackendArticle = {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  author?: BackendUser;
  parentId?: string | null;
  depth?: number;
  comments?: BackendArticle[];
  commentsCount?: number;
  images?: Array<BackendImage | string>;
  upvoters?: BackendUser[];
  downvoters?: BackendUser[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type VoteResponse = {
  upvoted?: boolean;
  downvoted?: boolean;
  upvoteCount: number;
  downvoteCount: number;
};

@Injectable({ providedIn: 'root' })
export class ArticlesStore {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private readonly isLoading = signal<boolean>(true);
  private readonly error = signal<string | null>(null);
  private readonly items = signal<Article[]>([]);
  private readonly userCache = new Map<string, string>();

  private voteStorageKey(userId: string): string {
    return `drafts.articleVotes.${userId}`;
  }

  private readVoteMap(userId: string): Record<string, Vote> {
    try {
      const raw = globalThis?.localStorage?.getItem(this.voteStorageKey(userId));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, Vote>;
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed;
    } catch {
      return {};
    }
  }

  private writeVoteMap(userId: string, map: Record<string, Vote>): void {
    try {
      globalThis?.localStorage?.setItem(this.voteStorageKey(userId), JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  private getPersistedVote(articleId: string): Vote {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return 'null';
    const map = this.readVoteMap(userId);
    return map[articleId] ?? 'null';
  }

  private setPersistedVote(articleId: string, vote: Vote): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    const map = this.readVoteMap(userId);
    if (vote === 'null') {
      delete map[articleId];
    } else {
      map[articleId] = vote;
    }
    this.writeVoteMap(userId, map);
  }

  private applyPersistedVoteState(article: Article): Article {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return article;

    const persisted = this.getPersistedVote(article.id);
    if (persisted === 'null') return article;

    const votersWithoutMe = (article.voters ?? []).filter((v) => v.voterId !== userId);
    votersWithoutMe.push({ voterId: userId, vote: persisted === 'upvote' ? 'upvote' : 'downvote' });
    return { ...article, voters: votersWithoutMe };
  }

  readonly articles = this.items.asReadonly();
  readonly isLoading$ = this.isLoading.asReadonly();
  readonly error$ = this.error.asReadonly();

  constructor() {
    this.loadArticles();
  }

  private mergeWithExisting(fresh: Article): Article {
    const existing = this.getById(fresh.id);
    if (!existing) return fresh;

    return {
      ...fresh,
      comments: fresh.comments.length > 0 ? fresh.comments : existing.comments,
      commentsCount: typeof fresh.commentsCount === 'number' ? fresh.commentsCount : existing.commentsCount,
      images: (fresh.images ?? []).length > 0 ? fresh.images : existing.images,
      voters: existing.voters,
      upvotes: existing.upvotes,
      downvotes: existing.downvotes,
    };
  }

  private refreshVoteCounts(articleIds: string[]): void {
    const uniqueIds = Array.from(new Set(articleIds.filter(Boolean)));
    uniqueIds.forEach((id) => {
      this.http.get<{ upvoteCount: number; downvoteCount: number }>(API.articles.votes(id))
        .pipe(
          catchError(() => of(null)),
        )
        .subscribe((counts) => {
          if (!counts) return;
          this.items.update((list) =>
            this.updateTree(list, id, (a) => ({
              ...a,
              upvotes: counts.upvoteCount,
              downvotes: counts.downvoteCount,
            }))
          );
        });
    });
  }

  private loadArticles(): void {
    this.http.get<BackendArticle[]>(API.articles.listFull)
      .pipe(
        map((articles) => articles.map((a) => this.normalizeArticleImages(this.toFrontendArticle(a)))),
        map((articles) => articles.map((a) => this.mergeWithExisting(a))),
        map((articles) => articles.map((a) => this.applyPersistedVoteState(a))),
        tap((articles) => {
          this.items.set(articles);
          this.isLoading.set(false);
          this.error.set(null);

          // Backend list endpoint does not include vote relations; hydrate counts via /votes.
          this.refreshVoteCounts(articles.map((a) => a.id));
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

  /**
   * Load full article with nested comments (used by the detail page).
   * Backend endpoint supports ?depth=N (default 2).
   */
  loadArticleFull(id: string, depth: number = 5): void {
    if (!id) return;

    this.http.get<BackendArticle>(API.articles.byIdFull(id, depth)).pipe(
      map((a) => this.applyPersistedVoteState(this.normalizeArticleImages(this.toFrontendArticle(a)))),
      tap((article) => {
        this.items.update((list) => {
          const existing = this.getById(id);
          if (!existing) return [article, ...list];

          // Preserve local voter state and existing counts until we hydrate from /votes.
          return this.updateTree(list, id, (old) => ({
            ...article,
            voters: old.voters,
            upvotes: old.upvotes,
            downvotes: old.downvotes,
          }));
        });

        // Backend full endpoint includes images/comments but not root vote relations.
        this.refreshVoteCounts([id]);
      }),
    ).subscribe({
      error: (err) => console.error('Failed to load article details:', err),
    });
  }

  private toIso(value?: string | Date): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    return value.toISOString();
  }

  private toFrontendArticle(input: BackendArticle): Article {
    const ownerId = input.authorId ?? input.author?.id ?? 'unknown';
    const authorUsername = input.author?.username;
    if (ownerId && authorUsername) {
      this.userCache.set(ownerId, authorUsername);
    }

    const upvoters = Array.isArray(input.upvoters) ? input.upvoters : [];
    const downvoters = Array.isArray(input.downvoters) ? input.downvoters : [];

    const voters: Voter[] = [
      ...upvoters.map((u) => ({ voterId: u.id, vote: 'upvote' as const })),
      ...downvoters.map((u) => ({ voterId: u.id, vote: 'downvote' as const })),
    ];

    const images = (input.images ?? [])
      .map((img) => this.toFrontendImagePath(img))
      .filter((p) => !!p);

    const comments = (input.comments ?? []).map((c) => this.toFrontendArticle(c));

    const commentsCount = typeof input.commentsCount === 'number'
      ? input.commentsCount
      : comments.length;

    return {
      id: input.id,
      fatherId: input.parentId ?? null,
      title: input.title,
      content: input.content,
      images,
      owner: ownerId,
      ownerUsername: authorUsername ?? this.userCache.get(ownerId) ?? ownerId,
      comments,
      commentsCount,
      upvotes: upvoters.length,
      downvotes: downvoters.length,
      voters,
      slug: null,
      createdAt: this.toIso(input.createdAt),
      updatedAt: this.toIso(input.updatedAt),
    };
  }

  private toFrontendImagePath(img: BackendImage | string): string {
    if (!img) return '';
    if (typeof img === 'string') return img;

    const rawPath = (img.path ?? '').trim();
    const filename = (img.filename ?? rawPath.split('/').pop() ?? '').trim();

    // If backend already provides dated paths, keep them.
    if (/uploads\/images\/\d{4}\/\d{2}\/\d{2}\//.test(rawPath) || /uploads\/images\/\d{4}\/\d{2}\/\d{2}\//.test(rawPath.replace(/\\/g, '/'))) {
      return rawPath;
    }

    // Backend stores files under uploads/images/YYYY/MM/DD but DB path is often missing the date segments.
    if (filename && img.createdAt) {
      const date = new Date(typeof img.createdAt === 'string' ? img.createdAt : img.createdAt.toISOString());
      if (!Number.isNaN(date.getTime())) {
        const yyyy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `uploads/images/${yyyy}/${mm}/${dd}/${filename}`;
      }
    }

    return rawPath || filename;
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

  // Username fetching is no longer needed: backend returns `author` for articles/comments.

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
    this.http.post<VoteResponse>(API.articles.upvote(articleId), {})
      .subscribe({
        next: (response) => {
          const upvoted = response.upvoted === true;
          this.setPersistedVote(articleId, upvoted ? 'upvote' : 'null');

          this.items.update((list) =>
            this.updateTree(list, articleId, (a) => {
              const votersWithoutMe = a.voters.filter((v) => v.voterId !== currentUserId);
              const voters = upvoted
                ? [...votersWithoutMe, { voterId: currentUserId, vote: 'upvote' as const }]
                : votersWithoutMe;

              return {
                ...a,
                voters,
                upvotes: response.upvoteCount,
                downvotes: response.downvoteCount,
              };
            })
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
    this.http.post<VoteResponse>(API.articles.downvote(articleId), {})
      .subscribe({
        next: (response) => {
          const downvoted = response.downvoted === true;
          this.setPersistedVote(articleId, downvoted ? 'downvote' : 'null');

          this.items.update((list) =>
            this.updateTree(list, articleId, (a) => {
              const votersWithoutMe = a.voters.filter((v) => v.voterId !== currentUserId);
              const voters = downvoted
                ? [...votersWithoutMe, { voterId: currentUserId, vote: 'downvote' as const }]
                : votersWithoutMe;

              return {
                ...a,
                voters,
                upvotes: response.upvoteCount,
                downvotes: response.downvoteCount,
              };
            })
          );
        },
        error: (err) => {
          console.error('Failed to downvote:', err);
          // Revert on error
          this.items.set(previousState);
        }
      });
  }

  async addArticle(input: { title: string; content: string; images?: File[] }): Promise<string> {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      throw new Error('Must be logged in to create articles');
    }

    const created = await lastValueFrom(
      this.http.post<BackendArticle>(API.articles.create, {
        title: input.title.trim(),
        content: input.content.trim(),
      }),
    );

    const createdArticle = this.normalizeArticleImages(this.toFrontendArticle(created));

    // Ensure the UI has a username immediately even if backend didn't include `author`
    const ownerUsername = currentUser.username ?? currentUser.id;
    this.userCache.set(currentUser.id, ownerUsername);

    this.items.update((list) => [
      { ...createdArticle, owner: currentUser.id, ownerUsername },
      ...list,
    ]);

    if (input.images && input.images.length > 0) {
      await this.uploadImages(createdArticle.id, input.images);
      this.loadArticleFull(createdArticle.id, 5);
    }

    return createdArticle.id;
  }

  private async uploadImages(articleId: string, files: File[]): Promise<void> {
    if (!files.length) return;
    const formData = new FormData();
    formData.append('articleId', articleId);
    files.forEach((f) => formData.append('files', f));
    await lastValueFrom(this.http.post(API.images.uploadMultiple, formData));
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

  addReply(parentId: string, content: string, images: File[] = []): Promise<string | null> {
    const text = content.trim();
    if (!text) return Promise.resolve(null);

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      console.error('Must be logged in to add comments');
      return Promise.resolve(null);
    }

    // Generate a title for the comment (first 50 chars or "Comment")
    const title = text.substring(0, 50) + (text.length > 50 ? '...' : '');

    return lastValueFrom(
      this.http.post<BackendArticle>(API.articles.createComment, {
        title,
        content: text,
        parentId,
      })
        .pipe(
          map((reply) => {
            const normalized = this.normalizeArticleImages(this.toFrontendArticle(reply));

            // Ensure username for the new reply (backend may not return author relation here)
            const currentUsername = this.authService.currentUser()?.username || currentUser.id;
            this.userCache.set(currentUser.id, currentUsername);
            const withUsername: Article = {
              ...normalized,
              owner: currentUser.id,
              ownerUsername: currentUsername,
            };

            this.items.update((list) =>
              this.updateTree(list, parentId, (a) => ({
                ...a,
                comments: [...a.comments, withUsername],
                updatedAt: new Date().toISOString(),
              }))
            );

            return withUsername.id;
          }),
          tap(async (replyId) => {
            if (replyId && images.length > 0) {
              try {
                await this.uploadImages(replyId, images);
                // Refresh parent tree so images show up
                this.loadArticleFull(this.findRootArticleId(parentId) ?? parentId, 5);
              } catch (e) {
                console.error('Failed to upload comment images:', e);
              }
            }
          }),
          catchError((err) => {
            console.error('Failed to add reply:', err);
            return of(null);
          })
        )
    );
  }

  private findRootArticleId(anyId: string): string | null {
    const findInTree = (list: Article[], targetId: string, currentRootId: string | null): string | null => {
      for (const a of list) {
        const rootId = currentRootId ?? a.id;
        if (a.id === targetId) return rootId;
        if (a.comments.length) {
          const found = findInTree(a.comments, targetId, rootId);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTree(this.items(), anyId, null);
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

    // Optimistic delete - use removeFromTree to find and remove at any depth
    this.items.update((list) => this.removeFromTree(list, commentId));

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
    const payload: { title?: string; content?: string } = {};
    if (updates.title) payload.title = updates.title;
    if (updates.content) payload.content = updates.content;

    this.http.patch<BackendArticle>(API.articles.update(articleId), payload)
      .pipe(map((updated) => this.normalizeArticleImages(this.toFrontendArticle(updated))))
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
