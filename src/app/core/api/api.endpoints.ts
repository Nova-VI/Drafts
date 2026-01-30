import { environment } from '../../../environments/environment';

const base = environment.apiBaseUrl.replace(/\/$/, '');

/**
 * Drafts Backend API Documentation
 * Auth Note: Protected endpoints require 'Authorization: Bearer <token>' in headers.
 */
export const API = {
  auth: {
    /** POST: { email, password } -> returns { accessToken: string, userId: string, email: string } */
    login: `${base}/auth/login`,
    /** POST: { email, password, username, name?, lastName?, bio? } -> returns { accessToken: string, userId: string, email: string } */
    register: `${base}/auth/register`,
  },

  users: {
    /** GET -> returns User object */
    byId: (id: string) => `${base}/users/${id}`,
    /** GET -> returns User object */
    byEmail: (email: string) => `${base}/users/email/${encodeURIComponent(email)}`,
    /** GET -> returns User object */
    byUsername: (username: string) => `${base}/users/username/${encodeURIComponent(username)}`,
    /** GET -> returns current User object */
    me: `${base}/users/infos`,
    /** PATCH: { name?, lastName?, bio? } -> returns updated User object */
    updateMe: `${base}/users/infos`,
    /** GET -> returns User[] */
    all: `${base}/users`,
    /** GET -> returns User[] (partial name match) */
    search: (term: string) => `${base}/users/search/${term}`,
  },

  articles: {
    /** GET -> returns top-level articles */
    listFull: `${base}/articles`,
    /** GET -> returns an article with nested comments (depth is optional) */
    byIdFull: (id: string, depth?: number) => `${base}/articles/full/${id}${typeof depth === 'number' ? `?depth=${depth}` : ''}`,
    /** GET -> returns nested replies for a comment (depth is optional) */
    commentReplies: (commentId: string, depth?: number) => `${base}/articles/comments/${commentId}/replies${typeof depth === 'number' ? `?depth=${depth}` : ''}`,

    /** GET -> search with pagination via query params (q, authorId, page, limit, sortBy, sortOrder) */
    search: (queryString: string) => `${base}/articles/search${queryString.startsWith('?') ? '' : '?'}${queryString}`,

    /** POST: { title, content, parentId? } -> returns created Article */
    create: `${base}/articles`,
    /** POST: { title, content, parentId } -> returns created Comment (Article) */
    createComment: `${base}/articles/comments`,
    /** PATCH: { title?, content? } -> returns updated Article */
    update: (id: string) => `${base}/articles/${id}`,
    /** DELETE -> returns 204 No Content */
    delete: (id: string) => `${base}/articles/${id}`,

    /** POST -> returns { upvoted, upvoteCount, downvoteCount } */
    upvote: (articleId: string) => `${base}/articles/${articleId}/upvote`,
    /** POST -> returns { downvoted, upvoteCount, downvoteCount } */
    downvote: (articleId: string) => `${base}/articles/${articleId}/downvote`,
    /** GET -> returns { upvoteCount, downvoteCount } */
    votes: (articleId: string) => `${base}/articles/${articleId}/votes`,
  },

  images: {
    /** POST (Multipart): fields { file, articleId } */
    upload: `${base}/images/upload`,
    /** POST (Multipart): fields { files[], articleId } */
    uploadMultiple: `${base}/images/upload-multiple`,
  },

  notifications: {
    /** GET -> returns Notification[] for current user */
    mine: `${base}/notification`,
    /** POST: { ids: string[] } -> returns { updatedCount: number, message: string } */
    markAsRead: `${base}/notification/updates`,
    /** DELETE -> returns { message: string } */
    delete: (id: string) => `${base}/notification/${id}`,
  },
} as const;

export const WS_BASE_URL = environment.wsBaseUrl;