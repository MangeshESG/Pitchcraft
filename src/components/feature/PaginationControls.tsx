import React from "react";
import singleprvIcon from "../../assets/images/SinglePrv.png";
import previousIcon from "../../assets/images/previous.png";
import singlenextIcon from "../../assets/images/SingleNext.png";
import nextIcon from "../../assets/images/Next.png";

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

  //setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  setCurrentPage,
  setPageSize,
  showPageSizeDropdown,
  pageLabel,
}) => {
  const isAll = pageSize === "All";
  const effectiveTotalPages = isAll ? 1 : totalPages;
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < effectiveTotalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= effectiveTotalPages) setCurrentPage(page);
  };
   const startRecord = totalRecords === 0 ? 0 :isAll?1: (currentPage - 1) * pageSize + 1
  const endRecord = totalRecords === 0
  ? 0
  : isAll
  ? totalRecords
  : Math.min(currentPage * pageSize, totalRecords);

  return (
    <div
      className="d-flex justify-between align-center"
      style={{
        // marginTop: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div className="pagination-info" style={{ marginTop: "27px",marginRight:"20px" }}>
        Showing {startRecord} to {endRecord} of {totalRecords} items
      </div>

      {/* <div
        className="pagination-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      > */}
      <div className="d-flex align-items-center gap mt-[26px] gap-3">
        {/* Navigation buttons */}
        <div className="d-flex align-items-center gap-1">

          {/* FIRST PAGE BUTTON */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1|| isAll}
            title="Click to go to the first page"
            className="secondary-button h-[35px] w-[38px] !px-[5px] !py-[10px] flex justify-center items-center"
          >
            <img
              src={previousIcon}
              alt="First"
              style={{ width: "20px", height: "20px", objectFit: "contain" }}
            />
          </button>

          {/* PREVIOUS PAGE BUTTON */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isAll}
            className="secondary-button flex justify-center items-center !px-[10px] h-[35px]"
            title="Click to go to the previous page"
          >
            <img
              src={singleprvIcon}
              alt="Previous"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
                marginRight: "2px",
                marginLeft: "-7px",
              }}
            />
            <span>Prev</span>
          </button>

          {/* NEXT PAGE BUTTON */}
          <button
            className="secondary-button !h-[35px] !py-[10px] !px-[10px] flex justify-center items-center"
            disabled={currentPage >= effectiveTotalPages || isAll}
            onClick={handleNextPage}
            title="Click to go to the next page"
          >
            <span>Next</span>
            <img
              src={singlenextIcon}
              alt="Next"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
                marginLeft: "2px",
                marginRight: "-7px",
              }}
            />
          </button>
       
          {/* LAST PAGE BUTTON */}
          <button
            onClick={() => handlePageChange(effectiveTotalPages)}
            disabled={currentPage >= effectiveTotalPages||isAll}
            className="secondary-button h-[35px] w-[38px] !px-[5px] !py-[10px] flex justify-center items-center"
            title="Click to go to the last page"
          >
            <img
              src={nextIcon}
              alt="Last"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
                marginLeft: "2px",
              }}
            />
          </button>
        </div>
        {showPageSizeDropdown && (
           <select
  value={pageSize}
  onChange={(e) => {
    const value  = e.target.value;
    setPageSize(value === "All" ? "All" : Number(value));
    setCurrentPage(1); // reset to first page
  }}
  className="form-control ml-2 h-[35px]"
  style={{ width: "80px", padding: "5px",border:"1px solid #ddd" }}
>
  {[10, 20, 30, 40, 50,100,200,"All"].map((size) => (
    <option key={size} value={size}>
      {size}
    </option>
  ))}
</select>
        )}
        {/* Page Input Field */}
        <div className="d-flex align-items-center font-size-medium h-[35px]">
          <strong className="flex items-center">{pageLabel ?? "Page:"}</strong>

          <input
            type="number"
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) handlePageChange(page);
            }}
            className="form-control text-center !mx-2"
            style={{
              width: "70px",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />

          <span className="flex items-center">of {totalPages}</span>
        </div>
      </div>

    </div>
  );
};

export default PaginationControls;
