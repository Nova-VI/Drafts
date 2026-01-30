import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { ArticlesStore } from '../../data/articles.store';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'drafts-article-detail-page',
  imports: [CommonModule, RouterModule, RelativeTimePipe, ConfirmModalComponent],
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

  private readonly id = toSignal(this.route.paramMap.pipe(map((pm) => pm.get('id') ?? '')),
    { initialValue: '' }
  );

  readonly article = computed(() => {
    const id = this.id();
    if (!id) return undefined;
    return this.store.getById(id);
  });

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

  hasComments(): boolean {
    return this.commentCount() > 0;
  }

  addRootComment() {
    const a = this.article();
    if (!a) return;
    const text = this.newCommentText().trim();
    if (!text) return;
    this.store.addReply(a.id, text, this.newCommentImages());
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
    this.store.addReply(parentId, text, this.replyImages());
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
