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
  ["variable declarations", "int x = 1 \n bool y = false"],
  ["increment and decrement", "int x = 10 \n x-- \n x++"],
  ["initialize with empty array", "int a = []"],
  ["assign arrays", "int a = [] \n int b = [1] \n a = b \n b = a"],
  ["assign to array element", "int a = [1, 2, 3] \n a[1] = 100"],
  ["short return", "block f(): \n send"],
  ["long return", "block f() sends bool: \n send true"],
  ["return in nested if", "block f(): \n if true: \n send"],
  ["break in nested if", "while false: \n if true: \n break"],
  ["long if", "if true: \n say(1) \n else: \n say(3)"],
  ["elseif", "if true: \n say(1) \n else if true: \n say(0) \n else: say(3)"],
  ["for over collection", "for i in [2,3,5]: \n say(1)"],
  ["for in range", "for i in 1..<10: \n say(0)"],
  ["repeat", "stack 3: \n int a = 1 \n say(a)"],
  ["||", "say(true || 1 < 2 || false || !true)"],
  ["&&", "say(true && 1 < 2 && false && !true)"],
  ["ok to == arrays", "say([1] == [5,8])"],
  ["ok to != arrays", "print([1] != [5,8])"],
  ["arithmetic", "int x=1 \n say(2 * 3 + 5 ** -3 / 2 - 5 % 8)"],
  ["array length", "say([1, 2, 3].length)"],
  ["variables", "int x=[[[[1]]]] \n say(x[0][0][0][0] + 2)"],
  ["subscript exp", "int a = [1, 2] \n say(a[0])"],
  [
    "type equivalence of nested arrays",
    "block f([[int]] x): \n say(f([[1],[2]]))",
  ],
  [
    "pass a function to a function",
    "block f(int x, bool y) sends int: \n send 1 \n block g(bool z) \n f(2, g)",
  ],
  ["array parameters", "block f([int] x)"],
  ["outer variable", "int x = 1 \n while(false): \n say(x)"],
  ["built-in constants", "say(25.0 * π)"],
  ["built-in sin", "say(sin(π))"],
  ["built-in cos", "say(cos(93.999))"],
  ["built-in hypot", "say(hypot(-4.0, 3.00001))"],

  // Optional tests:
  /*
    ["assign optionals", "let a = no int;let b=some 1;a=b;b=a;"],
    ["conditionals with ints", "print(true ? 8 : 5);"],
    ["conditionals with floats", "print(1<2 ? 8.0 : -5.22);"],
    ["conditionals with strings", 'print(1<2 ? "x" : "y");'],
    ["??", "print(some 5 ?? 0);"],
    ["nested ??", "print(some 5 ?? 8 ?? 0);"],
    ["optional types", "let x = no int; x = some 100;"],
    ["random with array literals, ints", "print(random [1,2,3]);"],
    ["random with array literals, strings", 'print(random ["a", "b"]);'],
    ["random on array variables", "let a=[true, false];print(random a);"],
    ["optional parameters", "function f(x: [int], y: string?) {}"],
    ["empty optional types", "print(no [int]); print(no string);"],
    ["types in function type", "function f(g: (int?, float)->string) {}"],

    // Other tests to modify from Carlos:
    // ["assigned functions", "block f(): \n block g = f \n g = f"],
    // ["call of assigned functions", "block f(int x): \n block g = f \n g(1);"],
    */
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["non-int increment", "bool x = false \n x++", /an integer/],
  ["non-int decrement", "int x = [3, 5] \n x++", /an integer/],
  ["undeclared id", "say(x)", /Identifier x not declared/],
  ["redeclared id", "int x = 1 \n int x = 1", /Identifier x already declared/],
  ["assign to const", "$ x = 1 \n x = 2", /Cannot assign to constant/],
  [
    "assign bad type",
    "int x = 1 \n x = true",
    /Cannot assign a boolean to a int/,
  ],
  [
    "assign bad array type",
    "int x = 1 \n x = [true]",
    /Cannot assign a \[boolean\] to a int/,
  ],
  ["break outside loop", "break", /Break can only appear in a loop/],
  [
    "break inside function",
    "while true: \n block f(): \n break",
    /Break can only appear in a loop/,
  ],
  ["return outside function", "send", /Return can only appear in a function/],
  [
    "return value from void function",
    "block f(): \n send(1)",
    /Cannot return a value/,
  ],
  [
    "return nothing from non-void",
    "block f() sends int: \n send",
    /int should be returned/,
  ],
  [
    "return type mismatch",
    "block f() sends int: \n send false",
    /boolean to a int/,
  ],
  ["non-boolean short if test", "if 1: \n say(1)", /Expected a boolean/],
  [
    "non-boolean if test",
    "if 1: \n say(1) \n else: \n say(1)",
    /Expected a boolean/,
  ],
  ["non-boolean while test", "while 1:", /Expected a boolean/],
  ["non-integer repeat", 'stack "1":', /Expected an integer/],
  ["non-integer low range", "for i in true...2:", /Expected an integer/],
  ["non-integer high range", "for i in 1..<3.14:", /Expected an integer/],
  ["non-array in for", "for i in 100:", /Expected an array/],
  ["bad types for ||", "say(false || 1)", /Expected a boolean/],
  ["bad types for &&", "say(false && 1)", /Expected a boolean/],
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
  ["bad types for not", 'say(!"hello")', /Expected a boolean/],
  ["bad types for random", "say(random 3)", /Expected an array/],
  ["non-integer index", "int a = [1] \n say(a[false])", /Expected an integer/],
  [
    "diff type array elements",
    "say([3, 3.0])",
    /Not all elements have the same type/,
  ],
  [
    "shadowing",
    "int x = 1 \n while true: \n int x = 1",
    /Identifier x already declared/,
  ],
  ["call of uncallable", "int x = 1 \n say(x())", /Call of non-function/],
  [
    "Too many args",
    "block f(int x): \n f(1, 2)",
    /1 argument required but 2 passed/,
  ],
  [
    "Too few args",
    "block f(int x): \n f()",
    /1 argument required but 0 passed/,
  ],
  [
    "Parameter type mismatch",
    "block f(int x): \n f(false)",
    /Cannot assign a boolean to a int/,
  ],
  [
    "bad param type in fn assign",
    "block f(int x): \n send \n block g(float y): \n send \n f = g",
  ],
  ["bad call to sin()", "say(sin(true))", /Cannot assign a boolean to a float/],
  ["Non-type in param", "int x=1 \n block f(y x):", /Type expected/],
  [
    "Non-type in return type",
    "int x = 1 \n block f() sends int: \n return true",
    /Type expected/,
  ],

  // Optional tests:

  /*
    ["assign bad optional type", "let x=1;x=some 2;", /Cannot assign a int\? to a int/],
    ["non-boolean conditional test", "print(1?2:3);", /Expected a boolean/],
    ["diff types in conditional arms", "print(true?1:true);", /not have the same type/],
    ["unwrap non-optional", "print(1??2);", /Expected an optional/],
    */
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }
  // for (const [scenario, source, errorMessagePattern] of semanticErrors) {
  //   it(`throws on ${scenario}`, () => {
  //     assert.throws(() => analyze(parse(source)), errorMessagePattern)
  //   })
  // }
  it("produces the expected representation for a trivial program", () => {
    assert.deepEqual(
      analyze(parse("int x = 1")),
      program([variableDeclaration(variable("x", false, intType), intType)])
    );
  });
});
