import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'drafts-notification-toasts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-toasts.component.html',
  styleUrl: './notification-toasts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastsComponent {
  private readonly notifications = inject(NotificationsService);
  readonly toasts = this.notifications.toasts;
}
