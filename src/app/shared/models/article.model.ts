import type { Voter } from './voter.model';

export type Article = {
  id: string;
  fatherId: string | null;
  title: string;
  content: string;
  images: string[];
  owner: string;
  comments: Article[];
  upvotes: number;
  downvotes: number;
  voters: Voter[];
  slug: string | null;
  createdAt: string;
  updatedAt: string;
};
