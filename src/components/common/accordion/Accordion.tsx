import { useState } from "react";
const AccordionSection = ({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#cccccc] py-6 px-3">
      <button
        onClick={(e) => {
          e.preventDefault()
          setOpen(!open)}
        }

        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#3f9f42]">{icon}</span>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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