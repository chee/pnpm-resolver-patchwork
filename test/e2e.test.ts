import { describe, it, expect, beforeAll, afterAll } from "vitest"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const exec = promisify(execFile)
const FIXTURE_DIR = path.join(import.meta.dirname, "fixture")
const PNPM = path.join(import.meta.dirname, "../node_modules/.bin/pnpm")

beforeAll(async () => {
  // Clean up any previous install
  await fs.rm(path.join(FIXTURE_DIR, "node_modules"), {
    recursive: true,
    force: true,
  })
  await fs.rm(path.join(FIXTURE_DIR, "pnpm-lock.yaml"), { force: true })
})

afterAll(async () => {
  await fs.rm(path.join(FIXTURE_DIR, "node_modules"), {
    recursive: true,
    force: true,
  })
  await fs.rm(path.join(FIXTURE_DIR, "pnpm-lock.yaml"), { force: true })
})

describe("e2e: pnpm install", () => {
  it("installs an automerge: dependency via pnpm", async () => {
    // Run pnpm install in the fixture directory
    const { stdout, stderr } = await exec(
      PNPM,
      ["install", "--no-frozen-lockfile"],
      {
        cwd: FIXTURE_DIR,
        timeout: 120_000,
        env: { ...process.env, npm_config_yes: "true" },
      }
    ).catch((err) => {
      // pnpm exits 1 for ERR_PNPM_IGNORED_BUILDS which isn't a real failure
      if (
        err.stderr?.includes("ERR_PNPM_IGNORED_BUILDS") ||
        err.stdout?.includes("ERR_PNPM_IGNORED_BUILDS")
      ) {
        return { stdout: err.stdout ?? "", stderr: err.stderr ?? "" }
      }
      throw err
    })

    const output = stdout + stderr
    expect(output).toContain("@patchwork/chat")

    // Verify the package was installed
    const pkgJsonPath = path.join(
      FIXTURE_DIR,
      "node_modules/@patchwork/chat/package.json"
    )
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf-8"))
    expect(pkgJson.name).toBe("@patchwork/chat")
    expect(pkgJson.version).toBe("0.2.0")

    // Verify actual source files exist
    const mainJs = path.join(
      FIXTURE_DIR,
      "node_modules/@patchwork/chat/main.js"
    )
    const stat = await fs.stat(mainJs)
    expect(stat.size).toBeGreaterThan(0)
  }, 120_000)
})
