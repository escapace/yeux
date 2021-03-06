import { safeReadPackage as readPackageJson } from '@pnpm/read-package-json'
import fse from 'fs-extra'
import { find, isString } from 'lodash-es'
import path from 'path'
import supportsColor from 'supports-color'
import { fileURLToPath } from 'url'
import { State, Vite, ViteConfig } from './types'
import { resolve } from './utilities/resolve'
import semver from 'semver'
import { NODE_SEMVER } from './constants'
import { z } from 'zod'
import { stat } from 'fs/promises'

const Options = z
  .object({
    directory: z
      .string()
      .refine(async (value) => (await stat(value)).isDirectory()),
    command: z.enum(['build', 'dev', 'preview'] as const),
    configPath: z.string().optional(),
    host: z.string().default('127.0.0.1'),
    port: z
      .number()
      .int()
      .default(3000)
      .refine((value) => value > 0),
    target: z
      .string()
      .refine((value) => semver.valid(value))
      .optional()
  })
  .strict()

const createState = async (
  options: z.input<typeof Options>
): Promise<State> => {
  const {
    directory,
    host,
    port,
    target: _target,
    command,
    configPath: _configPath
  } = await Options.parseAsync(options)

  const basedir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../'
  )

  const templatePath = path.join(directory, 'index.html')

  const serverSSREntryPath = path.join(directory, 'src/entry-ssr.ts')
  const clientEntryPath = path.join(directory, 'src/entry-browser.ts')
  const serverCreateInstancePath = path.join(
    directory,
    'src/create-instance.ts'
  )
  const serverAPIEntryPath = path.join(directory, 'src/entry-api.ts')

  const configPath =
    _configPath === undefined
      ? find(
          [
            (await fse.pathExists(path.join(directory, 'vite.config.ts')))
              ? 'vite.config.ts'
              : undefined,
            (await fse.pathExists(path.join(directory, 'vite.config.js')))
              ? 'vite.config.js'
              : undefined
          ],
          (name) => isString(name)
        )
      : path.relative(directory, path.resolve(directory, _configPath))

  const packageJSONPath = path.join(directory, 'package.json')
  const tsconfigPath = path.join(directory, 'tsconfig.json')

  const conditions = [
    await fse.pathExists(directory),
    await fse.pathExists(path.join(directory, 'node_modules', '.bin', 'vite')),
    configPath !== undefined &&
      !configPath.startsWith('../') &&
      (await fse.pathExists(path.join(directory, configPath))),
    await fse.pathExists(packageJSONPath),
    await fse.pathExists(tsconfigPath)
  ]

  if (conditions.includes(false)) {
    throw new Error('Not a vite directory.')
  }

  const packageJson = await readPackageJson(packageJSONPath)

  if (packageJson === null) {
    throw new Error(`package.json: unable to read`)
  }

  const nodeMinVersion = semver.minVersion(NODE_SEMVER)?.version as string

  const targetVersion =
    _target ??
    (semver.minVersion(
      isString(packageJson.engines?.node)
        ? semver.validRange(packageJson.engines?.node) ?? NODE_SEMVER
        : NODE_SEMVER
    )?.version as string)

  if (!semver.satisfies(targetVersion, NODE_SEMVER)) {
    throw new Error(`Minumum target version is ${nodeMinVersion}.`)
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sourceMapSupportVersion = (await readPackageJson(
    path.join(basedir, 'package.json')
  ))!.dependencies!['source-map-support']

  const vite = (await import(await resolve('vite', directory))) as Vite

  const nodeEnv = {
    build: 'production',
    preview: 'staging',
    dev: 'development'
  }[command]

  const viteConfig: ViteConfig = await vite.resolveConfig(
    { configFile: configPath, root: directory },
    'build',
    nodeEnv
  )

  if (!(await fse.pathExists(clientEntryPath))) {
    throw new Error(
      `${path.relative(directory, clientEntryPath)}: No such file.`
    )
  }

  if (!(await fse.pathExists(serverSSREntryPath))) {
    throw new Error(
      `${path.relative(directory, serverSSREntryPath)}: No such file.`
    )
  }

  if (!(await fse.pathExists(serverCreateInstancePath))) {
    throw new Error(
      `${path.relative(directory, serverCreateInstancePath)}: No such file.`
    )
  }

  if (!(await fse.pathExists(templatePath))) {
    throw new Error(`${path.relative(directory, templatePath)}: No such file.`)
  }

  const outputDirectory = path.resolve(directory, viteConfig.build.outDir)
  const clientOutputDirectory = path.join(outputDirectory, 'client')
  const serverOutputDirectory = path.join(
    outputDirectory,
    command === 'dev' ? 'dev' : 'server'
  )

  const serverSSRManifestPath = path.join(
    serverOutputDirectory,
    'manifest.json'
  )
  const serverSSREntryCompiledPath = path.join(
    serverOutputDirectory,
    'entry-ssr.mjs'
  )
  const serverSSRTemplatePath = path.join(serverOutputDirectory, 'index.html')
  const serverCreateInstanceCompiledPath = path.join(
    serverOutputDirectory,
    'create-instance.mjs'
  )

  const serverAPIEntryCompiledPath = path.join(
    serverOutputDirectory,
    'entry-api.mjs'
  )

  const serverIndexPath = path.join(serverOutputDirectory, 'index.mjs')

  const umask = 0o027
  const maskFile = 0o666 & ~umask
  const maskDirectory = 0o777 & ~umask

  return {
    basedir,
    clientOutputDirectory,
    color: !(supportsColor.stdout === false),
    command,
    directory,
    maskDirectory,
    maskFile,
    nodeEnv,
    outputDirectory,
    packageJson,
    serverAPIEntryCompiledPath,
    serverAPIEntryEnable: await fse.pathExists(serverAPIEntryPath),
    serverAPIEntryPath,
    serverCreateInstanceCompiledPath,
    serverCreateInstancePath,
    serverHMRPort: 24678,
    serverHMRPrefix: '/hmr',
    serverHost: host,
    serverIndexPath,
    serverOutputDirectory,
    serverPort: port,
    serverSSREntryCompiledPath,
    serverSSREntryPath,
    serverSSRManifestPath,
    serverSSRTemplatePath,
    sourceMapSupportVersion,
    target: `node${targetVersion}`,
    templatePath,
    tsconfigPath,
    umask,
    vite,
    viteConfig
  }
}

export const yeux = async (options: z.input<typeof Options>) => {
  const state = await createState(options)

  process.env.NODE_ENV = state.nodeEnv

  process.umask(state.umask)
  process.chdir(state.directory)

  if (state.command === 'build') {
    const { build } = await import('./commands/build')

    await build(state)
  } else if (state.command === 'preview') {
    const { preview } = await import('./commands/preview')

    await preview(state)
  } else {
    const { dev } = await import('./commands/dev')

    await dev(state)
  }
}
