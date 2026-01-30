import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { ArticlesStore } from '../../data/articles.store';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component';
import { CommentThreadComponent } from '../../components/comment-thread/comment-thread.component';
import { AuthService } from '../../../../core/services/auth.service';
import type { Article } from '../../../../shared/models/article.model';

type SortMode = 'top' | 'newest';

@Component({
  selector: 'drafts-article-detail-page',
  imports: [CommonModule, RouterModule, RelativeTimePipe, ConfirmModalComponent, CommentThreadComponent],
  templateUrl: './article-detail.page.html',
  styleUrl: './article-detail.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleDetailPage implements AfterViewInit {
  readonly store = inject(ArticlesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly confirmModal = viewChild<ConfirmModalComponent>('confirmModal');
  @ViewChild('commentTextarea') commentTextarea?: ElementRef<HTMLTextAreaElement>;

  readonly newCommentText = signal('');
  readonly newCommentImages = signal<File[]>([]);
  readonly newCommentImagePreviews = signal<{ name: string; url: string }[]>([]);
  readonly replyingTo = signal<string | null>(null);
  readonly replyText = signal('');
  readonly replyImages = signal<File[]>([]);
  readonly replyImagePreviews = signal<{ name: string; url: string }[]>([]);
  
  // Pagination and sorting
  readonly sortMode = signal<SortMode>('top');
  readonly visibleCommentsCount = signal(10);
  readonly visibleRepliesCount = signal<Map<string, number>>(new Map());
  
  // Store sorted IDs only (not Article objects) to prevent stale data
  private readonly sortedCommentIds = signal<string[]>([]);
  private readonly sortedReplyIds = signal<Map<string, string[]>>(new Map());
  private lastSortedArticleId: string | null = null;
  private lastServerCommentCount = 0;
  
  // Track new comments added in current session (appear at top before sorting)
  private readonly newCommentIds = signal<Set<string>>(new Set());

  private readonly id = toSignal(this.route.paramMap.pipe(map((pm) => pm.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly article = computed(() => {
    const id = this.id();
    if (!id) return undefined;
    return this.store.getById(id);
  });

  constructor() {
    // Load full article (with nested comments) when navigating to the detail page.
    effect(() => {
      const id = this.id();
      if (id) {
        this.store.loadArticleFull(id, 5);
      }
    });

    // Initialize sorting snapshot when article ID changes OR when server-loaded comments arrive.
    effect(() => {
      const id = this.id();
      const art = this.article();
      const newIds = this.newCommentIds();
      
      if (!art || !id) return;

      const serverComments = (art.comments ?? []).filter(c => !newIds.has(c.id));
      const serverCount = serverComments.length;

      // New navigation: reset snapshot + local new-comment tracking
      if (id !== this.lastSortedArticleId) {
        this.lastSortedArticleId = id;
        this.lastServerCommentCount = serverCount;
        this.updateSortingSnapshot(serverComments);
        this.newCommentIds.set(new Set());
        return;
      }

      // Same article: update snapshot only when server-provided comments change.
      // This fixes the "sometimes I need to re-enter" issue when the page first renders
      // from the list article (0 comments) and then the full payload arrives.
      if (serverCount !== this.lastServerCommentCount) {
        this.lastServerCommentCount = serverCount;
        this.updateSortingSnapshot(serverComments);
      }
    });
  }

  readonly lightboxImage = signal<string | null>(null);

  ngAfterViewInit() {
    // Check if we should autofocus on comment field
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'comments') {
        setTimeout(() => {
          this.commentTextarea?.nativeElement.focus();
        }, 100);
      }
    });
  }

  commentCount(): number {
    const a = this.article();
    return a?.comments?.length ?? 0;
  }

  articleComments() {
    return this.article()?.comments ?? [];
  }

  // Get current sorted comments by looking up IDs dynamically (keeps UI reactive to votes)
  sortedComments = computed(() => {
    const sortedIds = this.sortedCommentIds();
    const currentComments = this.articleComments();
    const newIds = this.newCommentIds();
    
    // Separate new comments (added in this session) from sorted comments
    const newComments = currentComments.filter(c => newIds.has(c.id));
    const sortedExisting = sortedIds
      .map(id => currentComments.find(c => c.id === id))
      .filter((c): c is Article => c !== undefined);
    
    // New comments appear at top, followed by sorted comments
    return [...newComments, ...sortedExisting];
  });

  // Visible comments based on pagination
  visibleComments = computed(() => {
    const sorted = this.sortedComments();
    const count = this.visibleCommentsCount();
    return sorted.slice(0, count);
  });

  hasMoreComments = computed(() => {
    return this.sortedComments().length > this.visibleCommentsCount();
  });

  loadMoreComments() {
    this.visibleCommentsCount.update(count => count + 10);
  }

  setSortMode(mode: SortMode) {
    this.sortMode.set(mode);
    this.visibleCommentsCount.set(10); // Reset pagination when changing sort
    
    // Re-sort with new mode
    const comments = this.articleComments();
    this.updateSortingSnapshot(comments);
  }

  // Update the sorting snapshot (called on load or sort mode change)
  private updateSortingSnapshot(comments: Article[]) {
    const mode = this.sortMode();
    const sorted = this.sortCommentsArray(comments, mode);
    
    // Store only IDs, not Article objects
    this.sortedCommentIds.set(sorted.map(c => c.id));
    
    // Also sort all replies and store their IDs
    const repliesMap = new Map<string, string[]>();
    comments.forEach(comment => {
      if (comment.comments.length > 0) {
        const sortedReplies = this.sortCommentsArray(comment.comments, mode);
        repliesMap.set(comment.id, sortedReplies.map(r => r.id));
      }
    });
    this.sortedReplyIds.set(repliesMap);
  }

  // Get visible replies for a specific comment
  getVisibleReplies(commentId: string, replies: Article[]): Article[] {
    const sortedIds = this.sortedReplyIds().get(commentId);
    const newIds = this.newCommentIds();
    
    // Separate new replies from sorted replies
    const newReplies = replies.filter(r => newIds.has(r.id));
    
    // If we have sorted IDs, map them to current reply objects
    if (sortedIds) {
      const sorted = sortedIds
        .map(id => replies.find(r => r.id === id))
        .filter((r): r is Article => r !== undefined);
      
      const visibleCount = this.visibleRepliesCount().get(commentId) || 2;
      const sortedVisible = sorted.slice(0, visibleCount);
      
      // New replies at top, followed by sorted replies
      return [...newReplies, ...sortedVisible];
    }
    
    // Fallback to showing first replies if no sort data
    const visibleCount = this.visibleRepliesCount().get(commentId) || 2;
    const fallbackVisible = replies.filter(r => !newIds.has(r.id)).slice(0, visibleCount);
    return [...newReplies, ...fallbackVisible];
  }

  hasMoreReplies(commentId: string, replies: Article[]): boolean {
    const visibleCount = this.visibleRepliesCount().get(commentId) || 2;
    return replies.length > visibleCount;
  }

  loadMoreReplies(commentId: string) {
    this.visibleRepliesCount.update(map => {
      const newMap = new Map(map);
      const current = newMap.get(commentId) || 2;
      newMap.set(commentId, current + 10);
      return newMap;
    });
  }

  private sortCommentsArray(comments: Article[], mode: SortMode): Article[] {
    const sorted = [...comments];
    
    if (mode === 'top') {
      // Sort by score (upvotes - downvotes), then by date
      sorted.sort((a, b) => {
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
      sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    return sorted;
  }

  hasComments(): boolean {
    return this.commentCount() > 0;
  }

  addRootComment() {
    const a = this.article();
    if (!a) return;
    const text = this.newCommentText().trim();
    if (!text) return;
    
    this.store.addReply(a.id, text, this.newCommentImages()).then(newCommentId => {
      if (newCommentId) {
        // Track this as a new comment so it appears at top
        this.newCommentIds.update(ids => {
          const newSet = new Set(ids);
          newSet.add(newCommentId);
          return newSet;
        });
      }
    });
    
    this.newCommentText.set('');
    this.newCommentImages.set([]);
    this.newCommentImagePreviews.set([]);
  }

  openLightbox(url: string) {
    this.lightboxImage.set(url);
  }

  closeLightbox() {
    this.lightboxImage.set(null);
  }

  onRootCommentImageSelect(event: Event) {
    this.handleImageSelect(event, 'root');
  }

  removeRootCommentImage(index: number) {
    this.newCommentImages.update(files => files.filter((_, i) => i !== index));
    this.newCommentImagePreviews.update(previews => previews.filter((_, i) => i !== index));
  }

  startReply(commentId: string) {
    this.replyingTo.set(commentId);
    this.replyText.set('');
    this.replyImages.set([]);
    this.replyImagePreviews.set([]);
  }

  cancelReply() {
    this.replyingTo.set(null);
    this.replyText.set('');
    this.replyImages.set([]);
    this.replyImagePreviews.set([]);
  }

  submitReply(parentId: string) {
    const text = this.replyText().trim();
    if (!text) return;
    
    this.store.addReply(parentId, text, this.replyImages()).then(newReplyId => {
      if (newReplyId) {
        // Track this as a new reply so it appears at top of replies
        this.newCommentIds.update(ids => {
          const newSet = new Set(ids);
          newSet.add(newReplyId);
          return newSet;
        });
      }
    });
    
    this.cancelReply();
  }

  onReplyImageSelect(event: Event) {
    this.handleImageSelect(event, 'reply');
  }

  removeReplyImage(index: number) {
    this.replyImages.update(files => files.filter((_, i) => i !== index));
    this.replyImagePreviews.update(previews => previews.filter((_, i) => i !== index));
  }

  private handleImageSelect(event: Event, type: 'root' | 'reply') {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    const currentFiles = type === 'root' ? this.newCommentImages() : this.replyImages();
    
    // Limit to 5 images per comment
    const maxImages = 5;
    const totalFiles = currentFiles.length + newFiles.length;
    const filesToAdd = totalFiles > maxImages 
      ? newFiles.slice(0, maxImages - currentFiles.length)
      : newFiles;

    if (filesToAdd.length === 0) return;

    // Validate file sizes (5MB max per file)
    const validFiles = filesToAdd.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 5MB limit`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        console.warn(`File ${file.name} is not an image`);
        return false;
      }
      return true;
    });

    if (type === 'root') {
      this.newCommentImages.update(files => [...files, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.newCommentImagePreviews.update(previews => [
            ...previews,
            { name: file.name, url: e.target?.result as string }
          ]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      this.replyImages.update(files => [...files, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.replyImagePreviews.update(previews => [
            ...previews,
            { name: file.name, url: e.target?.result as string }
          ]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input
    input.value = '';
  }

  // Paste handler helper: convert image clipboard items to File and add to selection
  handlePaste(event: ClipboardEvent, type: 'root' | 'reply') {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const blob = it.getAsFile();
        if (!blob) continue;
        const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
        if (type === 'root') {
          this.newCommentImages.update(files => [...files, file]);
          const reader = new FileReader();
          reader.onload = (e) => {
            this.newCommentImagePreviews.update(previews => [
              ...previews,
              { name: file.name, url: e.target?.result as string }
            ]);
          };
          reader.readAsDataURL(file);
        } else {
          this.replyImages.update(files => [...files, file]);
          const reader = new FileReader();
          reader.onload = (e) => {
            this.replyImagePreviews.update(previews => [
              ...previews,
              { name: file.name, url: e.target?.result as string }
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  deleteThisArticle() {
    const a = this.article();
    if (!a) return;

    const modal = this.confirmModal();
    if (modal) {
      modal.open({
        title: 'Delete Article',
        message: 'Are you sure you want to delete this article? This action cannot be undone.',
        confirmText: 'Delete'
      });
      modal.confirmed.subscribe(() => {
        const success = this.store.deleteArticle(a.id);
        if (success) {
          this.router.navigate(['/articles']);
        }
      });
    }
  }

  deleteComment(commentId: string) {
    const a = this.article();
    if (!a) return;

    const modal = this.confirmModal();
    if (modal) {
      modal.open({
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment? This action cannot be undone.',
        confirmText: 'Delete'
      });
      modal.confirmed.subscribe(() => {
        this.store.deleteComment(commentId, a.id);
      });
    }
  }

  canDelete(item: any): boolean {
    return this.store.canDelete(item);
  }
}
