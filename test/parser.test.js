import assert from "node:assert/strict";
import parse from "../src/parser.js";

const syntaxChecks = [
  ["all numeric literal forms", "say(8 * 89.123)"],
  ["complex expressions", "say(83 * ((((-((((13 / 21)))))))) + 1 - 0)"],
  ["all unary operators", "say(-3) say(3)"],
  ["all binary operators", "say(z * 1 / 2 ** 3 + 4 < 5)"],
  ["all arithmetic operators", "x = 2 + 4 - (-7.3) * 8 ** 13 / 1"],
  ["all relational operators", "x = 1<(2<=(3==(4!=(5 >= (6>7)))))"],
  ["end of program inside comment", "say(0) // yay"],
  ["comments with no text are ok", "say(1)//\nsay(0)//"],
  ["non-Latin letters in identifiers", "コンパイラ = 100"],
  ["simplest syntactically correct program", "break"],
  ["multiple statements", "say(1) \nbreak \nx=5"],
  ["variable declarations", "int e=99*1\nbool z=false"],
  ["function with no params, no return type", "block f(): "],
  ["function with one param", "block f(int x): "],
  ["function with two params", "block f(int x, bool y): "],
  ["function with no params + return type", "block f() sends int: send(1)"],
  ["array type for param", "block f([[[bool]]] x): "],
  ["assignments", "a-- c++ abc=9*3 a=1"],
  ["read-only declaration", "$int x = 5"],
  ["call in statement", "f(100)"],
  ["call in statement after func decl", "block f(int x): \nsay(5) \nf(100)"],
  ["call in exp", "say(5 * f(x, y, 2 * y))"],
  [
    "short if", 
    [
      "if true:",
      "  say(1)",
    ].join('\n'),],
  [
    "longer if",
    [
      "if true:",
      "  say(1)",
      "else:",
      "  say(1)",
    ].join('\n'),
  ], 
  ["ors can be chained", "say(1 || 2 || 3 || 4 || 5)"],
  ["ands can be chained", "say(1 && 2 && 3 && 4 && 5)"],
  ["relational operators", "say(1<2||1<=2||1==2||1!=2||1>=2||1>2)"],
  ["arithmetic", "send(2 * x + 3 / 5 - -1 % 7 ** 3 ** 3)"],
  ["length", "send len [1,2,3]"],
  ["boolean literals", "bool x = false || true"],
  ["all numeric literal forms", "say(8 * 89.123 * 1.3E5 * 1.3E+5 * 1.3E-5)"],
  ["empty array literal", "say([int]())"],
  ["nonempty array literal", "say([1, 2, 3])"],
  ["parentheses", "say(83 * ((((((((-(13 / 21))))))))) + 1 - 0)"],
  ["indexing array literals", "say([1,2,3][1])"],
  ["non-Latin letters in identifiers", "string コンパイラ = 100"],
  ["a simple string literal", 'say("hello😉😬💀🙅🏽‍♀️—`")'],
  ["string literal with escapes", 'send "a\\n\\tbc\\\\de\\"fg"'],
  ["u-escape", 'say("\\u{a}\\u{2c}\\u{1e5}\\u{ae89}\\u{1f4a9}\\u{10ffe8}")'],
  ["end of program inside comment", "say(0) // yay"],
  ["comments with no text", "say(1)//\nsay(0)//"],
  ["async functions", "async block f(): "],
  ["async functions with return type", "async block f() sends int: "],
  ["random used like a function", "say(random [1, 2] )", /Line 1, col 12/], 
  ["blank line", "say(1)\n\n\nsay(2)"], // preparser tests
  ["blank lines at end of source", "say(1)\n\n\n"], // preparser tests
  ["basic pipe-forward", "5 |> say"],
  ["basic pipe-backward", "say <| 10"],
  [
    "pipe-forward with function call",
    "block square(int x) sends int:\nsend x * x\n4 |> square",
  ],
  [
    "pipe-forward with multiple inputs",
    "block multiply(int x, int y) sends int:\nsend x * y\n3, 5 |> multiply",
  ],
];

const syntaxErrors = [
  ["non-letter in an identifier", "ab😭c = 2", /Line 1, col 3/],
  ["malformed number", "int x = 2.", /Line 1, col 11/],
  ["a missing right operand", "say(5 -", /Line 2, col 1/],
  ["a non-operator", "say(7 * ((2 _ 3)", /Line 1, col 13/],
  ["an expression starting with a )", "x = )", /Line 1, col 5/],
  ["a statement starting with expression", "x * 5", /Line 1, col 3/],
  ["an illegal statement on line 2", "say(5) \n x * 5", /Line 2, col 1/],
  ["a statement starting with a )", "say(5) \n ) * 5", /Line 2, col 1/],
  ["an expression starting with a *", "x = * 71", /Line 1, col 5/],
  ["negation before exponentiation", "say(-2**2)", /Line 1, col 8:/],
  ["mixing ands and ors", "say(1 && 2 || 3)", /Line 1, col 12:/],
  ["mixing ors and ands", "say(1 || 2 && 3)", /Line 1, col 12:/],
  ["associating relational operators", "say(1 < 2 < 3)", /Line 1, col 11:/],
  ["while without colon", "while true \n say(1)", /Line 2, col 1/],
  ["if without colon", "if x < 3 \n say(1)", /Line 2, col 1/],
  ["while as identifier", "int for = 3", /Line 1, col 5/],
  ["if as identifier", "int if = 8", /Line 1, col 5/],
  ["while with empty block", "while true:", /Line 2, col 1/],
  ["unbalanced brackets", "block f(): int[", /Line 1, col 15/],
  ["empty array without type", "say([])", /Line 1, col 6/],
  ["bad array literal", "say([1,2,])", /Line 1, col 10/],
  ["empty subscript", "say(a[])", /Line 1, col 7/],
  ["true is not assignable", "true = 1", /Line 1, col 5/],
  ["false is not assignable", "false = 1", /Line 1, col 6/],
  ["numbers cannot be subscripted", "say(500[x])", /Line 1, col 8/],
  ["numbers cannot be called", "say(500(x))", /Line 1, col 8/],
  ["numbers cannot be dereferenced", "say(500 .x)", /Line 1, col 9/],
  ["no-paren function type", "block f(int g sends int): ", /Line 1, col 15/],
  ["string lit with unknown escape", 'say("ab\\zcdef")', /col 9/],
  ["string lit with quote", 'say("ab"zcdef")', /col 9/],
  ["string lit with code point too long", 'say("\\u{1111111}")', /col 15/],
  ["bad indentation", "if true:\n  say(1)\n say(2)", /Indent Error/],
  ["tabs", "if true:\n\tsay(1)", /Illegal whitespace character/],
];

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`properly specifies ${scenario}`, () => {
      assert(parse(source).succeeded());
    });
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`does not permit ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern);
    });
  }
});
