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
  // {
  //   name: "if",
  //   source: 
  //   `int x = 0
  //   if (x == 0): 
  //       say("1") 
  //   if (x == 0): 
  //       say(1) 
  //   else: 
  //       say(2) 
  //   if (x == 0): 
  //       say(1) 
  //   else if (x == 2): 
  //       say(3) 
  //   if (x == 0): 
  //       say(1) 
  //   else if (x == 2): 
  //       say(3) 
  //   else: 
  //       say(4)`,
  //   expected: dedent`
  //     let x_1 = 0;
  //     if ((x_1 === 0)) {
  //       console.log("1");
  //     }
  //     if ((x_1 === 0)) {
  //       console.log(1);
  //     } else {
  //       console.log(2);
  //     }
  //     if ((x_1 === 0)) {
  //       console.log(1);
  //     } else
  //       if ((x_1 === 2)) {
  //         console.log(3);
  //       }
  //     if ((x_1 === 0)) {
  //       console.log(1);
  //     } else
  //       if ((x_1 === 2)) {
  //         console.log(3);
  //       } else {
  //         console.log(4);
  //       }
  //   `,
  // },
  // {
  //   name: "while",
  //   source: `
  //     int x = 0
  //     while x < 5:
  //       int y = 0
  //       while y < 5:
  //         say(x * y)
  //         y = y + 1
  //         break
  //       x = x + 1
  //   `,
  //   expected: dedent`
  //     let x_1 = 0;
  //     while ((x_1 < 5)) {
  //       let y_2 = 0;
  //       while ((y_2 < 5)) {
  //         console.log((x_1 * y_2));
  //         y_2 = (y_2 + 1);
  //         break;
  //       }
  //       x_1 = (x_1 + 1);
  //     }
  //   `,
  // },
  // {
  //   name: "functions", // Potential for pipelines here
  //   source: `float z = 0.5 block f(float x, bool y): say(sin(1.0) > π) send block g() sends bool: send false`, // f(z, g())
  //   expected: dedent`
  //     let z_1 = 0.5;
  //     function f_2(x_3, y_4) {
  //       console.log((Math.sin(1) > Math.PI));
  //       return;
  //     }
  //     function g_5() {
  //       return false;
  //     }
  //   `, // f_2(z_1, g_5());
  // },
  // {
  //   name: "arrays",
  //   source: `bool a = [true, false, true] int b = [int]() int c = [10, len a - 20, 30] int d = random c say(a[1] || (b[0] < 88))`, // len and random expect arrays, but a and b are?
  //   expected: dedent`
  //     let a_1 = [true,false,true];
  //     let b_2 = [];
  //     let c_2 = [10,(a_1.length - 20),30];
  //     let d_3 = ((a=>a[~~(Math.random()*a.length)])(c_3));
  //     console.log(a_1[1] || (b_2[0] < 88));
  //   `,
  // },
  // {
  //   name: "for loops",
  //   source: `
  //     for i in 1..<50:
  //       say(i)
  //     for j in [10, 20, 30]:
  //       say(j)
  //     stack 3
  //       // hello
  //     for k in 1...10:
  //       say(k)
  //   `,
  //   expected: dedent`
  //     for (let i_1 = 1; i_1 < 50; i_1++) {
  //       console.log(i_1);
  //     }
  //     for (let j_2 of [10,20,30]) {
  //       console.log(j_2);
  //     }
  //     for (let i_3 = 0; i_3 < 3; i_3++) {
  //     }
  //     for (let k_4 = 1; k_4 <= 10; k_4++) {
  //     }
  //   `,
  // },
]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    it(`produces expected js output for the ${fixture.name} program`, () => {
      const actual = generate(optimize(analyze(parse(fixture.source))))
      assert.deepEqual(actual, fixture.expected)
    })
  }
})