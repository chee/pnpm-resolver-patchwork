# pnpm-resolver-patchwork

> **Warning**: chee has not read line 1 of this codebase. It was entirely written by the computer.

A pnpm custom resolver and fetcher for installing packages from a [patchwork](https://github.com/inkandswitch/pushwork) filesystem (automerge-repo).

Specify dependencies as `automerge:<documentId>` in your `package.json` and pnpm will resolve and fetch them from the automerge sync server.

## Requirements

- pnpm v11 (alpha.4+) — uses the top-level `resolvers`/`fetchers` plugin API

## Setup

1. Build the plugin:

```sh
pnpm install
pnpm build
```

2. Create a `.pnpmfile.mjs` in your project root:

```js
import { createPnpmPlugin } from "pnpm-resolver-patchwork"

const patchwork = createPnpmPlugin()

export const resolvers = [...patchwork.resolvers]
export const fetchers = [...patchwork.fetchers]
```

3. Point pnpm at it in your `pnpm-workspace.yaml`:

```yaml
pnpmfile: .pnpmfile.mjs
```

4. Add automerge dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@patchwork/chat": "automerge:6iXwddwF9cwrjmM5yqp2xUENxUY"
  }
}
```

5. Run `pnpm install`.

## How it works

- **Resolver**: Detects `automerge:` specifiers, connects to the automerge sync server, reads the folder document's `package.json` to get the package manifest, and returns a `custom:automerge` resolution.

- **Fetcher**: Connects to the sync server, recursively walks the automerge folder document tree to collect all files, packs them into a tarball, and delegates to pnpm's built-in `localTarball` fetcher.

- **Caching**: The document ID + heads hash is used as the resolution ID in the lockfile, so installs are cached until the document changes.

## Subpath resolution

You can resolve a subfolder of a folder document as the package root:

```json
{
  "dependencies": {
    "my-pkg": "automerge:6iXwddwF9cwrjmM5yqp2xUENxUY/dist"
  }
}
```

## Configuration

The sync server defaults to `wss://sync3.automerge.org`. You can change it when creating the plugin:

```js
const mod = await import("path/to/dist/index.js")
const plugin = mod.createPnpmPlugin({ syncServerUrl: "wss://my-sync-server.example.com" })
```

## Tests

```sh
pnpm test
```

Unit tests use a mocked automerge repo. The e2e test runs `pnpm install` in `test/fixture/` against the real sync server.
