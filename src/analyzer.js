// Semantic Analyzer skeleton from Dr. Toal's Carlos project

import * as core from "./core.js"
import { intType, floatType, stringType, boolType, voidType } from './core.js';

// A few declarations to save typing
const INT = core.intType
const FLOAT = core.floatType
const STRING = core.stringType
const BOOLEAN = core.boolType
const ANY = core.anyType
const VOID = core.voidType

class Context {
  constructor({ parent = null, locals = new Map(), inLoop = false, currentFunction = null }) {
    this.parent = parent;
    this.locals = locals;
    this.inLoop = inLoop;
    this.currentFunction = currentFunction; 
  }

  add(name, entity) {
    this.locals.set(name, entity);
  }

  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name);
  }

  static root() {
    return new Context({ locals: new Map(Object.entries(core.standardLibrary)) });
  }

  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() });
  }

  getCurrentFunction() {
    return this.currentFunction || this.parent?.getCurrentFunction();
  }
}

export default function analyze(match) {
  let context = Context.root()

  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage()
      throw new Error(`${prefix}${message}`)
    }
  }

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.lookup(name), `Identifier ${name} already declared`, at)
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not declared`, at)
  }

  function mustHaveNumericType(e, at) {
    must([INT, FLOAT].includes(e.type), "Expected a number", at)
  }

  function mustHaveNumericOrStringType(e, at) {
    must([INT, FLOAT, STRING].includes(e.type), "Expected a number or string", at)
  }

  function mustHaveBooleanType(e, at) {
    must(e.type === BOOLEAN, "Expected a boolean", at)
  }

  function mustHaveIntegerType(e, at) {
    must(e.type === INT, "Expected an integer", at)
  }

  function mustHaveAnArrayType(e, at) {
    must(e.type?.kind === "ArrayType", "Expected an array", at)
  }

  function mustBothHaveTheSameType(e1, e2, at) {
    must(equivalent(e1.type, e2.type), "Operands do not have the same type", at)
  }

  function mustAllHaveSameType(expressions, at) {

    must(
      expressions.slice(1).every(e => equivalent(e.type, expressions[0].type)),
      "Not all elements have the same type",
      at
    )
  }

  function mustBeAType(e, at) {
    must(e?.kind.endsWith("Type"), "Type expected", at)
  }

  function mustBeAnArrayType(t, at) {
    must(t?.kind === "ArrayType", "Must be an array type", at)
  }

  function equivalent(t1, t2) {
    return (
      t1 === t2 ||
      (t1?.kind === "OptionalType" &&
        t2?.kind === "OptionalType" &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1?.kind === "ArrayType" &&
        t2?.kind === "ArrayType" &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1?.kind === "FunctionType" &&
        t2?.kind === "FunctionType" &&
        equivalent(t1.returnType, t2.returnType) &&
        t1.paramTypes.length === t2.paramTypes.length &&
        t1.paramTypes.every((t, i) => equivalent(t, t2.paramTypes[i])))
    )
  }

  function assignable(fromType, toType) {
    return (
      toType == ANY ||
      equivalent(fromType, toType) ||
      (fromType?.kind === "FunctionType" &&
        toType?.kind === "FunctionType" &&
        assignable(fromType.returnType, toType.returnType) &&
        fromType.paramTypes.length === toType.paramTypes.length &&
        toType.paramTypes.every((t, i) => assignable(t, fromType.paramTypes[i])))
    )
  }

  function typeDescription(type) {
    switch (type.kind) {
      case "IntType":
        return "int"
      case "FloatType":
        return "float"
      case "StringType":
        return "string"
      case "BoolType":
        return "bool"
      case "VoidType":
        return "void"
      case "AnyType":
        return "any"
      case "StructType":
        return type.name
      case "FunctionType":
        const paramTypes = type.paramTypes.map(typeDescription).join(", ")
        const returnType = typeDescription(type.returnType)
        return `(${paramTypes})->${returnType}`
      case "ArrayType":
        return `[${typeDescription(type.baseType)}]`
      case "OptionalType":
        return `${typeDescription(type.baseType)}?`
    }
  }

  function mustBeAssignable(e, { toType: type }, at) {
    const message = `Cannot assign a ${typeDescription(e.type)} to a ${typeDescription(
      type
    )}`
    must(assignable(e.type, type), message, at)
  }

  function mustNotBeReadOnly(e, at) {
    must(!e.readOnly, `Cannot assign to constant ${e.name}`, at)
  }

  function mustHaveDistinctFields(type, at) {
    const fieldNames = new Set(type.fields.map(f => f.name))
    must(fieldNames.size === type.fields.length, "Fields must be distinct", at)
  }

  function mustHaveMember(structType, field, at) {
    must(structType.fields.map(f => f.name).includes(field), "No such field", at)
  }

  function mustBeInLoop(at) {
    must(context.inLoop, "Break can only appear in a loop", at)
  }

  function mustBeInAFunction(at) {
    must(context.function, "Return can only appear in a function", at)
  }

  function mustBeCallable(e, at) {
    const callable = e?.kind === "StructType" || e.type?.kind === "FunctionType"
    must(callable, "Call of non-function or non-constructor", at)
  }

  function mustNotReturnAnything(f, at) {
    must(f.type.returnType === VOID, "Something should be returned", at)
  }

  function mustReturnSomething(f, at) {
    must(f.type.returnType !== VOID, "Cannot return a value from this function", at)
  }

  function mustBeReturnable(e, { from: f }, at) {
    mustBeAssignable(e, { toType: f.type.returnType }, at)
  }

  function mustHaveCorrectArgumentCount(argCount, paramCount, at) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`
    must(argCount === paramCount, message, at)
  }


  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map(s => s.rep()))
    },

    VarDecl(type, id, _eq, exp) {
      const { type: baseType, readOnly } = type.rep();
      const initializer = exp.rep();
      const variable = core.variable(id.sourceString, readOnly, baseType);
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },    

    FunDecl(async, _block, id, parameters, _sends, type, _colon, stmtBlock) {
      const fun = core.fun(id.sourceString);
      mustNotAlreadyBeDeclared(id.sourceString, { at: id });
    
      const params = parameters.rep();
      const paramTypes = params.map(param => param.type);
    
      const returnTypeRep = type.rep();
      fun.type = core.functionType(paramTypes, returnTypeRep);
    
      context.add(id.sourceString, fun);
    
      const functionContext = context.newChildContext({ currentFunction: fun });
    
      context = functionContext;
      const body = stmtBlock.rep();
    
      context = functionContext.parent;
    
      console.log("Return type rep: ", returnTypeRep);
      console.log("Function type set as: ", fun.type);
      console.log("Context after restoring: ", context);
    
      return core.functionDeclaration(fun, params, body);
    },
    
    Param(type, id) {
      return { kind: 'Parameter', type: type.rep(), name: id.sourceString };
    },

    Params(_left, params, _right) {
      return params.rep(); 
    },

    _iter(...children) {
      return children.map(child => child.rep());
    },

    ListOf(children) {
      return children.asIteration().children.map(child => child.rep());
    },
    
    NonemptyListOf(_open, children, _close) {
      return children.asIteration().children.map(child => child.rep());
    },

    TypeArray(_left, baseType, _right) { 
      return core.arrayType(baseType.rep())
    },

    Args(args) {
      return args.children.map(child => child.rep());
    },

    Assignment_multipleAssignment(idList, _eq, expList) {
      const ids = idList.asIteration().children.map(id => id.sourceString)
      const exps = expList.asIteration().children.map(exp => exp.rep())
      const variables = ids.map(id => context.lookup(id))
      const assignments = variables.map((variable, i) => core.assignment(variable, exps[i]))
      return core.sequence(assignments)
    },

    Stmt_bump(exp, operator) {
      const variable = exp.rep()
      mustHaveIntegerType(variable, { at: exp })
      return operator.sourceString === "++"
        ? core.increment(variable)
        : core.decrement(variable)
    },
    
    Stmt_break(breakKeyword) {
      mustBeInLoop({ at: breakKeyword })
      return core.breakStatement
    },
    
    Stmt_return(returnKeyword, exp) {
      mustBeInAFunction({ at: returnKeyword })
      mustReturnSomething(context.function, { at: returnKeyword })
      const returnExpression = exp.rep()
      mustBeReturnable(returnExpression, { from: context.function }, { at: exp })
      return core.returnStatement(returnExpression)
    },

    Stmt_shortreturn(returnKeyword) {
      mustBeInAFunction({ at: returnKeyword })
      mustNotReturnAnything(context.function, { at: returnKeyword })
      return core.shortReturnStatement()
    },
    
    StmtBlock(statements) {
      return statements.children.map(stmt => stmt.rep());
    },

    LoopStmt_while(_while, exp, _colon, block) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.whileStatement(test, body)
    },
    
    IfStmt_long(_if, exp, _colon1, block1, _else, _colon2, block2) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext()
      const consequent = block1.rep()
      context = context.parent
      context = context.newChildContext()
      const alternate = block2.rep()
      context = context.parent
      return core.ifStatement(test, consequent, alternate)
    },

    IfStmt_elseif(_if, exp, _colon, block, _else, trailingIfStatement) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext()
      const consequent = block.rep()
      const alternate = trailingIfStatement.rep()
      context = context.parent
      return core.ifStatement(test, consequent, alternate)
    },

    IfStmt_short(_if, exp, _colon, block) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext()
      const consequent = block.rep()
      context = context.parent
      return core.shortIfStatement(test, consequent)
    },

    LoopStmt_while(_while, exp, _colon, block) {
      const test = exp.rep()
      mustHaveBooleanType(test, { at: exp })
      context = context.newChildContext({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.whileStatement(test, body)
    },

    LoopStmt_repeat(_repeat, exp, _colon, block) {
      const count = exp.rep()
      mustHaveIntegerType(count, { at: exp })
      context = context.newChildContext({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return core.repeatStatement(count, body)
    },

    LoopStmt_range(_for, id, _in, exp1, op, exp2, _colon, block) {
      const [low, high] = [exp1.rep(), exp2.rep()]
      mustHaveIntegerType(low, { at: exp1 })
      mustHaveIntegerType(high, { at: exp2 })
      const iterator = core.variable(id.sourceString, INT, true)
      context = context.newChildContext({ inLoop: true })
      context.add(id.sourceString, iterator)
      const body = block.rep()
      context = context.parent
      return core.forRangeStatement(iterator, low, op.sourceString, high, body)
    },

    LoopStmt_collection(_for, id, _in, exp, _colon, block) {
      const collection = exp.rep()
      mustHaveAnArrayType(collection, { at: exp })
      const iterator = core.variable(id.sourceString, true, collection.type.baseType)
      context = context.newChildContext({ inLoop: true })
      context.add(iterator.name, iterator)
      const body = block.rep()
      context = context.parent
      return core.forStatement(iterator, collection, body)
    },


    Exp_or(exp, _ops, exps) {
      let left = exp.rep()
      mustHaveBooleanType(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        mustHaveBooleanType(right, { at: e })
        left = core.binary("||", left, right, BOOLEAN)
      }
      return left
    },

    Exp_and(exp, _ops, exps) {
      let left = exp.rep()
      mustHaveBooleanType(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        mustHaveBooleanType(right, { at: e })
        left = core.binary("&&", left, right, BOOLEAN)
      }
      return left
    },

    Exp1_compare(exp1, relop, exp2) {
      const [left, op, right] = [exp1.rep(), relop.sourceString, exp2.rep()]
      if (["<", "<=", ">", ">="].includes(op)) {
        mustHaveNumericOrStringType(left, { at: exp1 })
      }
      mustBothHaveTheSameType(left, right, { at: relop })
      return core.binary(op, left, right, BOOLEAN)
    },
    
    Exp2_binary(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()]
      if (op === "+") {
        mustHaveNumericOrStringType(left, { at: exp1 })
      } else {
        mustHaveNumericType(left, { at: exp1 })
      }
      mustBothHaveTheSameType(left, right, { at: addOp })
      return core.binary(op, left, right, left.type)
    },
    
    Exp3_binary(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()]
      mustHaveNumericType(left, { at: exp1 })
      mustBothHaveTheSameType(left, right, { at: mulOp })
      return core.binary(op, left, right, left.type)
    },
    
    Exp4_binary(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()]
      mustHaveNumericType(left, { at: exp1 })
      mustBothHaveTheSameType(left, right, { at: powerOp })
      return core.binary(op, left, right, left.type)
    },

    Exp4_negation(_op, exp) {
      const operand = exp.rep()
      mustHaveNumericType(operand, { at: exp })
      return core.binary("-", core.int(0), operand, operand.type)
    },
    
    // FunCall_say(say, _open, args, _close) {
    //   console.log("FunCall_say triggered"); 
    //   const sayFunction = this.lookup('say');
    //   if (!sayFunction) {
    //       throw new Error("Function 'say' is not defined.");
    //   }
  
    //   const argumentExpressions = args.rep();
    //   return core.functionCall(sayFunction, argumentExpressions);
    // },

    // FunCall(callee) {
    //   const args = callee.args.rep()
    //   mustBeCallable(callee.callee, { at: callee })
    //   mustHaveCorrectArgumentCount(args.length, callee.callee.type.paramTypes.length, { at: callee })
    //   args.forEach((arg, i) => mustBeAssignable(arg, { toType: callee.callee.type.paramTypes[i] }, { at: callee }))
    //   return core.functionCall(callee.callee, args)
    // },

    // FunCall_left_pipe_forward(calleeList, _pipe, primaryList) {
    //   const args = primaryList.rep()
    //   const funs = calleeList.asIteration().children.map(callee => callee.rep())
    //   funs.forEach(fun => mustBeCallable(fun, { at: calleeList }))
    //   mustHaveCorrectArgumentCount(args.length, funs[funs.length - 1].type.paramTypes.length, { at: calleeList })
    //   args.forEach((arg, i) => mustBeAssignable(arg, { toType: funs[funs.length - 1].type.paramTypes[i] }, { at: calleeList }))
    //   return funs.reduceRight((result, fun) => core.left_pipe_forward(fun, [result]), args[0])
    // },
    
    // FunCall_right_pipe_forward(primaryList, _pipe, calleeList) {
    //   const args = primaryList.rep()
    //   const funs = calleeList.asIteration().children.map(callee => callee.rep())
    //   funs.forEach(fun => mustBeCallable(fun, { at: calleeList }))
    //   mustHaveCorrectArgumentCount(args.length, funs[0].type.paramTypes.length, { at: calleeList })
    //   args.forEach((arg, i) => mustBeAssignable(arg, { toType: funs[0].type.paramTypes[i] }, { at: calleeList }))
    //   return funs.reduce((result, fun) => core.right_pipe_forward([result], fun), args[0])
    // },

    // Primary taken from Carlos' Exp9, should follow exact same format
    Primary_emptyarray(ty, _open, _close) {
      const type = ty.rep()
      mustBeAnArrayType(type, { at: ty })
      return core.emptyArray(type)
    },

    Primary_arrayexp(_open, args, _close) {
      const elements = args.asIteration().children.map(e => e.rep())
      mustAllHaveSameType(elements, { at: args })
      return core.arrayExpression(elements)
    },

    Primary_parens(_open, expression, _close) {
      return expression.rep()
    },

    Primary_subscript(exp1, _open, exp2, _close) {
      const [array, subscript] = [exp1.rep(), exp2.rep()]
      mustHaveAnArrayType(array, { at: exp1 })
      mustHaveIntegerType(subscript, { at: exp2 })
      return core.subscript(array, subscript)
    },

    Primary_member(exp, dot, id) {
      const object = exp.rep()
      let structType
      mustHaveMember(structType, id.sourceString, { at: id })
      const field = structType.fields.find(f => f.name === id.sourceString)
      return core.memberExpression(object, dot.sourceString, field)
    },

    Primary_call(exp, open, expList, _close) {
      const callee = exp.rep()
      mustBeCallable(callee, { at: exp })
      const exps = expList.asIteration().children
      const targetTypes =
        callee?.kind === "StructType"
          ? callee.fields.map(f => f.type)
          : callee.type.paramTypes
      mustHaveCorrectArgumentCount(exps.length, targetTypes.length, { at: open })
      const args = exps.map((exp, i) => {
        const arg = exp.rep()
        mustBeAssignable(arg, { toType: targetTypes[i] }, { at: exp })
        return arg
      })
      return callee?.kind === "StructType"
        ? core.constructorCall(callee, args)
        : core.functionCall(callee, args)
    },

    Primary_id(id) {
      const entity = context.lookup(id.sourceString)
      mustHaveBeenFound(entity, id.sourceString, { at: id })
      return entity
    },

    true(_) {
      return true
    },

    false(_) {
      return false
    },

    type_read_only_symbol(dollar, actualType) {
      return {
        type: actualType.rep(),
        readOnly: dollar.sourceString === '$'
      };
    },

    int(_) {
      return intType; 
    },

    float(_) {
      return floatType; 
    },

    string(_) {
      return stringType; 
    },

    bool(_) {
      return boolType; 
    },

    void(_) {
      return voidType; 
    },

    intlit(_digits) {
      return BigInt(this.sourceString)
    },

    floatlit(_whole, _point, _fraction, _e, _sign, _exponent) {
      return Number(this.sourceString)
    },

    stringlit(_openQuote, _chars, _closeQuote) {
      return this.sourceString
    },
  })

  return builder(match).rep()
}
 