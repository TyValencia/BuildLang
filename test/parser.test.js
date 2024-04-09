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
  ["function with no params + return type", "block f() sends int: "], 
  ["array type for return", "block f() sends [int]: "], 
  ["array type for param", "block f([[[bool]]] x): "], 
  ["array type returned", "block f() sends [[int]]: "], 
  ["assignments", "a-- c++ abc=9*3 a=1"],
  ["read-only declaration", "$int x = 5"],
  ["complex var bumps", "c(5)[2]++ c.p.r++ c.q(8)[2](1,1).z-- "], 
  ["call in statement", "f(100)"], 
  ["call in statement after func decl", "block f(int x): \n say(5) \n f(100)"], 
  ["call in exp", "say(5 * f(x, y, 2 * y))"], 
  ["short if", "if true: \n say(1)"], 
  ["longer if", "if true: \n say(1) ⇦ else: ⇨ say(1)"], // Correct, but look over preparser to make sure all indents & dedents are accounted for
  ["even longer if", "if true: \n say(1) ⇦ else if false: ⇨ say(1)"], 
  ["while with one statement block", "while true: \n int x = 1"], 
  ["repeat with long block", "stack 2: \n say(1) \n say(2) \n say(3)"], 
  ["if inside loop", "stack 3: \n if true: ⇨ say(1) ⇦"], 
  ["for closed range", "for i in 2...9*1: \n say(1)"], 
  ["for half-open range", "for i in 2..<9*1: \n say(1)"], 
  ["for collection-as-id", "for i in things: \n say(1)"], 
  ["for collection-as-lit", "for i in [3,5,8]: \n say(1)"], 
  ["ors can be chained", "say(1 || 2 || 3 || 4 || 5)"],
  ["ands can be chained", "say(1 && 2 && 3 && 4 && 5)"],
  ["relational operators", "say(1<2||1<=2||1==2||1!=2||1>=2||1>2)"],
  ["arithmetic", "send(2 * x + 3 / 5 - -1 % 7 ** 3 ** 3)"], 
  ["length", "send [1,2,3].length"], 
  ["boolean literals", "bool x = false || true"],
  ["all numeric literal forms", "say(8 * 89.123 * 1.3E5 * 1.3E+5 * 1.3E-5)"],
  ["empty array literal", "say([int]())"], 
  ["nonempty array literal", "say([1, 2, 3])"], 
  ["parentheses", "say(83 * ((((((((-(13 / 21))))))))) + 1 - 0)"],
  ["variables in expression", "send r.p(3,1)[9]?.x?.y.z.p()(5)[1]"],
  ["more variables", "send c(3).p?.oh(9)[2][2].nope(1)[3](2)"],
  ["indexing array literals", "say([1,2,3][1])"], 
  ["member expression on string literal", `say(hello.append("there"))`], 
  ["non-Latin letters in identifiers", "string コンパイラ = 100"], 
  ["a simple string literal", 'say("hello😉😬💀🙅🏽‍♀️—`")'],
  ["string literal with escapes", 'send "a\\n\\tbc\\\\de\\"fg"'], 
  ["u-escape", 'say("\\u{a}\\u{2c}\\u{1e5}\\u{ae89}\\u{1f4a9}\\u{10ffe8}")'],
  ["end of program inside comment", "say(0) // yay"], 
  ["comments with no text", "say(1)//\nsay(0)//"],
  ["async functions", "async block f(): "], 
  ["async functions with return type", "async block f() sends int: "], 
  ["random used like a function", "say(random(1,2))", /Line 1, col 12/], // √ is a feature, returns random of the outputs
  ["pipe-forward with function call", "5 |> say"], // FIX pipe-forward
  ["pipe-backward with function call", "say <| 10"], // FIX pipe-backward
  // Possible optional tests:  
  // ["optional types", "block f(c: int?): float: "],
  // ["conditional", "send x?y:z?y:p "],
  // ["??", "send a ?? b ?? c ?? d"],
];

// These all pass (they are supposed to have errors) when put in Ohm editor, but some have issues with the preparser
const syntaxErrors = [
  ["non-letter in an identifier", "ab😭c = 2", /Line 1, col 3/],
  ["malformed number", "int x = 2.", /Line 1, col 5/], 
  ["a missing right operand", "say(5 -", /Line 1, col 6/], 
  ["a non-operator", "say(7 * ((2 _ 3)", /Line 1, col 11/], 
  ["an expression starting with a )", "x = )", /Line 1, col 5/],
  ["a statement starting with expression", "x * 5", /Line 1, col 3/], 
  ["an illegal statement on line 2", "say(5) \n x * 5", /Line 2, col 3/], 
  ["a statement starting with a )", "say(5) \n ) * 5", /Line 2, col 1/],
  ["an expression starting with a *", "x = * 71", /Line 1, col 5/],
  ["negation before exponentiation", "say(-2**2)", /Line 1, col 8:/],
  ["mixing ands and ors", "say(1 && 2 || 3)", /Line 1, col 13:/], 
  ["mixing ors and ands", "say(1 || 2 && 3)", /Line 1, col 13:/],
  ["associating relational operators", "say(1 < 2 < 3)", /Line 1, col 13:/], 
  ["while without colon", "while true \n say(1)", /Line 1, col 8/], 
  ["if without colon", "if x < 3 \n say(1)", /Line 1, col 7/], 
  ["while as identifier", "int for = 3", /Line 1, col 5/],
  ["if as identifier", "int if = 8", /Line 1, col 5/], 
  ["while with empty block", "while true:", /Line 1, col 11/], 
  ["unbalanced brackets", "block f(): int[", /Line 1, col 15/], 
  ["empty array without type", "say([])", /Line 1, col 6/], 
  ["bad array literal", "say([1,2,])", /Line 1, col 9/], 
  ["empty subscript", "say(a[])", /Line 1, col 7/], 
  ["true is not assignable", "true = 1", /Line 1, col 5/], 
  ["false is not assignable", "false = 1", /Line 1, col 6/], 
  ["numbers cannot be subscripted", "say(500[x])", /Line 1, col 8/],
  ["numbers cannot be called", "say(500(x))", /Line 1, col 8/],
  ["numbers cannot be dereferenced", "say(500 .x)", /Line 1, col 9/],
  ["no-paren function type", "block f(g:int sends int): ", /Line 1, col 19/], 
  ["string lit with unknown escape", 'say("ab\\zcdef")', /col 9/], 
  ["string lit with quote", 'say("ab"zcdef")', /col 9/], 
  ["string lit with code point too long", 'say("\\u{1111111}")', /col 15/], 
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
