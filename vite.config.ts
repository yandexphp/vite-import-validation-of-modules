/* vite.config.ts */
import {defineConfig, normalizePath, Plugin} from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const viteImportValidationOfModules = (): Plugin => {
  const rootSrc = path.join(process.cwd(), 'src')
  const restrictedModules = fs.readdirSync(path.join(rootSrc, 'modules')).filter(dir => fs.statSync(path.join(rootSrc, 'modules', dir)).isDirectory())

  return {
    name: 'vite-import-validation-of-modules',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer) {
        return null
      }

      let normalizedImporter = normalizePath(importer)
      let normalizedSource = normalizePath(source)
      let isFileExists = false

      if(normalizedImporter.includes('node_modules')) {
        return null
      }

      let absoluteImportPath = normalizePath(path.join(path.dirname(normalizedImporter), normalizedSource))

      try {
        isFileExists = fs.existsSync(absoluteImportPath)

        if(!isFileExists) {
          return null
        }
      } catch {
        return null
      }

      if(!absoluteImportPath.includes(normalizePath('/src/modules'))) {
        return null
      }

      if(!path.extname(normalizedSource)) {
        const files = await fs.promises.readdir(absoluteImportPath)

        const indexFilesMap = new Map<number, string>(
            files
                .filter(file => path.basename(file, path.extname(file)).toLowerCase() === 'index')
                .map((file, index) => [index, file])
        )

        if(indexFilesMap.size) {
          absoluteImportPath = path.extname(absoluteImportPath) ? absoluteImportPath : normalizePath(path.join(absoluteImportPath, String(indexFilesMap.get(0))))
          normalizedSource = path.extname(normalizedSource) ? normalizedSource : normalizePath(path.join(normalizedSource, String(indexFilesMap.get(0))))
        }
      }

      for (const restrictedModule of restrictedModules) {
        const modulePath = normalizePath(path.join(process.cwd(), 'src', 'modules', restrictedModule))

        if(!absoluteImportPath.startsWith(modulePath)) {
          continue
        }

        const moduleIndexPath = normalizePath(path.join(modulePath, 'index.ts'))

        if(!normalizedImporter.includes(modulePath) && (absoluteImportPath !== moduleIndexPath)) {
          const errorMessage = `Importing a file from path ${absoluteImportPath} into a file at path ${normalizedImporter} is not possible due to scope and module boundary violations. If you want to use this imported file ${path.basename(absoluteImportPath)}, specify its export from the file at path ${moduleIndexPath}`
          console.error(errorMessage)
          throw new Error(errorMessage)
        }
      }

      return null
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteImportValidationOfModules()],
})
