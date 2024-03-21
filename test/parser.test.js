import assert from "node:assert/strict"
import parse from "../src/parser.js"

// Commented out tests are not implemented in Oh grammar yet, but we want to implement
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
  ["multiple statements", "say(1) \nbreak \nx=5 send send"], // ERROR 
  ["variable declarations", "let e=99*1;\nconst z=false"], // ERROR 
  ["function with no params, no return type", "block f(): "],
  ["function with one param", "block f(x: int): "], // ERROR 
  ["function with two params", "block f(x: int, y: bool): "], // ERROR
  ["function with no params + return type", "block f() sends int: "], // ERROR
  // ["function types in params", "block f(g: (int) sends bool): "],
  ["function types returned", "block f(): (int)->(int)->void: "], // ERROR
  ["array type for return", "block f(): [int]: "], // ERROR 
  ["array type for param", "block f(x: [[[bool]]]): "], // ERROR
  ["array type returned", "block f(): [[int]]: "], // ERROR
  // ["optional types", "block f(c: int?): float: "], 
  ["assignments", "a-- c++ abc=9*3 a=1"], 
  // ["complex var assignment", "c(5)[2] = 100\nc.p.r=1\nc.q(8)[2](1,1).z=1"], 
  ["complex var bumps", "c(5)[2]++ c.p.r++ c.q(8)[2](1,1).z-- "], // ERROR 
  ["call in statement", "int x = 1 \nf(100) \nsay(1);"], // ERROR
  ["call in exp", "say(5 * f(x, y, 2 * y));"], // ERROR
  ["short if", "if true: \n say(1)"], // ERROR
  ["longer if", "if true: say(1) else: say(1)"], // ERROR
  ["even longer if", "if true: say(1) else if false: say(1)"], // ERROR
  ["while with empty block", "while true:"], // ERROR
  ["while with one statement block", "while true: int x = 1"], // ERROR
  ["repeat with long block", "stack 2: say(1) \nsay(2) say(3)"], // ERROR
  ["if inside loop", "stack 3: if true: say(1)"], // ERROR 
  ["for closed range", "for i in 2...9*1: "], // ERROR
  ["for half-open range", "for i in 2..<9*1: "], // ERROR
  ["for collection-as-id", "for i in things: "], // ERROR
  ["for collection-as-lit", "for i in [3,5,8]: "], // ERROR
  // ["conditional", "send x?y:z?y:p "], 
  // ["??", "send a ?? b ?? c ?? d"],
  ["ors can be chained", "say(1 || 2 || 3 || 4 || 5)"], 
  ["ands can be chained", "say(1 && 2 && 3 && 4 && 5)"],
  ["relational operators", "say(1<2||1<=2||1==2||1!=2||1>=2||1>2)"],
  ["arithmetic", "send 2 * x + 3 / 5 - -1 % 7 ** 3 ** 3"], // ERROR
  ["length", "send #c send #[1,2,3]"], // ERROR
  ["boolean literals", "bool x = false || true"],
  ["all numeric literal forms", "say(8 * 89.123 * 1.3E5 * 1.3E+5 * 1.3E-5)"],
  ["empty array literal", "say([int]())"], // ERROR 
  ["nonempty array literal", "say([1, 2, 3])"], // ERROR
  ["random operator", "send random [1, 2, 3]"], // ERROR 
  ["parentheses", "say(83 * ((((((((-(13 / 21))))))))) + 1 - 0)"],
  // ["variables in expression", "send r.p(3,1)[9]?.x?.y.z.p()(5)[1]"], 
  // ["more variables", "send c(3).p?.oh(9)[2][2].nope(1)[3](2)"], 
  ["indexing array literals", "say([1,2,3][1])"], // ERROR 
  ["member expression on string literal", `say("hello".append("there"))`], // ERROR
  ["non-Latin letters in identifiers", "let コンパイラ = 100"], // ERROR 
  ["a simple string literal", 'say("hello😉😬💀🙅🏽‍♀️—`")'],
  ["string literal with escapes", 'send "a\\n\\tbc\\\\de\\"fg"'], // ERROR
  ["u-escape", 'say("\\u{a}\\u{2c}\\u{1e5}\\u{ae89}\\u{1f4a9}\\u{10ffe8}")'],
  ["end of program inside comment", "say(0); // yay"], // ERROR 
  ["comments with no text", "say(1)//\nsay(0)//"],
  ["async functions", "block async f(): "], // ERROR 
  ["async functions with return type", "block async f() sends int: "], // ERROR
  ["pipe-forward with function call", "5 |> say"], // ERROR
  ["pipe-backward with function call", "say <| 10"], // ERROR 
]

