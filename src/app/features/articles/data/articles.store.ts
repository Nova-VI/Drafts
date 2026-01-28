import { Injectable, signal } from '@angular/core';
import type { Article } from '../../../shared/models/article.model';
import type { Vote, Voter } from '../../../shared/models/voter.model';

@Injectable({ providedIn: 'root' })
export class ArticlesStore {
  private readonly items = signal<Article[]>([
    {
      id: 'a1',
      fatherId: null,
      title: 'Drafts: a modern blog platform',
      content:
        "lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      images: [],
      owner: 'demo-user',
      comments: [
        {
          id: 'c1',
          fatherId: 'a1',
          title: '',
          content: 'It looks fine. Clean enough. None of it will matter.',
          images: [],
          owner: 'reader-1',
          comments: [],
          upvotes: 2,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:30:00.000Z',
          updatedAt: '2026-01-28T10:30:00.000Z',
        },
        {
          id: 'c2',
          fatherId: 'a1',
          title: '',
          content: 'Changing the API paths will eventually break something anyway.',
          images: [],
          owner: 'reader-2',
          comments: [],
          upvotes: 5,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:33:00.000Z',
          updatedAt: '2026-01-28T10:33:00.000Z',
        },
        {
          id: 'c3',
          fatherId: 'a1',
          title: '',
          content: 'Buttons above or below, the content stays the same and is forgotten.',
          images: [],
          owner: 'reader-3',
          comments: [],
          upvotes: 1,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:35:00.000Z',
          updatedAt: '2026-01-28T10:35:00.000Z',
        },
        {
          id: 'c4',
          fatherId: 'a1',
          title: '',
          content: 'Long text wraps. Meaning does not.',
          images: [],
          owner: 'reader-4',
          comments: [],
          upvotes: 0,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:37:00.000Z',
          updatedAt: '2026-01-28T10:37:00.000Z',
        },
        {
          id: 'c5',
          fatherId: 'a1',
          title: '',
          content: 'Small commits, big commits. The repository still decays.',
          images: [],
          owner: 'reader-5',
          comments: [],
          upvotes: 3,
          downvotes: 1,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:38:00.000Z',
          updatedAt: '2026-01-28T10:38:00.000Z',
        },
        {
          id: 'c6',
          fatherId: 'a1',
          title: '',
          content: 'More items. Same emptiness.',
          images: [],
          owner: 'reader-6',
          comments: [],
          upvotes: 0,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:39:00.000Z',
          updatedAt: '2026-01-28T10:39:00.000Z',
        },
        {
          id: 'c7',
          fatherId: 'a1',
          title: '',
          content: 'Scrolling reveals nothing new.',
          images: [],
          owner: 'reader-7',
          comments: [],
          upvotes: 1,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:40:00.000Z',
          updatedAt: '2026-01-28T10:40:00.000Z',
        },
        {
          id: 'c8',
          fatherId: 'a1',
          title: '',
          content: 'It will render on mobile. It will still be ignored.',
          images: [],
          owner: 'reader-8',
          comments: [],
          upvotes: 4,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:41:00.000Z',
          updatedAt: '2026-01-28T10:41:00.000Z',
        },
        {
          id: 'c9',
          fatherId: 'a1',
          title: '',
          content: 'State layers come and go. Complexity remains.',
          images: [],
          owner: 'reader-9',
          comments: [],
          upvotes: 2,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:42:00.000Z',
          updatedAt: '2026-01-28T10:42:00.000Z',
        },
        {
          id: 'c10',
          fatherId: 'a1',
          title: '',
          content: 'Endless scrolling toward nothing.',
          images: [],
          owner: 'reader-10',
          comments: [],
          upvotes: 0,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:43:00.000Z',
          updatedAt: '2026-01-28T10:43:00.000Z',
        },
        {
          id: 'c11',
          fatherId: 'a1',
          title: '',
          content: 'Another comment. Same void.',
          images: [],
          owner: 'reader-11',
          comments: [],
          upvotes: 1,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:44:00.000Z',
          updatedAt: '2026-01-28T10:44:00.000Z',
        },
        {
          id: 'c12',
          fatherId: 'a1',
          title: '',
          content: 'Compact, readable, ultimately irrelevant.',
          images: [],
          owner: 'reader-12',
          comments: [],
          upvotes: 0,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:45:00.000Z',
          updatedAt: '2026-01-28T10:45:00.000Z',
        },
        {
          id: 'c13',
          fatherId: 'a1',
          title: '',
          content: 'Almost there. There is nowhere to arrive.',
          images: [],
          owner: 'reader-13',
          comments: [],
          upvotes: 2,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:46:00.000Z',
          updatedAt: '2026-01-28T10:46:00.000Z',
        },
        {
          id: 'c14',
          fatherId: 'a1',
          title: '',
          content: 'Borders align. Purpose does not.',
          images: [],
          owner: 'reader-14',
          comments: [],
          upvotes: 0,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:47:00.000Z',
          updatedAt: '2026-01-28T10:47:00.000Z',
        },
        {
          id: 'c15',
          fatherId: 'a1',
          title: '',
          content: 'The final comment changes nothing.',
          images: [],
          owner: 'reader-15',
          comments: [],
          upvotes: 1,
          downvotes: 0,
          voters: [],
          slug: null,
          createdAt: '2026-01-28T10:48:00.000Z',
          updatedAt: '2026-01-28T10:48:00.000Z',
        },
      ],
      upvotes: 12,
      downvotes: 1,
      voters: [],
      slug: 'drafts-a-modern-blog-platform',
      createdAt: '2026-01-28T10:00:00.000Z',
      updatedAt: '2026-01-28T10:00:00.000Z',
    },
    {
      id: 'a2',
      fatherId: null,
      title: 'Design system first, features second',
      content:
        'How a small set of primitives helps three developers ship in parallel without conflicts. Build the layout and components first, then wire APIs.',
      images: [],
      owner: 'demo-user',
      comments: [],
      upvotes: 5,
      downvotes: 0,
      voters: [],
      slug: 'design-system-first-features-second',
      createdAt: '2026-01-27T16:20:00.000Z',
      updatedAt: '2026-01-27T16:20:00.000Z',
    },
    {
      id: 'a3',
      fatherId: null,
      title: 'API Endpoints',
      content:
        'API endpoints are served by a Node.js backend using Express. The database is Postgres, API routes are RESTful and secured with JWT tokens.',
      images: [],
      owner: 'backend-team',
      comments: [],
      upvotes: 9,
      downvotes: 2,
      voters: [],
      slug: 'api-endpoints',
      createdAt: '2026-01-26T09:15:00.000Z',
      updatedAt: '2026-01-26T09:15:00.000Z',
    },
  ]);

