// The parse() function uses Ohm to produce a match object for a given
// source code program, using the grammar in the buildlang.ohm.

import * as fs from "node:fs";
import * as ohm from "ohm-js";

import { withIndentsAndDedents } from "./preparser.js";
const grammar = ohm.grammar(fs.readFileSync("src/buildlang.ohm"));

// Returns the Ohm match if successful, otherwise throws an error
export default function parse(sourceCode) {
  const preprocessedSourceCode = withIndentsAndDedents(sourceCode);
  const match = grammar.match(preprocessedSourceCode);
  if (!match.succeeded()) throw new Error(match.message);
  return match;
}
