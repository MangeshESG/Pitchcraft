import React, { useState, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Tooltip as ReactTooltip } from "react-tooltip";
import ValidationErrorModal from "../common/ValidationErrorModal";
import { defaultButtonStyle, lessPriorityButtonStyle } from "../../styles/buttonStyles";
import "./datafile.css";
import API_BASE_URL from "../../config";
import { useAppData } from "../../contexts/AppDataContext";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";

/* ===========================================================
   Pitchkraft import redesign — theme + shared UI primitives
   (green #3f9f42, Inter, white surfaces)
   =========================================================== */
const G = "#3f9f42";
const G_DARK = "#2d7a30";
const G_BG = "#e8f3e9";
const G_BG_SOFT = "#f1f8f2";
const BORDER = "#e8eaee";
const TEXT_MUTED = "#6b7280";

type IconProps = React.SVGProps<SVGSVGElement>;
const FI: Record<string, (p: IconProps) => JSX.Element> = {
  user: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" /></svg>),
  mail: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><path d="m4 8 8 5.2L20 8" /></svg>),
  building: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M4 21h17M8 8h3M8 12h3M8 16h3" /></svg>),
  briefcase: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7.5" width="18" height="12" rx="2.2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3 12.5h18" /></svg>),
  phone: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" /></svg>),
  globe: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" /></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s6.5-5.7 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 15.3 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.4" /></svg>),
  linkedin: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.6v.01M12 16v-3.2a1.8 1.8 0 0 1 3.6 0V16" /></svg>),
  tag: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" /></svg>),
  swap: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>),
  info: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.01" /></svg>),
  bulb: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9.5 18h5M10 21h4M12 3a6 6 0 0 0-3.7 10.7c.7.6 1.2 1.4 1.2 2.3h5c0-.9.5-1.7 1.2-2.3A6 6 0 0 0 12 3Z" /></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12.5 4.5 4.5L19 6.5" /></svg>),
  arrow: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
  arrowL: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6" /></svg>),
  cloud: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 15V4m0 0-3.5 3.5M12 4l3.5 3.5" /><path d="M5 15.5A4 4 0 0 1 6 8a5.5 5.5 0 0 1 10.6-1A4.2 4.2 0 0 1 19 15.5" /></svg>),
  file: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z" /><path d="M13 3v6h6" /><path d="M8.5 13h7M8.5 16.5h5" /></svg>),
  download: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" /></svg>),
  x: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>),
};

// Choose a glyph for a mapped contact field (used on the map + review rows)
const iconForField = (fieldKey: string): ((p: IconProps) => JSX.Element) => {
  if (!fieldKey) return FI.file;
  if (fieldKey.startsWith("custom_")) return FI.tag;
  const map: Record<string, (p: IconProps) => JSX.Element> = {
    full_name: FI.user, first_name: FI.user, last_name: FI.user, name: FI.user,
    email: FI.mail, company: FI.building, job_title: FI.briefcase,
    company_telephone: FI.phone, company_website: FI.globe, location: FI.pin,
    linkedin: FI.linkedin, company_linkedin_url: FI.linkedin,
    company_industry: FI.tag, company_employee_count: FI.tag,
    linkedIninformation: FI.linkedin,
  };
  return map[fieldKey] || FI.file;
};

