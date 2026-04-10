export type InstagramProfileAsset = {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  profilePictureUrl: string | null;
  mediaCount: number | null;
};

export type InstagramMediaAsset = {
  id: string;
  caption: string | null;
  mediaType: string;
  permalink: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  displayUrl: string | null;
  timestamp: string | null;
  timestampLabel: string | null;
  childCount: number;
};

export type InstagramFeedResult = {
  profile: InstagramProfileAsset | null;
  media: InstagramMediaAsset[];
  configured: boolean;
  connected: boolean;
  error: string | null;
  accountName: string | null;
  loginHref: string;
  callbackPath: string;
};

export type InstagramConnectionCandidate = {
  pageId: string;
  pageName: string;
  instagramUserId: string;
  instagramUsername: string | null;
  pageAccessToken: string;
  profilePictureUrl: string | null;
};

export type InstagramConnectionResult = {
  longLivedUserAccessToken: string;
  expiresIn: number | null;
  candidates: InstagramConnectionCandidate[];
};
