import { Octokit } from "@octokit/rest";

export function createOctokit(token: string): Octokit {
  if (!token) {
    throw new Error("GitHub token is required");
  }

  return new Octokit({
    auth: token,
    userAgent: "CogniCMS/0.1.0",
  });
}
