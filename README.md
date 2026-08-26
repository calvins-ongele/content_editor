# ContentEditor

A lightweight, zero-dependency WYSIWYG rich text editor built with vanilla JavaScript. Features live word/character counting, custom callouts, code blocks, modals, and dynamic table operations.

## Features

* **Zero External Dependencies** — Single self-contained JS class.
* **Live Word & Character Count** — Built-in footer tracking words, character count (with/without spaces), and estimated read time.
* **Custom Containers & Code Support** — Pre-formatted code blocks (`<pre><code>`), inline code (`<code>`), and callouts (`.ce-callout`).
* **Clean Public API** — Simple `.get()` and `.set(html)` methods.
* **Interactive Modals** — Link, image, video embed, and table generator dialogs.
* **Table Editor** — Add/delete table rows and columns contextually.
* **Full-screen & Source Modes** — Edit raw HTML or switch to full-window mode.

---

## Quick Start

### HTML Markup & Initialization

```html
<div id="editor-container"></div>

<script src="ContentEditor.js"></script>
<script>
  const editor = new ContentEditor({
    container: '#editor-container'
  });
</script>

##API Reference

- .get()
Returns current inner HTML from the content area (or current textarea value when in source mode).
const contentBody = editor.get();

- .set(html)
Populates the editor with HTML and updates live stats.
editor.set('<p>Hello world!</p>');

- Footer & Live Statistics
The editor automatically appends a .ce-footer bar tracking stats on input, command execution, and state restoration:
Stat Metric	Description	Calculation
Words	Total word count	RegEx word boundary splits (/\s+/)
Chars	Total character length	Full string length including spaces
No spaces	Character count without whitespace	Removes whitespace characters (/\s/g)
Read time	Estimated reading duration	Based on average 200 words per minute

##Output Markup Structure
<!-- Callout Box -->
<div class="ce-callout">Callout note text...</div>
<!-- Code Block -->
<pre class="ce-code-block"><code>const x = 10;</code></pre>
<!-- Inline Code -->
<code class="ce-inline-code">npm install</code>


