import { transformSync } from "@babel/core"
import { injectHMRInfo } from "./injectHMRInfo"
import { injectImport } from "./injectImport"
import { types } from "@babel/core"
import { injectAutoReload } from "./injectAutoReload"

export function setsunaPlugin() {
  return {
    name: "vite:setsuna",

    config() {
      return {
        esbuild: {
          include: /\.ts$/
        }
      }
    },

    transform(source, id) {
      if (!id.endsWith("jsx")) return

      let hasRender = false
      let hasDefineElement = false
      let hmrComponent = null
      const result = transformSync(source, {
        ast: true,
        sourceMaps: true,
        sourceFileName: id,
        babelrc: false,
        configFile: false,
        plugins: [
          [
            require("@babel/plugin-transform-react-jsx"),
            {
              runtime: "classic",
              pragma: "_jsx",
              pragmaFrag: "Fragment",
              useBuiltIns: true
            }
          ],
          {
            visitor: {
              Program(path) {
                hmrComponent = injectHMRInfo({ id, body: path.node.body })
              },
              ImportSpecifier(path) {
                if (
                  path.parentPath.node.source.value === "@setsuna/setsuna" &&
                  path.node.imported.name === "render" &&
                  path.scope.getBinding("render").referencePaths.length > 0
                ) {
                  hasRender = true
                }

                if (
                  path.parentPath.node.source.value === "@setsuna/setsuna" &&
                  path.node.imported.name === "defineElement" &&
                  path.scope.getBinding("defineElement").referencePaths.length >
                    0
                ) {
                  hasDefineElement = true
                }
              },
              ExportDefaultDeclaration(path, state) {
                if (!path.node.declaration.id) {
                  path.node.declaration.id = types.identifier("__default__")
                }
              }
            }
          }
        ]
      })

      injectImport({ result })
      debugger
      injectAutoReload({ result, hasRender, hasDefineElement, hmrComponent })
      return {
        code: result.code,
        map: result.map
      }
    }
  }
}
