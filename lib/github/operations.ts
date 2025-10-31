import { RequestError } from "@octokit/request-error";
import { createOctokit } from "@/lib/github/client";
import { resolveToken } from "@/lib/storage/sites";
import { SiteConfig } from "@/types/site";
import { GitHubContent, PublishResult } from "@/types/github";

function normalizeOwner(owner: string): string {
  let value = owner.trim();

  if (!value) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
      if (segments[0]) {
        value = segments[0];
      }
    } catch {
      value = value.replace(/^https?:\/\//, "");
    }
  }

  if (value.includes("github.com")) {
    const stripped = value.replace(/^.*github\.com[/:]+/i, "");
    const segments = stripped.split(/[\\/]/).filter(Boolean);
    if (segments[0]) {
      value = segments[0];
    }
  }

  const segments = value.split(/[\\/]/).filter(Boolean);
  const ownerSegment = segments[0] ?? value;
  return ownerSegment.replace(/^@/, "");
}

function normalizeRepo(repo: string): string {
  let value = repo.trim();

  if (!value) {
    return value;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
      if (segments.length >= 2) {
        value = segments[1];
      } else if (segments[0]) {
        value = segments[0];
      }
    } catch {
      value = value.replace(/^https?:\/\//, "");
    }
  }

  if (value.includes("github.com")) {
    const stripped = value.replace(/^.*github\.com[/:]+/i, "");
    const segments = stripped.split(/[\\/]/).filter(Boolean);
    if (segments.length >= 2) {
      value = segments[1];
    } else if (segments[0]) {
      value = segments[0];
    }
  }

  const segments = value.split(/[\\/]/).filter(Boolean);
  const repoSegment = segments[segments.length - 1] ?? value;
  return repoSegment.replace(/\.git$/i, "");
}

export async function getFileContent(
  site: SiteConfig,
  path: string
): Promise<GitHubContent> {
  const token = await resolveToken(site);
  const octokit = createOctokit(token);
  const owner = normalizeOwner(site.githubOwner);
  const repo = normalizeRepo(site.githubRepo);

  let response;

  try {
    response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: site.githubBranch,
    });
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      throw new Error(
        `GitHub returned 404 for ${owner}/${repo}/${path}. ` +
          "Confirm the repository contains that file and that the access token can read it."
      );
    }
    throw error;
  }

  if (Array.isArray(response.data) || response.data.type !== "file") {
    throw new Error(`Expected file at path ${path}`);
  }

  return {
    path,
    sha: response.data.sha,
    content: Buffer.from(response.data.content, "base64").toString("utf8"),
  };
}

export async function publishFiles(
  site: SiteConfig,
  files: GitHubContent[],
  commitMessage: string
): Promise<PublishResult> {
  const token = await resolveToken(site);
  const octokit = createOctokit(token);
  const owner = normalizeOwner(site.githubOwner);
  const repo = normalizeRepo(site.githubRepo);

  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${site.githubBranch}`,
  });

  const latestCommitSha = ref.object.sha;
  const { data: latestCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: latestCommit.tree.sha,
    tree: files.map((file) => ({
      path: file.path,
      mode: "100644",
      type: "blob",
      content: file.content,
    })),
  });

  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: tree.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${site.githubBranch}`,
    sha: commit.sha,
  });

  const pagesUrl = `https://${owner}.github.io/${repo}/`;

  return {
    success: true,
    message: "Changes published",
    url: pagesUrl,
  };
}
