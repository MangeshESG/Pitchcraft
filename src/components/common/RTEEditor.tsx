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

    const exec = (command: string, commandValue?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, commandValue);
    };

    const savedRangeRef = useRef<Range | null>(null);

    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0);
        }
    };

    const restoreSelection = () => {
        const selection = window.getSelection();
        if (savedRangeRef.current && selection) {
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
        }
    };

    const applyBlockStyle = (tag: string) => {
        editorRef.current?.focus();
        restoreSelection();

        document.execCommand("formatBlock", false, tag);
    };



  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 bg-gray-100 rounded-t">
        <select
           onChange={(e) => applyBlockStyle(e.target.value)}
            className="border px-2 py-1 rounded"
            >
            <option value="p">Normal</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
        </select>


        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            <b>B</b>
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            <i>I</i>
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            <u>U</u>
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("strikeThrough");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            <s>S</s>
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            •
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
            }}
            className="px-2.5 py-1.5 border rounded bg-white"
        >
            1.
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("Enter link URL");
            if (url) exec("createLink", url);
            }}
        >
            🔗
        </button>

        <button
            onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("Enter image URL");
            if (url) exec("insertImage", url);
            }}
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
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
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