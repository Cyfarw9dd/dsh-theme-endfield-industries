/**
 * tsdown.config.mjs — build the browser client half into a single-file artifact.
 *
 * Mirrors how @deepseek-ai's own client packages are produced (tsdown bundles
 * src/ into lib/client.js; dsh-client-modules even parses the tsdown source-map
 * trailer). We keep the artifact at the repo root as ./client.js because the
 * package's exports["./client"] points there and the DSH plugin loader serves
 * exactly that path.
 *
 * The raw-css plugin is the one piece of machinery: styles live as REAL .css
 * files (editor/lint support, no template-literal escaping rules) and are
 * embedded verbatim (JSON.stringify) into the artifact at build time.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

const RAW_QUERY = /\?raw$/

export default {
  entry: { client: 'src/client/index.js' },
  outDir: 'dist',
  format: 'iife',
  minify: false,
  sourcemap: false,
  target: 'es2020',
  platform: 'browser',
  plugins: [
    {
      name: 'raw-css',
      resolveId(source, importer) {
        if (RAW_QUERY.test(source)) {
          return path.resolve(path.dirname(importer), source)
        }
      },
      load(id) {
        if (RAW_QUERY.test(id)) {
          const text = readFileSync(id.replace(RAW_QUERY, ''), 'utf8')
          return `export default ${JSON.stringify(text)}`
        }
      },
    },
  ],
}
