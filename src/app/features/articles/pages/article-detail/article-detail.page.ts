import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { ArticlesStore } from '../../data/articles.store';

@Component({
  selector: 'drafts-article-detail-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './article-detail.page.html',
  styleUrl: './article-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetailPage {
  readonly store = inject(ArticlesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly newCommentText = signal('');
  readonly replyingTo = signal<string | null>(null);
  readonly replyText = signal('');

  private readonly id = toSignal(this.route.paramMap.pipe(map((pm) => pm.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly article = computed(() => {
    const id = this.id();
    if (!id) return undefined;
    return this.store.getById(id);
  });

  addRootComment() {
    const a = this.article();
    if (!a) return;
    const text = this.newCommentText().trim();
    if (!text) return;
    this.store.addReply(a.id, text);
    this.newCommentText.set('');
  }

  startReply(commentId: string) {
    this.replyingTo.set(commentId);
    this.replyText.set('');
  }

  cancelReply() {
    this.replyingTo.set(null);
    this.replyText.set('');
  }

  submitReply(parentId: string) {
    const text = this.replyText().trim();
    if (!text) return;
    this.store.addReply(parentId, text);
    this.cancelReply();
  }

  deleteThisArticle() {
    const a = this.article();
    if (!a) return;

    const confirmFn = (globalThis as any)?.confirm as ((message: string) => boolean) | undefined;
    if (confirmFn && !confirmFn('Delete this article?')) return;

    this.store.deleteArticle(a.id);
    this.router.navigate(['/articles']);
  }
}
