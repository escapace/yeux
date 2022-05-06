import type { PackageManifest } from '@pnpm/types'

import type {
  build,
  createServer,
  InlineConfig as ViteInlineConfig,
  resolveConfig,
  ResolvedConfig as ViteConfig,
  ViteDevServer
} from 'vite'

export type { ViteConfig, ViteDevServer, ViteInlineConfig }

export interface Vite {
  build: typeof build
  createServer: typeof createServer
  resolveConfig: typeof resolveConfig
}

export interface State {
  apiEntryCompiledPath: string
  apiEntryEnable: boolean
  apiEntryPath: string
  basedir: string
  clientOutputDirectory: string
  color: boolean
  command: 'build' | 'dev' | 'preview'
  createInstanceCompiledPath: string
  createInstancePath: string
  devIndexPath: string
  devOutputDirectory: string
  directory: string
  directoryMask: number
  fileMask: number
  hmrPort: number
  hmrPrefix: string
  host: string
  nodeEnv: string
  outputDirectory: string
  packageJson: PackageManifest
  port: number
  sourceMapSupportVersion: string
  ssrEntryCompiledPath: string
  ssrEntryPath: string
  ssrIndexPath: string
  ssrManifestPath: string
  ssrOutputDirectory: string
  ssrTemplatePath: string
  target: string
  templatePath: string
  tsconfigPath: string
  umask: number
  vite: Vite
  viteConfig: ViteConfig
}
