import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * Privacy helpers: every analysis runs inside its own random temp directory,
 * which is deleted in a `finally` block when the request finishes.
 */

/** Create an isolated temp directory for one analysis run. */
export async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "cupid-"));
}

/** Delete a temp directory and everything inside it. Never throws. */
export async function cleanupTemporaryFiles(dir: string): Promise<void> {
  try {
    // Safety: only ever delete inside the OS temp directory.
    const resolved = path.resolve(dir);
    const tmpRoot = path.resolve(os.tmpdir());
    if (!resolved.startsWith(tmpRoot + path.sep)) return;
    await fs.rm(resolved, { recursive: true, force: true });
  } catch {
    // Best effort — nothing user-identifiable may leak via this path.
  }
}
