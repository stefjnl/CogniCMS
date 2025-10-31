export interface GitHubFile {
  path: string;
  sha: string;
  content: string;
}

export interface GitHubContent {
  path: string;
  content: string;
  sha?: string;
}

export interface PublishResult {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
}
