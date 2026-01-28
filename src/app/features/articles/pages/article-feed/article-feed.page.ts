import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Article } from '../../../../shared/models/article.model';
import type { Vote, Voter } from '../../../../shared/models/voter.model';

@Component({
  selector: 'drafts-article-feed-page',
  imports: [CommonModule],
  templateUrl: './article-feed.page.html',
  styleUrl: './article-feed.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleFeedPage {
  private readonly seed = signal<Article[]>([
    {
      id: 'a1',
      fatherId: null,
      title: 'Drafts: a modern blog platform',
      content:
        'A clean Angular 21+ frontend rebuilt from scratch with signals and modern control flow. This is dummy data but uses the same Article shape as last year\'s project.',
      images: [],
      owner: 'demo-user',
      comments: [],
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

  readonly query = signal('');

  readonly articles = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.seed();

    return this.seed().filter((a) => {
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

  private currentVoterId(): string {
    return localStorage.getItem('userId') ?? 'anonymous';
  }

  private myVoteOn(article: Article): Vote {
    const me = this.currentVoterId();
    const record = article.voters.find((v) => v.voterId === me);
    return record?.vote ?? 'null';
  }

  upvote(articleId: string) {
    this.seed.update((list) =>
      list.map((a) => {
        if (a.id !== articleId) return a;

        const me = this.currentVoterId();
        const prev = this.myVoteOn(a);
        const voters: Voter[] = a.voters.filter((v) => v.voterId !== me);

        // Toggle logic: null -> upvote, upvote -> null, downvote -> upvote
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
    this.seed.update((list) =>
      list.map((a) => {
        if (a.id !== articleId) return a;

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

  isUpvoted(article: Article): boolean {
    return this.myVoteOn(article) === 'upvote';
  }

  isDownvoted(article: Article): boolean {
    return this.myVoteOn(article) === 'downvote';
  }
}