const syntaxErrors = [
  ["non-letter in an identifier", "ab😭c = 2", /Line 1, col 3/],
  ["malformed number", "int x = 2.", /Line 1, col 6/],
  ["variable declared without a type", "x = 3", /Line 1, col 1/],
  ["a missing right operand", "say(5 -", /Line 1, col 6/],
  ["a non-operator", "say(7 * ((2 _ 3)", /Line 1, col 11/],
  ["an expression starting with a )", "x = )", /Line 1, col 5/],
  ["a statement starting with expression", "x * 5", /Line 1, col 3/],
  ["an illegal statement on line 2", "say(5)\nx * 5", /Line 2, col 3/],
  ["a statement starting with a )", "say(5)\n) * 5", /Line 2, col 1/],
  ["an expression starting with a *", "x = * 71", /Line 1, col 5/],
  ["negation before exponentiation", "say(-2**2)", /Line 1, col 8:/],
  ["mixing ands and ors", "say(1 && 2 || 3)", /Line 1, col 13:/], // ERROR 
  ["mixing ors and ands", "say(1 || 2 && 3)", /Line 1, col 13:/], // ERROR
  ["associating relational operators", "say(1 < 2 < 3)", /Line 1, col 13:/], // ERROR
  ["while without colon", "while true\nsay(1)", /Line 1, col 8/], // ERROR
  ["if without colon", "if x < 3\nsay(1)", /Line 1, col 7/], // ERROR
  ["while as identifier", "int for = 3", /Line 1, col 5/],
  ["if as identifier", "int if = 8", /Line 1, col 5/], // ERROR 
  ["unbalanced brackets", "block f(): int[", /Line 1, col 15/], // ERROR
  ["empty array without type", "say([])", /Line 1, col 6/], // ERROR
  ["random used like a function", "say(random(1,2))", /Line 1, col 12/], // ERROR
  ["bad array literal", "say([1,2,])", /Line 1, col 9/], // ERROR
  ["empty subscript", "say(a[])", /Line 1, col 7/], // ERROR
  ["true is not assignable", "true = 1", /Line 1, col 5/], // ERROR
  ["false is not assignable", "false = 1", /Line 1, col 6/], // ERROR 
  ["numbers cannot be subscripted", "say(500[x])", /Line 1, col 8/],
  ["numbers cannot be called", "say(500(x))", /Line 1, col 8/],
  ["numbers cannot be dereferenced", "say(500 .x)", /Line 1, col 9/],
  ["no-paren function type", "block f(g:int sends int): ", /Line 1, col 19/], // ERROR
  ["string lit with unknown escape", 'say("ab\\zcdef")', /col 9/], // ERROR
  ["string lit with newline", 'say("ab\\zcdef")', /col 9/], // ERROR
  ["string lit with quote", 'say("ab\\zcdef")', /col 9/], // ERROR
  ["string lit with code point too long", 'say("\\u{1111111}")', /col 15/], // ERROR
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`properly specifies ${scenario}`, () => {
      assert(parse(source).succeeded())
    })
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`does not permit ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern)
    })
  }
})
