export type Vote = 'upvote' | 'downvote' | 'null';

export type Voter = {
  voterId: string;
  vote: Vote;
};
