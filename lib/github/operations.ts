import { RequestError } from "@octokit/request-error";
import { createOctokit } from "@/lib/github/client";
import { resolveToken } from "@/lib/storage/sites";
import { SiteConfig } from "@/types/site";
import { GitHubContent, PublishResult } from "@/types/github";
import { withRetry } from "@/lib/utils/retry";

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
  console.log("[GET_FILE_CONTENT] Fetching file:", path);
  console.log(
    "[GET_FILE_CONTENT] Repository:",
    `${site.githubOwner}/${site.githubRepo}`
  );
  console.log("[GET_FILE_CONTENT] Branch:", site.githubBranch);

  try {
    const token = await resolveToken(site);
    console.log("[GET_FILE_CONTENT] Token resolved successfully");

    const octokit = createOctokit(token);
    const owner = normalizeOwner(site.githubOwner);
    const repo = normalizeRepo(site.githubRepo);

    console.log("[GET_FILE_CONTENT] Normalized owner:", owner);
    console.log("[GET_FILE_CONTENT] Normalized repo:", repo);
    console.log("[GET_FILE_CONTENT] Making API request with retry...");

    // Wrap the API call in retry logic to handle transient network errors
    const response = await withRetry(
      async () => {
        try {
          const res = await octokit.repos.getContent({
            owner,
            repo,
            path,
            ref: site.githubBranch,
          });
          console.log("[GET_FILE_CONTENT] API request successful");
          console.log(
            "[GET_FILE_CONTENT] Response type:",
            Array.isArray(res.data) ? "directory" : res.data.type
          );
          return res;
        } catch (error) {
          console.error("[GET_FILE_CONTENT] API request failed:", error);
          if (error instanceof RequestError && error.status === 404) {
            console.error("[GET_FILE_CONTENT] File not found. Details:");
            console.error("  - Owner:", owner);
            console.error("  - Repo:", repo);
            console.error("  - Path:", path);
            console.error("  - Branch:", site.githubBranch);
            console.error("  - Request URL:", error.request?.url);
            throw new Error(
              `GitHub returned 404 for ${owner}/${repo}/${path}. ` +
                "Confirm the repository contains that file and that the access token can read it.\n" +
                `Full path: ${owner}/${repo}/${path} on branch ${site.githubBranch}`
            );
          }
          throw error;
        }
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );

    if (Array.isArray(response.data) || response.data.type !== "file") {
      console.error(
        "[GET_FILE_CONTENT] Expected file but got:",
        Array.isArray(response.data) ? "directory" : response.data.type
      );
      throw new Error(
        `Expected file at path ${path} but got ${
          Array.isArray(response.data) ? "directory" : response.data.type
        }`
      );
    }

    const content = Buffer.from(response.data.content, "base64").toString(
      "utf8"
    );
    console.log(
      "[GET_FILE_CONTENT] File content decoded, length:",
      content.length
    );
    console.log("[GET_FILE_CONTENT] File SHA:", response.data.sha);

    return {
      path,
      sha: response.data.sha,
      content,
    };
  } catch (error) {
    console.error("[GET_FILE_CONTENT] Complete error:", error);
    throw error;
  }
}

