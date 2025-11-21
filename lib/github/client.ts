import { Octokit } from "@octokit/rest";
import { config } from "@/lib/config";

/**
 * Create a GitHub Octokit client.
 *
 * Prefer using the configured token when an explicit token is not provided.
 * This keeps GitHub access centralized and type-safe.
 */
export function createOctokit(token?: string): Octokit {
  const resolvedToken = token ?? config.github.token;

  if (!resolvedToken) {
    throw new Error("GitHub token is required to create Octokit client");
  }

  return new Octokit({
    auth: resolvedToken,
    userAgent: "CogniCMS/0.1.0",
  });
}