  readonly articles = this.items.asReadonly();

  getById(id: string): Article | undefined {
    return this.items().find((a) => a.id === id);
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
    return this.myVoteOn(article) === 'upvote';
  }

  isDownvoted(article: Article): boolean {
    return this.myVoteOn(article) === 'downvote';
  }

  upvote(articleId: string) {
    this.items.update((list) =>
      this.updateTree(list, articleId, (a) => {
        const me = this.currentVoterId();
        const prev = this.myVoteOn(a);
        const voters: Voter[] = a.voters.filter((v) => v.voterId !== me);

        if (prev === 'upvote') {
          return {
            ...a,
            upvotes: Math.max(0, a.upvotes - 1),
            voters,
          };
        }

        voters.push({ voterId: me, vote: 'upvote' });
        return {
          ...a,
          upvotes: a.upvotes + 1,
          downvotes: prev === 'downvote' ? Math.max(0, a.downvotes - 1) : a.downvotes,
          voters,
        };
      })
    );
  }

  downvote(articleId: string) {
    this.items.update((list) =>
      this.updateTree(list, articleId, (a) => {
        const me = this.currentVoterId();
        const prev = this.myVoteOn(a);
        const voters: Voter[] = a.voters.filter((v) => v.voterId !== me);

        if (prev === 'downvote') {
          return {
            ...a,
            downvotes: Math.max(0, a.downvotes - 1),
            voters,
          };
        }

        voters.push({ voterId: me, vote: 'downvote' });
        return {
          ...a,
          downvotes: a.downvotes + 1,
          upvotes: prev === 'upvote' ? Math.max(0, a.upvotes - 1) : a.upvotes,
          voters,
        };
      })
    );
  }

  addReply(parentId: string, content: string) {
    const text = content.trim();
    if (!text) return;

    const now = this.nowIso();
    const reply: Article = {
      id: this.newId('c'),
      fatherId: parentId,
      title: '',
      content: text,
      images: [],
      owner: this.currentUserLabel(),
      comments: [],
      upvotes: 0,
      downvotes: 0,
      voters: [],
      slug: null,
      createdAt: now,
      updatedAt: now,
    };

    this.items.update((list) =>
      this.updateTree(list, parentId, (a) => ({
        ...a,
        comments: [...a.comments, reply],
        updatedAt: now,
      }))
    );
  }
}
