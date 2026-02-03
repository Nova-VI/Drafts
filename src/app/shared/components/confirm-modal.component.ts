import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'drafts-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css'
})
export class ConfirmModalComponent {
  readonly isOpen = signal(false);
  readonly title = signal('');
  readonly message = signal('');
  readonly confirmText = signal('Delete');
  
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  open(options: { title: string; message: string; confirmText?: string }) {
    this.title.set(options.title);
    this.message.set(options.message);
    this.confirmText.set(options.confirmText || 'Delete');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  onConfirm() {
    this.confirmed.emit();
    this.close();
  }

  onCancel() {
    this.cancelled.emit();
    this.close();
  }
}

