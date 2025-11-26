import React, { useState, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Tooltip as ReactTooltip } from "react-tooltip";
import Modal from "../common/Modal";
import ValidationErrorModal from "../common/ValidationErrorModal";
import "./datafile.css";
import API_BASE_URL from "../../config";
import { useAppData } from "../../contexts/AppDataContext";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
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
  company_event_link?: string;
}

const REQUIRED_FIELDS = [
  { key: "name", label: "Full name (First name and Surname)", required: true },
  { key: "email", label: "Email address", required: true },
  { key: "job_title", label: <>Job title <span style={{ color: "blue" }}>*</span></>, required: false },
  { key: "company", label: <>Company <span style={{ color: "blue" }}>*</span></>, required: false },
  { key: "location", label: <>Location <span style={{ color: "blue" }}>*</span></>, required: false },
  { key: "linkedin", label: "LinkedIn URL", required: false },
  { key: "company_website", label: <>Company Website <span style={{ color: "blue" }}>*</span></>, required: false },
  { key: "email_body", label: "Email body", required: false },
  { key: "email_subject", label: "Email subject", required: false },
  { key: "company_telephone", label: "Company telephone", required: false },
  {
    key: "company_employee_count",
    label: "Company employee count",
    required: false,
  },
  { key: "company_industry", label: <>Company Industry <span style={{ color: "blue" }}>*</span></>, required: false },
  {
    key: "company_linkedin_url",
    label: "Company LinkedIn URL",
    required: false,
  },
  { key: "company_event_link", label: "Company event link", required: false },
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
  });
  const [isDragActive, setIsDragActive] = useState(false);

  const [showDataFileModal, setShowDataFileModal] = useState(false);
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

  // Auto-detect column mappings
  const autoDetectColumns = (headers: string[]) => {
    const mappings: ColumnMapping = {};
    const columnPatterns: { [key: string]: string[] } = {
      name: [
        "name",
        "full name",
        "fullname",
        "contact name",
        "person",
        "firstname lastname",
      ],
      email: ["email", "email address", "e-mail", "mail", "email id"],
      job_title: [
        "job title",
        "title",
        "position",
        "role",
        "designation",
        "job role",
      ],
      company: [
        "company",
        "company name",
        "organization",
        "org",
        "employer",
        "firm",
      ],
      location: ["location", "address", "city", "country", "place", "region"],
      linkedin: [
        "linkedin",
        "linkedin url",
        "linkedin profile",
        "profile url",
        "linkedin link",
      ],
      company_website: [
        "company website",
        "website",
        "company url",
        "company link",
        "web address",
      ],
      email_body: [
        "email body",
        "message body",
        "email content",
        "message content",
      ],
      email_subject: [
        "email subject",
        "subject",
        "message subject",
        "email title",
      ],
      company_telephone: [
        "company telephone",
        "company phone",
        "telephone",
        "phone",
        "contact number",
        "company contact",
      ],
      company_employee_count: [
        "company employee count",
        "employee count",
        "employees",
        "company size",
        "headcount",
        "staff count",
      ],
      company_industry: [
        "company industry",
        "industry",
        "sector",
        "business type",
        "industry type",
      ],
      company_linkedin_url: [
        "company linkedin url",
        "company linkedin",
        "business linkedin",
        "organization linkedin",
      ],
      company_event_link: [
        "company event link",
        "event link",
        "event url",
        "conference link",
        "meeting link",
      ],
    };

    REQUIRED_FIELDS.forEach((field) => {
      const patterns = columnPatterns[field.key] || [];
      const matchedHeader = headers.find((header) =>
        patterns.some((pattern) => header.toLowerCase().includes(pattern))
      );
      if (matchedHeader) {
        mappings[field.key] = matchedHeader;
      }
    });

    setColumnMappings(mappings);
  };

const reduxUserId = useSelector((state: RootState) => state.auth.userId);
const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;
console.log("API Payload Client ID:", effectiveUserId);