/* ---- 3-step progress header ---- */
const STEP_LABELS = ["Upload CSV", "Map columns", "Review & confirm"];
const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <div className="bg-white rounded-2xl border px-8 py-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]" style={{ borderColor: BORDER }}>
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < current, active = n === current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-[16px] font-bold transition"
                style={done || active ? { background: G, color: "#fff" } : { background: "#eef1ef", color: "#9aa3a0" }}>
                {done ? <FI.check className="w-5 h-5" /> : n}
              </div>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold" style={{ color: done || active ? "#111827" : "#9aa3a0" }}>{label}</div>
                {active && <div className="text-[12.5px] mt-0.5" style={{ color: G }}>You are here</div>}
              </div>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className="flex-1 h-[3px] mx-5 rounded-full" style={{ background: n < current ? G : "#e7eae8" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const Heading: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div>
    <h1 className="text-[28px] font-extrabold tracking-tight text-[#111827] leading-tight">{title}</h1>
    <p className="text-[15px] mt-1.5" style={{ color: TEXT_MUTED }}>{sub}</p>
  </div>
);

const Stat: React.FC<{ value: React.ReactNode; label: string; tone: "green" | "amber" | "slate" }> = ({ value, label, tone }) => {
  const c = tone === "green" ? { fg: G } : tone === "amber" ? { fg: "#c07a11" } : { fg: "#4b5563" };
  return (
    <div className="flex-1 rounded-2xl border bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]" style={{ borderColor: BORDER }}>
      <span className="text-[30px] font-extrabold" style={{ color: c.fg, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <div className="text-[13.5px] font-medium mt-0.5" style={{ color: TEXT_MUTED }}>{label}</div>
    </div>
  );
};
interface DataFileProps {
  selectedClient: string;
  onDataProcessed: (data: any[]) => void;
  isProcessing?: boolean;
  onBack?: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

interface ProcessedContact {
  sourceRowNumber?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name: string;
  email: string;
  job_title?: string;
  company?: string;
  location?: string;
  linkedin?: string;
  company_website?: string;
  email_body?: string;
  email_subject?: string;
  company_telephone?: string;
  company_employee_count?: string;
  company_industry?: string;
  company_linkedin_url?: string;
  linkedIninformation?: string;
    customFields?: Record<string, string>;

}

interface SkippedContact {
  rowNumber: number;
  email?: string;
  fullName?: string;
  reason: string;
}

const REQUIRED_FIELDS = [
  { key: "first_name", label: "First name", required: false },
  { key: "last_name", label: "Last name", required: false },
  { key: "full_name", label: "Full name", required: false },
  { key: "email", label: "Email address", required: false },
  { key: "job_title", label: "Job title", required: false },
  { key: "company", label: "Company name", required: false },
  { key: "location", label: "Company location", required: false },
  { key: "linkedin", label: "LinkedIn URL", required: false },
  { key: "company_website", label: "Company website", required: false },
  { key: "company_telephone", label: "Company telephone", required: false },
  {
    key: "company_employee_count",
    label: "Company employee count",
    required: false,
  },
  { key: "company_industry", label: "Company industry", required: false },
  {
    key: "company_linkedin_url",
    label: "Company LinkedIn URL",
    required: false,
  },
  { key: "linkedIninformation", label: "LinkedIn summary", required: false },
];

const DataFile: React.FC<DataFileProps> = ({
  selectedClient,
  onDataProcessed,
  isProcessing = false,
  onBack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [previewData, setPreviewData] = useState<ProcessedContact[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{row: number, field: string, value: string, message: string}>>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
  });
  const [skippedContacts, setSkippedContacts] = useState<SkippedContact[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
 const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;

  const [dataFileInfo, setDataFileInfo] = useState<DataFileInfo>({
    name: "",
    description: "",
  });
  const [validatedData, setValidatedData] = useState<ProcessedContact[]>([]);
  const { triggerRefresh } = useAppData();

  interface DataFileInfo {
    name: string;
    description: string;
  }
  const toastAnimation = `
@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
`;

  const showImportToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);

    if (type === "success") {
      setShowErrorToast(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
      return;
    }

    setShowSuccessToast(false);
    setShowErrorToast(true);
    setTimeout(() => setShowErrorToast(false), 6000);
  };

  interface CustomField {
  id: number;
  field_name: string;
  field_type: string;
}

const [customFields, setCustomFields] = useState<CustomField[]>([]);
// The map-stage pick list lists the system fields A–Z first, then the client's
// custom attributes A–Z under their own group heading.
const systemFieldOptions = React.useMemo(
  () =>
    [...REQUIRED_FIELDS].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    ),
  []
);
const customFieldOptions = React.useMemo(
  () =>
    customFields
      .map((f: CustomField) => ({
        key: `custom_${f.field_name}`,
        label: f.field_name,
        required: false,
        isCustom: true,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
  [customFields]
);
const allFields = React.useMemo(
  () => [...systemFieldOptions, ...customFieldOptions],
  [systemFieldOptions, customFieldOptions]
);
useEffect(() => {
  const fetchCustomFields = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/Crm/custom-fields?clientId=${effectiveUserId}`
      );
      const data = await res.json();
      setCustomFields(data || []);
    } catch (err) {
      console.error("Error fetching custom fields", err);
    }
  };

  if (effectiveUserId) fetchCustomFields();
}, [effectiveUserId]);

  // Auto-detect column mappings
 const autoDetectColumns = (headers: string[]) => {
  const mappings: ColumnMapping = {};

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    if (["name", "full name", "fullname", "contact name"].includes(lowerHeader)) {
      mappings[header] = "full_name";
    } else if (["first name", "firstname", "first_name"].includes(lowerHeader)) {
      mappings[header] = "first_name";
    } else if (["last name", "lastname", "last_name"].includes(lowerHeader)) {
      mappings[header] = "last_name";
    } else if (lowerHeader.includes("email")) {
      mappings[header] = "email";
    } else if (lowerHeader.includes("company")) {
      mappings[header] = "company";
    } else if (lowerHeader.includes("location")) {
      mappings[header] = "location";
    } else if (lowerHeader.includes("website")) {
      mappings[header] = "company_website";
    } else if (lowerHeader.includes("job")) {
      mappings[header] = "job_title";
    } else if (lowerHeader.includes("linkedin")) {
      mappings[header] = "linkedin";
    }
  });

  const patterns: Record<string, string[]> = {
    full_name: ['full name', 'fullname', 'contact name', 'name'],
    email: ['email address', 'e-mail', 'mail'],
    job_title: ['title', 'position', 'role'],
    company: ['company name', 'organization'],
    location: ['address', 'city', 'country'],
    linkedin: ['linkedin url', 'linkedin profile'],
    company_website: ['company website', 'company url']
  };

  headers.forEach((header) => {
  const lowerHeader = header.toLowerCase();

  for (const [field, patternList] of Object.entries(patterns)) {
    if (mappings[header]) break;

    const matched = patternList.some(pattern =>
      lowerHeader.includes(pattern)
    );

    if (matched) {
      mappings[header] = field;
      break;
    }
  }
});
  // Detect custom fields
  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    const matchedCustom = customFields.find(
      (f) => f.field_name.toLowerCase() === lowerHeader
    );

    if (matchedCustom && !mappings[header]) {
      mappings[header] = `custom_${matchedCustom.field_name}`;
    }
  });

  setColumnMappings(mappings);
};


  // const userId = sessionStorage.getItem("clientId");
  //  console.log("Client ID stored in session:", userId);
  // const effectiveUserId = selectedClient !== "" ? selectedClient : userId;
  //   console.log("Client ID stored in session:", effectiveUserId);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      setErrors([
        "Please upload a valid contacts data file (.xlsx, .xls, or .csv)",
      ]);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors(["File size must be less than 10MB"]);
      return;
    }

    setUploadedFile(file);
    setErrors([]);
    setDataFileInfo((prev) => ({
      ...prev,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
    }));
    readExcelFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Read Excel file
  const readExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 0) {
          // Get headers and clean them properly
          const rawHeaders = jsonData[0] as any[];
          const headers = rawHeaders.map((h, index) => {
            if (h === null || h === undefined || h === '') {
              return `Column_${index + 1}`;
            }
            return String(h).trim();
          });
          
          const rows = jsonData
            .slice(1)
            .filter((row) => (row as any[]).some((cell) => cell !== null && cell !== undefined && cell !== ''));

          setColumnHeaders(headers);
          setExcelData(rows);

          // Auto-detect columns
          autoDetectColumns(headers);
          setCurrentStep(2);
        } else {
          setErrors(["The file appears to be empty"]);
        }
      } catch (error) {
        setErrors([
          "Failed to read the contacts data file. Please ensure it's a valid contacts data file.",
        ]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle column mapping change
  const handleMappingChange = (field: string, value: string) => {
    setColumnMappings({
      ...columnMappings,
      [field]: value,
    });
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Generate preview data
  const generatePreview = () => {
    const allValidData: ProcessedContact[] = [];
    const validPreview: ProcessedContact[] = [];
    const detailedErrors: Array<{row: number, field: string, value: string, message: string}> = [];
    let validCount = 0;
    let invalidCount = 0;

    const totalRows = excelData.length;

    excelData.forEach((row, rowIndex) => {
      const mappedRow: any = {
        sourceRowNumber: rowIndex + 2,
        customFields: {}
      };
      let isValid = true;

      Object.entries(columnMappings).forEach(([column, field]) => {
      if (!field) return;
        const columnIndex = columnHeaders.indexOf(column);
        
        if (columnIndex !== -1 && columnIndex < row.length && row[columnIndex] !== undefined && row[columnIndex] !== null) {
          const cellValue = row[columnIndex];
          const value = cellValue?.toString().trim() || "";

        if (field.startsWith("custom_")) {
          const customKey = field.replace("custom_", "");
          mappedRow.customFields[customKey] = value;
        } else {
          mappedRow[field] = value;
        }
        } else {
            if (field.startsWith("custom_")) {
              const customKey = field.replace("custom_", "");
              mappedRow.customFields[customKey] = "";
            } else {
              mappedRow[field] = "";
            }
          }
      });

      // Handle full_name + first_name + last_name combination
      const firstName = mappedRow.first_name || "";
      const lastName = mappedRow.last_name || "";
      const fullName = mappedRow.full_name || "";
      const combinedName = fullName || `${firstName} ${lastName}`.trim();
      mappedRow.name = combinedName;
      if (!mappedRow.full_name && combinedName) {
        mappedRow.full_name = combinedName;
      }

      // A row without an address is imported: Audience Assurance can discover
      // one from a LinkedIn profile or a company domain. Only a row with
      // nothing to identify the person by is rejected.
      if (!mappedRow.email) {
        if (!combinedName && !mappedRow.linkedin) {
          detailedErrors.push({
            row: rowIndex + 2,
            field: 'email',
            value: '',
            message: 'The row has no email, name or LinkedIn URL'
          });
          isValid = false;
        }
      } else if (!isValidEmail(mappedRow.email)) {
        detailedErrors.push({
          row: rowIndex + 2,
          field: 'email',
          value: mappedRow.email,
          message: 'Invalid email format'
        });
        isValid = false;
      }

      if (isValid) {
        validCount++;
        allValidData.push(mappedRow);
        if (validPreview.length < 5) {
          validPreview.push(mappedRow);
        }
      } else {
        invalidCount++;
      }
    });

    setValidationErrors(detailedErrors);
    setPreviewData(validPreview);
    setProcessingStats({
      total: totalRows,
      valid: validCount,
      invalid: invalidCount,
    });
    setValidatedData(allValidData);

    if (validCount === 0 && detailedErrors.length > 0) {
      setShowValidationModal(true);
    } else {
      setCurrentStep(3);
    }
  };

  // Process and save data
  const processData = async () => {
    if (!dataFileInfo.name.trim()) {
      setErrors(["Please enter a data file name"]);
      return;
    }

    const contactsToUpload = validatedData.filter(
      (contact: any) => !contact.email || isValidEmail(contact.email)
    );

    if (contactsToUpload.length === 0) {
      setErrors(["No valid contacts found. Please fix the invalid email rows before saving."]);
      setCurrentStep(3);
      return;
    }

    setCurrentStep(4);
    setUploadProgress(0);
    setErrors([]);
   // const clientId = sessionStorage.getItem("clientId"); 

    try {
      const apiPayload = {
       // clientId: clientId,
        clientId: Number(effectiveUserId),
        name: dataFileInfo.name,
        dataFileName: uploadedFile?.name || "",
        description: dataFileInfo.description,
          contacts: contactsToUpload.map((contact: any) => {
            const firstName = contact.first_name?.trim() || "";
            const lastName = contact.last_name?.trim() || "";
            const fullName = (contact.full_name || contact.name || "").trim();

            return {
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              fullName: fullName || undefined,
              sourceRowNumber: contact.sourceRowNumber,
              email: contact.email,
              website: contact.company_website || "",
              companyName: contact.company || "",
              jobTitle: contact.job_title || "",
              linkedInUrl: contact.linkedin || "",
              countryOrAddress: contact.location || "",
              emailSubject: contact.email_subject || "",
              emailBody: contact.email_body || "",
              companyTelephone: contact.company_telephone || "",
              companyEmployeeCount: contact.company_employee_count || "",
              companyIndustry: contact.company_industry || "",
              companyLinkedInURL: contact.company_linkedin_url || "",
              linkedIninformation: contact.linkedIninformation || "",

              // NEW
              customFields: contact.customFields || {}
            };
          })
      };

      setUploadProgress(50);

      const response = await fetch(`${API_BASE_URL}/api/Crm/uploadcontacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to upload contacts");
      }

      triggerRefresh();

      const result = await response.json();
      const importedCount = Number(result.contactCount || 0);
      const apiSkippedContacts: SkippedContact[] = Array.isArray(result.skippedContacts)
        ? result.skippedContacts
        : [];
      setSkippedContacts(apiSkippedContacts);

      setUploadProgress(100);

      setProcessingStats({
        total: excelData.length,
        valid: importedCount,
        invalid: excelData.length - importedCount,
      });

      onDataProcessed(contactsToUpload);
      showImportToast(
        `${importedCount} contact${importedCount === 1 ? "" : "s"} imported${apiSkippedContacts.length ? `, ${apiSkippedContacts.length} duplicate${apiSkippedContacts.length === 1 ? "" : "s"} skipped` : ""}`,
        "success"
      );
    } catch (error) {
      console.error("Error processing data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save data. Please try again.";

      setErrors([errorMessage]);
      showImportToast(errorMessage, "error");
      setCurrentStep(3);
    }
  };

  // Reset upload
  const resetUpload = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setExcelData([]);
    setColumnHeaders([]);
    setColumnMappings({});
    setPreviewData([]);
    setErrors([]);
    setUploadProgress(0);
    setSkippedContacts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      [
        "Name",
        "Email",
        "Job Title",
        "Company",
        "Location",
        "LinkedIn URL",
        "Company Website",
        "Company Telephone",
        "Company Employee Count",
        "Company Industry",
        "Company LinkedIn URL",
        "LinkedIn Summary",
      ],
      [
        "John Doe",
        "john.doe@example.com",
        "Software Engineer",
        "Tech Corp",
        "San Francisco, CA",
        "https://linkedin.com/in/johndoe",
        "https://techcorp.com",
        "+1-555-123-4567",
        "100-500",
        "Technology",
        "https://linkedin.com/company/techcorp",
        "Experienced software engineer with 10+ years in full-stack development.",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "contact_template.xlsx");
  };

  // First data-row value for a given CSV column (map-stage preview)
  const firstRowValue = (header: string): string => {
    if (!excelData.length) return "";
    const idx = columnHeaders.indexOf(header);
    if (idx === -1) return "";
    const v = excelData[0][idx];
    return v === undefined || v === null ? "" : String(v).trim();
  };

  // A field stays selectable for this row while it is unmapped elsewhere.
  const selectableFields = (
    fields: Array<{ key: string; label: string }>,
    mapped: string
  ) =>
    fields.filter(
      (field) =>
        !Object.values(columnMappings).includes(field.key) || mapped === field.key
    );

  // Label for a target field key (map-stage dropdown + row subtitle).
  // Prefers the field's declared label so casing like "LinkedIn URL" is preserved.
  const fieldLabel = (fieldKey: string): string => {
    if (!fieldKey) return "";
    if (fieldKey.startsWith("custom_")) return fieldKey.replace("custom_", "");

    const declared = allFields.find((f) => f.key === fieldKey)?.label;
    if (typeof declared === "string") return declared;

    return fieldKey
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  // An Email column is no longer required to continue: Audience Assurance can
  // discover addresses from a LinkedIn profile or a company domain. What the
  // import cannot do without is some way to tell the people apart, so one of
  // these four has to be mapped.
  const mappedFields = Object.values(columnMappings);

  const canContinueMapping =
    mappedFields.includes("email") ||
    mappedFields.includes("first_name") ||
    mappedFields.includes("full_name") ||
    mappedFields.includes("linkedin");

  return (
    <div className="w-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="w-full p-6">
        {/* ===========================================================
            STAGE 1 — Upload
            =========================================================== */}
        {currentStep === 1 && (
          <>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="mb-3"
                    style={{ ...lessPriorityButtonStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <FI.arrowL className="w-4 h-4" /> Back to list
                  </button>
                )}
                <Heading
                  title="Import your contacts"
                  sub="Upload a CSV or Excel file to bring your contacts into Pitchkraft."
                />
              </div>
              <button
                onClick={downloadTemplate}
                className="shrink-0 transition"
                style={{ ...lessPriorityButtonStyle, display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <FI.download className="w-[18px] h-[18px]" style={{ color: G }} /> Download template
              </button>
            </div>

            <div className="mt-6">
              <Stepper current={1} />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              {/* dropzone */}
              <div
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl bg-white border-2 border-dashed transition-all px-8 py-16 flex flex-col items-center text-center"
                style={{
                  borderColor: isDragActive ? G : "#c9d2ce",
                  background: isDragActive ? G_BG_SOFT : "#fff",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: G_BG, color: G }}
                >
                  <FI.cloud className="w-10 h-10" />
                </div>
                <div className="text-[19px] font-bold text-[#111827]">
                  {isDragActive ? "Drop the file here…" : "Drag & drop your file here"}
                </div>
                <div className="text-[14px] mt-1.5" style={{ color: TEXT_MUTED }}>
                  or click to browse from your computer
                </div>
                <span
                  className="mt-6 shadow-sm"
                  style={{ ...defaultButtonStyle, display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <FI.file className="w-[18px] h-[18px]" /> Choose file
                </span>
                <div className="text-[12.5px] mt-6" style={{ color: "#9aa3a0" }}>
                  Supports .csv, .xlsx, .xls · up to 10&nbsp;MB
                </div>
              </div>

              {/* helper card */}
              <div
                className="rounded-2xl bg-white border p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                style={{ borderColor: BORDER }}
              >
                <div className="text-[14px] font-bold text-[#111827]">Before you upload</div>
                <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: TEXT_MUTED }}>
                  Make sure the first row of your file holds column headers. We’ll match
                  them automatically in the next step.
                </p>
                <div className="h-px my-5" style={{ background: BORDER }} />
                <div
                  className="text-[12px] font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "#9aa3a0" }}
                >
                  Required fields
                </div>
                <div className="flex flex-col gap-2.5">
                  {([
                    { label: "Full name", hint: "or ‘First name’ and ‘Surname’", Ic: FI.user },
                    { label: "Email address", hint: "", Ic: FI.mail },
                  ] as const).map(({ label, hint, Ic }) => (
                    <div
                      key={label}
                      className="flex items-start gap-2.5 text-[13.5px] font-medium text-[#374151]"
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: G_BG, color: G }}
                      >
                        <Ic className="w-4 h-4" />
                      </span>
                      <span>
                        <span className="block leading-7">{label}</span>
                        {hint && (
                          <span
                            className="block text-[12.5px] font-normal leading-tight"
                            style={{ color: TEXT_MUTED }}
                          >
                            {hint}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="text-[12px] font-semibold uppercase tracking-wide mt-5 mb-3"
                  style={{ color: "#9aa3a0" }}
                >
                  Recommended
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Company", "Job title", "Phone", "Website"].map((t) => (
                    <span
                      key={t}
                      className="text-[12.5px] font-medium px-2.5 py-1 rounded-lg"
                      style={{ background: "#f2f4f3", color: "#4b5563" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {uploadedFile && (
              <div
                className="mt-5 flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
                style={{ borderColor: BORDER }}
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#ede9fe", color: "#7c5cff" }}
                >
                  <FI.file className="w-5 h-5" />
                </span>
                <span className="text-[14px] font-semibold text-[#111827]">
                  {uploadedFile.name}
                </span>
                <span className="text-[12.5px]" style={{ color: TEXT_MUTED }}>
                  ({(uploadedFile.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}

            {errors.length > 0 && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-[13.5px]"
                style={{ background: "#fdecec", color: "#b42318" }}
              >
                {errors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===========================================================
            STAGE 2 — Map columns
            =========================================================== */}
        {currentStep === 2 && (
          <>
            <Heading
              title="Map your contacts"
              sub="Match the columns from your file to the Pitchkraft contact fields."
            />

            <div className="mt-6">
              <Stepper current={2} />
            </div>

            <div
              className="mt-6 bg-white rounded-2xl border overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              style={{ borderColor: BORDER }}
            >
              {/* header */}
              <div className="grid grid-cols-[1fr_360px_240px] items-center gap-6 px-8 py-4">
                <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-[#111827]">
                  Your file column
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center ml-1"
                    style={{ background: G_BG, color: G }}
                  >
                    <FI.swap className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-[13px] font-bold uppercase tracking-wide text-[#111827]">
                  Maps to contact field
                </div>
                <div className="text-[13px] font-bold uppercase tracking-wide text-[#111827] flex items-center gap-1.5">
                  Preview <FI.info className="w-4 h-4" style={{ color: "#9aa3a0" }} />
                </div>
              </div>

              {columnHeaders.map((header) => {
                const mapped = columnMappings[header] || "";
                const Ic = iconForField(mapped);
                const pv = firstRowValue(header);
                return (
                  <div
                    key={header}
                    className="grid grid-cols-[1fr_360px_240px] items-center gap-6 px-8 py-4 border-t"
                    style={{ borderColor: "#f0f2f1" }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: mapped ? G : "#eef1ef",
                          color: mapped ? "#fff" : "#9aa3a0",
                        }}
                      >
                        <Ic className="w-[19px] h-[19px]" />
                      </span>
                      <div className="leading-tight min-w-0">
                        <div className="text-[14.5px] font-semibold text-[#111827] truncate">
                          {header}
                        </div>
                        <div className="text-[12.5px] truncate" style={{ color: TEXT_MUTED }}>
                          {mapped ? `Mapped to ${fieldLabel(mapped)}` : "Not imported"}
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <select
                        value={mapped}
                        onChange={(e) =>
                          setColumnMappings({
                            ...columnMappings,
                            [header]: e.target.value,
                          })
                        }
                        className="appearance-none w-full h-11 pl-4 pr-10 text-[14px] rounded-xl border bg-white outline-none focus:border-[#3f9f42] cursor-pointer transition"
                        style={{
                          borderColor: mapped ? "#cfd8d4" : "#e6a6a6",
                          color: mapped ? "#111827" : "#9aa3a0",
                        }}
                      >
                        <option value="">— Don’t include —</option>
                        {selectableFields(systemFieldOptions, mapped).map((field) => (
                          <option key={field.key} value={field.key}>
                            {fieldLabel(field.key)}
                          </option>
                        ))}
                        {selectableFields(customFieldOptions, mapped).length > 0 && (
                          <optgroup label="Custom attributes">
                            {selectableFields(customFieldOptions, mapped).map((field) => (
                              <option key={field.key} value={field.key}>
                                {fieldLabel(field.key)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <FI.chev
                        className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: "#6b7280" }}
                      />
                    </div>

                    <div
                      className="text-[14px] truncate"
                      style={{ color: !mapped ? "#c0c7c3" : "#374151" }}
                    >
                      {mapped ? pv || "—" : "not mapped"}
                    </div>
                  </div>
                );
              })}

              {/* footer */}
              <div
                className="border-t px-8 py-5 flex items-center justify-between flex-wrap gap-4"
                style={{ borderColor: "#f0f2f1" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: G_BG, color: G }}
                  >
                    <FI.bulb className="w-[18px] h-[18px]" />
                  </span>
                  <div className="text-[13.5px]">
                    <span className="font-bold" style={{ color: G }}>
                      Required:{" "}
                    </span>
                    <span style={{ color: TEXT_MUTED }}>
                      map at least one of <b>Email address</b>, <b>Full name</b>,{" "}
                      <b>First name</b> or <b>LinkedIn URL</b> to continue. Contacts
                      with no address can have one discovered later.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetUpload}
                    className="transition"
                    style={lessPriorityButtonStyle}
                  >
                    Back
                  </button>
                  <button
                    onClick={generatePreview}
                    disabled={!canContinueMapping}
                    className="shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ ...defaultButtonStyle, display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    Continue to review <FI.arrow className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===========================================================
            STAGE 3 — Review & confirm
            =========================================================== */}
        {currentStep === 3 && (
          <>
            <Heading
              title="Review & confirm"
              sub="Check the parsed rows, name your data file, then bring your contacts in."
            />

            <div className="mt-6">
              <Stepper current={3} />
            </div>

            <div className="mt-6 flex gap-4 flex-wrap">
              <Stat value={processingStats.total} label="Rows in file" tone="slate" />
              <Stat value={processingStats.valid} label="Ready to import" tone="green" />
              <Stat value={processingStats.invalid} label="Need attention" tone="amber" />
            </div>

            {errors.length > 0 && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-[13.5px]"
                style={{ background: "#fdecec", color: "#b42318" }}
              >
                {errors.map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              {/* preview table */}
              <div
                className="bg-white rounded-2xl border overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                style={{ borderColor: BORDER }}
              >
                <div
                  className="px-6 py-4 flex items-center justify-between border-b"
                  style={{ borderColor: "#f0f2f1" }}
                >
                  <div className="text-[14px] font-bold text-[#111827]">
                    Data preview{" "}
                    <span className="font-normal" style={{ color: TEXT_MUTED }}>
                      · first {previewData.length} row{previewData.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="text-[11.5px] font-bold uppercase tracking-wide"
                        style={{ color: "#9aa3a0" }}
                      >
                        {["", "Name", "Email", "Company", "Job title", "Website"].map(
                          (h, i) => (
                            <th
                              key={i}
                              className="px-4 py-3 whitespace-nowrap"
                              style={{ background: "#fafbfb" }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((r, i) => {
                        // A blank address is fine now; only a malformed one is not.
                        const ok = !r.email || isValidEmail(r.email);
                        return (
                          <tr
                            key={i}
                            className="text-[13.5px] border-t"
                            style={{ borderColor: "#f0f2f1" }}
                          >
                            <td className="px-4 py-3.5">
                              {ok ? (
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ background: G_BG, color: G }}
                                >
                                  <FI.check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ background: "#fdf1dc", color: "#c07a11" }}
                                >
                                  <FI.info className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#111827] whitespace-nowrap">
                              {r.name || "—"}
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap"
                              style={{
                                color: ok ? "#374151" : "#c07a11",
                                fontWeight: ok ? 400 : 600,
                              }}
                            >
                              {r.email || "—"}
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap"
                              style={{ color: "#374151" }}
                            >
                              {r.company || "—"}
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap"
                              style={{ color: "#374151" }}
                            >
                              {r.job_title || "—"}
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap font-medium"
                              style={{ color: G }}
                            >
                              {r.company_website || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {validationErrors.length > 0 && (
                  <div
                    className="px-6 py-3.5 border-t text-[12.5px] flex items-center justify-between gap-3 flex-wrap"
                    style={{ borderColor: "#f0f2f1", color: "#c07a11", background: "#fffaf0" }}
                  >
                    <span className="flex items-center gap-2">
                      <FI.info className="w-4 h-4" /> {validationErrors.length} row
                      {validationErrors.length > 1 ? "s" : ""} will be skipped: the
                      address is malformed, or there is no name, email or LinkedIn URL
                      to identify the person by.
                    </span>
                    <button
                      onClick={() => setShowValidationModal(true)}
                      className="font-semibold underline"
                    >
                      View details
                    </button>
                  </div>
                )}
              </div>

              {/* data file details */}
              <div
                className="rounded-2xl bg-white border p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                style={{ borderColor: BORDER }}
              >
                <div className="text-[14px] font-bold text-[#111827]">Data file details</div>
                <div className="mt-4">
                  <label className="text-[12.5px] font-semibold text-[#374151]">
                    Data file name <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <input
                    value={dataFileInfo.name}
                    onChange={(e) =>
                      setDataFileInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. Q3 outbound list"
                    className="mt-1.5 w-full h-11 px-3.5 text-[14px] rounded-xl border bg-white outline-none focus:border-[#3f9f42] transition"
                    style={{ borderColor: "#cfd8d4" }}
                  />
                </div>
                <div className="mt-4">
                  <label className="text-[12.5px] font-semibold text-[#374151]">
                    Description
                  </label>
                  <textarea
                    value={dataFileInfo.description}
                    onChange={(e) =>
                      setDataFileInfo((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Optional notes about this list"
                    className="mt-1.5 w-full px-3.5 py-2.5 text-[14px] rounded-xl border bg-white outline-none focus:border-[#3f9f42] transition resize-none"
                    style={{ borderColor: "#cfd8d4" }}
                  />
                </div>
                <button
                  onClick={processData}
                  disabled={
                    isProcessing || processingStats.valid === 0 || !dataFileInfo.name.trim()
                  }
                  className="mt-5 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ ...defaultButtonStyle, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <FI.check className="w-[18px] h-[18px]" />{" "}
                  {isProcessing
                    ? "Processing…"
                    : `Import ${processingStats.valid} contact${
                        processingStats.valid === 1 ? "" : "s"
                      }`}
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="mt-2.5 transition"
                  style={{ ...lessPriorityButtonStyle, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <FI.arrowL className="w-[18px] h-[18px]" /> Back to mapping
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===========================================================
            STAGE 4 — Processing / complete
            =========================================================== */}
        {currentStep === 4 && (
          <>
            <Heading
              title={uploadProgress < 100 ? "Importing your contacts" : "All done"}
              sub="Bringing your contacts into Pitchkraft."
            />

            <div className="mt-6">
              <Stepper current={3} />
            </div>

            <div
              className="mt-6 bg-white rounded-2xl border p-10 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col items-center text-center"
              style={{ borderColor: BORDER }}
            >
              {uploadProgress < 100 ? (
                <div className="w-full max-w-[460px]">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 mx-auto"
                    style={{ background: G_BG, color: G }}
                  >
                    <FI.cloud className="w-8 h-8" />
                  </div>
                  <div className="text-[17px] font-bold text-[#111827] mb-4">
                    Processing… {uploadProgress}%
                  </div>
                  <div
                    className="h-2.5 w-full rounded-full overflow-hidden"
                    style={{ background: "#eef1ef" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${uploadProgress}%`, background: G }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                    style={{ background: G_BG, color: G }}
                  >
                    <FI.check className="w-10 h-10" />
                  </div>
                  <h3 className="text-[22px] font-extrabold text-[#111827]">
                    Import complete!
                  </h3>
                  <p className="text-[14px] mt-2" style={{ color: TEXT_MUTED }}>
                    Your contacts have been successfully imported.
                  </p>
                  <div className="mt-5 flex gap-5">
                    <span className="text-[15px] font-semibold" style={{ color: G }}>
                      {processingStats.valid} imported
                    </span>
                    {processingStats.invalid > 0 && (
                      <span
                        className="text-[15px] font-semibold"
                        style={{ color: "#c07a11" }}
                      >
                        {processingStats.invalid} skipped
                      </span>
                    )}
                  </div>
                  {skippedContacts.length > 0 && (
                    <div className="mt-6 w-full max-w-4xl text-left">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="text-[14px] font-bold text-[#92400e]">
                          Contacts not imported ({skippedContacts.length})
                        </h4>
                        <span className="text-[12px] text-[#6b7280]">
                          Duplicate email addresses are not imported.
                        </span>
                      </div>
                      <div className="max-h-64 overflow-auto rounded-xl border border-[#f3d6a2] bg-white">
                        <table className="w-full border-collapse text-[13px]">
                          <thead className="sticky top-0 bg-[#fff8eb] text-[#78350f]">
                            <tr>
                              <th className="border-b border-[#f3d6a2] px-4 py-3 text-left">Row</th>
                              <th className="border-b border-[#f3d6a2] px-4 py-3 text-left">Contact</th>
                              <th className="border-b border-[#f3d6a2] px-4 py-3 text-left">Email</th>
                              <th className="border-b border-[#f3d6a2] px-4 py-3 text-left">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skippedContacts.map((contact, index) => (
                              <tr key={`${contact.rowNumber}-${contact.email || index}`} className="border-b border-[#f5ead6] last:border-b-0">
                                <td className="px-4 py-3 text-[#6b7280]">{contact.rowNumber || "—"}</td>
                                <td className="px-4 py-3 font-medium text-[#111827]">{contact.fullName || "—"}</td>
                                <td className="px-4 py-3 text-[#374151]">{contact.email || "—"}</td>
                                <td className="px-4 py-3 text-[#b45309]">{contact.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <div className="mt-7 flex items-center gap-3 flex-wrap justify-center">
                    <button
                      onClick={resetUpload}
                      className="transition"
                      style={lessPriorityButtonStyle}
                    >
                      Upload another file
                    </button>
                    <button
                      onClick={() => {
                        resetUpload();
                        onBack?.();
                      }}
                      className="shadow-sm transition"
                      style={{ ...defaultButtonStyle, display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      Done <FI.arrow className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ---- toasts ---- */}
      <style>{toastAnimation}</style>

      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#E6F4EF",
            color: "#2F3A34",
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#1F9D74",
              animation: "toastProgress 3s linear forwards",
            }}
          />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#1F9D74",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {"✓"}
          </div>
          <div style={{ flex: 1 }}>{toastMessage}</div>
          <div
            onClick={() => setShowSuccessToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#6B7280",
              lineHeight: 1,
            }}
          >
            {"×"}
          </div>
        </div>
      )}

      {showErrorToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FDECEC",
            color: "#2F3A34",
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#DC2626",
              animation: "toastProgress 3s linear forwards",
            }}
          />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#DC2626",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            !
          </div>
          <div style={{ flex: 1 }}>{toastMessage}</div>
          <div
            onClick={() => setShowErrorToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#9CA3AF",
              lineHeight: 1,
            }}
          >
            {"×"}
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      <ValidationErrorModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        errors={validationErrors}
        onContinue={() => {
          setShowValidationModal(false);
          setCurrentStep(3);
        }}
        onFixErrors={() => {
          setShowValidationModal(false);
          setCurrentStep(2);
        }}
      />
    </div>
  );
};

export default DataFile;
