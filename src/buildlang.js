import * as fs from "node:fs/promises"
import process from "node:process"
import parse from "./parser.js"

if (process.argv.length !== 3) {
  console.log(
    "Must have exactly one argument: the filename of the program to compile."
  )
} else {
  try {
    const buffer = await fs.readFile(process.argv[2])
    parse(buffer.toString())
    console.log("Syntax is ok")
  } catch (e) {
    // log error message in red
    console.error("\x1b[31m%s\x1b[0m", e.message)
    process.exit(1)
  }
}
