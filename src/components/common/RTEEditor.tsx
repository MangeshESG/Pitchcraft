import React, { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  height?: number;
  onChange: (html: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  height = 400,
  onChange,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
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
            const url = prompt("Enter link URL");
            if (url) handleCommand("createLink", url);
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
          className="border border-t-0 border-gray-300 p-3 outline-none overflow-auto rounded-b"
          style={{
            height,
            overflowY: "auto",
          }}
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onBlur={(e) => onChange(e.currentTarget.innerHTML)}
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