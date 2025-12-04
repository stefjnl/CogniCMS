import { config, validateProductionConfig } from "@/lib/config";
import { Octokit } from "@octokit/rest";

/**
 * Create a GitHub Octokit client.
 *
 * Prefer using the configured token when an explicit token is not provided.
 * This keeps GitHub access centralized and type-safe.
 */
export function createOctokit(token?: string): Octokit {
  // Only validate production config when falling back to global token.
  // When an explicit token is provided (e.g., from a site's encrypted token),
  // we don't need a global GITHUB_TOKEN environment variable.
  if (!token) {
    validateProductionConfig();
  }
  
  const resolvedToken = token ?? config.github.token;

  if (!resolvedToken) {
    throw new Error("GitHub token is required to create Octokit client");
  }

  return new Octokit({
    auth: resolvedToken,
    userAgent: "CogniCMS/0.1.0",
  });
}
