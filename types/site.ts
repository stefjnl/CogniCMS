export interface SiteConfig {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  contentFile: string;
  htmlFile: string;
  createdAt: string;
  lastModified: string;
  encryptedToken: string;
  customSchema?: Record<string, unknown>;
}

export interface SiteSummary {
  id: string;
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  lastModified: string;
}

export interface SiteCredentials {
  token: string;
}
