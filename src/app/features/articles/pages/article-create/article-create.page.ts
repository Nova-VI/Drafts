import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ArticlesStore } from '../../data/articles.store';

@Component({
  selector: 'drafts-article-create-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './article-create.page.html',
  styleUrl: './article-create.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleCreatePage {
  private readonly store = inject(ArticlesStore);
  private readonly router = inject(Router);

  readonly title = signal('');
  readonly content = signal('');
  readonly attemptedSubmit = signal(false);
  readonly submitting = signal(false);

  readonly titleTrimmedLen = computed(() => this.title().trim().length);
  readonly contentTrimmedLen = computed(() => this.content().trim().length);

  readonly titleError = computed(() => {
    if (!this.attemptedSubmit()) return '';
    if (this.titleTrimmedLen() < 3) return 'Title must be at least 3 characters.';
    if (this.titleTrimmedLen() > 120) return 'Title must be 120 characters or less.';
    return '';
  });

  readonly contentError = computed(() => {
    if (!this.attemptedSubmit()) return '';
    if (this.contentTrimmedLen() < 10) return 'Content must be at least 10 characters.';
    if (this.contentTrimmedLen() > 10_000) return 'Content must be 10,000 characters or less.';
    return '';
  });

  readonly canSubmit = computed(() => {
    return (
      this.titleTrimmedLen() >= 3 &&
      this.titleTrimmedLen() <= 120 &&
      this.contentTrimmedLen() >= 10 &&
      this.contentTrimmedLen() <= 10_000
    );
  });

  submit() {
    this.attemptedSubmit.set(true);
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);

    const id = this.store.addArticle({
      title: this.title().trim(),
      content: this.content().trim(),
    });

    this.router.navigate(['/articles', id]);
  }
}
