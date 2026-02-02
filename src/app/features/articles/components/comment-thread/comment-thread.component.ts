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
  template: `
    <article class="comment" [class.reply]="depth() > 0" role="listitem">
      <div class="commentHeader">
        <div class="commentMeta">
          <a [routerLink]="['/profile', comment().ownerUsername]" class="author authorLink">{{ comment().ownerUsername }}</a>
          <span class="dot">•</span>
          <time class="date">{{ comment().createdAt | relativeTime }}</time>
        </div>
        @if (store.canDelete(comment())) {
          <button
            type="button"
            class="btn iconBtn miniBtn"
            (click)="onDelete.emit(comment().id)"
            aria-label="Delete comment"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3h6M3 6h18M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 4v6m4-6v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        }
      </div>

      <p class="commentBody">{{ comment().content }}</p>

      @if (comment().images && comment().images.length > 0) {
        <div class="commentImagesGallery">
          @for (image of comment().images; track image) {
            <div class="commentImageTile" (click)="onOpenLightbox.emit(image)" [style.--bg-image]="'url(' + image + ')'">
              <img [src]="image" [alt]="comment().title" class="commentImage" />
            </div>
          }
        </div>
      }

      <div class="commentActions" aria-label="Comment actions">
        <button
          type="button"
          class="btn voteBtn miniBtn"
          [class.active]="store.isUpvoted(comment())"
          (click)="store.upvote(comment().id)"
          [disabled]="!authService.isAuthenticated()"
          aria-label="Like comment"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 11V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M6 11h4l5.4-6.3c.6-.7 1.7-.2 1.6.7l-.7 5.6H20a2 2 0 0 1 2 2.2l-1.1 7A2 2 0 0 1 18.9 22H10a4 4 0 0 1-4-4v-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="label"><span class="count">{{ comment().upvotes }}</span></span>
        </button>

        <button
          type="button"
          class="btn voteBtn miniBtn"
          [class.activeDown]="store.isDownvoted(comment())"
          (click)="store.downvote(comment().id)"
          [disabled]="!authService.isAuthenticated()"
          aria-label="Dislike comment"
        >
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 13V4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M18 13h-4L8.6 19.3c-.6.7-1.7.2-1.6-.7l.7-5.6H4a2 2 0 0 1-2-2.2l1.1-7A2 2 0 0 1 5.1 2H14a4 4 0 0 1 4 4v7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="label"><span class="count">{{ comment().downvotes }}</span></span>
        </button>

        @if (authService.isAuthenticated()) {
          <button
            type="button"
            class="btn voteBtn miniBtn"
            (click)="onStartReply.emit(comment().id)"
            aria-label="Reply"
          >
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-2.5l-4.5 4.5V19H9a6 6 0 0 1-6-6V9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
            </span>
            <span class="label"><span class="count">{{ comment().comments.length }}</span></span>
          </button>
        }
      </div>

      <!-- Reply form when this comment is being replied to -->
      @if (replyingToId() === comment().id && replyFormTemplate()) {
        <ng-container *ngTemplateOutlet="replyFormTemplate()!; context: { $implicit: comment().id }"></ng-container>
      }

      <!-- Nested replies - recursive rendering -->
      @if (comment().comments.length > 0) {
        <div class="replies">
          @for (reply of visibleReplies(); track reply.id) {
            <drafts-comment-thread
              [comment]="reply"
              [depth]="depth() + 1"
              [replyingToId]="replyingToId()"
              [visibleRepliesMap]="visibleRepliesMap()"
              [replyFormTemplate]="replyFormTemplate()"
              [sortMode]="sortMode()"
              (onDelete)="onDelete.emit($event)"
              (onStartReply)="onStartReply.emit($event)"
              (onOpenLightbox)="onOpenLightbox.emit($event)"
              (onLoadMoreReplies)="onLoadMoreReplies.emit($event)"
            />
          }
          
          @if (hasMoreReplies()) {
            <button 
              type="button" 
              class="btn loadMoreBtn" 
              (click)="onLoadMoreReplies.emit(comment().id)"
            >
              Load more replies ({{ remainingRepliesCount() }} remaining)
            </button>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    .comment {
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-sm);
      padding: 12px;
    }

    .reply {
      background: rgba(255, 255, 255, 0.02);
    }

    .commentHeader {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .commentMeta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .author {
      font-weight: 600;
      color: var(--text);
    }

    .authorLink {
      text-decoration: none;
    }

    .authorLink:hover {
      text-decoration: underline;
    }

    .dot {
      color: var(--muted);
    }

    .date {
      color: var(--muted);
    }

    .commentBody {
      margin: 0;
      color: var(--text);
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .commentImagesGallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }

    .commentImageTile {
      width: 100%;
      border-radius: 4px;
      border: 1px solid var(--border);
      cursor: zoom-in;
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
    }

    .commentImageTile::before {
      content: '';
      position: absolute;
      inset: -16px;
      background-image: var(--bg-image);
      background-size: cover;
      background-position: center;
      filter: blur(16px);
      transform: scale(1.1);
      opacity: 0.7;
    }

    .commentImage {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
      position: relative;
      z-index: 1;
    }

    .commentActions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      background: var(--surface);
      transform: translateY(-1px);
    }

    .iconBtn {
      padding: 8px;
      min-width: 36px;
    }

    .miniBtn {
      padding: 7px 10px;
      min-height: 34px;
      font-size: 12.5px;
    }

    .voteBtn {
      padding: 8px 10px;
      min-height: 36px;
      font-size: 13px;
      color: var(--muted);
    }

    .voteBtn.active {
      border-color: color-mix(in oklab, var(--brand-2) 45%, var(--border));
      background: color-mix(in oklab, var(--brand-2) 18%, transparent);
      color: var(--text);
    }

    .voteBtn.activeDown {
      border-color: color-mix(in oklab, var(--brand) 45%, var(--border));
      background: color-mix(in oklab, var(--brand) 18%, transparent);
      color: var(--text);
    }

    .voteBtn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .voteBtn:disabled:hover {
      transform: none;
      background: transparent;
    }

    .icon {
      display: inline-flex;
      width: 18px;
      height: 18px;
    }

    .icon svg {
      width: 18px;
      height: 18px;
    }

    .label {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      font-variant-numeric: tabular-nums;
      color: inherit;
    }

    .count {
      font-weight: 750;
    }

    .replies {
      margin-top: 12px;
      padding-left: 14px;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .loadMoreBtn {
      margin-top: 8px;
      width: 100%;
      padding: 10px 16px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .loadMoreBtn:hover {
      background: var(--surface);
      border-color: var(--brand);
    }
  `]
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
