import { createRepo } from "./automerge-client.js"
import {
  canResolve,
  resolve,
  parseAutomergeSpec,
  type ResolveResult,
} from "./resolver.js"
import {
  canFetch,
  fetchToTarball,
  fetchToDirectory,
  fetchWithCafs,
} from "./fetcher.js"
import type { Repo } from "@automerge/automerge-repo"
import type { AutomergeResolution, FileEntry } from "./types.js"

export interface PatchworkPlugin {
  resolvers: {
    canResolve: (bareSpecifier: string) => boolean
    resolve: (bareSpecifier: string) => Promise<ResolveResult>
  }
  fetchers: {
    canFetch: (pkgId: string, resolution: { type?: string }) => boolean
    fetch: (
      resolution: AutomergeResolution
    ) => Promise<{ tarballPath: string; cleanup: () => Promise<void> }>
  }
  shutdown: () => Promise<void>
}

export function createPatchworkPlugin(opts?: {
  syncServerUrl?: string
  repo?: Repo
}): PatchworkPlugin {
  const repo = opts?.repo ?? createRepo(opts?.syncServerUrl)
  const isOwnedRepo = !opts?.repo

  return {
    resolvers: {
      canResolve,
      resolve: (bareSpecifier: string) => resolve(bareSpecifier, repo),
    },
    fetchers: {
      canFetch,
      fetch: (resolution: AutomergeResolution) =>
        fetchToTarball(resolution, repo),
    },
    shutdown: async () => {
      if (isOwnedRepo) {
        await repo.shutdown()
      }
    },
  }
}

export function createPnpmPlugin(opts?: { syncServerUrl?: string }) {
  const repo = createRepo(opts?.syncServerUrl)

  return {
    resolvers: [
      {
        canResolve: (wantedDep: { bareSpecifier?: string }) =>
          canResolve(wantedDep.bareSpecifier ?? ""),
        resolve: async (wantedDep: { bareSpecifier?: string }) =>
          resolve(wantedDep.bareSpecifier!, repo),
      },
    ],
    fetchers: [
      {
        canFetch: (_pkgId: string, resolution: { type?: string }) =>
          canFetch(_pkgId, resolution),
        fetch: (cafs: any, resolution: any, fetchOpts: any, fetchers: any) =>
          fetchWithCafs(cafs, resolution, fetchOpts, fetchers, repo),
      },
    ],
    shutdown: () => repo.shutdown(),
  }
}

export {
  canResolve,
  resolve,
  parseAutomergeSpec,
  canFetch,
  fetchToTarball,
  fetchToDirectory,
  fetchWithCafs,
  createRepo,
}
export type { ResolveResult, AutomergeResolution, FileEntry }
export type {
  DirectoryDocument,
  DirectoryEntry,
  FileDocument,
} from "./types.js"
