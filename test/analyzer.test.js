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

// Programs that are semantically correct
const semanticChecks = [
  ["basic assignment", "int x = 1"],
  ["print statement", "say(1)"],
  [
    "short return", 
    [
      "block f():",
      "  say(1)",
    ].join('\n'),
  ],
  [
    "long return", 
    [
      "block f() sends bool:",
      "  send true",
    ].join('\n'),
  ],
  ["variable declarations", "int x = 1 bool y = false"],
  ["increment and decrement", "int x = 10 x-- x++"],
  ["initialize array", "int a = [1, 2, 3]"],
  ["assign arrays", "int a = [1] int b = [1]"],
  [
    "return in nested if", 
    [
      "block f() sends float:", 
      "  if true:", 
      "    send(1.0)", 
      "  else:", 
      "    send(2.0)",
    ].join('\n'),
  ],
  // [
  //   "break in nested if", 
  //   [
  //     "while false:", 
  //     "  if true:", 
  //     "    break",
  //   ].join('\n'),
  // ],
  [
    "long if", 
    [
      "if true:", 
      "  say(1)", 
      "else:", 
      "  say(3)",
    ].join('\n'),
  ],
  [
    "elseif", 
    [
      "if true:", 
      "  say(1)", 
      "else if true:", 
      "  say(0)", 
      "else:",
      "  say(3)",
    ].join('\n'),
  ],
  [
    "for over collection", 
    [
      "for i in [2,3,5]:", 
      "  say(1)",
    ].join('\n'),
  ],
  [
    "for in range", 
    [
      "for i in 1..<10:", 
      "  say(0)",
    ].join('\n'),
  ],
  [
    "repeat", 
    [
      "stack 3:", 
      "  int a = 1", 
      "  say(a)"
    ].join('\n'),
  ],
  ["||", "say(true || 1 < 2 || false || true)"],
  ["&&", "say(true && 1 < 2 && false && true)"],
  ["ok to == arrays", "say([1] == [5,8])"],
  ["ok to != arrays", "print([1] != [5,8])"],
  ["arithmetic", "say(2 * 3 + 5 ** 3 / 2 - 5 % 8)"],
  ["array parameters", "block f([int] x):"],
  [
    "outer variable", 
    [
      "int x = 1",
      "while(false):",
      "  say(x)"
    ].join('\n'),
  ],
  ["built-in constants", "say(25.0 * π)"],
  ["built-in sin", "say(sin(π))"],
  ["built-in cos", "say(cos(93.999))"],
  ["array expression type consistency", 'say([1, 2, 3])'], 
  [
    "nested if statements", 
    [
      "if true:", 
      "  if false:",
      "    say(1)"
    ].join('\n'),
  ], 
  ["function type creation", "block f(int x, bool y):"],
  ["comments", "int x = 1 // this is a comment"],
  ["async function", "async block f(): say(1)"],
  ["multiple tests", "int x = 1 int y = 2 x, y = 3, 4"],
  ["empty array", "int a = [int]()"],
  ["string test", 'string x = "hello"'],
  ["blank line", "say(1)\n\n\nsay(2)"], 
  ["blank lines at end of source", "say(1)\n\n\n"],
  ["negative number", "say(-1)"], 
  ["array length", "say(len[1,2,3])"], 
  ["basic pipe-forward", "5 |> say"],
  ["basic pipe-backward", "say <| 10"],
  [
    "pipe-forward with function call",
    [
      "block square(int x) sends int:",
      "  send x * x",
      "4 |> square",
    ].join('\n'),
  ],
  [
    "pipe-forward with multiple inputs",
    [
      "block multiply(int x, int y) sends int:",
      "  send x * y",
      "3, 5 |> multiply",
    ].join('\n'),
  ],
  // ["assign to array element", "int a = [1, 2, 3] a[1] = 100"], //**** 
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["non-int increment", "bool x = false x++", /an integer/],
  ["undeclared id", "say(x)", /Identifier x not declared/],
  ["redeclared id", "int x = 1 int x = 1", /Identifier x already declared/],
  ["assign bad type", "int x = 1 x = true", /Cannot assign a bool to a int/],
  ["assign bad array type","int x = 1 x = [true]",/Cannot assign a \[bool\] to a int/],
  ["break outside loop", "break", /Break can only appear in a loop/],
  ["return outside function", "send", /Return can only appear in a function/],
  [
    "return value from void function", 
    [
      "block f():", 
      "  send(1)", 
    ].join('\n'),
    /Cannot return a value/
  ],
  [
    "return nothing from non-void", 
    [
      "block f() sends int:",
       "  send", 
    ].join('\n'),
    /int should be returned/
  ],
  [
    "return type mismatch", 
    [
      "block f() sends int:", 
      "  send false", 
    ].join('\n'),
    /bool to a int/
  ],
  [
    "non-boolean short if test",
    [
      "if 1:",
      "  say(1)", 
    ].join('\n'),
    /Expected a bool/
  ],
  [
    "non-boolean if test", 
    [
      "if 1:", 
      "  say(1)",
      "else:",
      "  say(1)", 
    ].join('\n'),
    /Expected a bool/
  ],
  [
    "non-boolean while test",
    [
      "while 1:", 
      "  say(1)", 
    ].join('\n'),
    /Expected a bool/
  ],
  ["non-integer repeat", 'stack "1":', /Expected a digit/],
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
  ["diff type array elements", "say([3, 3.0])", /Not all elements have the same type/],
  [
    "shadowing", 
    [
      "int x = 1",
      "while true:",
      "  int x = 1", 
    ].join('\n'),
    /Identifier x already declared/
  ],
  ["call of uncallable", "int x = 1 say(x())", /Call of non-function/],
  [
    "Too many args", 
    [
      "block f(int x):", 
      "  f(1, 2)", 
    ].join('\n'),
    /1 argument\(s\) required but 2 passed/
  ],
  [
    "Too few args", 
    [
      "block f(int x):", 
      "  say(1) f()", 
    ].join('\n'),
    /1 argument\(s\) required but 0 passed/
  ],
  [
    "Parameter type mismatch", 
    [
      "block f(int x):", 
      "  say(1)", 
      "f(false)", 
    ].join('\n'),
    /Cannot assign a bool to a int/
  ],
  [
    "bad param type in fn assign", 
    [
      "block f(int x):", 
      "  send block g(float y):",
      "send f = g"
    ].join('\n'),
  ],
  ["bad call to sin()", "say(sin(true))", /Cannot assign a bool to a float/],
  ["non-numeric operation", 'say("hello" + true)', /Operands do not have the same type/],
  [
    "non-boolean condition in if", 
    [
      "if \"not a boolean\":",
      "  say(1)", 
      ].join('\n'),
       /Expected a boolean/
      ],
  ["assignment to undeclared variable", 'x = 10', /Identifier x not declared/],
  [
    "function argument count mismatch", 
    [
      "block f(int x):",
      "  send block g():",
      "f(1, 2)", 
    ].join('\n'),
    /1 argument\(s\) required but 2 passed/
  ],
  [
    "returning a value from a void-type function", 
    [
      "block f(int x):", 
      "  send 1", 
    ].join('\n'),
    /Cannot return a value from this function/
  ],
  [
    "type description in function call", 
    [
      "block f(int x) sends int:", 
      "  x = true",
      "  send x", 
    ].join('\n'),
    /Cannot assign a bool to a int/
  ],
  ["illegal whitespace error", 'int x = 1\n\tint y = 2', /Illegal whitespace character/], 
  ["indent error", 'int x = 1\n    int y = 2\n  int z = 3', /Indent Error/], 
  ["newline error", 'int x = 1 \n int y = 2', /Expected end of input/],
  [
    "multiple dedents", 
    [
      "int x = 1",
      "  int y = 2",
      "    int z = 3",
      "int a = 4", 
    ].join('\n'),
      /Expected end of input/
    ], 
  // ["dedents at end", 'int x = 1\n  int y = 2\n    int z = 3', /⇦\n$/], //****
  // ["assign to const", "$ int x = 1 x = 2", /Cannot assign to constant/], //**** 
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
