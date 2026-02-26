import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock isValidAutomergeUrl to accept our test URLs
vi.mock("@automerge/automerge-repo", async () => {
  const actual = await vi.importActual<any>("@automerge/automerge-repo")
  return {
    ...actual,
    isValidAutomergeUrl: (url: unknown) =>
      typeof url === "string" && url.startsWith("automerge:"),
  }
})

import type { AutomergeUrl } from "@automerge/automerge-repo"
import type {
  DirectoryDocument,
  FileDocument,
  DirectoryEntry,
} from "../src/types.js"

// Mock document store: url -> document data
const mockDocs = new Map<string, any>()

function mockUrl(id: string): AutomergeUrl {
  return `automerge:${id}` as AutomergeUrl
}

function mockDocHandle<T>(doc: T, heads: string[] = ["abc123"]) {
  return {
    doc: () => doc,
    heads: () => heads,
    url: "",
    documentId: "",
    whenReady: () => Promise.resolve(),
    isReady: () => true,
  }
}

// Mock Repo that resolves docs from our in-memory store
function createMockRepo() {
  return {
    find: vi.fn(async (url: string) => {
      const doc = mockDocs.get(url)
      if (!doc) throw new Error(`Document not found: ${url}`)
      return mockDocHandle(doc)
    }),
    shutdown: vi.fn(async () => {}),
  } as any
}

// Set up a simple package file tree:
// root/
//   package.json
//   src/
//     index.js
//   README.md
function setupSimplePackage() {
  const rootUrl = mockUrl("rootDoc123")
  const pkgJsonUrl = mockUrl("pkgJsonDoc")
  const srcFolderUrl = mockUrl("srcFolder")
  const indexJsUrl = mockUrl("indexJs")
  const readmeUrl = mockUrl("readmeDoc")

  const pkgJson: FileDocument = {
    "@patchwork": { type: "file" },
    name: "package.json",
    extension: ".json",
    mimeType: "application/json",
    content: JSON.stringify({
      name: "my-automerge-pkg",
      version: "1.0.0",
      main: "src/index.js",
    }),
    metadata: { permissions: 0o644 },
  }

  const indexJs: FileDocument = {
    "@patchwork": { type: "file" },
    name: "index.js",
    extension: ".js",
    mimeType: "application/javascript",
    content: 'module.exports = { hello: "world" }\n',
    metadata: { permissions: 0o644 },
  }

  const readme: FileDocument = {
    "@patchwork": { type: "file" },
    name: "README.md",
    extension: ".md",
    mimeType: "text/markdown",
    content: "# My Package\n\nHello from automerge!\n",
    metadata: { permissions: 0o644 },
  }

  const srcFolder: DirectoryDocument = {
    "@patchwork": { type: "folder" },
    name: "src",
    title: "src",
    docs: [{ name: "index.js", type: "file", url: indexJsUrl }],
  }

  const rootFolder: DirectoryDocument = {
    "@patchwork": { type: "folder" },
    name: "my-automerge-pkg",
    title: "my-automerge-pkg",
    docs: [
      { name: "package.json", type: "file", url: pkgJsonUrl },
      { name: "src", type: "folder", url: srcFolderUrl },
      { name: "README.md", type: "file", url: readmeUrl },
    ],
  }

  mockDocs.set(rootUrl, rootFolder)
  mockDocs.set(pkgJsonUrl, pkgJson)
  mockDocs.set(srcFolderUrl, srcFolder)
  mockDocs.set(indexJsUrl, indexJs)
  mockDocs.set(readmeUrl, readme)

  return { rootUrl, pkgJsonUrl, srcFolderUrl, indexJsUrl, readmeUrl }
}

