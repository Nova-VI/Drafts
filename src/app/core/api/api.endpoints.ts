import { environment } from '../../../environments/environment';

const base = environment.apiBaseUrl.replace(/\/$/, '');

export const API = {
  auth: {
    login: `${base}/auth/login`,
    register: `${base}/auth/register`,
  },

  users: {
    byId: (id: string) => `${base}/users/${id}`,
    byEmail: (email: string) => `${base}/users/email/${email}`,
    byUsername: (username: string) => `${base}/users/username/${username}`,
    me: `${base}/users/infos`,
    updateMe: `${base}/users/infos`,
    all: `${base}/users`,
    search: (term: string) => `${base}/users/search/${term}`,
  },

  articles: {
    listFull: `${base}/article/full`,
    byIdFull: (id: string) => `${base}/article/full/${id}`,
    byUserIdFull: (userId: string) => `${base}/article/full/byUserId/${userId}`,

    mineProperties: `${base}/article/property`,
    find: (queryString: string) => `${base}/article/find${queryString.startsWith('?') ? '' : '?'}${queryString}`,

    create: `${base}/article/create/`,
    update: (id: string) => `${base}/article/${id}`,
    delete: (id: string) => `${base}/article/${id}`,

    owner: (articleId: string) => `${base}/article/owner/${articleId}`,
    images: (articleId: string) => `${base}/article/${articleId}/images`,

    upvote: (articleId: string) => `${base}/article/${articleId}/upvote`,
    downvote: (articleId: string) => `${base}/article/${articleId}/downvote`,

    search: (term: string) => `${base}/article/search/${term}`,
  },

  notifications: {
    mine: `${base}/notification`,
  },
} as const;

export const WS_BASE_URL = environment.wsBaseUrl;
