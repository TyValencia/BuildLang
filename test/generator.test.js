// Implement from Carlos
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const fixtures = [
  {
    name: "small",
    source: `int x = 3 * 7 x++ x-- bool y = true y = 5 ** -x / -100 > - x || false say((y && y) || false || (x * 2) != 5)`,
    expected: dedent`
      let x_1 = 21;
      x_1++;
      x_1--;
      let y_2 = true;
      y_2 = ((((5 ** -(x_1)) / -(100)) > -(x_1)) || false);
      console.log(((y_2 && y_2) || ((x_1 * 2) !== 5)));
    `,
  },
  {
    name: "if",
    source: 
    [
      "int x = 0",
      "if (x == 0):",
      "  say(1)",
      "if (x == 0):",
      "  say(1)",
      "else:",
      "  say(2)",
      "if (x == 0):",
      "  say(1)",
      "else if (x == 2):",
      "  say(3)",
      "if (x == 0):",
      "  say(1)",
      "else if (x == 2):",
      "  say(3)",
      "else:", 
      "  say(4)",
    ].join('\n'),
    expected: dedent`
      let x_1 = 0;
      if ((x_1 === 0)) {
        console.log(1);
      }
      if ((x_1 === 0)) {
        console.log(1);
      } else {
        console.log(2);
      }
      if ((x_1 === 0)) {
        console.log(1);
      } else
        if ((x_1 === 2)) {
          console.log(3);
        }
      if ((x_1 === 0)) {
        console.log(1);
      } else
        if ((x_1 === 2)) {
          console.log(3);
        } else {
          console.log(4);
        }
    `,
  },
  {
    name: "while",
    source: 
    [
      "int x = 0",
      "while x < 5:",
      "  int y = 0",
      "  while y < 5:",
      "    say(x * y)",
      "    y = y + 1",
      "  x = x + 1",
    ].join('\n'),
    expected: dedent`
      let x_1 = 0;
      while ((x_1 < 5)) {
        let y_2 = 0;
        while ((y_2 < 5)) {
          console.log((x_1 * y_2));
          y_2 = (y_2 + 1);
        }
        x_1 = (x_1 + 1);
      }
    `,
  },
  {
    name: "functions with pipes", 
    source: 
    [
      "float z = 0.5",
      "block f(float x):",
      "  say(sin(1.0) > π)",
      "  send",
      "block g() sends bool:",
      "  string word = \"hello\"",
      "  int a = len word",
      "  send false",
      "bool n = true",
      "z |> f |> g",
    ].join('\n'), 
    expected: dedent`
      let z_1 = 0.5;
      function f_2(x_3) {
        console.log((Math.sin(1) > Math.PI));
        return;
      }
      function g_4() {
        let word_5 = "hello";
        let a_6 = word_5.length;
        return false;
      }
      let n_7 = true;
      g_4(f_2(z_1));
      `, 
  },
  {
    name: "for loops",
    source: 
    [
      "for i in 1..<50:",
      "  say(i)",
      "for j in [10, 20, 30]:",
      "  say(j)",
      "stack 3:",
      "  say(1)",
      "for k in 1...10:",
      "  say(2)",
    ].join('\n'),
    expected: dedent`
      for (let i_1 = 1; i_1 < 50; i_1++) {
        console.log(i_1);
      }
      for (let j_2 of [10,20,30]) {
        console.log(j_2);
      }
      for (let i_3 = 0; i_3 < 3; i_3++) {
        console.log(1);
      }
      for (let k_4 = 1; k_4 <= 10; k_4++) {
        console.log(2);
      }
    `,
  },
]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))))
      assert.deepEqual(actual, fixture.expected)
    })
  }
})