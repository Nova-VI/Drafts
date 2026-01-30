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
  readonly selectedImages = signal<File[]>([]);
  readonly imagePreviews = signal<{ name: string; url: string }[]>([]);
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

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    const currentFiles = this.selectedImages();
    
    // Limit to 10 images total
    const maxImages = 10;
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

    this.selectedImages.update(files => [...files, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.update(previews => [
          ...previews,
          { name: file.name, url: e.target?.result as string }
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    input.value = '';
  }

  removeImage(index: number) {
    this.selectedImages.update(files => files.filter((_, i) => i !== index));
    this.imagePreviews.update(previews => previews.filter((_, i) => i !== index));
  }

  onCreatePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const blob = it.getAsFile();
        if (!blob) continue;
        const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
        this.selectedImages.update(files => [...files, file]);
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreviews.update(previews => [...previews, { name: file.name, url: e.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  submit() {
    this.attemptedSubmit.set(true);
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);

    this.store.addArticle({
      title: this.title().trim(),
      content: this.content().trim(),
      images: this.selectedImages()
    })
      .then(id => {
        this.submitting.set(false);
        this.router.navigate(['/articles', id]);
      })
      .catch(error => {
        console.error('Failed to create article:', error);
        this.submitting.set(false);
      });
  }
}