// Set up a package with a dist/ subfolder for subpath testing
function setupPackageWithSubpath() {
  const rootUrl = mockUrl("subpathRoot")
  const pkgJsonUrl = mockUrl("subpathPkgJson")
  const distFolderUrl = mockUrl("distFolder")
  const distPkgJsonUrl = mockUrl("distPkgJson")
  const distIndexUrl = mockUrl("distIndex")

  const rootPkgJson: FileDocument = {
    "@patchwork": { type: "file" },
    name: "package.json",
    extension: ".json",
    mimeType: "application/json",
    content: JSON.stringify({ name: "subpath-pkg", version: "2.0.0" }),
    metadata: { permissions: 0o644 },
  }

  const distPkgJson: FileDocument = {
    "@patchwork": { type: "file" },
    name: "package.json",
    extension: ".json",
    mimeType: "application/json",
    content: JSON.stringify({
      name: "subpath-pkg",
      version: "2.0.0",
      main: "index.js",
    }),
    metadata: { permissions: 0o644 },
  }

  const distIndex: FileDocument = {
    "@patchwork": { type: "file" },
    name: "index.js",
    extension: ".js",
    mimeType: "application/javascript",
    content: 'export default "from dist"\n',
    metadata: { permissions: 0o644 },
  }

  const distFolder: DirectoryDocument = {
    "@patchwork": { type: "folder" },
    name: "dist",
    title: "dist",
    docs: [
      { name: "package.json", type: "file", url: distPkgJsonUrl },
      { name: "index.js", type: "file", url: distIndexUrl },
    ],
  }

  const rootFolder: DirectoryDocument = {
    "@patchwork": { type: "folder" },
    name: "subpath-pkg",
    title: "subpath-pkg",
    docs: [
      { name: "package.json", type: "file", url: pkgJsonUrl },
      { name: "dist", type: "folder", url: distFolderUrl },
    ],
  }

  mockDocs.set(rootUrl, rootFolder)
  mockDocs.set(pkgJsonUrl, rootPkgJson)
  mockDocs.set(distFolderUrl, distFolder)
  mockDocs.set(distPkgJsonUrl, distPkgJson)
  mockDocs.set(distIndexUrl, distIndex)

  return { rootUrl, distFolderUrl }
}

beforeEach(() => {
  mockDocs.clear()
})

describe("resolver", () => {
  it("canResolve detects automerge: URLs", async () => {
    const { canResolve } = await import("../src/resolver.js")
    expect(canResolve("automerge:abc123")).toBe(true)
    expect(canResolve("automerge:4NMNnkMhL8jXrdJ9jamS58PAVdXu")).toBe(true)
  })

  it("canResolve ignores non-automerge specs", async () => {
    const { canResolve } = await import("../src/resolver.js")
    expect(canResolve("lodash@^4.0.0")).toBe(false)
    expect(canResolve("https://example.com/foo.tgz")).toBe(false)
    expect(canResolve("file:../local-pkg")).toBe(false)
    expect(canResolve("")).toBe(false)
  })

  it("parseAutomergeSpec parses simple URL", async () => {
    const { parseAutomergeSpec } = await import("../src/resolver.js")
    const result = parseAutomergeSpec("automerge:4NMNnkMhL8jXrdJ9jamS58PAVdXu")
    expect(result.automergeUrl).toBe("automerge:4NMNnkMhL8jXrdJ9jamS58PAVdXu")
    expect(result.subpath).toBeUndefined()
  })

  it("parseAutomergeSpec parses URL with subpath", async () => {
    const { parseAutomergeSpec } = await import("../src/resolver.js")
    const result = parseAutomergeSpec(
      "automerge:4NMNnkMhL8jXrdJ9jamS58PAVdXu/dist"
    )
    expect(result.automergeUrl).toBe("automerge:4NMNnkMhL8jXrdJ9jamS58PAVdXu")
    expect(result.subpath).toBe("dist")
  })

  it("resolve reads package.json and returns resolution", async () => {
    const { resolve } = await import("../src/resolver.js")
    const { rootUrl } = setupSimplePackage()
    const repo = createMockRepo()

    const result = await resolve(rootUrl, repo)

    expect(result.resolution.type).toBe("custom:automerge")
    expect(result.resolution.automergeUrl).toBe(rootUrl)
    expect(result.manifest?.name).toBe("my-automerge-pkg")
    expect(result.manifest?.version).toBe("1.0.0")
    expect(result.resolvedVia).toBe("automerge")
    expect(result.id).toContain("automerge:rootDoc123")
  })

  it("resolve handles subpath URLs", async () => {
    const { resolve } = await import("../src/resolver.js")
    setupPackageWithSubpath()
    const repo = createMockRepo()

    const result = await resolve("automerge:subpathRoot/dist", repo)

    expect(result.resolution.automergeUrl).toBe("automerge:subpathRoot/dist")
    expect(result.manifest?.name).toBe("subpath-pkg")
  })
})

