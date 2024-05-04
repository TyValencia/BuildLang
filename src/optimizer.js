// The optimizer module exports a single function, optimize(node), to perform
// machine-independent optimizations on the analyzed semantic representation.
//
// The only optimizations supported here are:
//
//   - assignments to self (x = x) turn into no-ops
//   - constant folding
//   - some strength reductions (+0, -0, *0, *1, etc.)
//   - turn references to built-ins true and false to be literals
//   - remove all disjuncts in || list after literal true
//   - remove all conjuncts in && list after literal false
//   - while-false becomes a no-op
//   - repeat-0 is a no-op
//   - for-loop over empty array is a no-op
//   - for-loop with low > high is a no-op
//   - if-true and if-false reduce to only the taken arm
//
// The optimizer also replaces token references with their actual values,
// since the original token line and column numbers are no longer needed.
// This simplifies code generation.

import * as core from "./core.js"

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node
}

// function isTailRecursive(functionDecl) {
//   let lastStatement = functionDecl.body?.[functionDecl.body.length - 1];

//   if (lastStatement?.kind === 'IfStatement') {
//       const branch = lastStatement.alternate || lastStatement.consequent;
//       lastStatement = branch[branch.length - 1];
//   }

//   if (lastStatement?.kind !== 'ReturnStatement') return false;

//   let expr = lastStatement.expression;
//   if (expr.kind === 'BinaryExpression' && (expr.left.kind === 'FunctionCall' || expr.right.kind === 'FunctionCall')) {
//       expr = expr.left.kind === 'FunctionCall' ? expr.left : expr.right;
//   }
//   if (expr.kind === 'FunctionCall' && expr.callee.name === functionDecl.fun.name) {
//       return true;
//   }

//   return false;
// }

