import React from "react";
import "./PaginationControls.css";

type PageSize = number | "All";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: PageSize;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  showPageSizeDropdown?: boolean;
  pageLabel?: string;

  /** 'compact' renders a minimal < 1/25 > pill — useful in tight toolbars */
  variant?: "full" | "compact";
  /** Hide the "Showing X to Y of Z items" line when the count is shown elsewhere */
  showInfo?: boolean;
  pageSizeOptions?: Array<number | "All">;
}

const DEFAULT_PAGE_SIZES: Array<number | "All"> = [10, 20, 30, 40, 50, 100, 200, "All"];

const Icon = {
  chevsL: () => (
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m11 6-6 6 6 6M18 6l-6 6 6 6" />
    </svg>
  ),
  chevsR: () => (
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6M6 6l6 6-6 6" />
    </svg>
  ),
  chevL: () => (
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
    </svg>
  ),
  chevR: () => (
    <svg viewBox="0 0 24 24" width="14" height="14">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  ),
  chevDown: () => (
    <svg viewBox="0 0 24 24" width="12" height="12">
      <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  ),
};

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  setCurrentPage,
  setPageSize,
  showPageSizeDropdown = true,
  pageLabel = "Page:",
  variant = "full",
  showInfo = true,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}) => {
  const isAll = pageSize === "All";
  const effectiveTotalPages = isAll ? 1 : totalPages;

  const goTo = (p: number) => {
    if (p >= 1 && p <= effectiveTotalPages) setCurrentPage(p);
  };

  const prevDisabled = currentPage === 1 || isAll;
  const nextDisabled = currentPage >= effectiveTotalPages || isAll;

  const startRecord =
    totalRecords === 0 ? 0 : isAll ? 1 : (currentPage - 1) * (pageSize as number) + 1;
  const endRecord =
    totalRecords === 0
      ? 0
      : isAll
      ? totalRecords
      : Math.min(currentPage * (pageSize as number), totalRecords);

  if (variant === "compact") {
    return (
      <div className="pc-compact">
        <div className="pc-nav-pill">
          <button onClick={() => goTo(currentPage - 1)} disabled={prevDisabled} title="Previous">
            <Icon.chevL />
          </button>
          <div className="pc-nav-page">
            {currentPage} <span className="pc-nav-page__slash">/</span> {Math.max(effectiveTotalPages, 1)}
          </div>
          <button onClick={() => goTo(currentPage + 1)} disabled={nextDisabled} title="Next">
            <Icon.chevR />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-wrap">
      {showInfo ? (
        <div className="pc-info">
          {totalRecords === 0 ? (
            <span className="pc-info__muted">No items</span>
          ) : (
            <>
              Showing <strong>{startRecord.toLocaleString()}</strong>
              {" to "}
              <strong>{endRecord.toLocaleString()}</strong>
              {" of "}
              <strong>{totalRecords.toLocaleString()}</strong> items
            </>
          )}
        </div>
      ) : (
        <div />
      )}

      <div className="pc-right">
        {/* Navigation pill */}
        <div className="pc-nav-pill">
          <button onClick={() => goTo(1)} disabled={prevDisabled} title="First page" className="pc-icon-only">
            <Icon.chevsL />
          </button>
          <button onClick={() => goTo(currentPage - 1)} disabled={prevDisabled} title="Previous page" className="pc-icon-only">
            <Icon.chevL />
          </button>
          <div className="pc-nav-page">
            {currentPage} <span className="pc-nav-page__slash">/</span> {Math.max(effectiveTotalPages, 1)}
          </div>
          <button onClick={() => goTo(currentPage + 1)} disabled={nextDisabled} title="Next page" className="pc-icon-only">
            <Icon.chevR />
          </button>
          <button onClick={() => goTo(effectiveTotalPages)} disabled={nextDisabled} title="Last page" className="pc-icon-only">
            <Icon.chevsR />
          </button>
        </div>

        {/* Page size */}
        {showPageSizeDropdown && (
          <div className="pc-select">
            <select
              value={pageSize as any}
              onChange={(e) => {
                const v = e.target.value;
                setPageSize(v === "All" ? "All" : Number(v));
                setCurrentPage(1);
              }}
            >
              {pageSizeOptions.map((s) => (
                <option key={String(s)} value={s as any}>
                  {s} / page
                </option>
              ))}
            </select>
            <span className="pc-select__caret">
              <Icon.chevDown />
            </span>
          </div>
        )}

        {/* Page jump */}
        <div className="pc-jump">
          <span className="pc-jump__label">{pageLabel}</span>
          <input
            type="number"
            min={1}
            max={effectiveTotalPages}
            value={currentPage}
            onChange={(e) => {
              const p = parseInt(e.target.value, 10);
              if (!Number.isNaN(p) && p >= 1 && p <= effectiveTotalPages) setCurrentPage(p);
            }}
            disabled={isAll}
          />
          <span className="pc-jump__of">of {Math.max(effectiveTotalPages, 1)}</span>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
