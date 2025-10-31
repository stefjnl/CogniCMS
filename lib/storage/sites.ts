import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { SiteConfig, SiteSummary } from "@/types/site";
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto";
import { SiteInput } from "@/lib/utils/validation";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "sites.json");

async function readSitesFile(): Promise<SiteConfig[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as SiteConfig[];
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DATA_FILE, "[]", "utf8");
      return [];
    }
    throw error;
  }
}

async function writeSitesFile(payload: SiteConfig[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function listSites(): Promise<SiteSummary[]> {
  const sites = await readSitesFile();
  return sites.map(
    ({ id, name, githubOwner, githubRepo, githubBranch, lastModified }) => ({
      id,
      name,
      githubOwner,
      githubRepo,
      githubBranch,
      lastModified,
    })
  );
}

export async function getSiteConfig(
  siteId: string
): Promise<SiteConfig | undefined> {
  const sites = await readSitesFile();
  return sites.find((site) => site.id === siteId);
}

export async function deleteSite(siteId: string): Promise<void> {
  const sites = await readSitesFile();
  const filtered = sites.filter((site) => site.id !== siteId);
  await writeSitesFile(filtered);
}

export type CreateSiteOptions = SiteInput & { id?: string };

export async function createSite(
  input: CreateSiteOptions
): Promise<SiteConfig> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const encryptedToken = encryptSecret(input.githubToken);

  const site: SiteConfig = {
    id,
    name: input.name,
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    githubBranch: input.githubBranch,
    contentFile: input.contentFile,
    htmlFile: input.htmlFile,
    customSchema: input.customSchema,
    createdAt: now,
    lastModified: now,
    encryptedToken,
  };

  const sites = await readSitesFile();
  const existingIndex = sites.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    sites[existingIndex] = site;
  } else {
    sites.push(site);
  }
  await writeSitesFile(sites);
  return site;
}

export async function updateSite(
  siteId: string,
  updates: Partial<SiteInput>
): Promise<SiteConfig | undefined> {
  const sites = await readSitesFile();
  const index = sites.findIndex((site) => site.id === siteId);
  if (index < 0) {
    return undefined;
  }

  const current = sites[index];
  const merged: SiteConfig = {
    ...current,
    ...updates,
    contentFile: updates.contentFile ?? current.contentFile,
    htmlFile: updates.htmlFile ?? current.htmlFile,
    githubBranch: updates.githubBranch ?? current.githubBranch,
    customSchema: updates.customSchema ?? current.customSchema,
    lastModified: new Date().toISOString(),
    encryptedToken: updates.githubToken
      ? encryptSecret(updates.githubToken)
      : current.encryptedToken,
  };

  sites[index] = merged;
  await writeSitesFile(sites);
  return merged;
}

export async function resolveToken(site: SiteConfig): Promise<string> {
  return decryptSecret(site.encryptedToken);
}
