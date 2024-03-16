import assert from "node:assert/strict"
import parse from "../src/parser.js"

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
]

const syntaxErrors = [
  ["non-letter in an identifier", "ab😭c = 2", /Line 1, col 3/],
  ["malformed number", "x= 2.", /Line 1, col 6/],
  ["a missing right operand", "say(5 -", /Line 1, col 8/],
  ["a non-operator", "say(7 * ((2 _ 3)", /Line 1, col 13/],
  ["an expression starting with a )", "x = )", /Line 1, col 5/],
  ["a statement starting with expression", "x * 5", /Line 1, col 3/],
  ["an illegal statement on line 2", "say(5)\nx * 5", /Line 2, col 3/],
  ["a statement starting with a )", "say(5)\n) * 5", /Line 2, col 1/],
  ["an expression starting with a *", "x = * 71", /Line 1, col 5/],
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
