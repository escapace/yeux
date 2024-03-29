import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import arg from 'arg'
import colors from 'chalk'
import { includes, pick, flatMap } from 'lodash-es'
import process from 'process'
import { ZodError } from 'zod'

declare const VERSION: string

const HELP = () => `yeux/${VERSION}

${colors.bold('Usage:')}
  yeux [options]

${colors.bold('Repository:')}
  https://github.com/escapace/yeux

${colors.bold('Commands:')}
  dev              start dev server (default)
  build            build for production
  preview          locally preview production build

${colors.bold('Options:')}
  --host [host]           [string] specify hostname (default: "127.0.0.1")
  --port <port>           [number] specify port (default: 3000)
  -h, --help              Display this message
  -v, --version           Display version number
`

const help = (message?: string): never => {
  console.log(HELP())

  if (message !== undefined) {
    console.error(message)

    process.exit(1)
  } else {
    process.exit(0)
  }
}

void (async () => {
  const args = arg({
    // types
    '--help': Boolean,
    '--host': String,
    '--port': Number,
    '--version': Boolean,

    // aliases
    '-h': '--help',
    '-v': '--version'
  })

  if (args['--help'] === true) {
    help()
  }

  if (args['--version'] === true) {
    console.log(VERSION)

    process.exit(0)
  }

  if (args._.length > 1) {
    help()
  }

  const command = (args._[0] ?? 'dev') as 'build' | 'dev' | 'preview'

  if (!includes(['build', 'dev', 'preview'], command)) {
    help(`${command}: unknown command.`)
  }

  const directory = process.cwd()

  const { yeux } = await import('./index')

  try {
    await yeux({
      command,
      directory,
      host: args['--host'],
      port: args['--port']
    })
  } catch (e) {
    if (e instanceof ZodError) {
      help(
        flatMap(
          pick(e.format(), ['host', 'port']) as Record<
            string,
            { _errors: string[] }
          >,
          (value, key) =>
            flatMap(
              value._errors,
              (message) => `${colors.red('Error:')} --${key} ${message}`
            )
        ).join('\n')
      )
    } else if (e instanceof Error) {
      console.error(`${colors.red('Error:')} ${e.message}`)
      process.exit(1)
    } else {
      console.error('Unknown Error')
      process.exit(1)
    }
  }
})()