const optimizers = {
  Program(p) {
    p.statements = p.statements.flatMap(optimize)
    return p
  },
  VariableDeclaration(d) {
    d.variable = optimize(d.variable)
    d.initializer = optimize(d.initializer)
    return d
  },
  FunctionDeclaration(d) {
    d.fun = optimize(d.fun);
    if (d.body) {
      // if (isTailRecursive(d)) {
      //   d.body = transformTailRecursiveFunction(d);
      // } else {
        if (d.body) d.body = d.body.flatMap(optimize)
      // }
    }
    return d;
  },

  // Tail recursion elimination
  // isTailRecursive(functionDecl) {
  //   const lastStatement = functionDecl.body[functionDecl.body.length - 1];
  //   return lastStatement && lastStatement.kind === 'ReturnStatement' &&
  //          lastStatement.expression.kind === 'FunctionCall' &&
  //          lastStatement.expression.callee.name === functionDecl.fun.name;
  // },
  // transformTailRecursiveFunction(functionDecl) {
  //   const lastStatement = functionDecl.body.pop(); 
  //   const params = functionDecl.params.map(p => p.name);
  //   const args = lastStatement.expression.args.map(optimize);
  
  //   let updates = params.map((param, index) => ({
  //     kind: 'Assignment',
  //     target: { kind: 'Variable', name: param },
  //     source: args[index]
  //   }));
  //   let newBody = [
  //     ...functionDecl.body,
  //     ...updates,
  //     {
  //       kind: 'WhileStatement',
  //       test: { kind: 'BooleanLiteral', value: true },
  //       body: [...functionDecl.body, ...updates]
  //     }
  //   ];
  //     return newBody.flatMap(optimize);
  // },

  Increment(s) {
    s.variable = optimize(s.variable)
    return s
  },
  Decrement(s) {
    s.variable = optimize(s.variable)
    return s
  },
  Assignment(s) {
    s.source = optimize(s.source)
    s.target = optimize(s.target)
    if (s.source === s.target) {
      return []
    }
    return s
  },
  BreakStatement(s) {
    return s
  },
  ReturnStatement(s) {
    s.expression = optimize(s.expression)
    return s
  },
  ShortReturnStatement(s) {
    return s
  },
  IfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    if (s.alternate?.kind?.endsWith?.("IfStatement")) {
      s.alternate = optimize(s.alternate)
    } else {
      s.alternate = s.alternate.flatMap(optimize)
    }
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : s.alternate
    }
    return s
  },
  ShortIfStatement(s) {
    s.test = optimize(s.test)
    s.consequent = s.consequent.flatMap(optimize)
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : []
    }
    return s
  },
  WhileStatement(s) {
    s.test = optimize(s.test)
    if (s.test === false) {
      // while false is a no-op
      return []
    }
    s.body = s.body.flatMap(optimize)
    return s
  },
  RepeatStatement(s) {
    s.count = optimize(s.count)
    if (s.count === 0) {
      // repeat 0 times is a no-op
      return []
    }
    s.body = s.body.flatMap(optimize)
    return s
  },
  ForRangeStatement(s) {
    s.iterator = optimize(s.iterator)
    s.low = optimize(s.low)
    s.op = optimize(s.op)
    s.high = optimize(s.high)
    s.body = s.body.flatMap(optimize)
    if (s.low.constructor === Number) {
      if (s.high.constructor === Number) {
        if (s.low > s.high) {
          return []
        }
      }
    }
    return s
  },
  ForStatement(s) {
    s.iterator = optimize(s.iterator)
    s.collection = optimize(s.collection)
    s.body = s.body.flatMap(optimize)
    if (s.collection?.kind === "EmptyArray") {
      return []
    }
    return s
  },
  BinaryExpression(e) {
    e.op = optimize(e.op)
    e.left = optimize(e.left)
    e.right = optimize(e.right)
    if (e.op === "&&") {
      // Optimize boolean constants in && and ||
      if (e.left === true) return e.right
      else if (e.right === true) return e.left
    } else if (e.op === "||") {
      if (e.left === false) return e.right
      else if (e.right === false) return e.left
    } else if ([Number, BigInt].includes(e.left.constructor)) {
      // Numeric constant folding when left operand is constant
      if ([Number, BigInt].includes(e.right.constructor)) {
        if (e.op === "+") return e.left + e.right
        else if (e.op === "-") return e.left - e.right
        else if (e.op === "*") return e.left * e.right
        else if (e.op === "/") return e.left / e.right
        else if (e.op === "**") return e.left ** e.right
        else if (e.op === "<") return e.left < e.right
        else if (e.op === "<=") return e.left <= e.right
        else if (e.op === "==") return e.left === e.right
        else if (e.op === "!=") return e.left !== e.right
        else if (e.op === ">=") return e.left >= e.right
        else if (e.op === ">") return e.left > e.right
      } else if (e.left === 0 && e.op === "+") return e.right
      else if (e.left === 1 && e.op === "*") return e.right
      else if (e.left === 0 && e.op === "-") return core.unary("-", e.right)
      else if (e.left === 1 && e.op === "**") return 1
      else if (e.left === 0 && ["*", "/"].includes(e.op)) return 0
    } else if ([Number, BigInt].includes(e.right.constructor)) {
      // Numeric constant folding when right operand is constant
      if (["+", "-"].includes(e.op) && e.right === 0) return e.left
      else if (["*", "/"].includes(e.op) && e.right === 1) return e.left
      else if (e.op === "*" && e.right === 0) return 0
      else if (e.op === "**" && e.right === 0) return 1
    }
    return e
  },
  UnaryExpression(e) {
    e.op = optimize(e.op)
    e.operand = optimize(e.operand)
    if (e.operand.constructor === Number) {
      if (e.op === "-") {
        return -e.operand
      }
    }
    return e
  },
  SubscriptExpression(e) {
    e.array = optimize(e.array)
    e.index = optimize(e.index)
    return e
  },
  ArrayExpression(e) {
    e.elements = e.elements.map(optimize)
    return e
  },
  FunctionCall(c) {
    c.callee = optimize(c.callee)
    c.args = c.args.map(optimize)
    return c
  },
  RightPipeForward(r) {
    if (r.callee.name === 'square' && typeof r.args[0] === 'number') {
      return r.args[0] * r.args[0]; 
    }
    return r;  
  },
  LeftPipeForward(l) {
    if (l.callee.name === 'square' && typeof l.args[0] === 'number') {
      return l.args[0] * l.args[0];  
    }
    return l;  
  }
}
