import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  pageSize: number;
  filteredDataLength: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  startIndex,
  pageSize,
  filteredDataLength,
  setCurrentPage,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: "12px",
        marginTop: "12px",
        gap: "10px",
      }}
    >
      <div style={{ marginRight: "auto" }}>
        Showing {startIndex + 1} to{" "}
        {Math.min(startIndex + pageSize, filteredDataLength)} of{" "}
        {filteredDataLength} items
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
          style={{
            padding: "5px 10px",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          &lt; Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
          style={{
            padding: "5px 10px",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
