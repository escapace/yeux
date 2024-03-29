import type { Manifest, ModuleGraph } from 'vite'

export type Fetch = (
  input: RequestInfo | URL,
  init?: RequestInit | undefined
) => Promise<Response>

export interface App {
  fetch: Fetch
}

export interface OptionsDevelopment {
  mode: 'development'
  command: 'dev'
  template: string
  moduleGraph: ModuleGraph
}

export interface OptionsProduction {
  mode: 'staging' | 'production'
  command: 'build' | 'preview'
  template: string
  manifest: {
    client: Manifest
    server: Manifest
    ssr: Record<string, string[] | undefined>
  }
}

export type OptionsStaging = OptionsProduction
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export type Options = OptionsDevelopment | OptionsProduction | OptionsStaging
export type CreateApp = (options: Options) => Promise<App>

declare global {
  const YEUX_OPTIONS: Options
}