export async function validateGitHubPermissions(
  site: SiteConfig
): Promise<{ valid: boolean; error?: string }> {
  console.log("[VALIDATE_PERMISSIONS] Checking GitHub token permissions");

  try {
    const token = await resolveToken(site);
    const octokit = createOctokit(token);
    const owner = normalizeOwner(site.githubOwner);
    const repo = normalizeRepo(site.githubRepo);

    // Test read permissions by getting repo info (with retry)
    try {
      await withRetry(
        async () => {
          await octokit.repos.get({
            owner,
            repo,
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        }
      );
      console.log("[VALIDATE_PERMISSIONS] Read permissions: OK");
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        return {
          valid: false,
          error: `Repository ${owner}/${repo} not found or no read access. Check the repository name and ensure the token has 'repo' scope.`,
        };
      }
      throw error;
    }

    // Test write permissions by trying to get a reference (with retry)
    try {
      await withRetry(
        async () => {
          await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${site.githubBranch}`,
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        }
      );
      console.log("[VALIDATE_PERMISSIONS] Write permissions: OK");
    } catch (error) {
      if (
        error instanceof RequestError &&
        (error.status === 404 || error.status === 403)
      ) {
        return {
          valid: false,
          error: `Insufficient permissions for repository ${owner}/${repo}. The GitHub token needs 'repo' scope to write to the repository. Current OAuth scopes: ${
            error.response?.headers?.["x-oauth-scopes"] || "None"
          }`,
        };
      }
      throw error;
    }

    return { valid: true };
  } catch (error) {
    console.error("[VALIDATE_PERMISSIONS] Validation failed:", error);
    return {
      valid: false,
      error: `Failed to validate GitHub permissions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

export async function publishFiles(
  site: SiteConfig,
  files: GitHubContent[],
  commitMessage: string
): Promise<PublishResult> {
  console.log("[PUBLISH_FILES] Starting publish process");
  console.log("[PUBLISH_FILES] Site ID:", site.id);
  console.log(
    "[PUBLISH_FILES] Repository:",
    `${site.githubOwner}/${site.githubRepo}`
  );
  console.log("[PUBLISH_FILES] Branch:", site.githubBranch);

  try {
    const token = await resolveToken(site);
    if (!token) {
      throw new Error(
        "Failed to resolve GitHub token - token is null or empty"
      );
    }

    const octokit = createOctokit(token);
    const owner = normalizeOwner(site.githubOwner);
    const repo = normalizeRepo(site.githubRepo);

    console.log("[PUBLISH_FILES] Normalized owner:", owner);
    console.log("[PUBLISH_FILES] Normalized repo:", repo);
    console.log("[PUBLISH_FILES] Files to publish:", files.length);
    files.forEach((file, index) => {
      console.log(
        `[PUBLISH_FILES] File ${index + 1}:`,
        file.path,
        "Content length:",
        file.content?.length || 0
      );
    });

    console.log(
      "[PUBLISH_FILES] Getting reference for branch:",
      `heads/${site.githubBranch}`
    );
    const ref = await withRetry(
      async () => {
        const { data } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${site.githubBranch}`,
        });
        return data;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );
    console.log(
      "[PUBLISH_FILES] Reference retrieved successfully, SHA:",
      ref.object.sha
    );

    const latestCommitSha = ref.object.sha;
    console.log("[PUBLISH_FILES] Getting latest commit:", latestCommitSha);
    const latestCommit = await withRetry(
      async () => {
        const { data } = await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: latestCommitSha,
        });
        return data;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );
    console.log(
      "[PUBLISH_FILES] Latest commit retrieved successfully, tree SHA:",
      latestCommit.tree.sha
    );

    console.log(
      "[PUBLISH_FILES] Creating tree with base_tree:",
      latestCommit.tree.sha
    );
    const tree = await withRetry(
      async () => {
        const { data } = await octokit.git.createTree({
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
        return data;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );
    console.log("[PUBLISH_FILES] Tree created successfully, SHA:", tree.sha);

    console.log("[PUBLISH_FILES] Creating commit with message:", commitMessage);
    const commit = await withRetry(
      async () => {
        const { data } = await octokit.git.createCommit({
          owner,
          repo,
          message: commitMessage,
          tree: tree.sha,
          parents: [latestCommitSha],
        });
        return data;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );
    console.log(
      "[PUBLISH_FILES] Commit created successfully, SHA:",
      commit.sha
    );

    console.log(
      "[PUBLISH_FILES] Updating reference:",
      `heads/${site.githubBranch}`
    );
    await withRetry(
      async () => {
        await octokit.git.updateRef({
          owner,
          repo,
          ref: `heads/${site.githubBranch}`,
          sha: commit.sha,
        });
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    );
    console.log("[PUBLISH_FILES] Reference updated successfully");

    const pagesUrl = `https://${owner}.github.io/${repo}/`;
    console.log(
      "[PUBLISH_FILES] Publish completed successfully, URL:",
      pagesUrl
    );

    return {
      success: true,
      message: "Changes published",
      url: pagesUrl,
    };
  } catch (error) {
    console.error("[PUBLISH_FILES] Error during publish:", error);

    if (error instanceof RequestError) {
      console.error("[PUBLISH_FILES] GitHub API Error Details:");
      console.error("  - Status:", error.status);
      console.error("  - Message:", error.message);
      console.error("  - Headers:", error.headers);
      console.error("  - Request URL:", error.request?.url);
      console.error("  - Request Method:", error.request?.method);

      if (error.status === 404) {
        if (error.request?.url?.includes("/git/trees")) {
          throw new Error(
            `GitHub returned 404 when creating tree. This usually means:\n` +
              `1. The repository doesn't exist or is not accessible\n` +
              `2. The token doesn't have write permissions (needs 'repo' scope)\n` +
              `3. The base tree reference is invalid\n` +
              `Repository: ${site.githubOwner}/${site.githubRepo}\n` +
              `Branch: ${site.githubBranch}\n` +
              `OAuth scopes: ${
                error.response?.headers?.["x-oauth-scopes"] || "None"
              }\n` +
              `Original error: ${error.message}`
          );
        } else if (error.request?.url?.includes("/git/refs/")) {
          const normalizedOwner = normalizeOwner(site.githubOwner);
          const normalizedRepo = normalizeRepo(site.githubRepo);
          throw new Error(
            `GitHub returned 404 when getting branch reference. This usually means:\n` +
              `1. The branch '${site.githubBranch}' doesn't exist\n` +
              `2. The repository doesn't exist or is not accessible\n` +
              `3. The token doesn't have read permissions\n` +
              `Repository: ${normalizedOwner}/${normalizedRepo}\n` +
              `Original error: ${error.message}`
          );
        }
      } else if (error.status === 401 || error.status === 403) {
        throw new Error(
          `GitHub authentication failed (HTTP ${error.status}). This usually means:\n` +
            `1. The token is invalid or expired\n` +
            `2. The token doesn't have the required permissions\n` +
            `3. The token has been revoked\n` +
            `Original error: ${error.message}`
        );
      }
    }

    throw error;
  }
}
