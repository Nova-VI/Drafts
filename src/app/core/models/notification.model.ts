export type NotificationType = 'comment' | 'reply' | 'upvote' | 'downvote';
export type NotificationTargetType = 'article' | 'comment';

export type NotificationActor = {
  id: string;
  username: string;
};

export type Notification = {
  id: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  actor: NotificationActor;
  articleId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
};
