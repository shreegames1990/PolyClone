import { createCn } from "cn/config";

/** Type scale from globals.css and daisyUI radii, so merging keeps them instead of treating them as colors. */
const TYPE_TOKENS = ["display", "title", "heading", "body", "body-sm", "label", "caption"];
const RADIUS_TOKENS = ["box", "field", "selector"];

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: TYPE_TOKENS }],
      rounded: [{ rounded: RADIUS_TOKENS }],
    },
  },
});
