import React from "react";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import previousIcon from "../../assets/images/previous.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import nextIcon from "../../assets/images/Next.png";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  setCurrentPage,
}) => {
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div
      className="d-flex justify-between align-center"
      style={{
        marginTop: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div className="pagination-info">
        Showing {(currentPage - 1) * pageSize + 1} to{" "}
        {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} items
      </div>

      <div
        className="pagination-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {/* Left controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(1)}
            title="First page"
          >
            <img
              src={previousIcon}
              alt="First"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={handlePrevPage}
            title="Previous page"
            style={{ display: "flex", alignItems: "center", gap: "3px" }}
          >
            <img
              src={singleprvIcon}
              alt="Prev"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
            <span>Prev</span>
          </button>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={handleNextPage}
            title="Next page"
            style={{ display: "flex", alignItems: "center", gap: "3px" }}
          >
            <span>Next</span>
            <img
              src={singlenextIcon}
              alt="Next"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(totalPages)}
            title="Last page"
          >
            <img
              src={nextIcon}
              alt="Last"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          </button>
        </div>

        {/* Page display */}
        <span
          style={{
            marginLeft: "16px",
            fontSize: "14px",
            color: "#000",
            fontWeight: "600",
          }}
        >
          Contact:
        </span>
        <input
          type="number"
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= totalPages) handlePageChange(page);
          }}
          style={{
            width: "45px",
            padding: "4px 6px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            textAlign: "center",
            fontSize: "14px",
            color: "#000000",
            fontWeight: "400",
          }}
        />
        <span style={{ fontSize: "14px", color: "#000", fontWeight: "600" }}>
          of {totalPages}
        </span>
      </div>
    </div>
  );
};

export default PaginationControls;
