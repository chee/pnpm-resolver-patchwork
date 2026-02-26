import type { Repo } from "@automerge/automerge-repo"
import { isValidAutomergeUrl } from "@automerge/automerge-repo"
import type { AutomergeUrl } from "@automerge/automerge-repo"
import { readPackageJson } from "./automerge-client.js"
import type { AutomergeResolution } from "./types.js"

const AUTOMERGE_PREFIX = "automerge:"

export interface ResolveResult {
  id: string
  resolution: AutomergeResolution
  manifest?: { name: string; version: string }
  resolvedVia: string
}

export function canResolve(bareSpecifier: string): boolean {
  return bareSpecifier.startsWith(AUTOMERGE_PREFIX)
}

export function parseAutomergeSpec(bareSpecifier: string): {
  automergeUrl: AutomergeUrl
  subpath: string | undefined
} {
  const withoutPrefix = bareSpecifier
  // Could be "automerge:docId" or "automerge:docId/subpath"
  const slashIndex = withoutPrefix.indexOf("/", AUTOMERGE_PREFIX.length)

  let urlPart: string
  let subpath: string | undefined

  if (slashIndex !== -1) {
    urlPart = withoutPrefix.slice(0, slashIndex)
    subpath = withoutPrefix.slice(slashIndex + 1)
  } else {
    urlPart = withoutPrefix
  }

  if (!isValidAutomergeUrl(urlPart)) {
    throw new Error(`Invalid automerge URL: ${urlPart}`)
  }

  return { automergeUrl: urlPart as AutomergeUrl, subpath }
}

export async function resolve(
  bareSpecifier: string,
  repo: Repo
): Promise<ResolveResult> {
  const { automergeUrl, subpath } = parseAutomergeSpec(bareSpecifier)

  // Find the root folder to read package.json and get heads for cache key
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  let heads: string[]
  try {
    const handle = await repo.find(automergeUrl, { signal: controller.signal } as any)
    heads = handle.heads()
  } finally {
    clearTimeout(timer)
  }
  const pkg = await readPackageJson(repo, automergeUrl)

  const headsHash = heads.join(",")
  const id = `${automergeUrl}@${headsHash}` as string

  const fullUrl = subpath
    ? `${automergeUrl}/${subpath}`
    : (automergeUrl as string)

  return {
    id,
    resolution: {
      type: "custom:automerge",
      automergeUrl: fullUrl,
    },
    manifest: pkg,
    resolvedVia: "automerge",
  }
}
