import { types } from "@babel/core"
import { createHash } from "./createHash"

export function injectHMR({ id, body }) {
  const hash = createHash(id)
  const componentNames = new Set()
  const hmrComponent = []
  body.forEach(node => {
    let useNode = node
    const isExport = isExportDeclaration(node)

    if (isExport && node.specifiers?.length > 0) {
      return node.specifiers.forEach(item => {
        const name = item.exported.name
        componentNames.has(name) && hmrComponent.push(name)
      })
    }

    if (isExport) {
      node = useNode = node.declaration
    }

    if (node.type === "VariableDeclaration") {
      node = node.declarations.at(-1)
      useNode = node.init
    }

    const res = isAllowFunctionType(useNode, false)
    if (res) {
      if (!node.id) {
        return hmrComponent.push("__default__")
      }
      const name = node.id.name
      componentNames.add(name)

      if (isExport) {
        hmrComponent.push(name)
      }
    }
  })

  //   let code = "\n"
  //   hmrComponent.forEach(name => {
  //     code += `\n__SETSUNA_HMR_MAP__.createRecord("${activeOptions.hmrId}")`
  //     code += `\nimport.meta.hot.accept(mods => {
  //   if (!mods) return;
  //   for (const key in mods) {
  //     const app = mods[key]
  //     __SETSUNA_HMR_MAP__.invokeReload(app._hmrId, app)
  //   }
  // })`
  //   })
  //   result.code += code
  body.unshift(
    ...hmrComponent.map(name => {
      return types.expressionStatement(
        types.assignmentExpression(
          "=",
          types.memberExpression(
            types.Identifier(name),
            types.Identifier("hmrId"),
            false
          ),
          types.stringLiteral(id)
        )
      )
    })
  )
}

function isExportDeclaration({ type }) {
  return ["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(type)
}

function isAllowFunction(node, done) {
  if (isAsync(node)) {
    return false
  }

  let body = node.body
  if (body.type === "BlockStatement") {
    body = body.body

    const returnStatement = body.find(node => node.type === "ReturnStatement")
    if (!returnStatement) {
      return false
    }

    if (!done) {
      return isAllowFunctionType(returnStatement.argument, true)
    }
  }

  switch (body.type) {
    case "JSXElement":
    case "NullLiteral":
    case "JSXFragment": {
      return true
    }
    default: {
      return false
    }
  }
}

function isAsync(node) {
  return node.async || node.generator
}

function isAllowFunctionType(node, done) {
  return [
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression"
  ].includes(node.type)
    ? isAllowFunction(node, done)
    : false
}
