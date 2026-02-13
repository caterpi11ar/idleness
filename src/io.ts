import { existsSync, readFileSync } from 'node:fs'
import { chmod, copyFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import process from 'node:process'
import json5 from 'json5'

export function findConfigFile(
  name: string,
  type: string,
  paths: string[],
): string | undefined {
  const filename = `${name}.${type}`
  for (const dir of paths) {
    const fullPath = join(dir, filename)
    if (existsSync(fullPath)) {
      return fullPath
    }
  }
  return undefined
}

export function readConfigFile(path: string): Record<string, unknown> {
  const raw = readFileSync(path, 'utf-8')
  const parsed = json5.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config file must contain a JSON object: ${path}`)
  }
  return parsed as Record<string, unknown>
}

export async function atomicWriteFile(path: string, data: string): Promise<void> {
  const dir = dirname(path)

  const tmp = join(
    dir,
    `${basename(path)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  )

  await writeFile(tmp, data, { encoding: 'utf-8', mode: 0o600 })

  if (existsSync(path)) {
    await copyFile(path, `${path}.bak`).catch(() => {
      // best-effort backup
    })
  }

  try {
    await rename(tmp, path)
  }
  catch (err) {
    const code = (err as { code?: string }).code
    // Windows doesn't reliably support atomic replace via rename when dest exists
    if (code === 'EPERM' || code === 'EEXIST') {
      await copyFile(tmp, path)
      await chmod(path, 0o600).catch(() => {})
      await unlink(tmp).catch(() => {})
      return
    }
    await unlink(tmp).catch(() => {})
    throw err
  }
}
