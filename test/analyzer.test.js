import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import {
  program,
  variableDeclaration,
  variable,
  binary,
  floatType,
} from "../src/core.js";

// Implement indent-specific checks, pipeline checks, and async checks

// Programs that are semantically correct
const semanticChecks = [
  ["basic assignment", "int x = 1"],
  ["print statement", "say(1)"],
  ["short return", "block f(): say(1)"],
  ["long return", "block f() sends bool: send true"], // ****
  ["variable declarations", "int x = 1 bool y = false"],
  ["increment and decrement", "int x = 10 x-- x++"],
  ["initialize array", "int a = [1, 2, 3]"],
  ["assign arrays", "int a = [1] int b = [1]"],
  ["assign to array element", "int a = [1, 2, 3] a[1] = 100"],
  ["return in nested if", "block f() sends float: if true: send(1.0) else: send(2.0)"],
  ["break in nested if", "while false: if true: break"],
  ["long if", "if true: say(1) else: say(3)"],
  ["elseif", "if true: say(1) else if true: say(0) else: say(3)"],
  ["for over collection", "for i in [2,3,5]: say(1)"],
  ["for in range", "for i in 1..<10: say(0)"],
  ["repeat", "stack 3: int a = 1 say(a)"],
  ["||", "say(true || 1 < 2 || false || true)"],
  ["&&", "say(true && 1 < 2 && false && true)"],
  ["ok to == arrays", "say([1] == [5,8])"],
  ["ok to != arrays", "print([1] != [5,8])"],
  ["arithmetic", "say(2 * 3 + 5 ** 3 / 2 - 5 % 8)"],
  // ["array length", "say([1,2,3].length)"],
  // ["variables", "int x=[[[[1]]]] say(x[0][0][0][0] + 2)"],
  // ["subscript exp", "int a = [1, 2] say(a[0])"],
  // ["type equivalence of nested arrays", "block f([[int]] x): say(f([[1],[2]]))"],
  // ["pass a function to a function", "block f(int x, bool y) sends int: send 1 block g(bool z) f(2, g)"],
  ["array parameters", "block f([int] x):"],
  ["outer variable", "int x = 1 while(false): say(x)"],
  ["built-in constants", "say(25.0 * π)"],
  ["built-in sin", "say(sin(π))"],
  ["built-in cos", "say(cos(93.999))"],
  // ["built-in hypot", "say(hypot(-4.0, 3.00001))"],
  ["array expression type consistency", 'say([1, 2, 3])'], 
  // ["empty array construction", 'int[] a = []'], 
  // ["array length property access", 'int a = [1, 2, 3].length'], 
  ["nested if statements", 'if true: if false: say(1)'], 
  // ["proper indenting", 'int x = 1\n  int y = 2'], 
  // ["function type creation", "block f(int x, bool y):"],
  ["comments", "int x = 1 // this is a comment"],
  ["async function", "async block f(): say(1)"],
  ["multiple tests", "int x = 1 int y = 2 x, y = 3, 4"],
  ["empty array", "int a = [int]()"],
  ["string test", 'string x = "hello"'],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["non-int increment", "bool x = false x++", /an integer/],
  // ["non-int decrement", "int x = [3, 5] x++", /an integer/],
  ["undeclared id", "say(x)", /Identifier x not declared/],
  ["redeclared id", "int x = 1 int x = 1", /Identifier x already declared/],
  // ["assign to const", "$int x = 1 x = 2", /Cannot assign to constant/],
  ["assign bad type", "int x = 1 x = true", /Cannot assign a bool to a int/],
  ["assign bad array type","int x = 1 x = [true]",/Cannot assign a \[bool\] to a int/],
  ["break outside loop", "break", /Break can only appear in a loop/],
  // ["break inside function", "while true: block f(): break", /Break can only appear in a loop/],
  ["return outside function", "send", /Return can only appear in a function/],
  // ["return value from void function", "block f(): send(1)", /Cannot return a value/],
  // ["return nothing from non-void", "block f() sends int: send", /int should be returned/],
  // ["return type mismatch", "block f() sends int: send false", /bool to a int/],
  ["non-boolean short if test", "if 1: say(1)", /Expected a bool/],
  ["non-boolean if test", "if 1: say(1) else: say(1)", /Expected a bool/],
  ["non-boolean while test", "while 1: say(1)", /Expected a bool/],
  ["non-integer repeat", 'stack "1":', /Expected a digit/],
  // ["non-integer low range", "for i in true...2:", /Expected an integer/],
  // ["non-integer high range", "for i in 1..<3.14:", /Expected an integer/],
  // ["non-array in for", "for i in 100:", /Expected an array/],
  ["bad types for ||", "say(false || 1)", /Expected a bool/],
  ["bad types for &&", "say(false && 1)", /Expected a bool/],
  ["bad types for ==", "say(false == 1)", /Operands do not have the same type/],
  ["bad types for !=", "say(false != 1)", /Operands do not have the same type/],
  ["bad types for +", "say(false + 1)", /Expected a number or string/],
  ["bad types for -", "say(false - 1)", /Expected a number/],
  ["bad types for *", "say(false * 1)", /Expected a number/],
  ["bad types for /", "say(false / 1)", /Expected a number/],
  ["bad types for **", "say(false ** 1)", /Expected a number/],
  ["bad types for <", "say(false < 1)", /Expected a number or string/],
  ["bad types for <=", "say(false <= 1)", /Expected a number or string/],
  ["bad types for >", "say(false > 1)", /Expected a number or string/],
  ["bad types for >=", "say(false >= 1)", /Expected a number or string/],
  ["bad types for ==", "say(2 == 2.0)", /not have the same type/],
  ["bad types for !=", "say(false != 1)", /not have the same type/],
  ["bad types for negation", "say(-true)", /Expected a number/],
  // ["non-integer index", "int a = [1] say(a[false])", /Expected an integer/],
  ["diff type array elements", "say([3, 3.0])", /Not all elements have the same type/],
  ["shadowing", "int x = 1 while true: int x = 1", /Identifier x already declared/],
  ["call of uncallable", "int x = 1 say(x())", /Call of non-function/],
  ["Too many args", "block f(int x): f(1, 2)", /1 argument\(s\) required but 2 passed/],
  ["Too few args", "block f(int x): say(1) f()", /1 argument\(s\) required but 0 passed/],
  // ["Parameter type mismatch", "block f(int x): f(false)", /Cannot assign a bool to a int/],
  ["bad param type in fn assign", "block f(int x): send block g(float y): send f = g"],
  ["bad call to sin()", "say(sin(true))", /Cannot assign a bool to a float/],
  // ["Non-type in param", "int x=1 block f(y x):", /Type expected/],
  // ["Non-type in return type", "int x = 1 block f() sends int: send true", /Type expected/],
  // ["non-numeric operation", 'say("hello" + true)', /Expected a number/],
  ["non-boolean condition in if", 'if "not a boolean": say(1)', /Expected a boolean/],
  // ["non-integer array index", 'int a = [1, 2, 3] say(a["one"])', /Expected an integer/],
  ["assignment to undeclared variable", 'x = 10', /Identifier x not declared/],
  // ["function argument count mismatch", 'block f(int x): send block g(): f(1, 2)', /1 argument\(s\) required but 2 passed/],
  // ["type description in function call", 'block f(int x): send x = true', /Cannot assign a bool to a int/],
  ["illegal whitespace error", 'int x = 1\n\tint y = 2', /Illegal whitespace character/], 
  ["indent error", 'int x = 1\n    int y = 2\n  int z = 3', /Indent Error/], 
  // ["multiple dedents", 'int x = 1\n  int y = 2\n    int z = 3\nint a = 4', /⇦/],
  // ["dedents at end", 'int x = 1\n  int y = 2\n    int z = 3', /⇦\n$/], 
  ["newline error", 'int x = 1 \n int y = 2', /Expected end of input/], 
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  it("produces the expected representation for a trivial program", () => {
    assert.deepEqual(
      analyze(parse("float x = π + 2.2")),
      program([
        variableDeclaration(
          variable("x", false, floatType),
          binary("+", variable("π", true, floatType), 2.2, floatType)
        ),
      ])
    )
  })
})
