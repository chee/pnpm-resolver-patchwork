import type { AutomergeUrl } from "@automerge/automerge-repo"

export interface DirectoryEntry {
  name: string
  type: "file" | "folder"
  url: AutomergeUrl
}

export interface DirectoryDocument {
  "@patchwork": { type: "folder" }
  name: string
  title: string
  docs: DirectoryEntry[]
}

export interface FileDocument {
  "@patchwork": { type: "file" }
  name: string
  extension: string
  mimeType: string
  content: string | Uint8Array
  metadata: {
    permissions: number
  }
}

export interface FileEntry {
  path: string
  content: Buffer
  mode?: number
}

export interface AutomergeResolution {
  type: "custom:automerge"
  automergeUrl: string
}
