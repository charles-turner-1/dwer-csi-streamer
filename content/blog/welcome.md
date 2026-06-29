---
title: "Welcome to the data streamer updates"
description: "How this blog works and how to publish your own update."
date: "2026-06-29"
author: "DWER CSI"
---

# Welcome

This is the updates blog for the DWER Climate Science Initiative data streamer.
It is a lightweight, file-based CMS: there is **no admin interface and no
database to edit**. To publish an update, you just add a markdown file.

## Publishing an update

1. Create a new file under `content/blog/`, e.g. `content/blog/my-update.md`.
2. Add frontmatter at the top:

   ```yaml
   ---
   title: "My update"
   description: "A one-line summary shown on the blog index."
   date: "2026-07-01"
   author: "Your Name"
   ---
   ```

3. Write the body in standard markdown — headings, lists, code blocks, tables,
   links and images all work.
4. Commit and push. The post appears at `/blog/my-update` and is listed on the
   blog index automatically — no code changes required.

## Adding figures

Put image files in the `public/` directory and reference them with an absolute
path:

```markdown
![Example figure](/figures/example.png)
```

Anything in `public/` is published as-is, so `/figures/example.png` maps to
`public/figures/example.png`.

That's it — happy writing.
