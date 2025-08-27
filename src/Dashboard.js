import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return "";
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial);
  const total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  const minutes = Math.floor(total_seconds / 60) % 60;
  const hours = Math.floor(total_seconds / 3600);
  date_info.setHours(hours);
  date_info.setMinutes(minutes);
  date_info.setSeconds(seconds);
  return date_info.toLocaleString();
}

function Dashboard({ user, accessToken, logout }) {
  const [data, setData] = useState([]);
  const [allRows, setAllRows] = useState([]); // unpaginated for export
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "ExportedData.xlsx");
  };

  // Print
  const printData = () => {
    const printWindow = window.open("", "", "width=800,height=600");
    const tableHTML = `
      <html>
      <head>
        <title>Print Data</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>Exported Data</h2>
        <table>
          <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>
            ${allRows
              .map(
                (row) =>
                  `<tr>${headers.map((h) => `<td>${row[h] || ""}</td>`).join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>`;
    printWindow.document.write(tableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Fetch and transform with server-side filtering and pagination
  const fetchExcelData = async (
    token,
    page = 1,
    perPage = 10,
    nameFilter = "",
    equipmentFilter = ""
  ) => {
    setLoading(true);
    setError("");
    setNeedsLogin(false);

    if (!token) {
      setError("No valid access token");
      setNeedsLogin(true);
      setLoading(false);
      return;
    }

    try {
      let endpoint = `https://graph.microsoft.com/v1.0/me/drive/items/33aa4076-dadd-4e4b-aa36-187a55943921/workbook/worksheets('Sheet1')/usedRange`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      let allData;
      if (!res.ok) {
        const shareUrl =
          "https://1drv.ms/x/c/664d2a3caa281035/EXZAqjPd2ktOqjYYelWUOSEBB2Qj5IeQMkacTX3XNCOOhg?e=ZtiEvd";
        const encodedUrl = btoa(shareUrl)
          .replace(/=+$/, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_");
        endpoint = `https://graph.microsoft.com/v1.0/shares/u!${encodedUrl}/driveItem/workbook/worksheets('Sheet1')/usedRange`;

        const fallbackRes = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (!fallbackRes.ok) {
          if (fallbackRes.status === 401) setNeedsLogin(true);
          throw new Error(`HTTP ${fallbackRes.status}`);
        }

        allData = await fallbackRes.json();
      } else {
        allData = await res.json();
      }

      const rawRows = allData.values?.slice(1) || [];
      const rawHeaders = allData.values?.[0] || [];

      const skipCols = ["Id", "Start time", "Email", "Name"];
      const headerMap = {
        "Completion time": "Submitted Time",
        "Name1": "Name",
      };

      const transformedHeaders = rawHeaders
        .filter((h) => !skipCols.includes(h))
        .map((h) => headerMap[h] || h);

      setHeaders(transformedHeaders);

      let transformedRows = rawRows.map((row) => {
        const rowObj = {};
        rawHeaders.forEach((h, i) => {
          if (skipCols.includes(h)) return;

          let val = row[i];
          if (h === "Completion time") val = excelDateToJSDate(val);
          rowObj[headerMap[h] || h] = val;
        });
        return rowObj;
      });

      transformedRows = transformedRows.reverse();

      // Apply filters on the server side (simulated)
      let filteredRows = transformedRows;
      if (nameFilter) {
        filteredRows = filteredRows.filter((r) =>
          r["Name"]?.toLowerCase().includes(nameFilter.toLowerCase())
        );
      }
      if (equipmentFilter) {
        filteredRows = filteredRows.filter((r) =>
          r["Equipment"]?.toLowerCase().includes(equipmentFilter.toLowerCase())
        );
      }

      // Set total count for pagination
      setTotalCount(filteredRows.length);
      
      // Apply pagination
      const start = (page - 1) * perPage;
      const end = start + perPage;
      const paginatedData = filteredRows.slice(start, end);
      
      setData(paginatedData);
      setAllRows(filteredRows); // Keep filtered data for export
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when filters, page, or entriesPerPage change
  useEffect(() => {
    fetchExcelData(accessToken, page, entriesPerPage, filterName, filterEquipment);
  }, [accessToken, page, entriesPerPage, filterName, filterEquipment]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / entriesPerPage);

  if (needsLogin)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Your Microsoft token is expired. Please log in again.</h2>
        <button onClick={logout}>Logout</button>
      </div>
    );
  if (error) return <p style={{ padding: "20px", color: "red" }}>Error: {error}</p>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.displayName || user.email}</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="filters">
        <input
          placeholder="Filter by Name"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />
        <input
          placeholder="Filter by Equipment"
          value={filterEquipment}
          onChange={(e) => setFilterEquipment(e.target.value)}
        />
        <select
          value={entriesPerPage}
          onChange={(e) => {
            setEntriesPerPage(Number(e.target.value));
            setPage(1);
          }}
        >
          <option value={5}>5 entries</option>
          <option value={10}>10 entries</option>
          <option value={20}>20 entries</option>
          <option value={50}>50 entries</option>
        </select>
      </div>

      <div className="dashboard-actions">
        <button className="action-btn" onClick={exportToExcel}>
          Export to Excel
        </button>
        <button className="action-btn" onClick={printData}>
          Print
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{ padding: "20px" }}>Loading Excel data...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>{headers.map((h, idx) => <th key={idx}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {headers.map((h, cIdx) => (
                      <td key={cIdx}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages} ({totalCount} total records)</span>
              <button 
                onClick={() => setPage((p) => p + 1)} 
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;