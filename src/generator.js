// The code generator exports a single function, generate(program), which
// accepts a program representation and returns the JavaScript translation
// as a string.

import { voidType, standardLibrary } from "./core.js"

export default function generate(program) {
  const output = []

  const standardFunctions = new Map([
    [standardLibrary.say, x => `console.log(${x})`],
    [standardLibrary.sin, x => `Math.sin(${x})`],
    [standardLibrary.cos, x => `Math.cos(${x})`],
    [standardLibrary.exp, x => `Math.exp(${x})`],
    [standardLibrary.ln, x => `Math.log(${x})`],
    [standardLibrary.hypot, ([x, y]) => `Math.hypot(${x},${y})`],
    [standardLibrary.bytes, s => `[...Buffer.from(${s}, "utf8")]`],
    [standardLibrary.codepoints, s => `[...(${s})].map(s=>s.codePointAt(0))`],
  ])

  const targetName = (mapping => {
    return entity => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1)
      }
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    Program(p) {
      p.statements.forEach(gen)
    },
    VariableDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`)
    },
    FunctionDeclaration(d) {
      output.push(`function ${gen(d.fun)}(${d.params.map(param => targetName(param)).join(", ")}) {`);
      d.body.forEach(gen)
      output.push("}")
    },
    Variable(v) {
      if (v === standardLibrary.π) return "Math.PI"
      return targetName(v)
    },
    Function(f) {
      return targetName(f)
    },
    Increment(s) {
      output.push(`${gen(s.variable)}++;`)
    },
    Decrement(s) {
      output.push(`${gen(s.variable)}--;`)
    },
    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`)
    },
    BreakStatement(s) {
      output.push("break;")
    },
    ReturnStatement(s) {
      output.push(`return ${gen(s.expression)};`)
    },
    ShortReturnStatement(s) {
      output.push("return;")
    },
    LeftPipeForward: function(e) {
      const args = e.args.map(arg => gen(arg)).join(", ");
      const callee = gen(e.callee);
      return `${callee}(${args})`;
    },
    RightPipeForward: function(e) {
      const args = e.args.map(arg => gen(arg)).join(", ");
      const callee = gen(e.callee);
      return `${callee}(${args})`;
    },
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`)
      s.consequent.forEach(gen)
      if (s.alternate?.kind?.endsWith?.("IfStatement")) {
        output.push("} else")
        gen(s.alternate)
      } else {
        output.push("} else {")
        s.alternate.forEach(gen)
        output.push("}")
      }
    },
    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`)
      s.consequent.forEach(gen)
      output.push("}")
    },
    WhileStatement(s) {
      output.push(`while (${gen(s.test)}) {`)
      s.body.forEach(gen)
      output.push("}")
    },
    RepeatStatement(s) {
      const i = targetName({ name: "i" })
      output.push(`for (let ${i} = 0; ${i} < ${gen(s.count)}; ${i}++) {`)
      s.body.forEach(gen)
      output.push("}")
    },
    ForRangeStatement(s) {
      const i = targetName(s.iterator)
      const op = s.op === "..." ? "<=" : "<"
      output.push(`for (let ${i} = ${gen(s.low)}; ${i} ${op} ${gen(s.high)}; ${i}++) {`)
      s.body.forEach(gen)
      output.push("}")
    },
    ForStatement(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`)
      s.body.forEach(gen)
      output.push("}")
    },
    BinaryExpression(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op
      return `(${gen(e.left)} ${op} ${gen(e.right)})`
    },
    UnaryExpression(e) {
      const operand = gen(e.operand)
      if (e.op === "random") {
        return `((a=>a[~~(Math.random()*a.length)])(${operand}))`
      } else if (e.op === "len") {
        return `${operand}.length`
      }
      return `${e.op}(${operand})`
    },
    SubscriptExpression(e) {
      return `${gen(e.array)}[${gen(e.index)}]`
    },
    ArrayExpression(e) {
      return `[${e.elements.map(gen).join(",")}]`
    },
    MemberExpression(e) {
      const object = gen(e.object)
      const field = JSON.stringify(gen(e.field))
      const chain = e.op === "." ? "" : e.op
      return `(${object}${chain}[${field}])`
    },
    FunctionCall(c) {
      const targetCode = standardFunctions.has(c.callee)
        ? standardFunctions.get(c.callee)(c.args.map(gen))
        : `${gen(c.callee)}(${c.args.map(gen).join(", ")})`
      if (c.callee.type.returnType !== voidType) {
        return targetCode
      }
      output.push(`${targetCode};`)
    },
  }

  program.statements.forEach(statement => {
    const result = gen(statement);
    if (result != "[object Object]") { // Skip pushing empty objects
      output.push(result + ";");  // Push the result of each top-level statement (specific for pipelines)
    }
  });  return output.join("\n")
}