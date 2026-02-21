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
    <div className="border-b border-border py-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{icon}</span>
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

const FormField = ({ label, value, full = false, type = "text" }: { label: string; value: string; full?: boolean; type?: string }) => (
  <div className={full ? "col-span-2" : ""}>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    <input
      type={type}
      defaultValue={value}
      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
    />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      {/* Breadcrumb */}
      <div className="mb-8 text-sm text-muted-foreground">
        <span className="cursor-pointer hover:underline">← Contacts</span>
        <span className="mx-1">/</span>
        <span className="text-foreground font-medium">Edit Contact</span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left column - Form */}
        <div className="flex-1 rounded-xl border border-border bg-card p-6">
          <AccordionSection
            defaultOpen
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            }
            title="Personal Information"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Full name" value="Alexander Pierce" />
              <FormField label="Email address" value="a.pierce@technexus.io" type="email" />
              <FormField label="Mobile number" value="+1 (555) 245-8794" type="tel" />
              <FormField label="Timezone" value="GMT -5 (EST)" />
            </div>
          </AccordionSection>

          <AccordionSection
            defaultOpen
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            }
            title="Company Information"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Job title" value="Senior Strategic Director" />
              <FormField label="Company name" value="TechNexus Solutions" />
              <FormField label="Industry sector" value="Software & SaaS" />
              <FormField label="Company size" value="500 - 1,000 Employees" />
              <FormField label="Office address" value="452 Innovation Way, Silicon Valley, CA 94025, USA" full />
            </div>
          </AccordionSection>

          <AccordionSection
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            }
            title="Website & Social Presence"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormField label="Company website" value="https://technexus.io" type="url" />
              <FormField label="LinkedIn profile" value="linkedin.com/in/apierce-tech" />
            </div>
          </AccordionSection>

          {/* Footer bar */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
            <button className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">Save</button>
          </div>
        </div>

        {/* Right column */}
        <div className="w-full space-y-6 lg:w-80">
          {/* Email Engagement */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <h3 className="text-lg font-semibold text-foreground">Email Engagement</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                <p className="text-xs text-blue-600 font-medium">Sent</p>
                <p className="text-2xl font-bold text-blue-700">14</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-xs text-green-600 font-medium">Opens</p>
                <p className="text-2xl font-bold text-green-700">9</p>
                <p className="text-xs text-green-500">(64.3%)</p>
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-center">
                <p className="text-xs text-orange-600 font-medium">Clicks</p>
                <p className="text-2xl font-bold text-orange-700">2</p>
                <p className="text-xs text-orange-500">(14.2%)</p>
              </div>
            </div>
            <a href="#" className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View full campaign report
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

          {/* Pinned Notes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-semibold text-foreground">Pinned Notes (3)</h3>
              </div>
              <a href="#" className="text-sm font-medium text-green-600 hover:underline">View All</a>
            </div>
            <div className="space-y-3">
              {[
                { date: "17 Feb 2026 · 03:34 PM", text: "Expressed high interest in the Q3 enterprise plan. Needs a follow-up demo scheduled for early March." },
                { date: "04 Feb 2026 · 11:20 AM", text: "Met at the TechSummit conference. Discussion focused on API integrations and security compliance." },
                { date: "28 Jan 2026 · 09:15 AM", text: "Initial outreach successful. Lead quality is high based on company revenue tier." },
              ].map((note, i) => (
                <div key={i} className="rounded-lg border-l-4 border-l-green-400 bg-green-50 p-3">
                  <p className="mb-1 text-xs font-medium text-red-500">{note.date}</p>
                  <p className="text-sm text-foreground">{note.text}</p>
                </div>
              ))}
            </div>
            <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:bg-muted/50">
              + Add a new private note
            </button>
          </div>

          {/* LinkedIn Summary */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="h-1 bg-blue-600" />
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  <h3 className="text-lg font-semibold text-foreground">LinkedIn Summary</h3>
                </div>
                <span className="text-muted-foreground">+</span>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-sm italic text-foreground">
                  "Strategic leader with 10+ years experience in scaling SaaS operations. Expert in cross-functional alignment and digital transformation strategies at TechNexus."
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">AP</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Alexander Pierce</p>
                  <p className="text-xs text-muted-foreground">Updated 2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
