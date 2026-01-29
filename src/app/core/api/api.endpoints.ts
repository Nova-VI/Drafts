import { environment } from '../../../environments/environment';

const base = environment.apiBaseUrl.replace(/\/$/, '');

/**
 * Drafts Backend API Documentation
 * Auth Note: Protected endpoints require 'Authorization: Bearer <token>' in headers.
 */
export const API = {
  auth: {
    /** POST: { email, password } -> returns { Authorization: string } */
    login: `${base}/auth/login`,
    /** POST: { email, password, username, name?, lastName?, bio? } -> returns { Authorization: string } */
    register: `${base}/auth/register`,
  },

  users: {
    /** GET -> returns User object */
    byId: (id: string) => `${base}/users/${id}`,
    /** GET -> returns User object */
    byEmail: (email: string) => `${base}/users/email/${email}`,
    /** GET -> returns User object */
    byUsername: (username: string) => `${base}/users/username/${username}`,
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
    /** GET -> returns Article[] with nested comments */
    listFull: `${base}/article/full`,
    /** GET -> returns Article object with nested comments */
    byIdFull: (id: string) => `${base}/article/full/${id}`,
    /** GET -> returns Article[] with full details for a specific user */
    byUserIdFull: (userId: string) => `${base}/article/full/byUserId/${userId}`,

    /** GET -> returns Article[] owned by the current user */
    mineProperties: `${base}/article/property`,
    /** GET: ?page=1&limit=10&ownerid=... -> returns Article[] (paginated) */
    find: (queryString: string) => `${base}/article/find${queryString.startsWith('?') ? '' : '?'}${queryString}`,

    /** POST (Multipart): { title, content, fatherId?, slug?, images? } -> returns { id: string } */
    create: `${base}/article/create/`,
    /** PATCH (Multipart): { title?, content?, slug? } -> returns updated Article object */
    update: (id: string) => `${base}/article/${id}`,
    /** DELETE -> returns { message: string } */
    delete: (id: string) => `${base}/article/${id}`,

    /** GET -> returns User object of the article creator */
    owner: (articleId: string) => `${base}/article/owner/${articleId}`,
    /** GET -> returns { images: string[] } */
    images: (articleId: string) => `${base}/article/${articleId}/images`,

    /** POST -> returns { upvotes: number, downvotes: number, voters: object[] } */
    upvote: (articleId: string) => `${base}/article/${articleId}/upvote`,
    /** POST -> returns { upvotes: number, downvotes: number, voters: object[] } */
    downvote: (articleId: string) => `${base}/article/${articleId}/downvote`,

    /** GET -> returns Article[] (title search) */
    search: (term: string) => `${base}/article/search/${term}`,
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