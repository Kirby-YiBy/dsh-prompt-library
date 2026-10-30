window.__ModuleLoader__.load({
  id: "dsh-prompt-library",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;

    const API = "/dsh-prompts/api";
    const STYLE_ID = "dsh-prompt-library-style";
    const PREFS_KEY = "dspl.prefs.v3";
    const PLUGIN_VERSION = "0.17.0";
    const BALL_SIZE = 46;
    const EDGE = 18;
    const PANEL_GAP = 10;
    const VIEWPORT_PAD = 8;
    const PANEL_WIDTH = 440;
    const PREVIEW_OPEN_MS = 250;
    const PREVIEW_CLOSE_MS = 150;

    const composer = { appendDraft: null, setDraft: null };

    const DEFAULT_PREFS = {
      ball: { right: EDGE, bottom: EDGE },
      panel: null,
      locked: false,
      view: "compact",
      theme: "auto",
      filter: "all",
      insertOnClick: true,
      lang: "zh",
      formulaFormat: "latex",
    };

    const STRINGS = {
      zh: {
        title: "提示词库", add: "新增", save: "保存", cancel: "取消",
        search: "搜索 prompt 或标签", empty: "暂无 prompt",
        all: "全部", pinned: "已置顶", recent: "最近",
        pin: "置顶", unpin: "取消置顶", edit: "编辑", remove: "删除",
        confirmDelete: "确定删除该 prompt 吗？",
        reorderTip: "拖动调整顺序（↑/↓ 键）",
        namePlaceholder: "备注名",
        textPlaceholder: "Prompt 文本，支持 Markdown 与 {{变量}}",
        tagsPlaceholder: "标签（逗号分隔）",
        nameRequired: "必须填写 Prompt 名称",
        nameTaken: "Prompt 名称已存在",
        saveFailed: "无法保存更改，已撤销。",
        saved: "已保存", inserted: "已插入", copied: "已复制", deleted: "已删除",
        loadFailed: "无法加载 prompt，正在重试，请稍后再试。",
        import: "导入", export: "导出",
        imported: "已导入 {count} 条",
        importFailed: "文件格式不正确或导入失败：",
        exportFailed: "导出失败：",
        compact: "紧凑", comfortable: "舒适",
        clickInsert: "点击插入", clickCopy: "点击复制",
        themeAuto: "跟随系统", themeLight: "浅色", themeDark: "深色",
        lock: "锁定位置", unlock: "取消锁定", close: "关闭",
        fillVars: "填写变量", keepLiteral: "留空保留 {{变量}} 原文", insert: "插入",
        settingsHint: "编辑 prompt", newHint: "新增 prompt", langToggle: "English",
        folders: "会话文件夹", unfiled: "未归档", allSessions: "全部会话", newFolder: "新建文件夹",
        moveTo: "移到", noSessions: "暂无会话", deleteFolder: "删除文件夹",
      },
      en: {
        title: "Prompts", add: "New", save: "Save", cancel: "Cancel",
        search: "Search prompts or tags", empty: "No prompts yet",
        all: "All", pinned: "Pinned", recent: "Recent",
        pin: "Pin", unpin: "Unpin", edit: "Edit", remove: "Delete",
        confirmDelete: "Delete this prompt?",
        reorderTip: "Drag to reorder (↑/↓ keys)",
        namePlaceholder: "Name",
        textPlaceholder: "Prompt text — Markdown and {{variables}} supported",
        tagsPlaceholder: "Tags (comma separated)",
        nameRequired: "Name is required",
        nameTaken: "That name is already taken",
        saveFailed: "Could not save, the change was rolled back.",
        saved: "Saved", inserted: "Inserted", copied: "Copied", deleted: "Deleted",
        loadFailed: "Could not load prompts, retrying.",
        import: "Import", export: "Export",
        imported: "Imported {count}",
        importFailed: "Bad file or import failed: ",
        exportFailed: "Export failed: ",
        compact: "Compact", comfortable: "Comfortable",
        clickInsert: "Click to insert", clickCopy: "Click to copy",
        themeAuto: "System theme", themeLight: "Light", themeDark: "Dark",
        lock: "Lock position", unlock: "Unlock position", close: "Close",
        fillVars: "Fill variables", keepLiteral: "Leave empty to keep {{var}}", insert: "Insert",
        settingsHint: "Edit prompt", newHint: "New prompt", langToggle: "中文",
        folders: "Folders", unfiled: "Unfiled", allSessions: "All sessions", newFolder: "New folder",
        moveTo: "Move to", noSessions: "No sessions", deleteFolder: "Delete folder",
      },
    };

    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (raw === null) return { ...DEFAULT_PREFS };
        const parsed = JSON.parse(raw);
        return {
          ball: { ...DEFAULT_PREFS.ball, ...(parsed.ball || {}) },
          panel: parsed.panel && typeof parsed.panel === "object" ? parsed.panel : null,
          locked: parsed.locked === true,
          view: parsed.view === "comfortable" ? "comfortable" : "compact",
          theme: ["auto", "light", "dark"].includes(parsed.theme) ? parsed.theme : "auto",
          filter: ["all", "pinned", "recent"].includes(parsed.filter) ? parsed.filter : "all",
          insertOnClick: parsed.insertOnClick !== false,
          formulaFormat: ["latex", "bare", "mathml", "notion"].includes(parsed.formulaFormat) ? parsed.formulaFormat : "latex",
          lang: parsed.lang === "en" ? "en" : "zh",
        };
      } catch {
        return { ...DEFAULT_PREFS };
      }
    }

    function writePrefs(prefs) {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // Preferences are a convenience; blocked storage must not break the panel.
      }
    }

    // ---------------------------------------------------------------- styles
    // Metrics, radii and oklch tokens mirror the extension's own
    // src/styles/contentStyle/0xx-prompt-*.css so the panel matches the original.
    const CSS = `
.dspl-ball, .dspl-panel {
  --dspl-brand: oklch(.601 .1 140);
  --dspl-brand-hover: oklch(.55 .1 140);
  --dspl-brand-fg: #ffffff;
  --dspl-brand-soft: oklch(.601 .1 140 / .16);
  --dspl-brand-ink: oklch(.38 .09 140);
  --dspl-brand-glow: oklch(.601 .1 140 / .35);
  --dspl-brand-glow-2: oklch(.601 .1 140 / .2);
  --dspl-brand-glow-strong: oklch(.601 .1 140 / .45);
}
.dspl-panel[data-theme="dark"] {
  --dspl-brand: oklch(.773 .091 126);
  --dspl-brand-hover: oklch(.72 .09 126);
  --dspl-brand-fg: #1f2a24;
  --dspl-brand-soft: oklch(.773 .091 126 / .18);
  --dspl-brand-ink: oklch(.82 .09 126);
  --dspl-brand-glow: oklch(.773 .091 126 / .3);
  --dspl-brand-glow-2: oklch(.773 .091 126 / .18);
  --dspl-brand-glow-strong: oklch(.773 .091 126 / .4);
}
@media (prefers-color-scheme: dark) {
  .dspl-ball {
    --dspl-brand: oklch(.773 .091 126);
    --dspl-brand-hover: oklch(.72 .09 126);
    --dspl-brand-fg: #1f2a24;
    --dspl-brand-glow: oklch(.773 .091 126 / .3);
    --dspl-brand-glow-2: oklch(.773 .091 126 / .18);
    --dspl-brand-glow-strong: oklch(.773 .091 126 / .4);
  }
}
.dspl-ball {
  position: fixed; width: ${BALL_SIZE}px; height: ${BALL_SIZE}px; padding: 0; border: none;
  border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--dspl-brand); color: var(--dspl-brand-fg); cursor: pointer;
  box-shadow: 0 6px 24px var(--dspl-brand-glow), 0 2px 8px var(--dspl-brand-glow-2);
  transition: background-color .15s ease, box-shadow .15s ease;
  z-index: 2147483100; touch-action: none;
}
.dspl-ball:hover { background: var(--dspl-brand-hover); box-shadow: 0 10px 32px var(--dspl-brand-glow-strong), 0 4px 12px var(--dspl-brand-glow); }
.dspl-ball:focus-visible { outline: 2px solid var(--dspl-brand); outline-offset: 3px; }
.dspl-ball[data-dragging="true"] { cursor: grabbing; }
.dspl-ball svg { pointer-events: none; }
.dspl-panel {
  position: fixed; display: flex; flex-direction: column; width: ${PANEL_WIDTH}px;
  max-width: calc(100vw - 20px); max-height: min(75vh, 600px); overflow: hidden;
  font-size: 14px; border-radius: 18px; background: var(--dspl-surface);
  border: 1px solid var(--dspl-border); box-shadow: none;
  z-index: 2147483200; color: var(--dspl-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.dspl-panel[data-theme="light"] {
  --dspl-surface: oklch(.995 .002 250); --dspl-text: oklch(.14 .004 285);
  --dspl-border: oklch(.92 .004 250 / .7); --dspl-wash: oklch(.14 .004 285 / .04);
  --dspl-wash-strong: oklch(.14 .004 285 / .07); --dspl-selected: oklch(.995 .002 250);
  --dspl-row: rgba(0,0,0,.04); --dspl-row-hover: rgba(0,0,0,.07); --dspl-muted: rgba(31,41,55,.55);
}
.dspl-panel[data-theme="dark"] {
  --dspl-surface: oklch(.2 .008 285); --dspl-text: oklch(.92 .004 250);
  --dspl-border: oklch(.3 .008 285 / .7); --dspl-wash: rgba(255,255,255,.06);
  --dspl-wash-strong: rgba(255,255,255,.08); --dspl-selected: oklch(.32 .008 285);
  --dspl-row: rgba(255,255,255,.05); --dspl-row-hover: rgba(255,255,255,.09); --dspl-muted: rgba(229,231,235,.6);
}
.dspl-preview[data-theme="light"] { --dspl-surface: oklch(.995 .002 250); --dspl-text: oklch(.14 .004 285); --dspl-border: oklch(.92 .004 250 / .7); }
.dspl-preview[data-theme="dark"] { --dspl-surface: oklch(.2 .008 285); --dspl-text: oklch(.92 .004 250); --dspl-border: oklch(.3 .008 285 / .7); }
.dspl-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; gap: 6px; border-bottom: 1px solid var(--dspl-border); cursor: grab; }
.dspl-header:active { cursor: grabbing; }
.dspl-grip { width: 10px; height: 14px; margin-right: 4px; opacity: .35; flex-shrink: 0; display: grid; grid-template-columns: repeat(2, 3px); grid-template-rows: repeat(3, 3px); gap: 2px; }
.dspl-grip span { background: currentColor; border-radius: 1px; }
.dspl-title { font-weight: 800; font-size: 17px; letter-spacing: -.02em; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--dspl-text); }
.dspl-controls { display: inline-flex; gap: 6px; align-items: center; margin-left: auto; }
.dspl-add { box-sizing: border-box; height: 28px; border-radius: 8px; padding: 0 12px; background: var(--dspl-brand); color: var(--dspl-brand-fg); border: none; font: inherit; font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer; transition: background-color .15s ease; }
.dspl-add:hover { background: var(--dspl-brand-hover); }
.dspl-icon { box-sizing: border-box; width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: transparent; border: 1px solid var(--dspl-border); color: inherit; cursor: pointer; font-size: 12px; }
.dspl-icon:hover { background: var(--dspl-wash-strong); }
.dspl-icon[data-on="true"] { border-color: var(--dspl-brand); color: var(--dspl-brand); }
.dspl-icon:focus-visible, .dspl-add:focus-visible, .dspl-mini:focus-visible, .dspl-act:focus-visible { outline: 2px solid var(--dspl-brand); outline-offset: 2px; }
.dspl-search { padding: 10px 16px; display: flex; align-items: center; gap: 8px; }
.dspl-search input {
  flex: 1; min-width: 0; height: 34px; border-radius: 8px; background: var(--dspl-wash);
  color: inherit; border: 1px solid var(--dspl-border); padding: 0 12px; font: inherit;
  font-size: 13px; box-sizing: border-box; outline: none;
  transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
.dspl-search input:focus { border-color: var(--dspl-brand); box-shadow: 0 0 0 3px var(--dspl-brand-soft); }
.dspl-toolbar { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 16px 8px; }
.dspl-segments { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 3px; width: 100%; padding: 3px; box-sizing: border-box; border-radius: 9px; background: var(--dspl-wash-strong); }
.dspl-segment { min-width: 0; height: 26px; padding: 0 8px; border: 0; border-radius: 7px; background: transparent; color: var(--dspl-muted); cursor: pointer; font: inherit; font-size: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dspl-segment:hover { color: var(--dspl-text); }
.dspl-segment[data-active="true"] { background: var(--dspl-selected); color: var(--dspl-text); box-shadow: 0 1px 2px rgba(0,0,0,.16); }
.dspl-tags { display: flex; flex-wrap: wrap; gap: 6px; max-height: min(18vh, 132px); overflow-y: auto; overscroll-behavior: contain; width: 100%; }
.dspl-tag { border-radius: 9999px; padding: 4px 10px; font: inherit; font-size: 12px; font-weight: 500; background: var(--dspl-wash-strong); color: var(--dspl-muted); border: none; cursor: pointer; transition: background-color .15s ease, color .15s ease; }
.dspl-tag:hover { color: var(--dspl-text); }
.dspl-tag[data-active="true"] { background: var(--dspl-brand-soft); color: var(--dspl-brand-ink); }
.dspl-list { flex: 1; overflow-y: auto; padding: 6px 16px 12px; min-height: 120px; display: flex; flex-direction: column; gap: 4px; }
.dspl-divider { height: 1px; background: var(--dspl-border); margin: 5px 2px; }
.dspl-item { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 6px; align-items: start; padding: 10px 12px; border-radius: 10px; border: none; background: var(--dspl-row); position: relative; transition: background .15s ease; }
.dspl-item:hover { background: var(--dspl-row-hover); }
.dspl-item[data-drop="before"] { box-shadow: 0 -2px 0 0 var(--dspl-brand); }
.dspl-item[data-drop="after"] { box-shadow: 0 2px 0 0 var(--dspl-brand); }
.dspl-item[data-dragging="true"] { opacity: .45; }
.dspl-item[data-view="compact"] { display: flex; align-items: center; min-height: 36px; padding: 7px 10px; border-radius: 8px; gap: 3px; }
.dspl-item-main { display: flex; align-items: flex-start; gap: 8px; width: 100%; }
.dspl-item[data-view="compact"] .dspl-item-main { align-items: center; flex: 1; min-width: 0; padding-right: 96px; }
.dspl-item-title { flex: 1; min-width: 0; text-align: left; cursor: pointer; font-size: 13px; line-height: 1.5; color: var(--dspl-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dspl-item[data-view="comfortable"] .dspl-item-title { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; max-height: 7.5em; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.dspl-item-title:hover { opacity: .85; }
.dspl-item-name { font-size: 12px; font-weight: 700; opacity: .9; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dspl-md-pre { margin: 2px 0; padding: 4px; background: rgba(0,0,0,.06); border-radius: 4px; white-space: pre-wrap; word-break: break-word; font-size: 12px; }
.dspl-panel[data-theme="dark"] .dspl-md-pre, .dspl-preview[data-theme="dark"] .dspl-md-pre { background: rgba(0,0,0,.2); }
.dspl-md-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: rgba(127,127,127,.16); padding: 1px 4px; border-radius: 4px; }
.dspl-md-h { font-weight: 700; margin: 2px 0; }
.dspl-md-h[data-level="1"] { font-size: 15px; }
.dspl-md-h[data-level="2"] { font-size: 14px; }
.dspl-md-list { margin: 2px 0 2px 18px; padding: 0; }
.dspl-md-quote { border-left: 2px solid var(--dspl-border); margin: 2px 0; padding-left: 8px; opacity: .85; }
.dspl-md-hr { border: none; border-top: 1px solid var(--dspl-border); margin: 6px 0; }
.dspl-actions { display: flex; gap: 2px; flex-shrink: 0; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); }
.dspl-item[data-view="comfortable"] .dspl-actions { position: static; transform: none; }
.dspl-act { width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: transparent; color: var(--dspl-muted); opacity: 0; cursor: pointer; transition: opacity .15s ease, background .15s ease, color .15s ease; }
.dspl-item:hover .dspl-act, .dspl-item:focus-within .dspl-act, .dspl-act[data-pinned="true"] { opacity: 1; }
.dspl-act:hover { background: var(--dspl-wash-strong); color: var(--dspl-text); }
.dspl-act[data-pinned="true"] { color: var(--dspl-brand); }
.dspl-act[data-grip] { cursor: grab; touch-action: none; }
.dspl-act[data-grip]:active { cursor: grabbing; }
.dspl-item-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.dspl-item[data-view="compact"] .dspl-item-tags { display: none; }
.dspl-item-tag { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; background: var(--dspl-brand-soft); color: var(--dspl-brand-ink); border: none; cursor: pointer; }
.dspl-empty { padding: 24px 16px; text-align: center; font-size: 13px; opacity: .5; }
.dspl-form { padding: 12px 16px 14px; display: grid; gap: 10px; border-top: 1px solid var(--dspl-border); }
.dspl-field { width: 100%; border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 13px; line-height: 1.5; color: inherit; background: var(--dspl-wash); border: 1px solid var(--dspl-border); outline: none; box-sizing: border-box; }
.dspl-field:focus { border-color: var(--dspl-brand); box-shadow: 0 0 0 3px var(--dspl-brand-soft); }
textarea.dspl-field { resize: vertical; min-height: 68px; max-height: 200px; }
.dspl-field::placeholder { color: currentColor; opacity: .45; }
.dspl-form-row { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.dspl-hint { flex: 1; font-size: 11px; opacity: .55; }
.dspl-hint[data-kind="error"] { color: #e5484d; opacity: 1; }
.dspl-btn { height: 28px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--dspl-border); background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
.dspl-btn:hover { background: var(--dspl-wash-strong); }
.dspl-btn-primary { background: var(--dspl-brand); color: var(--dspl-brand-fg); border-color: transparent; }
.dspl-btn-primary:hover { background: var(--dspl-brand-hover); }
.dspl-btn-danger { background: #e5484d; color: #fff; border-color: transparent; }
.dspl-footer { display: flex; align-items: center; gap: 6px; padding: 12px 16px 14px; border-top: 1px solid var(--dspl-border); flex-wrap: wrap; }
.dspl-footer .dspl-spacer { flex: 1; }
.dspl-mini { height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dspl-border); background: transparent; color: inherit; font: inherit; font-size: 11px; cursor: pointer; }
.dspl-mini:hover { background: var(--dspl-wash-strong); }
.dspl-mini[data-active="true"] { border-color: var(--dspl-brand); color: var(--dspl-brand); }
.dspl-ver { font-size: 10px; opacity: .35; margin-left: 4px; }
.dspl-toast { position: absolute; left: 50%; bottom: 58px; transform: translateX(-50%); background: rgba(20,20,24,.9); color: #fff; font-size: 12px; padding: 6px 12px; border-radius: 8px; pointer-events: none; }
.dspl-vars { display: grid; gap: 6px; }
.dspl-var-row { display: flex; gap: 6px; align-items: center; }
.dspl-var-row label { font-size: 11px; opacity: .7; min-width: 56px; word-break: break-all; }
.dspl-var-row input { flex: 1; height: 26px; border-radius: 6px; padding: 0 8px; font: inherit; font-size: 12px; color: inherit; background: var(--dspl-wash); border: 1px solid var(--dspl-border); outline: none; }
.dspl-selbar { position: fixed; transform: translateX(-50%); z-index: 2147483250; display: inline-flex; gap: 2px; padding: 3px; border-radius: 8px; background: rgba(24,24,28,.94); box-shadow: 0 6px 20px rgba(0,0,0,.28); }
.dspl-selbtn { height: 24px; padding: 0 10px; border: none; border-radius: 6px; background: transparent; color: #fff; font-size: 12px; font-family: inherit; cursor: pointer; white-space: nowrap; }
.dspl-selbtn:hover { background: rgba(255,255,255,.16); }

.dspl-folders { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px 8px; }
.dspl-chip { display: inline-flex; align-items: center; border-radius: 9999px; padding: 4px 10px; font: inherit; font-size: 12px; border: 1px solid var(--dspl-border); background: transparent; color: inherit; cursor: pointer; }
.dspl-chip:hover { background: var(--dspl-wash-strong); }
.dspl-chip[data-active="true"] { background: var(--dspl-brand-soft); border-color: transparent; color: var(--dspl-brand-ink); }
.dspl-chip-count { opacity: .55; margin-left: 5px; font-size: 10px; }
.dspl-chip-x { margin-left: 6px; opacity: .45; font-size: 11px; }
.dspl-chip-x:hover { opacity: 1; }
.dspl-folder-create { display: flex; gap: 6px; padding: 0 16px 8px; }
.dspl-folder-create input { flex: 1; height: 28px; border-radius: 8px; padding: 0 10px; font: inherit; font-size: 12px; border: 1px solid var(--dspl-border); background: var(--dspl-wash); color: inherit; outline: none; }
.dspl-folder-create input:focus { border-color: var(--dspl-brand); }
.dspl-sessions { flex: 1; overflow-y: auto; padding: 0 16px 12px; display: flex; flex-direction: column; gap: 4px; }
.dspl-session { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: var(--dspl-row); }
.dspl-session:hover { background: var(--dspl-row-hover); }
.dspl-session-main { flex: 1; min-width: 0; cursor: pointer; }
.dspl-session-title { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dspl-session-sub { font-size: 11px; opacity: .5; margin-top: 1px; }
.dspl-session-select { max-width: 118px; height: 24px; font: inherit; font-size: 11px; border-radius: 6px; border: 1px solid var(--dspl-border); background: transparent; color: inherit; cursor: pointer; }
.dspl-dot { width: 6px; height: 6px; border-radius: 9999px; background: var(--dspl-brand); flex-shrink: 0; }

.dspl-panel[data-variant="page"] { position: relative; left: auto; bottom: auto; width: 100%; max-width: none; height: 100%; max-height: none; border-radius: 0; border: none; background: transparent; }
.dspl-panel[data-variant="page"] .dspl-header { padding: 18px 20px 14px; }
.dspl-panel[data-variant="page"] .dspl-sessions { padding: 0 20px 20px; }
.dspl-panel[data-variant="page"] .dspl-folders { padding: 0 20px 10px; }
.dspl-panel[data-variant="page"] .dspl-folder-create { padding: 0 20px 10px; }
.dspl-glyph { display: inline-flex; align-items: center; justify-content: center; }

.dspl-math-hover {
  cursor: pointer !important;
  border-radius: 4px;
  background-color: rgba(90, 163, 106, .18) !important;
  box-shadow: 0 0 0 1px rgba(90, 163, 106, .5);
  transition: background-color .2s ease, box-shadow .2s ease;
}
.dspl-formula-toast { position: fixed; z-index: 2147483400; background: rgba(20,20,24,.92); color: #fff; font-size: 12px; padding: 6px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap; }
.dspl-formula-badge { position: fixed; z-index: 2147483390; background: rgba(20,20,24,.85); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 6px; pointer-events: none; opacity: .9; }

.dspl-chip-input { width: 96px; height: 22px; border-radius: 6px; border: 1px solid var(--dspl-brand); background: transparent; color: inherit; font: inherit; font-size: 12px; padding: 0 6px; outline: none; }
.dspl-chip[data-drop="true"] { outline: 2px dashed var(--dspl-brand); outline-offset: 1px; background: var(--dspl-brand-soft); color: var(--dspl-brand-ink); }
.dspl-folder-search { padding: 0 16px 8px; }
.dspl-folder-search input { width: 100%; box-sizing: border-box; height: 30px; border-radius: 8px; padding: 0 10px; font: inherit; font-size: 12px; border: 1px solid var(--dspl-border); background: var(--dspl-wash); color: inherit; outline: none; }
.dspl-folder-search input:focus { border-color: var(--dspl-brand); box-shadow: 0 0 0 3px var(--dspl-brand-soft); }
.dspl-session[draggable="true"] { cursor: grab; }
.dspl-session[draggable="true"]:active { cursor: grabbing; }
.dspl-session-folder { margin-left: 6px; padding: 1px 6px; border-radius: 9999px; background: var(--dspl-brand-soft); color: var(--dspl-brand-ink); font-size: 10px; }
.dspl-panel[data-variant="page"] .dspl-folder-search { padding: 0 20px 10px; }

.dspl-preview { position: fixed; z-index: 2147483300; max-width: 420px; max-height: 360px; overflow: auto; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; box-shadow: 0 12px 32px rgba(0,0,0,.22); white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
`;

    // ------------------------------------------------------------ utilities
    async function apiGet(path) {
      const response = await fetch(`${API}/${path}`, { headers: { accept: "application/json" }, credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        dsplReport("get-failed", `${path} ${response.status} ${payload.error || ""}`);
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      return payload;
    }

    async function apiPost(path, body) {
      const response = await fetch(`${API}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        dsplReport("post-failed", `${path} ${response.status} ${JSON.stringify(payload)}`);
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      return payload;
    }

    const VAR_RE = /\{\{\s*([\p{L}\p{M}\p{N}._-]+?)\s*\}\}/gu;

    function variablesOf(text) {
      const found = [];
      const source = String(text ?? "").replace(/\\\{\{/g, "\u0000");
      let match;
      VAR_RE.lastIndex = 0;
      while ((match = VAR_RE.exec(source)) !== null) if (!found.includes(match[1])) found.push(match[1]);
      return found;
    }

    function fillVariables(text, values) {
      return String(text ?? "")
        .replace(/\\\{\{/g, "\u0000")
        .replace(VAR_RE, (whole, name) =>
          Object.prototype.hasOwnProperty.call(values, name) && values[name] !== "" ? values[name] : `{{${name}}}`,
        )
        .replace(/\u0000/g, "{{");
    }

    function plainTitle(text) {
      const first = String(text ?? "").split("\n").find((line) => line.trim() !== "") ?? "";
      return first.replace(/[*_`#>]/g, "").trim();
    }

    function titleOf(item) {
      return item.name && String(item.name).trim() !== "" ? item.name : plainTitle(item.text);
    }

    // ------------------------------------------------------------- markdown
    function renderInline(text) {
      const parts = [];
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
      let last = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        const token = match[0];
        if (token.startsWith("**")) parts.push(h("strong", { key: parts.length }, token.slice(2, -2)));
        else if (token.startsWith("`")) parts.push(h("code", { key: parts.length, className: "dspl-md-code" }, token.slice(1, -1)));
        else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
          parts.push(
            /^https?:\/\//.test(link[2])
              ? h("a", { key: parts.length, href: link[2], target: "_blank", rel: "noreferrer noopener" }, link[1])
              : link[1],
          );
        }
        last = match.index + token.length;
      }
      if (last < text.length) parts.push(text.slice(last));
      return parts.length === 0 ? text : parts;
    }

    /** Block markdown: fences, headings, bullets, ordered lists, quotes, rules. */
    function renderMarkdown(text) {
      const lines = String(text ?? "").split("\n");
      const blocks = [];
      let fence = null;
      let list = null;
      let ordered = false;

      const flushList = () => {
        if (list === null) return;
        blocks.push(
          h(
            ordered ? "ol" : "ul",
            { key: `l${blocks.length}`, className: "dspl-md-list" },
            list.map((entry, index) => h("li", { key: index }, renderInline(entry))),
          ),
        );
        list = null;
      };

      for (const line of lines) {
        if (line.trimStart().startsWith("```")) {
          flushList();
          if (fence === null) fence = [];
          else {
            blocks.push(h("pre", { key: `f${blocks.length}`, className: "dspl-md-pre" }, fence.join("\n")));
            fence = null;
          }
          continue;
        }
        if (fence !== null) {
          fence.push(line);
          continue;
        }
        const heading = /^(#{1,3})\s+(.*)$/.exec(line);
        if (heading !== null) {
          flushList();
          blocks.push(h("div", { key: `h${blocks.length}`, className: "dspl-md-h", "data-level": heading[1].length }, renderInline(heading[2])));
          continue;
        }
        if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
          flushList();
          blocks.push(h("hr", { key: `hr${blocks.length}`, className: "dspl-md-hr" }));
          continue;
        }
        const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
        if (bullet !== null) {
          if (list === null || ordered) {
            flushList();
            list = [];
            ordered = false;
          }
          list.push(bullet[1]);
          continue;
        }
        const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
        if (numbered !== null) {
          if (list === null || !ordered) {
            flushList();
            list = [];
            ordered = true;
          }
          list.push(numbered[1]);
          continue;
        }
        flushList();
        const quote = /^>\s?(.*)$/.exec(line);
        if (quote !== null) {
          blocks.push(h("div", { key: `q${blocks.length}`, className: "dspl-md-quote" }, renderInline(quote[1])));
          continue;
        }
        if (line.trim() === "") continue;
        blocks.push(h("div", { key: `p${blocks.length}` }, renderInline(line)));
      }
      flushList();
      if (fence !== null && fence.length > 0) blocks.push(h("pre", { key: "f-last", className: "dspl-md-pre" }, fence.join("\n")));
      return blocks;
    }

    function deliver(text, mode) {
      if (mode === "insert") {
        // DSH's draft editor is authoritative; a direct DOM write is only used
        // when the draft is empty, because that cannot destroy typed content.
        try {
          if (typeof composer.appendDraft === "function") {
            composer.appendDraft(text);
            return "inserted";
          }
        } catch (error) {
          dsplReport("appendDraft-failed", error && error.message ? error.message : error);
        }
        const editor = composerEditor();
        const empty = editor === null || (editor.textContent || "").trim() === "";
        if (empty && insertViaEditor(text)) return "inserted";
        copyText(text);
        return "copied";
      }
      return copyText(text) ? "copied" : "failed";
    }

    /** Move `id` next to `targetId`; returns a new id array. */
    function moveId(ids, id, targetId, side) {
      const next = ids.filter((entry) => entry !== id);
      if (targetId === null) return [id, ...next];
      const index = next.indexOf(targetId);
      if (index < 0) return [id, ...next];
      next.splice(side === "after" ? index + 1 : index, 0, id);
      return next;
    }

    // -------------------------------------------------------------- icons
    const ICONS = {
      spark: "M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4L12 2z",
      close: "M6 6l12 12M18 6L6 18",
      pin: "M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6zM12 15v6",
      edit: "M4 20h4l10-10-4-4L4 16v4zM14 6l4 4",
      trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
      grip: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
      folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z",
    };

    function Icon(name, size, extra) {
      return h(
        "svg",
        {
          width: size || 14,
          height: size || 14,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true",
          ...(extra || {}),
        },
        h("path", { d: ICONS[name] }),
      );
    }

    // ------------------------------------------------------------- components
    function usePrefs() {
      const [prefs, setPrefs] = React.useState(() => readPrefs());
      const update = React.useCallback((patch) => {
        setPrefs((current) => {
          const next = { ...current, ...patch };
          writePrefs(next);
          return next;
        });
      }, []);
      return [prefs, update];
    }

    function useLibrary() {
      const [items, setItems] = React.useState([]);
      const [problem, setProblem] = React.useState(null);

      const refresh = React.useCallback(async () => {
        try {
          const payload = await apiGet("state");
          setItems(Array.isArray(payload.items) ? payload.items : []);
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      }, []);

      React.useEffect(() => {
        refresh();
      }, [refresh]);

      return { items, problem, setProblem, refresh };
    }

    function ItemRow(props) {
      const { item, view, t, dragId, dropAt, onPick, onEdit, onDelete, onPin, onTag, onGripDown, onGripKey, onHoverStart, onHoverEnd } = props;
      const pinned = typeof item.pinnedAt === "number";
      const [confirming, setConfirming] = React.useState(false);
      const drop = dropAt !== null && dropAt.id === item.id ? dropAt.side : null;

      return h(
        "div",
        { className: "dspl-item", "data-view": view, "data-drop": drop || undefined, "data-dragging": dragId === item.id ? "true" : "false" },
        h(
          "div",
          { className: "dspl-item-main" },
          h(
            "button",
            {
              className: "dspl-act",
              "data-grip": "1",
              title: t("reorderTip"),
              tabIndex: 0,
              onPointerDown: (event) => onGripDown(event, item),
              onKeyDown: (event) => onGripKey(event, item),
            },
            Icon("grip", 14),
          ),
          h(
            "div",
            {
              className: "dspl-item-title",
              role: "button",
              tabIndex: 0,
              onClick: () => onPick(item),
              onMouseEnter: (event) => onHoverStart(event, item),
              onMouseLeave: onHoverEnd,
              onKeyDown: (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPick(item);
                }
              },
            },
            item.name && String(item.name).trim() !== "" ? h("div", { className: "dspl-item-name" }, item.name) : null,
            view === "compact" ? titleOf(item) : h("div", null, renderMarkdown(item.text)),
          ),
          h(
            "div",
            { className: "dspl-actions" },
            h("button", { className: "dspl-act", "data-pinned": pinned ? "true" : "false", title: pinned ? t("unpin") : t("pin"), onClick: () => onPin(item) }, Icon("pin", 14)),
            h("button", { className: "dspl-act", title: t("edit"), onClick: () => onEdit(item) }, Icon("edit", 14)),
            confirming
              ? h("button", { className: "dspl-btn dspl-btn-danger", style: { height: 22, fontSize: 11 }, onClick: () => onDelete(item), onBlur: () => setConfirming(false) }, t("confirmDelete"))
              : h("button", { className: "dspl-act", title: t("remove"), onClick: () => setConfirming(true) }, Icon("trash", 14)),
          ),
        ),
        view === "comfortable" && item.tags && item.tags.length > 0
          ? h("div", { className: "dspl-item-tags" }, item.tags.map((tag) => h("button", { className: "dspl-item-tag", key: tag, onClick: () => onTag(tag) }, tag)))
          : null,
      );
    }

    function PromptPanel(props) {
      const { prefs, updatePrefs, anchor, onClose } = props;
      const t = React.useCallback(
        (key, vars) => {
          const dict = STRINGS[prefs.lang] || STRINGS.zh;
          let value = dict[key] ?? STRINGS.zh[key] ?? key;
          if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.replace(`{${name}}`, String(replacement));
          return value;
        },
        [prefs.lang],
      );

      const { items, problem, setProblem, refresh } = useLibrary();
      const [query, setQuery] = React.useState("");
      const [selectedTags, setSelectedTags] = React.useState([]);
      const [composing, setComposing] = React.useState(null);
      const [formError, setFormError] = React.useState(null);
      const [varsFor, setVarsFor] = React.useState(null);
      const [varValues, setVarValues] = React.useState({});
      const [toast, setToast] = React.useState(null);
      const [dragId, setDragId] = React.useState(null);
      const [dropAt, setDropAt] = React.useState(null);
      const [preview, setPreview] = React.useState(null);
      const [panelPos, setPanelPos] = React.useState(null);
      const searchRef = React.useRef(null);
      const fileRef = React.useRef(null);
      const hoverTimer = React.useRef(null);
      const closeTimer = React.useRef(null);

      const theme = prefs.theme === "auto" ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") : prefs.theme;

      React.useEffect(() => {
        const timer = setTimeout(() => searchRef.current?.focus(), 30);
        return () => clearTimeout(timer);
      }, []);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (preview !== null) setPreview(null);
            else if (composing !== null) setComposing(null);
            else if (varsFor !== null) setVarsFor(null);
            else onClose();
          }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
      }, [composing, varsFor, preview, onClose]);

      const notice = React.useCallback((text) => {
        setToast(text);
        setTimeout(() => setToast(null), 1800);
      }, []);

      const allTags = React.useMemo(() => {
        const seen = new Set();
        for (const item of items) for (const tag of item.tags || []) seen.add(tag);
        return [...seen].sort();
      }, [items]);

      const visible = React.useMemo(() => {
        const needle = query.trim().toLowerCase();
        let list = items;
        if (prefs.filter === "pinned") list = list.filter((item) => typeof item.pinnedAt === "number");
        if (prefs.filter === "recent") {
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
          list = list.filter((item) => (item.updatedAt ?? item.createdAt) >= cutoff);
        }
        if (selectedTags.length > 0) list = list.filter((item) => selectedTags.every((tag) => (item.tags || []).includes(tag)));
        if (needle !== "") list = list.filter((item) => `${item.text}\n${(item.tags || []).join(" ")}\n${item.name || ""}`.toLowerCase().includes(needle));
        return list;
      }, [items, query, prefs.filter, selectedTags]);

      const pinnedItems = visible.filter((item) => typeof item.pinnedAt === "number");
      const rest = visible.filter((item) => typeof item.pinnedAt !== "number");

      const previewStart = (event, item) => {
        if (closeTimer.current !== null) clearTimeout(closeTimer.current);
        const rect = event.currentTarget.getBoundingClientRect();
        hoverTimer.current = setTimeout(() => {
          setPreview({ item, top: Math.max(8, Math.min(rect.top, window.innerHeight - 380)), right: Math.max(8, window.innerWidth - rect.left + 10) });
        }, PREVIEW_OPEN_MS);
      };

      const previewEnd = () => {
        if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
        closeTimer.current = setTimeout(() => setPreview(null), PREVIEW_CLOSE_MS);
      };

      const pick = (item) => {
        const vars = variablesOf(item.text);
        if (vars.length > 0) {
          setVarsFor(item);
          setVarValues(Object.fromEntries(vars.map((name) => [name, ""])));
          return;
        }
        const outcome = deliver(item.text, prefs.insertOnClick ? "insert" : "copy");
        notice(outcome === "inserted" ? t("inserted") : outcome === "copied" ? t("copied") : "✕");
        onClose();
      };

      const commitVars = () => {
        if (varsFor === null) return;
        const outcome = deliver(fillVariables(varsFor.text, varValues), prefs.insertOnClick ? "insert" : "copy");
        notice(outcome === "inserted" ? t("inserted") : outcome === "copied" ? t("copied") : "✕");
        setVarsFor(null);
        onClose();
      };

      const openCreate = () => {
        setComposing({ name: "", text: "", tags: [] });
        setFormError(null);
      };

      const save = async () => {
        const draft = composing;
        if (draft === null) return;
        const name = String(draft.name || "").trim();
        if (name === "") return setFormError(t("nameRequired"));
        if (String(draft.text || "").trim() === "") return setFormError(t("nameRequired"));
        if (items.some((item) => item.id !== draft.id && String(item.name || "").trim() === name)) return setFormError(t("nameTaken"));
        try {
          if (draft.id) await apiPost("update", { id: draft.id, name, text: draft.text, tags: draft.tags });
          else await apiPost("add", { name, text: draft.text, tags: draft.tags });
          setComposing(null);
          setFormError(null);
          await refresh();
          notice(t("saved"));
        } catch (failure) {
          setFormError(`${t("saveFailed")}（${failure.message || failure}）`);
        }
      };

      const remove = async (item) => {
        try {
          await apiPost("remove", { id: item.id });
          await refresh();
          notice(t("deleted"));
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const pin = async (item) => {
        const pinned = typeof item.pinnedAt === "number";
        try {
          await apiPost("update", { id: item.id, pinnedAt: pinned ? null : Date.now() });
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const commitOrder = async (ids) => {
        try {
          await apiPost("reorder", { ids });
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const gripKey = (event, item) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const ids = items.map((entry) => entry.id);
        const index = ids.indexOf(item.id);
        const target = event.key === "ArrowUp" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= ids.length) return;
        const next = [...ids];
        next.splice(index, 1);
        next.splice(target, 0, item.id);
        commitOrder(next);
      };

      const gripDown = (event, item) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setDragId(item.id);
      };

      React.useEffect(() => {
        if (dragId === null) return undefined;
        const onMove = (event) => {
          const rows = Array.from(document.querySelectorAll(".dspl-list .dspl-item"));
          for (let index = 0; index < rows.length; index += 1) {
            const rect = rows[index].getBoundingClientRect();
            if (event.clientY < rect.top || event.clientY > rect.bottom) continue;
            const target = visible[index];
            if (target === undefined || target.id === dragId) {
              setDropAt(null);
              return;
            }
            setDropAt({ id: target.id, side: event.clientY < rect.top + rect.height / 2 ? "before" : "after" });
            return;
          }
          setDropAt(null);
        };
        const onUp = () => {
          const ids = items.map((entry) => entry.id);
          if (dropAt !== null) commitOrder(moveId(ids, dragId, dropAt.id, dropAt.side));
          setDragId(null);
          setDropAt(null);
        };
        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", onUp, true);
        window.addEventListener("pointercancel", onUp, true);
        return () => {
          window.removeEventListener("pointermove", onMove, true);
          window.removeEventListener("pointerup", onUp, true);
          window.removeEventListener("pointercancel", onUp, true);
        };
      }, [dragId, dropAt, visible, items]);

      const toggleTag = (tag) =>
        setSelectedTags((current) => (current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]));

      const importFile = async (file) => {
        try {
          const parsed = JSON.parse(await file.text());
          const stats = await apiPost("import", parsed);
          await refresh();
          notice(t("imported", { count: stats.added }));
        } catch (failure) {
          setProblem(`${t("importFailed")}${failure.message || failure}`);
        }
      };

      const exportAll = async () => {
        try {
          const payload = await apiGet("export");
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchorEl = document.createElement("a");
          anchorEl.href = url;
          anchorEl.download = `voyager-prompts-${new Date().toISOString().slice(0, 10)}.json`;
          anchorEl.click();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (failure) {
          setProblem(`${t("exportFailed")}${failure.message || failure}`);
        }
      };

      // Geometry: a locked panel keeps its saved spot, otherwise it anchors above the ball.
      const anchoredLeft = Math.max(VIEWPORT_PAD, Math.min(window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD, window.innerWidth - anchor.right - PANEL_WIDTH));
      const anchoredBottom = Math.max(VIEWPORT_PAD, Math.min(window.innerHeight - 80, anchor.bottom + BALL_SIZE + PANEL_GAP));
      const pos = prefs.locked && prefs.panel !== null ? prefs.panel : { left: anchoredLeft, bottom: anchoredBottom };
      const effective = panelPos ?? pos;

      const startPanelDrag = (event) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest("button") !== null) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const origin = { left: effective.left, bottom: effective.bottom };
        const onMove = (moveEvent) => {
          setPanelPos({
            left: Math.max(8, Math.min(window.innerWidth - PANEL_WIDTH - 8, origin.left + (moveEvent.clientX - startX))),
            bottom: Math.max(8, Math.min(window.innerHeight - 80, origin.bottom - (moveEvent.clientY - startY))),
          });
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove, true);
          window.removeEventListener("pointerup", onUp, true);
          setPanelPos((value) => {
            const next = value ?? origin;
            updatePrefs({ locked: true, panel: next });
            return next;
          });
        };
        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", onUp, true);
        event.preventDefault();
      };

      const rowProps = (item) => ({
        key: item.id,
        item,
        view: prefs.view,
        t,
        dragId,
        dropAt,
        onPick: pick,
        onEdit: (value) => {
          setComposing({ id: value.id, name: value.name || "", text: value.text, tags: value.tags || [] });
          setFormError(null);
        },
        onDelete: remove,
        onPin: pin,
        onTag: toggleTag,
        onGripDown: gripDown,
        onGripKey: gripKey,
        onHoverStart: previewStart,
        onHoverEnd: previewEnd,
      });

      return h(
        "div",
        { className: "dspl-panel", "data-theme": theme, style: { left: effective.left, bottom: effective.bottom } },
        h(
          "div",
          { className: "dspl-header", onPointerDown: startPanelDrag },
          h("span", { className: "dspl-grip", "aria-hidden": "true" }, [0, 1, 2, 3, 4, 5].map((i) => h("span", { key: i }))),
          h("div", { className: "dspl-title" }, t("title")),
          h(
            "div",
            { className: "dspl-controls" },
            h("button", { className: "dspl-icon", title: t("folders"), onClick: () => { if (!openSidebarPanel()) folderBus.open(); onClose(); } }, "📁"),
            h("button", { className: "dspl-icon", title: prefs.locked ? t("unlock") : t("lock"), "data-on": prefs.locked ? "true" : "false", onClick: () => updatePrefs({ locked: !prefs.locked, panel: prefs.locked ? null : effective }) }, prefs.locked ? "🔒" : "🔓"),
            h("button", { className: "dspl-add", onClick: openCreate }, t("add")),
            h("button", { className: "dspl-icon", title: prefs.theme === "auto" ? t("themeAuto") : prefs.theme === "dark" ? t("themeLight") : t("themeDark"), onClick: () => updatePrefs({ theme: prefs.theme === "auto" ? "light" : prefs.theme === "light" ? "dark" : "auto" }) }, prefs.theme === "auto" ? "A" : prefs.theme === "dark" ? "☀" : "☾"),
            h("button", { className: "dspl-icon", title: t("close"), onClick: onClose }, Icon("close", 14)),
          ),
        ),
        composing === null
          ? h("div", { className: "dspl-search" }, h("input", { ref: searchRef, type: "search", placeholder: t("search"), value: query, onChange: (event) => setQuery(event.target.value) }))
          : null,
        composing === null
          ? h(
              "div",
              { className: "dspl-toolbar" },
              h(
                "div",
                { className: "dspl-segments" },
                ["all", "pinned", "recent"].map((key) =>
                  h("button", { key, className: "dspl-segment", "data-active": prefs.filter === key ? "true" : "false", onClick: () => updatePrefs({ filter: key }) }, t(key)),
                ),
              ),
              allTags.length > 0
                ? h(
                    "div",
                    { className: "dspl-tags" },
                    allTags.map((tag) => h("button", { key: tag, className: "dspl-tag", "data-active": selectedTags.includes(tag) ? "true" : "false", onClick: () => toggleTag(tag) }, tag)),
                  )
                : null,
            )
          : null,
        problem !== null ? h("div", { className: "dspl-empty", style: { color: "#e5484d", opacity: 1 } }, problem) : null,
        composing !== null
          ? h(
              "div",
              { className: "dspl-form" },
              h("input", { className: "dspl-field", placeholder: t("namePlaceholder"), maxLength: 60, value: composing.name, autoFocus: true, onChange: (event) => setComposing({ ...composing, name: event.target.value }) }),
              h("textarea", { className: "dspl-field", placeholder: t("textPlaceholder"), value: composing.text, onChange: (event) => setComposing({ ...composing, text: event.target.value }) }),
              h("input", {
                className: "dspl-field",
                placeholder: t("tagsPlaceholder"),
                value: (composing.tags || []).join(", "),
                onChange: (event) =>
                  setComposing({ ...composing, tags: [...new Set(event.target.value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))] }),
              }),
              h(
                "div",
                { className: "dspl-form-row" },
                h("span", { className: "dspl-hint", "data-kind": formError !== null ? "error" : undefined }, formError ?? (composing.id ? t("settingsHint") : t("newHint"))),
                h("button", { className: "dspl-btn", onClick: () => setComposing(null) }, t("cancel")),
                h("button", { className: "dspl-btn dspl-btn-primary", onClick: save }, t("save")),
              ),
            )
          : h(
              "div",
              { className: "dspl-list" },
              visible.length === 0 ? h("div", { className: "dspl-empty" }, t("empty")) : null,
              pinnedItems.map((item) => h(ItemRow, rowProps(item))),
              pinnedItems.length > 0 && rest.length > 0 ? h("div", { className: "dspl-divider" }) : null,
              rest.map((item) => h(ItemRow, rowProps(item))),
            ),
        varsFor !== null
          ? h(
              "div",
              { className: "dspl-form" },
              h("div", { style: { fontSize: 12, opacity: 0.75 } }, `${t("fillVars")} · ${titleOf(varsFor)}`),
              h(
                "div",
                { className: "dspl-vars" },
                variablesOf(varsFor.text).map((name, index) =>
                  h(
                    "div",
                    { className: "dspl-var-row", key: name },
                    h("label", null, name),
                    h("input", { autoFocus: index === 0, value: varValues[name] || "", onChange: (event) => setVarValues({ ...varValues, [name]: event.target.value }) }),
                  ),
                ),
              ),
              h(
                "div",
                { className: "dspl-form-row" },
                h("span", { className: "dspl-hint" }, t("keepLiteral")),
                h("button", { className: "dspl-btn", onClick: () => setVarsFor(null) }, t("cancel")),
                h("button", { className: "dspl-btn dspl-btn-primary", onClick: commitVars }, t("insert")),
              ),
            )
          : null,
        h(
          "div",
          { className: "dspl-footer" },
          h("button", { className: "dspl-mini", onClick: () => updatePrefs({ view: prefs.view === "compact" ? "comfortable" : "compact" }) }, prefs.view === "compact" ? t("compact") : t("comfortable")),
          h("button", { className: "dspl-mini", "data-active": prefs.insertOnClick ? "true" : "false", onClick: () => updatePrefs({ insertOnClick: !prefs.insertOnClick }) }, prefs.insertOnClick ? t("clickInsert") : t("clickCopy")),
          h("span", { className: "dspl-spacer" }),
          h(
            "button",
            {
              className: "dspl-mini",
              title: "公式复制格式",
              onClick: () => updatePrefs({ formulaFormat: prefs.formulaFormat === "latex" ? "bare" : prefs.formulaFormat === "bare" ? "mathml" : prefs.formulaFormat === "mathml" ? "notion" : "latex" }),
            },
            prefs.formulaFormat === "bare" ? "公式:$省略" : prefs.formulaFormat === "mathml" ? "公式:Word" : prefs.formulaFormat === "notion" ? "公式:$$" : "公式:$",
          ),
          h("button", { className: "dspl-mini", onClick: () => updatePrefs({ lang: prefs.lang === "zh" ? "en" : "zh" }) }, t("langToggle")),
          h("button", { className: "dspl-mini", onClick: () => fileRef.current?.click() }, t("import")),
          h("button", { className: "dspl-mini", onClick: exportAll }, t("export")),
          h("span", { className: "dspl-ver", title: "dsh-prompt-library" }, `v${PLUGIN_VERSION}`),
          h("input", {
            ref: fileRef,
            type: "file",
            accept: "application/json,.json",
            style: { display: "none" },
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) importFile(file);
            },
          }),
        ),
        toast !== null ? h("div", { className: "dspl-toast" }, toast) : null,
        preview !== null
          ? h(
              "div",
              {
                className: "dspl-preview",
                "data-theme": theme,
                style: { top: preview.top, right: preview.right, background: "var(--dspl-surface)", color: "var(--dspl-text)", border: "1px solid var(--dspl-border)" },
                onMouseEnter: () => {
                  if (closeTimer.current !== null) clearTimeout(closeTimer.current);
                },
                onMouseLeave: previewEnd,
              },
              renderMarkdown(preview.item.text),
            )
          : null,
      );
    }

    /**
     * Selection actions over the transcript: 引用 appends the selected text to the
     * composer as a Markdown quote, 复制公式 copies the LaTeX behind the selection.
     * Math comes from KaTeX's own annotation when the selection holds rendered
     * math, and falls back to the raw `$...$` / `\\(...\\)` source otherwise.
     */
    function SelectionToolbar() {
      // hook order fix: every hook below runs before the early return, because a
      // component may not change its hook count between renders.
      const [state, setState] = React.useState(null);
      const [note, setNote] = React.useState(null);

      React.useEffect(() => {
        let frame = null;
        let delay = null;
        const clear = () => setState(null);
        const evaluate = () => {
          const selection = window.getSelection();
          if (selection === null || selection.isCollapsed || selection.rangeCount === 0) return clear();
          const text = selection.toString().trim();
          if (text === "") return clear();
          const range = selection.getRangeAt(0);
          const node = range.commonAncestorContainer;
          const element = node.nodeType === 1 ? node : node.parentElement;
          if (element === null) return clear();
          // Never react to form fields or to our own surfaces. A contenteditable
          // is skipped only while it is the focused editor (the composer), so a
          // transcript that happens to live in an editable region still works.
          if (element.closest("input, textarea, .dspl-panel, .dspl-ball, .dspl-selbar, .dspl-preview") !== null) return clear();
          const editable = element.closest("[contenteditable='true']");
          if (editable !== null && editable === document.activeElement) return clear();
          if (element.closest(".dspl-preview") !== null) return clear();

          const holder = document.createElement("div");
          try {
            holder.appendChild(range.cloneContents());
          } catch {
            return clear();
          }
          const tex = [];
          for (const annotation of holder.querySelectorAll(".katex annotation[encoding='application/x-tex']")) {
            const value = (annotation.textContent || "").trim();
            if (value !== "" && !tex.includes(value)) tex.push(value);
          }
          const looksMath =
            tex.length > 0 ||
            /\$[^$\n]+\$|\\\(|\\\)|\\\[|\\\]|\\begin\{|\\frac|\^\{|_\{/.test(text) ||
            /[∑∫√≤≥≈≠∞π²³⁰¹⁄]/.test(text) ||
            (text.includes("$") && text.length > 2);
          const rect = range.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return clear();
          dsplReport("selection", JSON.stringify({ chars: text.length, tex: tex.length, math: looksMath }));
          setState({
            text,
            tex,
            looksMath,
            top: Math.max(8, Math.min(window.innerHeight - 44, rect.bottom + 8)),
            left: Math.max(70, Math.min(window.innerWidth - 70, rect.left + rect.width / 2)),
          });
        };
        const schedule = () => {
          if (frame !== null) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(evaluate);
        };
        const onUp = (event) => {
          if (event.target instanceof Element && event.target.closest(".dspl-selbar") !== null) return;
          // Read the selection synchronously, then again shortly after: an
          // application-level mouseup handler may collapse it in between.
          evaluate();
          if (delay !== null) clearTimeout(delay);
          delay = setTimeout(evaluate, 120);
        };
        const onSelectionChange = () => {
          if (delay !== null) clearTimeout(delay);
          delay = setTimeout(evaluate, 150);
        };
        document.addEventListener("mouseup", onUp, true);
        document.addEventListener("pointerup", onUp, true);
        document.addEventListener("keyup", schedule, true);
        document.addEventListener("selectionchange", onSelectionChange);
        document.addEventListener("scroll", clear, true);
        return () => {
          document.removeEventListener("mouseup", onUp, true);
          document.removeEventListener("pointerup", onUp, true);
          document.removeEventListener("keyup", schedule, true);
          document.removeEventListener("selectionchange", onSelectionChange);
          document.removeEventListener("scroll", clear, true);
          if (frame !== null) cancelAnimationFrame(frame);
          if (delay !== null) clearTimeout(delay);
        };
      }, []);

      if (state === null) return null;

      const quote = () => {
        const quoted = state.text.split("\n").map((line) => `> ${line}`).join("\n");
        const outcome = deliverQuote(quoted);
        dsplReport("quote", outcome);
        setNote(outcome === "inserted" ? "已引用" : outcome === "copied" ? "已复制，可粘贴" : "引用失败");
        window.getSelection()?.removeAllRanges();
        setTimeout(() => {
          setNote(null);
          setState(null);
        }, 900);
      };

      const copyFormula = () => {
        const value = state.tex.length > 0 ? state.tex.join("\n") : state.text;
        const ok = copyText(value);
        dsplReport("copy-formula", ok ? "ok" : "failed");
        setNote(ok ? "已复制公式" : "复制失败");
        setTimeout(() => {
          setNote(null);
          setState(null);
        }, 900);
      };

      return h(
        "div",
        { className: "dspl-selbar", style: { top: state.top, left: state.left } },
        note !== null
          ? h("span", { className: "dspl-selbtn", style: { cursor: "default" } }, note)
          : h("button", { className: "dspl-selbtn", onClick: quote }, "引用"),
      );
    }

    /** Fire-and-forget diagnostics: the host appends them to a log file. */
    function dsplReport(kind, detail) {
      try {
        void fetch(`${API}/debug`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, detail: String(detail ?? "") }),
        }).catch(() => {});
      } catch {
        // diagnostics must never break the feature
      }
    }

    /** The visible composer editor, if any. */
    function composerEditor() {
      try {
        const nodes = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        for (const node of nodes) {
          if (node.closest(".dspl-panel") !== null) continue;
          if (node.getClientRects().length === 0) continue;
          return node;
        }
      } catch {
        // fall through
      }
      return null;
    }

    /**
     * Quote reply, the way the extension does it: write `> …` into the composer
     * at the caret, leaving whatever the user already typed alone.
     *
     * Two hazards are specific to this host and are handled here:
     * - Enter is the SEND key, so no keyboard event is ever dispatched; a soft
     *   line break is inserted with `insertLineBreak` instead.
     * - The composer must not lose the draft, so this only ever inserts.
     */
    function deliverQuote(quoted) {
      // Preferred path: DSH's own draft editor. It re-renders the DOM from its
      // model, so a direct DOM insert would be reconciled away (and has wiped a
      // draft before). `appendDraft` splits on newlines, so the leading "\n"
      // becomes the blank paragraph the caller asked for.
      try {
        if (typeof composer.appendDraft === "function") {
          composer.appendDraft(`\n${quoted}`);
          dsplReport("quote-path", "draft-api");
          return "inserted";
        }
      } catch (error) {
        dsplReport("appendDraft-failed", error && error.message ? error.message : error);
      }
      dsplReport("quote-path", "no-draft-api");
      if (copyText(quoted)) return "copied";
      return "failed";
    }

    function deliverQuoteLegacy(quoted) {
      const editor = composerEditor();
      if (editor !== null) {
        try {
          // Read the caret BEFORE focusing: focusing a Lexical editor restores
          // its own selection, which can be position 0 even though the user was
          // typing at the end. Anything outside the composer means "append".
          const before = window.getSelection();
          const caretInside = before !== null && before.rangeCount > 0 && editor.contains(before.anchorNode);
          editor.focus();
          const selection = window.getSelection();
          if (selection !== null && (!caretInside || selection.rangeCount === 0)) {
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          // A blank line separates the quote from whatever was already typed;
          // an empty draft starts with the quote itself.
          const typed = (editor.textContent || "").trim() !== "";
          const blankLineFor = typed ? 2 : 0;
          let breaks = 0;
          for (let index = 0; index < blankLineFor; index += 1) {
            try {
              if (document.execCommand("insertLineBreak")) breaks += 1;
            } catch (error) {
              dsplReport("linebreak-failed", error && error.message ? error.message : error);
              break;
            }
          }
          const prefix = breaks === blankLineFor ? "" : "\n".repeat(blankLineFor - breaks);
          const inserted = document.execCommand("insertText", false, `${prefix}${quoted}`);
          dsplReport("quote-path", `editor caret=${caretInside} typed=${typed} breaks=${breaks} insert=${inserted}`);
          if (inserted) return "inserted";
        } catch (error) {
          dsplReport("quote-editor-failed", error && error.message ? error.message : error);
        }
      }
      try {
        if (typeof composer.appendDraft === "function") {
          composer.appendDraft(`\n${quoted}\n`);
          dsplReport("quote-path", "draft-api");
          return "inserted";
        }
      } catch (error) {
        dsplReport("appendDraft-failed", error && error.message ? error.message : error);
      }
      copyText(quoted);
      dsplReport("quote-path", "clipboard");
      return "copied";
    }

    /** Insert at the caret of DSH's Lexical composer, keeping it focused. */
    function insertViaEditor(text, options) {
      const editor = composerEditor();
      if (editor === null) return false;
      try {
        editor.focus();
        const selection = window.getSelection();
        if (selection !== null) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        if (options !== undefined && options.paragraph === true) {
          document.execCommand("insertParagraph");
          return true;
        }
        const ok = document.execCommand("insertText", false, text);
        if (ok) return true;
        return editor.textContent !== undefined;
      } catch (error) {
        dsplReport("insert-failed", error && error.message ? error.message : error);
        return false;
      }
    }

    /** Clipboard that can carry MathML alongside the plain text. */
    function copyRich(text, html) {
      try {
        if (html !== undefined && html !== null && typeof ClipboardItem === "function" && navigator.clipboard?.write) {
          const items = { "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) };
          Promise.resolve(navigator.clipboard.write([new ClipboardItem(items)])).catch(() => copyText(text));
          return true;
        }
      } catch {
        // fall through
      }
      return copyText(text);
    }

    /** Clipboard with an execCommand fallback (Electron may deny the async API). */
    function copyText(text) {
      const fallback = () => {
        try {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.top = "-1000px";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(area);
          return ok;
        } catch (error) {
          dsplReport("copy-failed", error && error.message ? error.message : error);
          return false;
        }
      };
      try {
        if (navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === "function") {
          Promise.resolve(navigator.clipboard.writeText(text)).catch(() => fallback());
          return true;
        }
      } catch {
        // fall back below
      }
      return fallback();
    }

    /** Handles the folder surface needs; filled in by apply(). */
    const runtime = { ctx: null };
    const FOLDER_PANEL_ID = "dsh-folders";

    /** Select the sidebar folder panel when the host registered it. */
    function openSidebarPanel() {
      try {
        runtime.ctx?.get?.("layout")?.selectPanel?.(FOLDER_PANEL_ID);
        return runtime.ctx?.get?.("layout") !== undefined;
      } catch {
        return false;
      }
    }
    const folderBus = { open: () => {} };

    function useSessionCatalog() {
      const [snapshot, setSnapshot] = React.useState(null);
      React.useEffect(() => {
        const sessions = runtime.ctx?.get?.("sessions");
        const source = sessions?.list;
        if (source === undefined || source === null) return undefined;
        const update = () => setSnapshot(source.getSnapshot());
        update();
        return source.subscribe(update);
      }, []);
      return snapshot;
    }

    /**
     * Conversation folders: the session catalog comes from `ctx.sessions.list`
     * (displayTitle + updatedAt), assignments live in the host's folder store,
     * and opening a session goes through `ctx.uiWorkspace.openSession`.
     */
    function FolderPanel(props) {
      const { onClose, variant } = props;
      const prefs = readPrefs();
      const L =
        prefs.lang === "en"
          ? {
              title: "Folders", all: "All sessions", unfiled: "Unfiled", create: "New folder", save: "Save", cancel: "Cancel",
              search: "Search sessions", rename: "Rename", remove: "Delete folder", confirm: "Delete?",
              moveTo: "Move to", empty: "No sessions", noMatch: "Nothing matches", dropHere: "Drop to file",
              emptyFolder: "Empty — drag a session here",
            }
          : {
              title: "会话文件夹", all: "全部会话", unfiled: "未归档", create: "新建文件夹", save: "保存", cancel: "取消",
              search: "搜索会话", rename: "重命名", remove: "删除文件夹", confirm: "确认删除？",
              moveTo: "移到", empty: "暂无会话", noMatch: "没有匹配的会话", dropHere: "放这里归档",
              emptyFolder: "空文件夹 —— 把会话拖进来",
            };
      const theme = prefs.theme === "auto" ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light") : prefs.theme;
      const [state, setState] = React.useState({ folders: [], assignments: {} });
      const [active, setActive] = React.useState("all");
      const [problem, setProblem] = React.useState(null);
      const [creating, setCreating] = React.useState(null);
      const [renaming, setRenaming] = React.useState(null);
      const [confirming, setConfirming] = React.useState(null);
      const [dragOver, setDragOver] = React.useState(null);
      const [query, setQuery] = React.useState("");
      const snapshot = useSessionCatalog();

      const refresh = React.useCallback(async () => {
        try {
          const payload = await apiGet("folders/state");
          setState({ folders: payload.folders || [], assignments: payload.assignments || {} });
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      }, []);

      React.useEffect(() => {
        refresh();
      }, [refresh]);

      // A delete prompt reverts by itself, so a stray click never removes a folder.
      React.useEffect(() => {
        if (confirming === null) return undefined;
        const timer = setTimeout(() => setConfirming(null), 3000);
        return () => clearTimeout(timer);
      }, [confirming]);

      const sessions = React.useMemo(() => {
        if (snapshot === null || snapshot.phase === "pending") return [];
        const rows = [];
        for (const id of snapshot.ids || []) {
          const row = snapshot.byId?.[id];
          if (row === undefined || row === null) continue;
          if (row.parentId !== undefined) continue; // subagent children stay out
          rows.push(row);
        }
        return rows.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
      }, [snapshot]);

      const needle = query.trim().toLowerCase();
      const shows = React.useMemo(() => {
        let list = sessions;
        if (active === "none") list = list.filter((row) => state.assignments[row.id] === undefined);
        else if (active !== "all") list = list.filter((row) => state.assignments[row.id] === active);
        if (needle !== "") list = list.filter((row) => String(row.displayTitle || row.id).toLowerCase().includes(needle));
        return list;
      }, [sessions, active, state.assignments, needle]);

      const folderName = (id) => state.folders.find((folder) => folder.id === id)?.name;

      const openSession = (id) => {
        try {
          runtime.ctx?.get?.("uiWorkspace")?.openSession?.(id);
        } catch {
          // navigation is best effort
        }
        onClose?.();
      };

      const assign = async (sessionId, folderId) => {
        try {
          await apiPost("folders/assign", { sessionId, folderId: folderId === "" || folderId === null ? null : folderId });
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const createFolder = async () => {
        const name = String(creating || "").trim();
        if (name === "") return;
        try {
          await apiPost("folders/create", { name });
          setCreating(null);
          setProblem(null);
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const renameFolder = async () => {
        if (renaming === null) return;
        const name = String(renaming.name || "").trim();
        if (name === "") return setRenaming(null);
        try {
          await apiPost("folders/rename", { id: renaming.id, name });
          setRenaming(null);
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const removeFolder = async (id) => {
        try {
          await apiPost("folders/remove", { id });
          if (active === id) setActive("all");
          setConfirming(null);
          await refresh();
        } catch (failure) {
          setProblem(String(failure.message || failure));
        }
      };

      const clock = (value) => {
        if (typeof value !== "number") return "";
        const delta = Date.now() - value;
        if (delta < 60000) return "now";
        if (delta < 3600000) return `${Math.floor(delta / 60000)}m`;
        if (delta < 86400000) return `${Math.floor(delta / 3600000)}h`;
        return `${Math.floor(delta / 86400000)}d`;
      };

      const countOf = (folderId) => sessions.filter((row) => state.assignments[row.id] === folderId).length;
      const unfiled = sessions.filter((row) => state.assignments[row.id] === undefined).length;

      // One chip renderer for the two fixed chips and every folder chip.
      const chip = (id, label, count, options) => {
        const opts = options || {};
        const isActive = active === id;
        const isDrop = dragOver === id;
        if (renaming !== null && renaming.id === id) {
          return h(
            "span",
            { className: "dspl-chip", key: id, "data-active": "true" },
            h("input", {
              className: "dspl-chip-input",
              autoFocus: true,
              value: renaming.name,
              onChange: (event) => setRenaming({ ...renaming, name: event.target.value }),
              onKeyDown: (event) => {
                if (event.key === "Enter") renameFolder();
                if (event.key === "Escape") setRenaming(null);
              },
              onBlur: renameFolder,
            }),
          );
        }
        return h(
          "button",
          {
            key: id,
            className: "dspl-chip",
            "data-active": isActive ? "true" : "false",
            "data-drop": isDrop ? "true" : "false",
            onClick: () => setActive(id),
            onDoubleClick: () => (opts.folder ? setRenaming({ id, name: label }) : undefined),
            onDragOver: (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOver(id);
            },
            onDragLeave: () => setDragOver(null),
            onDrop: (event) => {
              event.preventDefault();
              event.stopPropagation();
              const sessionId = event.dataTransfer.getData("text/plain");
              setDragOver(null);
              if (sessionId !== "" && id !== "all") assign(sessionId, id === "none" ? null : id);
            },
          },
          label,
          h("span", { className: "dspl-chip-count" }, String(count)),
          opts.folder
            ? h(
                "span",
                {
                  className: "dspl-chip-x",
                  title: L.rename,
                  onClick: (event) => {
                    event.stopPropagation();
                    setRenaming({ id, name: label });
                  },
                },
                "✎",
              )
            : null,
          opts.folder
            ? h(
                "span",
                {
                  className: "dspl-chip-x",
                  title: L.remove,
                  onClick: (event) => {
                    event.stopPropagation();
                    if (confirming === id) removeFolder(id);
                    else setConfirming(id);
                  },
                },
                confirming === id ? L.confirm : "✕",
              )
            : null,
        );
      };

      const left = Math.max(VIEWPORT_PAD, Math.min(window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD, window.innerWidth - prefs.ball.right - PANEL_WIDTH));
      const bottom = Math.max(VIEWPORT_PAD, Math.min(window.innerHeight - 80, prefs.ball.bottom + BALL_SIZE + PANEL_GAP));

      return h(
        "div",
        { className: "dspl-panel", "data-theme": theme, "data-variant": variant || "float", style: variant === "page" ? {} : { left, bottom } },
        h(
          "div",
          { className: "dspl-header" },
          h("div", { className: "dspl-title" }, L.title),
          h(
            "div",
            { className: "dspl-controls" },
            h("button", { className: "dspl-add", onClick: () => setCreating("") }, L.create),
            variant === "page" ? null : h("button", { className: "dspl-icon", title: "关闭", onClick: () => onClose?.() }, Icon("close", 14)),
          ),
        ),
        creating !== null
          ? h(
              "div",
              { className: "dspl-folder-create" },
              h("input", {
                autoFocus: true,
                placeholder: L.create,
                value: creating,
                onChange: (event) => setCreating(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter") createFolder();
                  if (event.key === "Escape") setCreating(null);
                },
              }),
              h("button", { className: "dspl-btn dspl-btn-primary", onClick: createFolder }, L.save),
              h("button", { className: "dspl-btn", onClick: () => setCreating(null) }, L.cancel),
            )
          : null,
        h(
          "div",
          { className: "dspl-folders" },
          chip("all", L.all, sessions.length),
          chip("none", L.unfiled, unfiled),
          state.folders.map((folder) => chip(folder.id, folder.name, countOf(folder.id), { folder: true })),
        ),
        sessions.length > 0
          ? h(
              "div",
              { className: "dspl-folder-search" },
              h("input", { type: "search", placeholder: L.search, value: query, onChange: (event) => setQuery(event.target.value) }),
            )
          : null,
        problem !== null ? h("div", { className: "dspl-empty", style: { color: "#e5484d", opacity: 1 } }, problem) : null,
        h(
          "div",
          { className: "dspl-sessions" },
          shows.length === 0
            ? h("div", { className: "dspl-empty" }, needle !== "" ? L.noMatch : active !== "all" && active !== "none" ? L.emptyFolder : L.empty)
            : null,
          shows.map((row) => {
            const folder = folderName(state.assignments[row.id]);
            return h(
              "div",
              {
                className: "dspl-session",
                key: row.id,
                draggable: true,
                onDragStart: (event) => {
                  event.dataTransfer.setData("text/plain", row.id);
                  event.dataTransfer.effectAllowed = "move";
                },
              },
              row.running === true ? h("span", { className: "dspl-dot" }) : null,
              h(
                "div",
                { className: "dspl-session-main", onClick: () => openSession(row.id), title: row.displayTitle || row.id },
                h("div", { className: "dspl-session-title" }, row.displayTitle || row.id),
                h(
                  "div",
                  { className: "dspl-session-sub" },
                  clock(row.updatedAt),
                  folder !== undefined ? h("span", { className: "dspl-session-folder" }, folder) : null,
                ),
              ),
              h(
                "select",
                {
                  className: "dspl-session-select",
                  value: state.assignments[row.id] ?? "",
                  onChange: (event) => assign(row.id, event.target.value),
                  title: L.moveTo,
                },
                h("option", { value: "" }, L.unfiled),
                state.folders.map((option) => h("option", { key: option.id, value: option.id }, option.name)),
              ),
            );
          }),
        ),
      );
    }

    /** Rail glyph: the same id that addresses the `main` entry. */
    function FolderGlyph(props) {
      const size = typeof props?.size === "number" ? props.size : 16;
      return h("span", { className: "dspl-glyph" }, Icon("folder", size, { strokeWidth: 1.8 }));
    }

    /** The folder surface as a sidebar page instead of a floating card. */
    function FolderSidebarPanel() {
      return h(FolderPanel, { variant: "page" });
    }

    function FolderHost() {
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        folderBus.open = () => setOpen(true);
        return () => {
          folderBus.open = () => {};
        };
      }, []);
      return open ? h(FolderPanel, { onClose: () => setOpen(false) }) : null;
    }

    // ------------------------------------------------------------ formula copy
    // Ported from the extension's features/formulaCopy: the formula itself is the
    // control — hover it and click it. Detection walks the same chain the
    // original does (data-math → ms-katex → .katex/.katex-display → math-inline),
    // and the source comes from KaTeX's own annotation, so what is copied is the
    // TeX that produced the glyphs.
    const MATH_SELECTOR = "[data-math], ms-katex, .katex-display, .katex, .math-inline, .math-block, .math-display";

    function findMathElement(target) {
      if (!(target instanceof Element)) return null;
      const direct = target.closest("[data-math]");
      if (direct !== null) return direct;
      const container = target.closest("ms-katex, .math-inline, .math-block, .math-display");
      if (container !== null) return container;
      const katex = target.closest(".katex, .katex-display");
      if (katex === null) return null;
      const display = katex.closest(".katex-display");
      return display !== null ? display : katex;
    }

    function latexOf(element) {
      const dataMath = element.getAttribute("data-math") ?? element.closest("[data-math]")?.getAttribute("data-math");
      if (typeof dataMath === "string" && dataMath.trim() !== "") return dataMath.trim();
      const source = element.closest("[data-math-source]")?.getAttribute("data-math-source");
      if (typeof source === "string" && source.trim() !== "") return source.trim();
      const annotation =
        element.querySelector('annotation[encoding="application/x-tex"]') ??
        element.closest(".katex")?.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation !== null && annotation !== undefined) {
        const value = (annotation.textContent || "").trim();
        if (value !== "") return value;
      }
      return null;
    }

    function mathmlOf(element) {
      const math = element.querySelector("math") ?? element.closest(".katex")?.querySelector("math");
      return math !== null && math !== undefined ? math.outerHTML : null;
    }

    function isDisplayMath(element) {
      return element.closest(".katex-display, .math-block, .math-display") !== null || element.matches(".katex-display, .math-block, .math-display");
    }

    function formatFormula(element, tex, format) {
      if (format === "bare") return { text: tex, html: undefined };
      if (format === "notion") return { text: `$$${tex}$$`, html: undefined };
      if (format === "mathml") {
        const mathml = mathmlOf(element);
        if (mathml === null) return { text: tex, html: undefined };
        return { text: mathml, html: mathml };
      }
      return { text: isDisplayMath(element) ? `$$\n${tex}\n$$` : `$${tex}$`, html: undefined };
    }

    function FormulaCopyLayer() {
      const [toast, setToast] = React.useState(null);
      const [format, setFormat] = React.useState(() => readPrefs().formulaFormat || "latex");
      const hovered = React.useRef(null);
      const timer = React.useRef(null);

      React.useEffect(() => {
        const label = { latex: "LaTeX", bare: "LaTeX（无 $）", mathml: "MathML（Word）", notion: "Notion $$" };

        const onOver = (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest(".dspl-panel, .dspl-ball, .dspl-selbar") !== null) return;
          const math = findMathElement(target);
          if (hovered.current !== null && hovered.current !== math) {
            hovered.current.classList.remove("dspl-math-hover");
            hovered.current = null;
          }
          if (math === null) return;
          if (latexOf(math) === null) return; // not a real formula; leave it alone
          math.classList.add("dspl-math-hover");
          hovered.current = math;
        };

        const onOut = (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const math = findMathElement(target);
          if (math === null) return;
          const next = event.relatedTarget;
          // Moving between children of the same formula is not leaving it.
          if (next instanceof Node && math.contains(next)) return;
          math.classList.remove("dspl-math-hover");
          if (hovered.current === math) hovered.current = null;
        };

        const onClick = (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (target.closest(".dspl-panel, .dspl-ball, .dspl-selbar") !== null) return;
          const math = findMathElement(target);
          if (math === null) return;
          const tex = latexOf(math);
          if (tex === null) return;
          event.preventDefault();
          event.stopPropagation();
          const current = readPrefs().formulaFormat || "latex";
          setFormat(current);
          const { text, html } = formatFormula(math, tex, current);
          const ok = copyRich(text, html);
          dsplReport("formula-copy", `${ok ? "ok" : "failed"} format=${current} tex=${tex.slice(0, 40)}`);
          const rect = math.getBoundingClientRect();
          if (timer.current !== null) clearTimeout(timer.current);
          setToast({ top: Math.max(8, rect.top - 30), left: Math.max(60, Math.min(window.innerWidth - 60, rect.left + rect.width / 2)), text: ok ? `已复制 ${label[current]}` : "复制失败" });
          timer.current = setTimeout(() => setToast(null), 1400);
        };

        document.addEventListener("mouseover", onOver, true);
        document.addEventListener("mouseout", onOut, true);
        document.addEventListener("click", onClick, true);
        return () => {
          document.removeEventListener("mouseover", onOver, true);
          document.removeEventListener("mouseout", onOut, true);
          document.removeEventListener("click", onClick, true);
          if (timer.current !== null) clearTimeout(timer.current);
          if (hovered.current !== null) hovered.current.classList.remove("dspl-math-hover");
        };
      }, []);

      return toast === null
        ? null
        : h("div", { className: "dspl-formula-toast", style: { top: toast.top, left: toast.left, transform: "translateX(-50%)" } }, toast.text);
    }

    function PromptBall() {
      const [prefs, updatePrefs] = usePrefs();
      const [open, setOpen] = React.useState(false);
      const [count, setCount] = React.useState(null);
      const drag = React.useRef(null);
      const [dragging, setDragging] = React.useState(false);
      const t = (key) => (STRINGS[prefs.lang] || STRINGS.zh)[key] ?? key;

      React.useEffect(() => {
        let alive = true;
        apiGet("state")
          .then((payload) => {
            if (alive) setCount(Array.isArray(payload.items) ? payload.items.length : 0);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, [open]);

      React.useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => {
          const target = event.target;
          if (target instanceof Element && target.closest(".dspl-panel, .dspl-ball") !== null) return;
          setOpen(false);
        };
        document.addEventListener("mousedown", onDown, true);
        return () => document.removeEventListener("mousedown", onDown, true);
      }, [open]);

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      };

      const onPointerMove = (event) => {
        const state = drag.current;
        if (state === null) return;
        if (!state.moved && Math.abs(event.clientX - state.startX) < 5 && Math.abs(event.clientY - state.startY) < 5) return;
        state.moved = true;
        setDragging(true);
        const x = event.clientX - state.dx;
        const y = event.clientY - state.dy;
        updatePrefs({
          ball: {
            right: Math.max(6, Math.min(window.innerWidth - BALL_SIZE - 6, window.innerWidth - x - BALL_SIZE)),
            bottom: Math.max(6, Math.min(window.innerHeight - BALL_SIZE - 6, window.innerHeight - y - BALL_SIZE)),
          },
        });
      };

      const onPointerUp = (event) => {
        const moved = drag.current?.moved === true;
        drag.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (!moved) setOpen((value) => !value);
      };

      return h(
        React.Fragment,
        null,
        h(SelectionToolbar, null),
        h(FormulaCopyLayer, null),
        h(FolderHost, null),
        open ? h(PromptPanel, { prefs, updatePrefs, anchor: prefs.ball, onClose: () => setOpen(false) }) : null,
        h(
          "button",
          {
            className: "dspl-ball",
            "data-dragging": dragging ? "true" : "false",
            style: { right: prefs.ball.right, bottom: prefs.ball.bottom },
            title: `${t("title")} · v${PLUGIN_VERSION}` + (count === null ? "" : ` · ${count}`),
            "aria-label": t("title"),
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: () => {
              drag.current = null;
              setDragging(false);
            },
          },
          Icon("spark", 20, { strokeWidth: 1.6 }),
        ),
      );
    }

    /** Invisible dock row occupant: publishes the composer callbacks. */
    function ComposerBridge() {
      return null;
    }

    function apply(ctx) {
      try {
        if (typeof document !== "undefined" && document.getElementById(STYLE_ID) === null) {
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = CSS;
          document.head.appendChild(style);
        }
      } catch {
        // A missing style tag only costs looks.
      }

      runtime.ctx = ctx;
      dsplReport("apply", `v${PLUGIN_VERSION} slots=${typeof ctx.slots}`);
      try {
        dsplReport("env", `${location.href} origin=${location.origin} base=${document.baseURI}`);
      } catch {
        // location is always available in a browser
      }
      const sessions = typeof ctx.get === "function" ? ctx.get("sessions") : undefined;

      // 1) Bind the composer API for the active session.
      ctx.slots.inject("conversation.input.dock", () =>
        ctx.slots.register(
          {
            name: "conversation.input.dock",
            id: "dsh-prompt-library-bridge",
            order: 45,
            inject: (sessionId) => {
              try {
                const actx = sessions?.scope?.(sessionId);
                const conversation = actx?.get?.("conversation");
                const shell = conversation?.input?.for?.(actx);
                // The mutable draft lives on the shell's `draftEditor`
                // (DraftEditorRuntime); the shell itself only exposes the
                // submission plane. Binding the wrong one left these null, which
                // is why an earlier version fell back to direct DOM writes.
                const draft = shell?.draftEditor ?? shell;
                composer.appendDraft = typeof draft?.appendDraft === "function" ? (text) => draft.appendDraft(text) : null;
                composer.setDraft = typeof draft?.setDraft === "function" ? (text) => draft.setDraft(text) : null;
                dsplReport("composer-bind", `append=${typeof composer.appendDraft} set=${typeof composer.setDraft}`);
              } catch {
                composer.appendDraft = null;
                composer.setDraft = null;
              }
              return {};
            },
          },
          ComposerBridge,
        ),
      );

      // 2) The floating ball and its panel, over the whole shell.
      ctx.slots.inject("shell.overlay", () =>
        ctx.slots.register({ name: "shell.overlay", id: "dsh-prompt-library", label: () => "提示词库" }, PromptBall),
      );

      // 3) The folder surface as a real sidebar panel: an icon in the rail
      //    (`sidebar.panellist`) and the page it selects (`main`, keyed by the
      //    same id). Both are optional: if a host lacks either slot the floating
      //    panel in the header keeps working.
      try {
        ctx.slots.inject("sidebar.panellist", () => {
          dsplReport("sidebar.panellist-inject", "fired");
          const dispose = ctx.slots.register(
            { name: "sidebar.panellist", id: FOLDER_PANEL_ID, order: 5, label: () => "会话文件夹" },
            FolderGlyph,
          );
          dsplReport("sidebar.panellist-registered", "ok");
          return dispose;
        });
      } catch (error) {
        dsplReport("sidebar.panellist-failed", error && error.stack ? error.stack : error);
        console.warn("[dsh-prompt-library] sidebar.panellist unavailable", error);
      }
      try {
        ctx.slots.inject("main", () => {
          const dispose = ctx.slots.register({ name: "main", id: FOLDER_PANEL_ID, key: FOLDER_PANEL_ID, order: 5 }, FolderSidebarPanel);
          dsplReport("main-registered", "ok");
          return dispose;
        });
      } catch (error) {
        dsplReport("main-failed", error && error.stack ? error.stack : error);
        console.warn("[dsh-prompt-library] main panel slot unavailable", error);
      }
    }

    exports.name = "dsh-prompt-library";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;
  },
});
