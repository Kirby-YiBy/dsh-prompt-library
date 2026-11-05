# Changelog

All notable changes to this plugin. The version mirrors `package.json`.

## 0.17.3 — quote fills the composer again

- **Fix:** the quote action only copied (`已复制`) instead of writing into the composer. The
  `conversation.input.dock` bridge that was supposed to supply `appendDraft` never fired in this
  host, so there was no draft API to call and the code fell through to the clipboard.
- The composer is now resolved at click time: `uiSession.adapter.current` for the active session,
  falling back to the catalog row the main view retains, then `conversation.input.for(scope)`.
- Insertion uses the shell's sanctioned action face — `captureInsertion()` + `insertText()` for
  insert-at-caret — then `setDraft()` with the existing draft preserved, then the editor's own
  `appendDraft`. The clipboard is only a last resort.

## 0.17.2 — a hairline on the inverted toolbar

- The light-on-dark selection toolbar and the formula toast now carry a 1px `rgba(0,0,0,.14)`
  border, so the pill reads as a surface on a dark background instead of a glow.
- Both theme states reserve the same transparent border, so switching themes never shifts layout.

## 0.17.1 — contrast for the floating surfaces

- **Fix:** the selection toolbar (`引用`) was always a dark pill with white text, which was hard to
  read on a dark app. It now inverts against the *host* theme: light with dark text in dark mode,
  dark with light text in light mode. The formula-copy toast follows the same rule.
- The host theme is read from `color-scheme` first, then from the app's background luminance, then
  from `prefers-color-scheme` — never from this plugin's own theme preference, because these
  surfaces sit on top of the host UI rather than inside the panel.

## 0.17.0 — folder panel polish

- Drag a session onto a folder chip to file it, with a drop highlight
- Rename folders inline (double-click or ✎)
- Two-step delete (`确认删除？`) that reverts after three seconds
- Search sessions by title; rows show their folder and running state
- Three distinct empty states

## 0.16.0 — quote through the draft API

- Bind `session.input.for(scope).draftEditor` instead of the shell, which is where
  `appendDraft` actually lives
- Quote reply writes only through that API: no DOM edits, so a draft can no longer be wiped
- Inserting a prompt falls back to the DOM only when the composer is empty

## 0.15.0 — quote placement

- Read the caret before focusing: focusing a Lexical editor restored position 0, which put the
  quote at the very start of the draft
- A blank line is inserted only when the draft already has text

## 0.14.0 — no more synthetic Enter

- **Fix:** the newline was produced by dispatching an Enter keydown, and Enter is the *send* key in
  this host, so quoting sent the draft. Keyboard simulation removed entirely; a soft line break
  (`insertLineBreak`) is used instead.

## 0.13.0 — hover affordance

- **Fix:** the hover style used a custom property that only exists inside the panel, so it resolved
  to nothing on host elements. Literal colours now, matching the original's tint + 1px ring.

## 0.12.0 — formula copy, ported properly

- Click a formula to copy it (`findMathElement` chain: `data-math` → `ms-katex` → KaTeX)
- Four formats: `$…$`, bare LaTeX, MathML for Word, Notion `$$`
- Rich clipboard (`text/html` + `text/plain`) with an `execCommand` fallback
- The selection toolbar keeps only 引用, matching the original's split of duties

## 0.11.0 — origin policy

- **Fix:** `Origin === Host` is wrong on Desktop (the page is served from `dsh-app://` and may be
  `localhost` against a `127.0.0.1` host), so every write was refused as cross-origin
- Accept loopback origins on any port, `dsh-app://`, and `Origin: null`; refuse everything else
- Server-side decision log, because the client cannot read its own 403

## 0.10.0 — diagnostics

- Un-guarded `/dsh-prompts/api/debug` route writing to `~/.dsh/prompt-library-debug.log`
- Quote, formula and binding results reported there

## 0.9.0 — insert/copy hardening

- Insert path: draft API → composer DOM → clipboard
- Clipboard gains an `execCommand` fallback
- **Fix:** a `useState` placed after an early return changed the hook count and crashed the
  selection toolbar

## 0.7.0 — folders in the sidebar

- `sidebar.panellist` icon plus the `main` keyed page (`dsh-folders`)
- Sessions read from `ctx.sessions.list`, opened through `ctx.uiWorkspace.openSession`

## 0.6.0 — conversation folders

- Folder store at `~/.dsh/session-folders.json` with create/rename/remove/assign routes

## 0.5.0 — quote and formula selection

- First selection toolbar (quote + copy formula)

## 0.4.0 — parity rewrite

- Rebuilt the client against the extension's own CSS: 46px ball, 440px panel anchored above it,
  `oklch` tokens, compact default, tag AND filters, pinning, previews, markdown, variables

## 0.1.0 — first working plugin

- Host store and eight routes, floating ball and prompt panel