describe("fetcher", () => {
  it("canFetch detects custom:automerge resolution", async () => {
    const { canFetch } = await import("../src/fetcher.js")
    expect(canFetch("", { type: "custom:automerge" })).toBe(true)
  })

  it("canFetch ignores other resolution types", async () => {
    const { canFetch } = await import("../src/fetcher.js")
    expect(canFetch("", { type: "directory" })).toBe(false)
    expect(canFetch("", { type: "git" })).toBe(false)
    expect(canFetch("", {})).toBe(false)
  })

  it("fetch walks tree and produces tarball", async () => {
    const { fetchToTarball: fetch } = await import("../src/fetcher.js")
    const { rootUrl } = setupSimplePackage()
    const repo = createMockRepo()

    const result = await fetch(
      { type: "custom:automerge", automergeUrl: rootUrl },
      repo
    )

    expect(result.tarballPath).toMatch(/\.tgz$/)

    // Verify tarball exists
    const fs = await import("node:fs/promises")
    const stat = await fs.stat(result.tarballPath)
    expect(stat.size).toBeGreaterThan(0)

    // Extract and verify contents
    const { list } = await import("tar")
    const entries: string[] = []
    await list({
      file: result.tarballPath,
      onReadEntry: (entry) => entries.push(entry.path),
    })

    expect(entries).toContain("package/package.json")
    expect(entries).toContain("package/src/index.js")
    expect(entries).toContain("package/README.md")

    await result.cleanup()
  })

  it("fetch resolves subpath to subfolder", async () => {
    const { fetchToTarball: fetch } = await import("../src/fetcher.js")
    setupPackageWithSubpath()
    const repo = createMockRepo()

    const result = await fetch(
      { type: "custom:automerge", automergeUrl: "automerge:subpathRoot/dist" },
      repo
    )

    const { list } = await import("tar")
    const entries: string[] = []
    await list({
      file: result.tarballPath,
      onReadEntry: (entry) => entries.push(entry.path),
    })

    expect(entries).toContain("package/package.json")
    expect(entries).toContain("package/index.js")
    // Should NOT contain root-level files, only dist/ contents
    expect(entries).not.toContain("package/dist/index.js")

    await result.cleanup()
  })
})

describe("automerge-client", () => {
  it("walkFolderTree collects all files recursively", async () => {
    const { walkFolderTree } = await import("../src/automerge-client.js")
    setupSimplePackage()
    const repo = createMockRepo()

    const files = await walkFolderTree(repo, mockUrl("rootDoc123"))

    expect(files).toHaveLength(3)

    const paths = files.map((f) => f.path)
    expect(paths).toContain("package.json")
    expect(paths).toContain("src/index.js")
    expect(paths).toContain("README.md")

    const pkgJson = files.find((f) => f.path === "package.json")!
    const parsed = JSON.parse(pkgJson.content.toString())
    expect(parsed.name).toBe("my-automerge-pkg")

    const indexJs = files.find((f) => f.path === "src/index.js")!
    expect(indexJs.content.toString()).toContain("hello")
  })

  it("readPackageJson extracts name and version", async () => {
    const { readPackageJson } = await import("../src/automerge-client.js")
    setupSimplePackage()
    const repo = createMockRepo()

    const pkg = await readPackageJson(repo, mockUrl("rootDoc123"))
    expect(pkg.name).toBe("my-automerge-pkg")
    expect(pkg.version).toBe("1.0.0")
  })

  it("readPackageJson throws if no package.json found", async () => {
    const { readPackageJson } = await import("../src/automerge-client.js")
    const emptyUrl = mockUrl("emptyFolder")
    mockDocs.set(emptyUrl, {
      "@patchwork": { type: "folder" },
      name: "empty",
      title: "empty",
      docs: [],
    })
    const repo = createMockRepo()

    await expect(readPackageJson(repo, emptyUrl)).rejects.toThrow(
      /No package\.json found/
    )
  })
})

describe("createPatchworkPlugin", () => {
  it("creates a plugin with resolvers and fetchers", async () => {
    const { createPatchworkPlugin } = await import("../src/index.js")
    const repo = createMockRepo()
    const plugin = createPatchworkPlugin({ repo })

    expect(plugin.resolvers.canResolve).toBeTypeOf("function")
    expect(plugin.resolvers.resolve).toBeTypeOf("function")
    expect(plugin.fetchers.canFetch).toBeTypeOf("function")
    expect(plugin.fetchers.fetch).toBeTypeOf("function")
    expect(plugin.shutdown).toBeTypeOf("function")
  })

  it("full round-trip: resolve then fetch", async () => {
    const { createPatchworkPlugin } = await import("../src/index.js")
    setupSimplePackage()
    const repo = createMockRepo()
    const plugin = createPatchworkPlugin({ repo })

    const spec = "automerge:rootDoc123"
    expect(plugin.resolvers.canResolve(spec)).toBe(true)

    const resolution = await plugin.resolvers.resolve(spec)
    expect(resolution.manifest?.name).toBe("my-automerge-pkg")
    expect(plugin.fetchers.canFetch("", resolution.resolution)).toBe(true)

    const { tarballPath, cleanup } = await plugin.fetchers.fetch(
      resolution.resolution
    )

    // Verify the tarball has expected files
    const { list } = await import("tar")
    const entries: string[] = []
    await list({
      file: tarballPath,
      onReadEntry: (entry) => entries.push(entry.path),
    })

    expect(entries).toContain("package/package.json")
    expect(entries).toContain("package/src/index.js")
    expect(entries).toContain("package/README.md")

    await cleanup()
    await plugin.shutdown()
  })
})