useEffect(() => {
  console.log("User ID from Redux:", reduxUserId);
  console.log("Effective User ID:", effectiveUserId);
}, [reduxUserId, effectiveUserId]);

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
          const headers = (jsonData[0] as string[]).map(
            (h) => h?.toString().trim() || ""
          );
          const rows = jsonData
            .slice(1)
            .filter((row) => (row as any[]).some((cell) => cell));

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
    const preview: ProcessedContact[] = [];
    const detailedErrors: Array<{row: number, field: string, value: string, message: string}> = [];
    let validCount = 0;
    let invalidCount = 0;

    const totalRows = excelData.length;

    excelData.forEach((row, rowIndex) => {
      const mappedRow: any = {};
      let isValid = true;

      Object.entries(columnMappings).forEach(([field, column]) => {
        const columnIndex = columnHeaders.indexOf(column);
        if (columnIndex !== -1) {
          mappedRow[field] = row[columnIndex]?.toString().trim() || "";
        }
      });

      // Validate required fields
      if (!mappedRow.name) {
        detailedErrors.push({
          row: rowIndex + 2,
          field: 'name',
          value: mappedRow.name || '',
          message: 'Missing required field: Full name'
        });
        isValid = false;
      }
      
      if (!mappedRow.email) {
        detailedErrors.push({
          row: rowIndex + 2,
          field: 'email',
          value: mappedRow.email || '',
          message: 'Missing required field: Email address'
        });
        isValid = false;
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
      } else {
        invalidCount++;
      }

      if (rowIndex < 5) {
        preview.push(mappedRow);
      }
    });

    setValidationErrors(detailedErrors);
    setPreviewData(preview);
    setProcessingStats({
      total: totalRows,
      valid: validCount,
      invalid: invalidCount,
    });
    setValidatedData(allValidData);
    
    // Show validation modal if there are errors, otherwise proceed to step 3
    if (detailedErrors.length > 0) {
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

    setShowDataFileModal(false);
    setCurrentStep(4);
    setUploadProgress(0);
   // const clientId = sessionStorage.getItem("clientId"); 

    try {
      const apiPayload = {
       // clientId: clientId,
        clientId: Number(effectiveUserId),
        name: dataFileInfo.name,
        dataFileName: uploadedFile?.name || "",
        description: dataFileInfo.description,
        contacts: validatedData.map((contact) => ({
          fullName: contact.name,
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
          companyEventLink: contact.company_event_link || "",
        })),
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
        throw new Error(errorData.error || "Failed to upload contacts");
      }

      triggerRefresh();

      const result = await response.json();

      setUploadProgress(100);

      setProcessingStats({
        total: excelData.length,
        valid: result.contactCount || validatedData.length,
        invalid:
          excelData.length - (result.contactCount || validatedData.length),
      });

      onDataProcessed(validatedData);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error processing data:", error);
      setErrors([
        error instanceof Error
          ? error.message
          : "Failed to save data. Please try again.",
      ]);
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
        "Email Body",
        "Email Subject",
        "Company Telephone",
        "Company Employee Count",
        "Company Industry",
        "Company LinkedIn URL",
        "Company Event Link",
      ],
      [
        "John Doe",
        "john.doe@example.com",
        "Software Engineer",
        "Tech Corp",
        "San Francisco, CA",
        "https://linkedin.com/in/johndoe",
        "https://techcorp.com",
        "Hello, this is a sample email body.",
        "Sample Email Subject",
        "+1-555-123-4567",
        "100-500",
        "Technology",
        "https://linkedin.com/company/techcorp",
        "https://techcorp.com/events/annual-conference",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "contact_template.xlsx");
  };
  const handleButtonClick = () => {
    debugger
  console.log("Button clicked!");
  setShowDataFileModal(true);
   console.log("showDataFileModal after click:", showDataFileModal);
   
};
console.log("isProcessing:", isProcessing);
console.log("processingStats.valid:", processingStats.valid);
  return (
    <div className="full-width d-flex">
      <div className="input-section edit-section w-[100%]">
        <div className="col-12">
          {onBack && (
            <div className="mb-20">
              <button className="button secondary" onClick={onBack}>
                ← Back to contacts
              </button>
            </div>
          )}
          <h3 className="section-title mb-20">Contacts data file upload</h3>

          {/* Progress Steps */}
          <div className="upload-steps d-flex justify-between mb-30">
            <div className={`step-item ${currentStep >= 1 ? "active" : ""}`}>
              <div className="step-number">1</div>
              <div className="step-label">Upload file</div>
            </div>
            <div
              className={`step-connector ${currentStep >= 2 ? "active" : ""}`}
            ></div>
            <div className={`step-item ${currentStep >= 2 ? "active" : ""}`}>
              <div className="step-number">2</div>
              <div className="step-label">Map columns</div>
            </div>
            <div
              className={`step-connector ${currentStep >= 3 ? "active" : ""}`}
            ></div>
            <div className={`step-item ${currentStep >= 3 ? "active" : ""}`}>
              <div className="step-number">3</div>
              <div className="step-label">Preview & continue</div>
            </div>
            <div
              className={`step-connector ${currentStep >= 4 ? "active" : ""}`}
            ></div>
            <div className={`step-item ${currentStep >= 4 ? "active" : ""}`}>
              <div className="step-number">4</div>
              <div className="step-label">Process data</div>
            </div>
          </div>

          {/* Step 1: Upload File */}
          {currentStep === 1 && (
            <div className="upload-section">
              <div className="d-flex justify-between items-center mb-10">
                <h4 className="!mb-0">Upload your contacts data file</h4>
                <button
                  className="button secondary small flex items-center"
                  onClick={downloadTemplate}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mr-5"
                  >
                    <path
                      d="M12 15L12 3M12 15L8 11M12 15L16 11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Download template
                </button>
              </div>

              <div
                className={`dropzone justify-center text-center flex flex-col items-center ${
                  isDragActive ? "active" : ""
                }`}
                onDragEnter={handleDragIn}
                onDragLeave={handleDragOut}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 10L12 15L17 10"
                    stroke="#666"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 15V3"
                    stroke="#666"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17"
                    stroke="#666"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-20 mb-10">
                  {isDragActive
                    ? "Drop the file here..."
                    : "Drag & drop your contacts data file here, or click to select"}
                </p>
                <small className="text-muted">
                  Supports: .xlsx, .xls, .csv (Max size: 10MB)
                </small>
              </div>

              {uploadedFile && (
                <div className="file-info mt-20">
                  <p className="d-flex align-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mr-10"
                    >
                      <path
                        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 2V8H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{uploadedFile.name}</span>
                    <span className="ml-10 text-muted">
                      ({(uploadedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="alert alert-error mt-20">
                  {errors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Map Columns */}
          {currentStep === 2 && (
            <div className="mapping-section mt-20">
              <h4
                className="mt-[20px] sub-title"
                style={{ marginBottom: "5px" }}
              >
                Map your contacts data file columns
              </h4>
              <p className="text-muted mb-20">
                Please map your contacts data file to the required fields below.<br />
                Mandatory fields are marked with a red asterisk (<span style={{color: 'red'}}>*</span>). 
                For best results, also include those fields with a blue asterisk (<span style={{color: 'blue'}}>*</span>).
              </p>

              <div className="mapping-container">
                {REQUIRED_FIELDS.map((field) => {
                  // Define helper text for each field
                  const getFieldDescription = (fieldKey: string) => {
                    switch (fieldKey) {
                      case 'name':
                        return 'Required – mapping the full name lets you address each recipient personally in your messages.';
                      case 'email':
                        return 'Required – mapping the email address is necessary for sending messages to each recipient.';
                      case 'company':
                        return 'Optional: mapping the company name lets you personalise messages and refer to each recipient\'s organisation.';
                      case 'company_website':
                        return 'Optional – mapping the company website lets you link directly to each organisation\'s site or include it in personalised emails.';
                      case 'location':
                        return 'Optional – mapping the location lets you tailor messages by region and reference each recipient\'s area.';
                      case 'email_body':
                        return 'Optional – map if you keep notes such as last contact details and want them handy when personalising future messages.';
                      case 'linkedin':
                        return 'Optional – mapping the LinkedIn profile lets you add personal touches or include a direct profile link in your message.';
                      case 'email_subject':
                        return 'Optional – map if you store custom subject lines and wish to reuse them when sending follow-up emails.';
                      case 'job_title':
                        return 'Optional – mapping the job title lets you personalise your message by referencing the recipient\'s role and responsibilities.';
                      case 'company_industry':
                        return 'Optional – mapping the industry helps you tailor your messaging to the recipient\'s business sector and add relevant context.';
                      case 'company_event_link':
                        return 'Optional – mapping the company event link lets you reference or share their events directly in personalised messages.';
                      case 'company_linkedin_url':
                        return 'Optional – mapping the company\'s LinkedIn page helps you add relevant context or include a direct link to their organisation profile.';
                      case 'company_employee_count':
                        return 'Optional – mapping the employee count helps you tailor messaging based on the organisation\'s size and structure.';
                      case 'company_telephone':
                        return 'Optional – mapping the company telephone number lets you include direct contact details when needed in personalised outreach.';
                      default:
                        return null;
                    }
                  };

                  const description = getFieldDescription(field.key);

                  return (
                    <div key={field.key} className="form-group">
                      <label>
                        {field.label}
                        {field.required && <span className="required"> *</span>}
                      </label>
                      <select
                        value={columnMappings[field.key] || ""}
                        onChange={(e) =>
                          handleMappingChange(field.key, e.target.value)
                        }
                        className={`${
                          field.required && !columnMappings[field.key]
                            ? "highlight-required"
                            : ""
                        }`}
                      >
                        <option value="">--Do not include--</option>
                        {columnHeaders.map((header, index) => (
                          <option key={index} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      {description && (
                        <p style={{
                          fontSize: '13px',
                          color: '#666',
                          marginTop: '4px',
                          marginBottom: '0',
                          lineHeight: '1.4'
                        }}>
                          {description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className="
              flex justify-end gap-2"
              >
                <button onClick={resetUpload} className="button secondary">
                  Back
                </button>
                <button
                  onClick={generatePreview}
                  className="button action-button"
                  disabled={!columnMappings.name || !columnMappings.email}
                >
                  Continue to Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === 3 && (
            <div className="preview-section">
              <div className="d-flex justify-between align-center mb-20">
                <h4 style={{ marginBottom: 0 }}>Preview Your Data</h4>
                <div className="stats-info">
                  <span className="badge badge-info">
                    Total: {processingStats.total}
                  </span>
                  <span className="badge badge-success ml-10">
                    Valid: {processingStats.valid}
                  </span>
                  {processingStats.invalid > 0 && (
                    <span className="badge badge-error ml-10">
                      Invalid: {processingStats.invalid}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-muted mb-20">
                Please review the first 5 rows of your mapped data:
              </p>

              <div className="table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Job title</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>LinkedIn</th>
                      <th>Website</th>
                      <th>Phone</th>
                      <th>Industry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        <td>{row.name || "-"}</td>
                        <td>{row.email || "-"}</td>
                        <td>{row.job_title || "-"}</td>
                        <td>{row.company || "-"}</td>
                        <td>{row.location || "-"}</td>
                        <td>{row.linkedin || "-"}</td>
                        <td>{row.company_website || "-"}</td>
                        <td>{row.company_telephone || "-"}</td>
                        <td>{row.company_industry || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validationErrors.length > 0 && (
                <div className="alert alert-warning mt-20">
                  <h5>Data Quality Summary:</h5>
                  <p>{validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} found in your data. 
                     Only valid rows will be processed during import.</p>
                  <button 
                    onClick={() => setShowValidationModal(true)}
                    style={{
                      background: '#ffc107',
                      color: '#000',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginTop: '8px'
                    }}
                  >
                    View Details
                  </button>
                </div>
              )}

              <div className="button-group mt-30">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="button secondary"
                >
                  Back to Mapping
                </button>
                <button
                  //onClick={() => {console.log("Process & Save Data button clicked!");setShowDataFileModal(true)}}
                  onClick={handleButtonClick}
                  className="button action-button"
                  disabled={isProcessing || processingStats.valid === 0}
                >
                  {isProcessing ? "Processing..." : "Process & Save Data"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="complete-section text-center">
              {uploadProgress < 100 ? (
                <>
                  <div className="progress-container mb-20">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="mt-10">Processing... {uploadProgress}%</p>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    className="success-icon mb-20"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="#4CAF50"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#4CAF50"
                      strokeWidth="2"
                    />
                  </svg>
                  <h3 className="mb-10">Upload Complete!</h3>
                  <p className="text-muted mb-10">
                    Your contacts have been successfully imported.
                  </p>
                  <div className="stats-summary mb-30">
                    <p className="text-large">
                      {processingStats.valid} records processed successfully
                    </p>
                    {processingStats.invalid > 0 && (
                      <p className="text-error">
                        {processingStats.invalid} records skipped due to errors
                      </p>
                    )}
                  </div>
                  <div className="button-group">
                    <button onClick={resetUpload} className="button secondary">
                      Upload Another File
                    </button>
                    <button
                      className="button action-button"
                      onClick={() => {
                        // Navigate to email generation or close the upload section
                        resetUpload();
                      }}
                    >
                      Continue to Email Generation
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        show={showSuccessModal}
        closeModal={() => setShowSuccessModal(false)}
        buttonLabel="Close"
        size="auto-width"
      >
        <div className="text-center">
          <svg
            className="success-icon mb-20"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="#4CAF50"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2" />
          </svg>
          <h3>Success!</h3>
          <p className="mt-10">Contacts have been imported successfully.</p>
          <p className="text-large mt-10">
            {processingStats.valid} contacts added
          </p>
        </div>
      </Modal>

      {/* Data File Info Modal */}
      <Modal
        show={showDataFileModal}
        closeModal={() => setShowDataFileModal(false)}
        buttonLabel=""
        size="auto-width"
      >
        <div className="datafile-modal" >
          <h3>Enter Data File Information</h3>
          <div className="form-group">
            <label>
              Data File Name <span className="required">*</span>
            </label>
            <input
              type="text"
              value={dataFileInfo.name}
              onChange={(e) =>
                setDataFileInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter data file name"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={dataFileInfo.description}
              onChange={(e) =>
                setDataFileInfo((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter description (optional)"
              rows={4}
            />
          </div>
          <div className="button-group">
            <button
              className="button secondary"
              onClick={() => setShowDataFileModal(false)}
            >
              Cancel
            </button>
            <button
              className="button action-button"
              onClick={processData}
              disabled={!dataFileInfo.name.trim()}
            >
              Save Data
            </button>
          </div>
        </div>
      </Modal>

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
