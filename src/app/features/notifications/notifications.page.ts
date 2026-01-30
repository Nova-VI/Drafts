import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { NotificationsService } from '../../core/services/notifications.service';
import type { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'drafts-notifications-page',
  imports: [CommonModule, RouterModule, RelativeTimePipe],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly notificationsService = inject(NotificationsService);

  readonly notifications = this.notificationsService.notifications;
  readonly isLoading = this.notificationsService.isLoading$;
  readonly error = this.notificationsService.error$;
  readonly unreadCount = this.notificationsService.unreadCount;

  readonly hasNotifications = computed(() => this.notifications().length > 0);

  constructor() {
    this.notificationsService.load();
  }

  markAllRead() {
    this.notificationsService.markAllRead();
  }

  markRead(id: string) {
    this.notificationsService.markAsRead([id]);
  }

  remove(id: string) {
    this.notificationsService.remove(id);
  }

  messageFor(notification: Notification): string {
    const actor = notification.actor?.username || 'Someone';
    const target = notification.targetType === 'comment' ? 'comment' : 'post';

    switch (notification.type) {
      case 'comment':
        return `${actor} commented on your post`;
      case 'reply':
        return `${actor} replied to your comment`;
      case 'upvote':
        return `${actor} upvoted your ${target}`;
      case 'downvote':
        return `${actor} downvoted your ${target}`;
      default:
        return `${actor} interacted with your ${target}`;
    }
  }
}
