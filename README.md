# Relate — Markdown ERD designer

A dependency-free relational schema designer built with HTML, CSS, and vanilla JavaScript. No build step, account, backend, or network requests are required.

## Run

Open `index.html` in a modern browser. Alternatively, run `python3 -m http.server 8080` in this directory and visit http://localhost:8080.

## Write your schema

Click the **?** button or **Syntax guide** for the in-app guide.

### Markdown tables

```markdown
| Entity | Attribute | Type | Constraints | Description |
| --- | --- | --- | --- | --- |
| Student | student_id | INT | PK | Unique student |
| | student_name | VARCHAR | NOT NULL | Name |
| Enrollment | enrollment_id | INT | PK | Enrollment |
| | student_id | INT | FK (Student.student_id) | Student |
| | course_id | INT | FK (Course.course_id) | Course |
| Course | course_id | INT | PK | Unique course |
| | course_title | VARCHAR | NOT NULL | Title |
```

Entity and Attribute headers are required; Type and Constraints are optional. Header matching is case-insensitive. Leave Entity blank for more attributes in the same entity. Bold and backtick formatting is accepted. Description columns are ignored. Use simple identifiers made of letters, numbers, underscores, or hyphens for entities and attributes referenced by foreign keys. Identifier matching is case-sensitive.

### Entity lists

```markdown
## Student
- student_id INT PK
- student_name VARCHAR NOT NULL

## Enrollment
- enrollment_id INT PK
- student_id INT FK -> Student.student_id
- course_id INT FK -> Course.course_id

## Course
- course_id INT PK
- course_title VARCHAR NOT NULL
```

Tagged bullet headings are also accepted:

```markdown
* **[Entity] Student**
  * `🔑 student_id` (PK)
  * `👤 student_name`
* **[Junction Table] Enrollment**
  * `🔑 enrollment_id` (PK)
  * `🔗 student_id` (FK → Student.student_id)
  * `🔗 course_id` (FK → Course.course_id)
* **[Entity] Course**
  * `🔑 course_id` (PK)
```

`##` and `###` introduce entities; a single `#` is a document title or comment. Types may be omitted. The supplied key, link, person, and book emoji and LaTeX `$\rightarrow$` are accepted. Relationship prose is ignored. Code-fenced examples are ignored: paste actual schema text without a surrounding code fence. Arbitrary text-art diagrams are export-only, not parsed as schema input.

### Many-to-many

Represent Student ↔ Course with an Enrollment junction entity and two foreign keys. Each FK creates a parent `1` to child `N` connection. You can mark each FK as `PK, FK (Entity.attribute)` to describe a composite primary key. If using an independent enrollment ID, enforce uniqueness of `(student_id, course_id)` in your database to prevent duplicate enrollment.

This is a diagram designer, not a database validator or migration generator. Constraints such as NOT NULL and UNIQUE are retained in Markdown and field tooltips. Connectors show maximum 1:N cardinality for every foreign key; optionality and unique-FK 1:1 cardinality are not inferred. Composite FK groups are not modeled as a single connection. Unresolved references and duplicate fields produce editor messages. Long labels are shortened on cards; hover for full details.

## Canvas controls

Use **Hide editor** above the canvas to collapse the Markdown panel and **Show editor** to expand it. Your schema is preserved, the canvas refits automatically, and the preference is remembered in this browser.

- Drag a table to reposition it; drag the background to pan. Tables maintain a 64-unit gap (32 units of margin per table). Dragging into another table’s margin is blocked. Existing overlapping layouts are repaired on load/import and when fields are added.
- Click a relationship line to highlight its entire connected component, following links in both directions through branches and cycles. The selected line is amber, connected links/tables are green, and unrelated entities fade. Tab to a line and press Enter/Space for keyboard selection. Escape, Clear, or clicking the background clears the highlight. SVG/PNG exports preserve the current highlight.
- Scroll or use +/− to zoom around the cursor or canvas center.
- Click the zoom percentage to return to 100%.
- Fit view frames the entire diagram; Auto layout arranges entities in rows.
- Focus the canvas to use arrow keys to pan, +/− to zoom, and 0 to fit.
- Undo/redo buttons or Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z restore schema and layout changes (up to 80 snapshots). Pan/zoom changes are not part of undo history.
- On touchscreens, drag with one finger and use zoom buttons.

## Search

Search table and column names in the **Find in schema** bar (case-insensitive). Results list each matching table and its matching columns. Click a result or press Enter for the first match to center its table. Matching columns are highlighted; unrelated tables fade. Clear or Escape resets search. Ctrl/Cmd+K focuses the search input. Search works with the Markdown editor collapsed.

## Save, import, and export

Changes are automatically stored in this browser's localStorage when available. Storage depends on the browser and origin; use Project export for durable backups. Clearing browser data removes local saved work. The app does not upload your schemas.

Import Markdown (`.md`, `.markdown`, `.txt`) or an exported JSON project, up to 2 MB. Import and Load example replace the editor and can be undone.

Export options:

- **SVG** — full vector diagram with background; independent of current pan/zoom.
- **PNG** — full diagram at 2× resolution. Very large diagrams must use SVG.
- **Markdown** — original schema text.
- **Text art** — plain-text entity boxes and a labeled relationship map.
- **Project JSON** — editable Markdown and table positions; import to resume.

The JSON format has `version: 1`, a `markdown` string, and a `positions` object mapping entity names to `{ "x": number, "y": number }` coordinates. Viewport and undo history are not exported.

## Files

- `index.html`: application shell and accessible help/export dialogs.
- `style.css`: responsive editor and canvas styling.
- `app.js`: parser, SVG renderer, canvas interactions, history, persistence, and exports.

## Checks

Run `node --check app.js` and `node tests.js`. The latter checks the parser against tables, list syntax, composite key markers, unresolved references, and code fences. No dependency installation is needed.
