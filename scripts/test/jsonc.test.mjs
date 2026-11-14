import assert from "node:assert/strict";
import { test } from "node:test";

import { stripJsonComments } from "../lib/jsonc.mjs";

test("strips line and block comments outside strings", () => {
  const source = `{
    // line comment
    "name": "sub-store-cloudflare",
    /* block
       comment */
    "url": "https://example.com/a//b",
    "escaped": "quote \\" // still a string",
    "literal": "/* not a comment */"
  }`;

  assert.deepEqual(JSON.parse(stripJsonComments(source)), {
    name: "sub-store-cloudflare",
    url: "https://example.com/a//b",
    escaped: 'quote " // still a string',
    literal: "/* not a comment */",
  });
});

test("handles a trailing comment without a final newline", () => {
  assert.deepEqual(JSON.parse(stripJsonComments('{"a":1} // done')), { a: 1 });
});
