import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import { program, variableDeclaration, variable, binary, floatType } from "../src/core.js"

// Implement indent-specific checks, pipeline checks, and async checks

// Programs that are semantically correct
const semanticChecks = [
    ["variable declarations", 'int x = 1 \n bool y = "false"'],
    ["increment and decrement", "int x = 10 \n x-- \n x++",],
    ["initialize with empty array", "int a = []"],
    ["assign arrays", "int a = [] \n int b = [1] \n a = b \n b = a"],
    ["assign to array element", "int a = [1, 2, 3] \n a[1] = 100"],
    ["short return", "block f(): \n send"],
    ["long return", "block f() sends boolean: \n send true"],
    ["return in nested if", "block f(): \n if true: \n send"],
    ["break in nested if", "while false: \n if true: \n break"],
    ["long if", "if true: \n say(1) \n else: \n say(3)"],
    ["elsif", "if true: \n say(1) \n else if true: \n say(0) \n else: say(3)"],
    ["for over collection", "for i in [2,3,5]: \n say(1)"],
    ["for in range", "for i in 1..<10: \n say(0)"],
    ["repeat", "stack 3: \n int a = 1 \n say(a)"],
    ["||", "say(true || 1 < 2 || false || !true)"],
    ["&&", "say(true && 1 < 2 && false && !true)"],
    ["ok to == arrays", "say([1] == [5,8])"],
    ["ok to != arrays", "print([1] != [5,8])"],
    ["arithmetic", "int x=1 \n say(2 * 3 + 5 ** -3 / 2 - 5 % 8)"],
    ["array length", "say([1, 2, 3].length)"],
  
    /*
    // Other tests to modify from Carlos: 

    ["variables", "let x=[[[[1]]]]; print(x[0][0][0][0]+2);"],
    ["pseudo recursive struct", "struct S {z: S?} let x = S(no S);"],
    ["nested structs", "struct T{y:int} struct S{z: T} let x=S(T(1)); print(x.z.y);"],
    ["member exp", "struct S {x: int} let y = S(1);print(y.x);"],
    ["optional member exp", "struct S {x: int} let y = some S(1);print(y?.x);"],
    ["subscript exp", "let a=[1,2];print(a[0]);"],
    ["array of struct", "struct S{} let x=[S(), S()];"],
    ["struct of arrays and opts", "struct S{x: [int] y: string??}"],
    ["assigned functions", "function f() {}\nlet g = f;g = f;"],
    ["call of assigned functions", "function f(x: int) {}\nlet g=f;g(1);"],
    ["type equivalence of nested arrays", "function f(x: [[int]]) {} print(f([[1],[2]]));"],
    [
      "call of assigned function in expression",
      `function f(x: int, y: boolean): int {}
      let g = f;
      print(g(1, true));
      f = g; // Type check here`,
    ],
    [
      "pass a function to a function",
      `function f(x: int, y: (boolean)->void): int { return 1; }
       function g(z: boolean) {}
       f(2, g);`,
    ],
    [
      "function return types",
      `function square(x: int): int { return x * x; }
       function compose(): (int)->int { return square; }`,
    ],
    ["function assign", "function f() {} let g = f; let h = [g, f]; print(h[0]());"],
    ["struct parameters", "struct S {} function f(x: S) {}"],
    ["array parameters", "function f(x: [int?]) {}"],
    ["optional parameters", "function f(x: [int], y: string?) {}"],
    ["empty optional types", "print(no [int]); print(no string);"],
    ["types in function type", "function f(g: (int?, float)->string) {}"],
    ["voids in fn type", "function f(g: (void)->void) {}"],
    ["outer variable", "let x=1; while(false) {print(x);}"],
    ["built-in constants", "print(25.0 * π);"],
    ["built-in sin", "print(sin(π));"],
    ["built-in cos", "print(cos(93.999));"],
    ["built-in hypot", "print(hypot(-4.0, 3.00001));"],

    // Optional tests: 
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
    */
]

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
    ["non-int increment", "bool x = false \n x++", /an integer/],
    ["non-int decrement", 'int x = [3, 5] \n x++', /an integer/],
    ["undeclared id", "say(x);", /Identifier x not declared/],
    ["redeclared id", "int x = 1 \n int x = 1", /Identifier x already declared/],
    ["assign to const", "$ x = 1 \n x = 2", /Cannot assign to constant/],
    ["assign bad type", "int x = 1 \n x = true", /Cannot assign a boolean to a int/],
    ["assign bad array type", "int x = 1 \n x = [true]", /Cannot assign a \[boolean\] to a int/],
    ["break outside loop", "break", /Break can only appear in a loop/],
    ["break inside function", "while true: \n block f(): \n break", /Break can only appear in a loop/],
    ["return outside function", "send", /Return can only appear in a function/],
    ["return value from void function","block f(): \n send(1)", /Cannot return a value/,],
    ["return nothing from non-void", "block f() sends int: \n send", /should be returned/],
    ["return type mismatch", "block f() sends int: \n send false", /boolean to a int/],
    ["non-boolean short if test", "if 1: \n say(1)", /Expected a boolean/],
    ["non-boolean if test", "if 1: \n say(1) \n else \n say(1)", /Expected a boolean/],
    ["non-boolean while test", "while 1:", /Expected a boolean/],
    ["non-integer repeat", 'stack "1":', /Expected an integer/],
    ["non-integer low range", "for i in true...2:", /Expected an integer/],
    ["non-integer high range", "for i in 1..<3.14:", /Expected an integer/],
    ["non-array in for", "for i in 100:", /Expected an array/],

    // Other tests to modify from Carlos:

    /*
    ["bad types for ||", "print(false||1);", /Expected a boolean/],
    ["bad types for &&", "print(false&&1);", /Expected a boolean/],
    ["bad types for ==", "print(false==1);", /Operands do not have the same type/],
    ["bad types for !=", "print(false==1);", /Operands do not have the same type/],
    ["bad types for +", "print(false+1);", /Expected a number or string/],
    ["bad types for -", "print(false-1);", /Expected a number/],
    ["bad types for *", "print(false*1);", /Expected a number/],
    ["bad types for /", "print(false/1);", /Expected a number/],
    ["bad types for **", "print(false**1);", /Expected a number/],
    ["bad types for <", "print(false<1);", /Expected a number or string/],
    ["bad types for <=", "print(false<=1);", /Expected a number or string/],
    ["bad types for >", "print(false>1);", /Expected a number or string/],
    ["bad types for >=", "print(false>=1);", /Expected a number or string/],
    ["bad types for ==", "print(2==2.0);", /not have the same type/],
    ["bad types for !=", "print(false!=1);", /not have the same type/],
    ["bad types for negation", "print(-true);", /Expected a number/],
    ["bad types for length", "print(#false);", /Expected an array/],
    ["bad types for not", 'print(!"hello");', /Expected a boolean/],
    ["bad types for random", "print(random 3);", /Expected an array/],
    ["non-integer index", "let a=[1];print(a[false]);", /Expected an integer/],
    ["no such field", "struct S{} let x=S(); print(x.y);", /No such field/],
    ["diff type array elements", "print([3,3.0]);", /Not all elements have the same type/],
    ["shadowing", "let x = 1;\nwhile true {let x = 1;}", /Identifier x already declared/],
    ["call of uncallable", "let x = 1;\nprint(x());", /Call of non-function/],
    [
      "Too many args",
      "function f(x: int) {}\nf(1,2);",
      /1 argument\(s\) required but 2 passed/,
    ],
    [
      "Too few args",
      "function f(x: int) {}\nf();",
      /1 argument\(s\) required but 0 passed/,
    ],
    [
      "Parameter type mismatch",
      "function f(x: int) {}\nf(false);",
      /Cannot assign a boolean to a int/,
    ],
    [
      "function type mismatch",
      `function f(x: int, y: (boolean)->void): int { return 1; }
       function g(z: boolean): int { return 5; }
       f(2, g);`,
      /Cannot assign a \(boolean\)->int to a \(boolean\)->void/,
    ],
    ["bad param type in fn assign", "function f(x: int) {} function g(y: float) {} f = g;"],
    [
      "bad return type in fn assign",
      'function f(x: int): int {return 1;} function g(y: int): string {return "uh-oh";} f = g;',
      /Cannot assign a \(int\)->string to a \(int\)->int/,
    ],
    ["bad call to sin()", "print(sin(true));", /Cannot assign a boolean to a float/],
    ["Non-type in param", "let x=1;function f(y:x){}", /Type expected/],
    ["Non-type in return type", "let x=1;function f():x{return 1;}", /Type expected/],
    ["Non-type in field type", "let x=1;struct S {y:x}", /Type expected/],

    // Optional tests: 
    ["assign bad optional type", "let x=1;x=some 2;", /Cannot assign a int\? to a int/],
    ["non-boolean conditional test", "print(1?2:3);", /Expected a boolean/],
    ["diff types in conditional arms", "print(true?1:true);", /not have the same type/],
    ["unwrap non-optional", "print(1??2);", /Expected an optional/],
    */
   
]

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  it("produces the expected representation for a trivial program", () => {
    assert.deepEqual(
      analyze(parse("let x = π + 2.2;")),
      program([
        variableDeclaration(
          variable("x", false, floatType),
          binary("+", variable("π", true, floatType), 2.2, floatType)
        ),
      ])
    )
  })
})
