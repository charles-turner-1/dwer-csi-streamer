import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: "page",
      source: "**/*.md",
      // `title` and `description` are part of the built-in page schema; declare
      // the extra frontmatter blog posts use so it is typed on the items.
      schema: z.object({
        date: z.string().optional(),
        author: z.string().optional(),
      }),
    }),
  },
});
