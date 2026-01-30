import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'drafts-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ title() }}</h3>
          </div>
          <div class="modal-body">
            <p>{{ message() }}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" (click)="onCancel()">
              Cancel
            </button>
            <button type="button" class="btn danger" (click)="onConfirm()">
              {{ confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      max-width: 500px;
      width: 90%;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
    }

    .modal-body {
      padding: 18px 24px;
    }

    .modal-body p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .modal-actions {
      padding: 16px 24px 20px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
      cursor: pointer;
      user-select: none;
      font-weight: 500;
      transition: all 0.2s;
      font-size: 0.95rem;
    }

    .btn:hover {
      background: rgba(255, 255, 255, 0.10);
    }

    .btn:active {
      transform: translateY(1px);
    }

    .btn.ghost {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.12);
      color: var(--muted);
    }

    .btn.ghost:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }

    .btn.danger {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
    }

    .btn.danger:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: rgba(239, 68, 68, 0.5);
    }

    .btn.danger:active {
      transform: translateY(1px);
    }

    @media (prefers-color-scheme: light) {
      .btn {
        background: rgba(15, 23, 42, 0.06);
      }

      .btn:hover {
        background: rgba(15, 23, 42, 0.10);
      }

      .btn.ghost {
        background: transparent;
        border-color: rgba(15, 23, 42, 0.10);
      }

      .btn.ghost:hover {
        background: rgba(15, 23, 42, 0.06);
      }
    }
  `]
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

