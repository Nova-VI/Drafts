import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, TemplateRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { ArticlesStore } from '../../data/articles.store';
import { AuthService } from '../../../../core/services/auth.service';
import type { Article } from '../../../../core/models/article.model';

export type SortMode = 'top' | 'newest';

@Component({
  selector: 'drafts-comment-thread',
  standalone: true,
  imports: [CommonModule, RouterModule, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css'
})
export class CommentThreadComponent {
  readonly store = inject(ArticlesStore);
  readonly authService = inject(AuthService);

  // Inputs
  readonly comment = input.required<Article>();
  readonly depth = input<number>(0);
  readonly replyingToId = input<string | null>(null);
  readonly visibleRepliesMap = input<Map<string, number>>(new Map());
  readonly replyFormTemplate = input<TemplateRef<any> | null>(null);
  readonly sortMode = input<SortMode>('top');

  // Outputs
  readonly onDelete = output<string>();
  readonly onStartReply = output<string>();
  readonly onOpenLightbox = output<string>();
  readonly onLoadMoreReplies = output<string>();

  // Computed: visible replies count for this comment
  private readonly visibleCount = computed(() => {
    return this.visibleRepliesMap().get(this.comment().id) ?? 2;
  });

  // Sort replies based on sortMode
  private readonly sortedReplies = computed(() => {
    const replies = [...this.comment().comments];
    const mode = this.sortMode();
    
    if (mode === 'top') {
      // Sort by score (upvotes - downvotes), then by date
      replies.sort((a, b) => {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        
        // If scores are equal, sort by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Sort by date only (newest first)
      replies.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    return replies;
  });

  // Computed: get visible replies (sorted and sliced)
  readonly visibleReplies = computed(() => {
    const sorted = this.sortedReplies();
    const count = this.visibleCount();
    return sorted.slice(0, count);
  });

  // Computed: check if there are more replies
  readonly hasMoreReplies = computed(() => {
    return this.comment().comments.length > this.visibleCount();
  });

  // Computed: remaining replies count
  readonly remainingRepliesCount = computed(() => {
    return this.comment().comments.length - this.visibleCount();
  });
}
