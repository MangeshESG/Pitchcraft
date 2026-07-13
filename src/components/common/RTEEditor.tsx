import React, { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  height?: number;
  onChange: (html: string) => void;
  /** When true the editor grows with its content (uses `height` as a minimum)
   *  instead of being a fixed-height box with an inner scrollbar. */
  autoGrow?: boolean;
  showActionButtons?: boolean;
  outputEmailWidth?: string;
  isCopyText?: boolean;
  openDeviceDropdown?: boolean;
  onDeviceDropdownToggle?: () => void;
  onDeviceWidthChange?: (width: string) => void;
  onCopyToClipboard?: () => void;
  onExpandEditor?: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  height = 400,
  onChange,
  autoGrow = false,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const incoming = value || "";
    // If the value is plain text (no HTML tags) preserve its line breaks by
    // converting newlines to <br> — otherwise innerHTML collapses them to spaces.
    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(incoming);
    const html = looksLikeHtml ? incoming : incoming.replace(/\r\n|\r|\n/g, "<br>");
    if (editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [value]);

  const isSelectionInsideEditor = (range: Range) => {
    const editor = editorRef.current;
    if (!editor) return false;
    return editor.contains(range.commonAncestorContainer);
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (isSelectionInsideEditor(range)) {
      savedSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedSelectionRef.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const normalizeUrl = (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return "";
    if (/^(https?:|mailto:|tel:|#)/i.test(trimmedUrl)) return trimmedUrl;
    return `https://${trimmedUrl}`;
  };

  const normalizeEditorLinks = () => {
    editorRef.current?.querySelectorAll("a[href]").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  };

  const syncEditorValue = () => {
    if (!editorRef.current) return;
    normalizeEditorLinks();
    onChange(editorRef.current.innerHTML);
  };

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    syncEditorValue();
  };

  const handleCreateLink = () => {
    rememberSelection();
    const href = normalizeUrl(prompt("Enter link URL") || "");
    if (!href) return;

    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (selectedRange && !selectedRange.collapsed && isSelectionInsideEditor(selectedRange)) {
      document.execCommand("createLink", false, href);
    } else {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = href;
      document.execCommand("insertHTML", false, link.outerHTML);
    }

    syncEditorValue();
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 bg-gray-100 rounded-t">
        <select
          onChange={(e) => {
            handleCommand("formatBlock", e.target.value);
            e.target.value = "p";
          }}
          className="border px-2 py-1 rounded"
          defaultValue="p"
        >
          <option value="p">Normal</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("bold");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Bold (Ctrl+B)"
        >
          <b>B</b>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("italic");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Italic (Ctrl+I)"
        >
          <i>I</i>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("underline");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("strikeThrough");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Strikethrough"
        >
          <s>S</s>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("insertUnorderedList");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Bullet List"
        >
          •
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCommand("insertOrderedList");
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Numbered List"
        >
          1.
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleCreateLink();
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Insert Link"
        >
          🔗
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("Enter image URL");
            if (url) handleCommand("insertImage", url);
          }}
          className="px-2.5 py-1.5 border rounded bg-white hover:bg-gray-200"
          title="Insert Image"
        >
          🖼️
        </button>
      </div>

      {/* Editor */}
      <div className="rich-text-editor">
        <div
          ref={editorRef}
          contentEditable
          className={`border border-t-0 border-gray-300 p-3 outline-none rounded-b ${autoGrow ? "" : "overflow-auto"}`}
          style={
            autoGrow
              ? { minHeight: height, overflowY: "visible" }
              : { height, overflowY: "auto" }
          }
          onInput={syncEditorValue}
          onBlur={syncEditorValue}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          onClick={(e) => {
            if (!(e.target instanceof Element)) return;
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement | null;
            if (link?.href) {
              e.preventDefault();
              window.open(link.href, "_blank", "noopener,noreferrer");
              return;
            }

            const summary = target.closest('summary');
            const details = summary?.closest('details') || target.closest('[data-reply-email-trail]');

            if (details?.hasAttribute('data-reply-email-trail')) {
              e.preventDefault();
              if (details instanceof HTMLDetailsElement) {
                details.open = !details.open;
              } else {
                const isOpen = details.getAttribute('data-trail-open') === 'true';
                details.setAttribute('data-trail-open', isOpen ? 'false' : 'true');
                const body = details.querySelector('.contact-reply-trail-body') as HTMLElement | null;
                if (body) body.style.display = isOpen ? 'none' : 'block';
              }
              onChange(e.currentTarget.innerHTML);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
            }
          }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;

// import React, { useMemo } from "react";
// import ReactQuill from "react-quill-new";
// import "react-quill-new/dist/quill.snow.css";

// interface RichTextEditorProps {
//   value: string;
//   onChange: (value: string) => void;
//   height?: number;
// }

// const RichTextEditor: React.FC<RichTextEditorProps> = ({
//   value,
//   onChange,
//   height = 200,
// }) => {
//   // 1. Memoize modules so they never change after the first render
//   const modules = useMemo(() => ({
//     toolbar: [
//       [{ header: [1, 2, 3, false] }],
//       ["bold", "italic", "underline", "strike"],
//       [{ list: "ordered" }, { list: "bullet" }],
//       ["link", "image"],
//       ["clean"],
//     ],
//   }), []);

//   // 2. Memoize formats
//   const formats = useMemo(() => [
//     "header", "bold", "italic", "underline", "strike", 
//     "list", "link", "image"
//   ], []);

//   // 3. Memoize the style object to prevent re-mounts
//   const editorStyle = useMemo(() => ({ 
//     height, 
//     marginBottom: '40px' // Space for the toolbar if needed
//   }), [height]);

//   return (
//     <div className="rich-text-editor">
//       <ReactQuill
//         theme="snow"
//         value={value}
//         onChange={onChange}
//         modules={modules}
//         formats={formats}
//         style={editorStyle} // Use the memoized style
//       />
//     </div>
//   );
// };

// export default RichTextEditor;
