import { useState } from "react";
const AccordionSection = ({
  icon,
  title,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  // Controlled mode (parent passes `open`/`onToggle`) lets a group of sections
  // enforce "only one open at a time"; otherwise fall back to internal state.
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  return (
    <div className="border-b border-[#cccccc] py-6 px-3">
      <button
        onClick={(e) => {
          e.preventDefault()
          if (isControlled) {
            onToggle?.();
          } else {
            setInternalOpen(!internalOpen);
          }
        }}

        className="flex w-full items-center justify-between text-left bg-[#e6f4e6] rounded-md px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#3f9f42]">{icon}</span>
          <h2 className="text-lg font-semibold text-[#1e5e21]">{title}</h2>
        </div>
        <svg
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-6">{children}</div>}
    </div>
  );
};

export default AccordionSection;