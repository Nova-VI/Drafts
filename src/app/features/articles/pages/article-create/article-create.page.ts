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

  readonly canSubmit = computed(() => {
    return this.title().trim().length >= 3 && this.content().trim().length >= 10;
  });

  submit() {
    if (!this.canSubmit()) return;

    const id = this.store.addArticle({
      title: this.title().trim(),
      content: this.content().trim(),
    });

    this.router.navigate(['/articles', id]);
  }
}
