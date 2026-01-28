import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
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

  private readonly id = toSignal(this.route.paramMap.pipe(map((pm) => pm.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly article = computed(() => {
    const id = this.id();
    if (!id) return undefined;
    return this.store.getById(id);
  });
}
