import React, { useEffect, useMemo, useRef, useState } from "react";

/* global XLSX */

/**
 * PEATS — GST Invoice System (Persistent + GST Dropdown + Series Format)
 *
 * ✅ Data persistence: autosaves to localStorage (auto-loads every time you open)
 * ✅ GST selector: choose CGST+SGST or IGST, then pick % from a dropdown (0, 0.1, 0.25, 3, 5, 12, 18, 28)
 * ✅ Invoice series: PINV/YYYY/MM/DD980001 (e.g. PINV/2025/08/21980001) — per-day sequence starting at 980001
 * ✅ Excel import/export (SheetJS)
 * ✅ Print-friendly A4 invoices (inline CSS)
 * ✅ Design/UX tidy (Tailwind classes)
 */

/* ------------------------------ Utils & Constants ------------------------------ */
const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
const fmtInr = (n = 0) => CURRENCY.format(Number.isFinite(n) ? n : 0);
const safeNum = (v) => (Number.isFinite(v) ? v : Number.isFinite(+v) ? +v : 0);
const idGen = () => (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString());
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (arr, key) => arr.reduce((acc, it) => acc + safeNum(it[key] ?? 0), 0);

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const GST_RATES = [0, 0.1, 0.25, 3, 5, 12, 18, 28];

const calcItem = (item) => {
  const qty = Math.max(0, safeNum(item.quantity));
  const rate = Math.max(0, safeNum(item.rate));
  const taxable = round2(qty * rate);
  const cgstAmt = round2((taxable * Math.max(0, safeNum(item.cgst))) / 100);
  const sgstAmt = round2((taxable * Math.max(0, safeNum(item.sgst))) / 100);
  const igstAmt = round2((taxable * Math.max(0, safeNum(item.igst))) / 100);
  const total = round2(taxable + cgstAmt + sgstAmt + igstAmt);
  return { taxable, cgstAmt, sgstAmt, igstAmt, total };
};

// Invoice number generator — PINV/YYYY/MM/DD980001 (per day; sequence starts at 980001)
function nextInvoiceNumberForDate(dateStr, existingInvoices = []) {
  if (!dateStr) {
    const today = new Date();
    const yyyy = String(today.getFullYear());
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `PINV/${yyyy}/${mm}/${dd}${980001}`;
  }
  const yyyy = dateStr.slice(0, 4);
  const mm = dateStr.slice(5, 7);
  const dd = dateStr.slice(8, 10);
  const prefix = `PINV/${yyyy}/${mm}/${dd}`;

  const seqs = existingInvoices
    .map((inv) => inv?.invoiceNumber)
    .filter((n) => typeof n === "string" && n.startsWith(prefix))
    .map((n) => {
      const m = n.slice(prefix.length).match(/(\d{6,})$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((x) => x !== null);

  const base = 980001;
  const next = seqs.length ? Math.max(...seqs) + 1 : base;
  return `${prefix}${next}`;
}

/* ------------------------------ Company Details ------------------------------ */
const companyDetails = {
  name: "ParthaSarthi Engineering and Training Services (PEATS)",
  phone: "7617001477, 9889031719",
  email: "Parthasarthiconsultancy@gmail.com",
  owners: "Mr. Ramkaran Yadav & Mr. Ajay Shankar Amist",
  address:
    "Tower 3, Goldfinch, Paarth Republic, Kanpur Road, Miranpur, Pinvat, Banthra, Sikandarpur, Post- Banthra Dist. - Lucknow, Pin- 226401",
};

/* ------------------------------ Icons ------------------------------ */
const Icon = ({ path, className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS = {
  dashboard: "M3 3h18M3 7h18M3 21h18M3 7v14m6-14v14m6-14v14m6-14v14",
  invoice: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  customers: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.042-2.72a3 3 0 00-4.682 2.72 9.094 9.094 0 003.741.479m7.042-2.72a3 3 0 00-4.682 2.72M12 12a3 3 0 100-6 3 3 0 000 6z",
  reports: "M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 3H20.25M3.75 3v.375c0 .621.504 1.125 1.125 1.125h14.25c.621 0 1.125-.504 1.125-1.125V3",
  add: "M12 4.5v15m7.5-7.5h-15",
  edit: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  delete: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  print: "M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 18.25M10 3.75v9.75m-10-8.25h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75A1.5 1.5 0 012.25 16.5v-12a1.5 1.5 0 011.5-1.5H10V3.75z",
  download: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
  upload: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  search: "M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z",
  duplicate: "M8 7h8a2 2 0 012 2v8m-2 2H8a2 2 0 01-2-2V9m2-6h8a2 2 0 012 2v2M6 11h8",
};

/* ------------------------------ Storage Keys ------------------------------ */
const LS_KEYS = {
  invoices: "peats_invoices_v1",
  customers: "peats_customers_v1",
};

/* ------------------------------ Main App ------------------------------ */
export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [invoices, setInvoices] = useState(() => loadLS(LS_KEYS.invoices, []));
  const [customers, setCustomers] = useState(() => loadLS(LS_KEYS.customers, []));
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);

  // Load SheetJS at runtime
  useEffect(() => {
    if (window.XLSX) return;
    const script = document.createElement("script");
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setXlsxReady(true);
    script.onerror = () => console.error("Failed to load XLSX library");
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  // Persist to localStorage
  useEffect(() => saveLS(LS_KEYS.invoices, invoices), [invoices]);
  useEffect(() => saveLS(LS_KEYS.customers, customers), [customers]);

  const handleSetView = (view) => {
    setEditingInvoice(null);
    setEditingCustomer(null);
    setCurrentView(view);
  };

  const saveData = (type, data) => {
    const id = data.id || idGen();
    const finalData = { ...data, id };

    if (type === "invoice") {
      setInvoices((prev) => {
        const exists = prev.some((i) => i.id === id);
        return exists ? prev.map((i) => (i.id === id ? finalData : i)) : [...prev, finalData];
      });
    }
    if (type === "customer") {
      setCustomers((prev) => {
        const exists = prev.some((c) => c.id === id);
        return exists ? prev.map((c) => (c.id === id ? finalData : c)) : [...prev, finalData];
      });
    }
  };

  const deleteData = (type, id) => {
    if (type === "invoice") setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (type === "customer") setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const duplicateInvoice = (invoice) => {
    const copy = { ...invoice, id: null, invoiceNumber: `${invoice.invoiceNumber}-COPY` };
    setEditingInvoice(copy);
    setCurrentView("invoiceForm");
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <DashboardView
            invoices={invoices}
            customers={customers}
            setInvoices={setInvoices}
            setCustomers={setCustomers}
            xlsxReady={xlsxReady}
          />
        );
      case "invoices":
        return (
          <InvoiceListView
            invoices={invoices}
            onEdit={(inv) => {
              setEditingInvoice(inv);
              setCurrentView("invoiceForm");
            }}
            onDelete={deleteData}
            onDuplicate={duplicateInvoice}
          />
        );
      case "invoiceForm":
        return (
          <InvoiceForm
            customers={customers}
            allInvoices={invoices}
            onSave={(data) => {
              saveData("invoice", data);
              handleSetView("invoices");
            }}
            onCancel={() => handleSetView("invoices")}
            existingInvoice={editingInvoice}
          />
        );
      case "customers":
        return (
          <CustomerListView
            customers={customers}
            onEdit={(c) => {
              setEditingCustomer(c);
              setCurrentView("customerForm");
            }}
            onDelete={deleteData}
          />
        );
      case "customerForm":
        return (
          <CustomerForm
            onSave={(data) => {
              saveData("customer", data);
              handleSetView("customers");
            }}
            onCancel={() => handleSetView("customers")}
            existingCustomer={editingCustomer}
          />
        );
      case "reports":
        return <ReportsView invoices={invoices} xlsxReady={xlsxReady} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      <Sidebar currentView={currentView} setView={handleSetView} />
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <Header currentView={currentView} setView={handleSetView} />
        {renderView()}
      </main>
    </div>
  );
}

/* ------------------------------ Layout ------------------------------ */
const Sidebar = ({ currentView, setView }) => {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { id: "invoices", label: "Invoices", icon: ICONS.invoice },
    { id: "customers", label: "Customers", icon: ICONS.customers },
    { id: "reports", label: "Reports", icon: ICONS.reports },
  ];
  return (
    <nav className="w-20 lg:w-64 bg-white shadow-lg flex flex-col">
      <div className="flex items-center justify-center lg:justify-start p-4 border-b">
        <span className="text-2xl font-extrabold text-indigo-600">PEATS</span>
      </div>
      <ul className="flex-1 mt-4">
        {nav.map((n) => (
          <li key={n.id} className="px-3 lg:px-5 mb-2">
            <button
              onClick={() => setView(n.id)}
              className={`flex items-center w-full p-3 rounded-xl transition-colors ${
                currentView === n.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <Icon path={n.icon} className="w-6 h-6" />
              <span className="ml-4 hidden lg:block font-medium">{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-4 text-xs text-gray-400">v1.2</div>
    </nav>
  );
};

const Header = ({ currentView, setView }) => {
  const title = {
    dashboard: "Dashboard",
    invoices: "Invoices",
    invoiceForm: "Create / Edit Invoice",
    customers: "Customers",
    customerForm: "Create / Edit Customer",
    reports: "Reports",
  }[currentView];

  const showAdd = ["invoices", "customers"].includes(currentView);
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        <p className="text-gray-500">Your GST Invoicing & Management Hub</p>
      </div>
      {showAdd && (
        <div className="flex gap-3">
          <button
            onClick={() => setView(currentView === "invoices" ? "invoiceForm" : "customerForm")}
            className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow"
          >
            <Icon path={ICONS.add} className="w-5 h-5 mr-2" />
            Add New
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ Dashboard ------------------------------ */
const DashboardView = ({ invoices, customers, setInvoices, setCustomers, xlsxReady }) => {
  const fileRef = useRef(null);

  const totals = useMemo(() => {
    const totalRevenue = sum(invoices, "totalAmount");
    const outstanding = invoices
      .filter((inv) => inv.status === "pending")
      .reduce((acc, inv) => acc + safeNum(inv.totalAmount), 0);
    return { totalRevenue, outstanding };
  }, [invoices]);

  const importExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        if (typeof XLSX === "undefined") {
          alert("Excel library not loaded yet. Please try again.");
          return;
        }
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        const importedInvoices = {};
        const importedCustomers = {};

        rows.forEach((row) => {
          const invoiceId = row["Invoice ID"] || row["invoice_id"] || row["id"];
          if (!invoiceId) return;
          if (!importedInvoices[invoiceId]) {
            importedInvoices[invoiceId] = {
              id: String(invoiceId),
              invoiceNumber: row["Invoice #"] ?? row["invoice_number"] ?? "",
              invoiceDate: row["Invoice Date"] ?? row["invoice_date"] ?? "",
              dueDate: row["Due Date"] ?? row["due_date"] ?? "",
              customerId: row["Customer ID"] ?? row["customer_id"] ?? "",
              customerName: row["Customer Name"] ?? row["customer_name"] ?? "",
              customerAddress: row["Customer Address"] ?? row["customer_address"] ?? "",
              customerGstin: row["Customer GSTIN"] ?? row["customer_gstin"] ?? "",
              status: (row["Invoice Status"] ?? row["status"] ?? "pending").toLowerCase(),
              totalAmount: safeNum(row["Invoice Total"] ?? row["invoice_total"] ?? 0),
              items: [],
            };
          }
          const cgst = safeNum(row["CGST Rate (%)"] ?? row["cgst"] ?? 0);
          const sgst = safeNum(row["SGST Rate (%)"] ?? row["sgst"] ?? 0);
          const igst = safeNum(row["IGST Rate (%)"] ?? row["igst"] ?? 0);
          const mode = igst > 0 ? "igst" : "cgst_sgst";
          const gstRate = igst > 0 ? igst : cgst + sgst;
          importedInvoices[invoiceId].items.push({
            description: row["Item Description"] ?? row["description"] ?? "",
            hsn: row["HSN/SAC"] ?? row["hsn"] ?? "",
            quantity: safeNum(row["Quantity"] ?? row["qty"] ?? 0),
            rate: safeNum(row["Rate"] ?? 0),
            cgst, sgst, igst,
            gstMode: mode,
            gstRate: gstRate,
            total: safeNum(row["Total Item Value"] ?? row["line_total"] ?? 0),
          });

          const customerId = row["Customer ID"] ?? row["customer_id"];
          if (customerId && !importedCustomers[customerId]) {
            importedCustomers[customerId] = {
              id: String(customerId),
              name: row["Customer Name"] ?? "",
              address: row["Customer Address"] ?? "",
              gstin: row["Customer GSTIN"] ?? "",
              email: row["Customer Email"] ?? row["email"] ?? "",
              phone: row["Customer Phone"] ?? row["phone"] ?? "",
            };
          }
        });

        setInvoices(Object.values(importedInvoices));
        setCustomers(Object.values(importedCustomers));
        alert("Data imported successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to import. Please verify file format.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-1">Manage Your Data</h2>
        <p className="text-sm text-gray-600 mb-4">
          Data autosaves in your browser. You can import/export Excel or JSON backups anytime.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!xlsxReady}
            onClick={() => fileRef.current?.click()}
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow ${
              xlsxReady
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Icon path={ICONS.upload} className="w-5 h-5 mr-2" /> Import from Excel
          </button>
          <input type="file" ref={fileRef} onChange={importExcel} className="hidden" accept=".xlsx,.xls" />
          <ExportExcelButton invoices={invoices} disabled={!xlsxReady} />
          <ExportJsonButton invoices={invoices} customers={customers} />
          <ClearDataButton setInvoices={setInvoices} setCustomers={setCustomers} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={invoices.length} />
        <StatCard title="Total Customers" value={customers.length} />
        <StatCard title="Total Revenue" value={fmtInr(sum(invoices, "totalAmount"))} />
        <StatCard title="Outstanding" value={fmtInr(totals.outstanding)} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-white p-5 rounded-xl shadow flex flex-col gap-1">
    <div className="text-gray-500 text-sm">{title}</div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

const ExportExcelButton = ({ invoices, disabled }) => {
  const exportToExcel = () => {
    if (typeof XLSX === "undefined") {
      alert("Excel library is loading. Try again.");
      return;
    }
    const rows = invoices.flatMap((invoice) =>
      (invoice.items || []).map((item) => {
        const { taxable, cgstAmt, sgstAmt, igstAmt } = calcItem(item);
        return {
          "Invoice ID": invoice.id,
          "Invoice #": invoice.invoiceNumber,
          "Invoice Date": invoice.invoiceDate,
          "Due Date": invoice.dueDate,
          "Customer ID": invoice.customerId,
          "Customer Name": invoice.customerName,
          "Customer Address": invoice.customerAddress,
          "Customer GSTIN": invoice.customerGstin,
          "Item Description": item.description,
          "HSN/SAC": item.hsn,
          Quantity: item.quantity,
          Rate: item.rate,
          "GST Mode": item.gstMode || (safeNum(item.igst) > 0 ? "igst" : "cgst_sgst"),
          "GST %": item.gstRate ?? (safeNum(item.igst) > 0 ? safeNum(item.igst) : safeNum(item.cgst) + safeNum(item.sgst)),
          "Taxable Value": taxable,
          "CGST Rate (%)": item.cgst,
          "CGST Amount": cgstAmt,
          "SGST Rate (%)": item.sgst,
          "SGST Amount": sgstAmt,
          "IGST Rate (%)": item.igst,
          "IGST Amount": igstAmt,
          "Total Item Value": round2(item.total),
          "Invoice Total": round2(invoice.totalAmount),
          "Invoice Status": invoice.status,
        };
      })
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PEATS_Master_Invoice_Data.xlsx";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <button
      disabled={disabled}
      onClick={exportToExcel}
      className={`inline-flex items-center px-4 py-2 rounded-lg shadow ${
        disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      <Icon path={ICONS.download} className="w-5 h-5 mr-2" /> Export Excel
    </button>
  );
};

const ExportJsonButton = ({ invoices, customers }) => {
  const onClick = () => {
    const payload = { schema: "peats-v1", exportedAt: new Date().toISOString(), invoices, customers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "peats_backup.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  return (
    <button onClick={onClick} className="inline-flex items-center px-4 py-2 rounded-lg shadow bg-gray-800 text-white hover:bg-black">
      <Icon path={ICONS.download} className="w-5 h-5 mr-2" /> Backup JSON
    </button>
  );
};

const ClearDataButton = ({ setInvoices, setCustomers }) => {
  const clearAll = () => {
    if (!window.confirm("This will clear all local data (invoices & customers). Continue?")) return;
    setInvoices([]);
    setCustomers([]);
    localStorage.removeItem(LS_KEYS.invoices);
    localStorage.removeItem(LS_KEYS.customers);
  };
  return (
    <button onClick={clearAll} className="inline-flex items-center px-4 py-2 rounded-lg shadow bg-red-50 text-red-700 hover:bg-red-100">
      <Icon path={ICONS.delete} className="w-5 h-5 mr-2" /> Clear Local Data
    </button>
  );
};
/* ------------------------------ Invoices List ------------------------------ */
const InvoiceListView = ({ invoices, onEdit, onDelete, onDuplicate }) => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState("invoiceDate");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((i) => (status === "all" ? true : i.status === status))
      .filter((i) =>
        !q
          ? true
          : [i.invoiceNumber, i.customerName, i.invoiceDate, i.dueDate]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
      )
      .sort((a, b) => cmp(a, b, sortKey, sortDir));
  }, [invoices, query, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [query, status]);

  const handleDelete = (id) => {
    if (window.confirm("Delete this invoice? This cannot be undone.")) onDelete("invoice", id);
  };

  const handlePrint = (inv) => {
    const win = window.open("", "_blank");
    win.document.write(generatePrintableInvoice(inv));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const th = (label, key, width) => (
    <th
      className={`p-3 ${width ?? ""} cursor-pointer select-none whitespace-nowrap`}
      onClick={() => toggleSort(key)}
      title="Sort"
    >
      <div className="inline-flex items-center gap-1">
        {label}
        <span className="text-xs text-gray-400">{sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
      </div>
    </th>
  );

  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">
              <Icon path={ICONS.search} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice #, customer, date..."
              className="pl-9 pr-3 py-2 border rounded-lg w-72 max-w-full"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600">
              {th("Invoice #", "invoiceNumber")}
              {th("Customer", "customerName")}
              {th("Date", "invoiceDate")}
              {th("Amount", "totalAmount")}
              {th("Status", "status")}
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{inv.invoiceNumber || "—"}</td>
                <td className="p-3">{inv.customerName || "—"}</td>
                <td className="p-3">{inv.invoiceDate || "—"}</td>
                <td className="p-3">{fmtInr(safeNum(inv.totalAmount))}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      inv.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <IconBtn title="Edit" onClick={() => onEdit(inv)} icon={ICONS.edit} className="text-blue-600 hover:bg-blue-50" />
                    <IconBtn title="Duplicate" onClick={() => onDuplicate(inv)} icon={ICONS.duplicate} className="text-purple-600 hover:bg-purple-50" />
                    <IconBtn title="Delete" onClick={() => handleDelete(inv.id)} icon={ICONS.delete} className="text-red-600 hover:bg-red-50" />
                    <IconBtn title="Print" onClick={() => handlePrint(inv)} icon={ICONS.print} className="text-gray-700 hover:bg-gray-100" />
                  </div>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No invoices match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

const Pagination = ({ page, totalPages, onPageChange }) => (
  <div className="flex items-center justify-end gap-2 mt-4">
    <button
      onClick={() => onPageChange(Math.max(1, page - 1))}
      className="px-3 py-1 border rounded-lg disabled:opacity-50"
      disabled={page === 1}
    >
      Prev
    </button>
    <span className="text-sm text-gray-600">
      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
    </span>
    <button
      onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      className="px-3 py-1 border rounded-lg disabled:opacity-50"
      disabled={page === totalPages}
    >
      Next
    </button>
  </div>
);

const IconBtn = ({ onClick, icon, title, className = "" }) => (
  <button title={title} onClick={onClick} className={`p-2 rounded-lg transition-colors ${className}`}>
    <Icon path={icon} />
  </button>
);

/* ------------------------------ Customers ------------------------------ */
const CustomerListView = ({ customers, onEdit, onDelete }) => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q
      ? customers
      : customers.filter((c) =>
          [c.name, c.email, c.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        );
  }, [customers, query]);

  const handleDelete = (id) => {
    if (window.confirm("Delete this customer? This cannot be undone.")) onDelete("customer", id);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers..."
          className="px-3 py-2 border rounded-lg w-72 max-w-full"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.email || "—"}</td>
                <td className="p-3">{c.phone || "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <IconBtn title="Edit" onClick={() => onEdit(c)} icon={ICONS.edit} className="text-blue-600 hover:bg-blue-50" />
                    <IconBtn title="Delete" onClick={() => handleDelete(c.id)} icon={ICONS.delete} className="text-red-600 hover:bg-red-50" />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ------------------------------ Reports ------------------------------ */
const ReportsView = ({ invoices, xlsxReady }) => {
  const monthly = useMemo(() => {
    const map = new Map();
    invoices.forEach((inv) => {
      const m = new Date(inv.invoiceDate);
      if (isNaN(m)) return;
      const key = m.toLocaleString("en-IN", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, { total: 0, count: 0 });
      map.get(key).total += safeNum(inv.totalAmount);
      map.get(key).count += 1;
    });
    return Array.from(map.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [invoices]);

  const gstTotals = useMemo(() => {
    const allItems = invoices.flatMap((i) => i.items || []);
    const cgst = sum(allItems.map((it) => calcItem(it)), "cgstAmt");
    const sgst = sum(allItems.map((it) => calcItem(it)), "sgstAmt");
    const igst = sum(allItems.map((it) => calcItem(it)), "igstAmt");
    return { cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst) };
  }, [invoices]);

  return (
    <div className="bg-white p-5 rounded-xl shadow space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">GST & Sales Reports</h2>
        <ExportExcelButton invoices={invoices} disabled={!xlsxReady} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total CGST" value={fmtInr(gstTotals.cgst)} />
        <StatCard title="Total SGST" value={fmtInr(gstTotals.sgst)} />
        <StatCard title="Total IGST" value={fmtInr(gstTotals.igst)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-gray-600">
              <th className="p-3">Month</th>
              <th className="p-3">Invoices Issued</th>
              <th className="p-3">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(([month, data]) => (
              <tr key={month} className="border-b hover:bg-gray-50">
                <td className="p-3">{month}</td>
                <td className="p-3">{data.count}</td>
                <td className="p-3">{fmtInr(round2(data.total))}</td>
              </tr>
            ))}
            {monthly.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">No data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ------------------------------ Forms ------------------------------ */
const InvoiceForm = ({ customers, allInvoices, onSave, onCancel, existingInvoice }) => {
  const todayISO = new Date().toISOString().split("T")[0];
  const [touchedNumber, setTouchedNumber] = useState(false);
  const [invoice, setInvoice] = useState(() => {
    const initDate = existingInvoice?.invoiceDate || todayISO;
    const defaultNumber = existingInvoice?.invoiceNumber || nextInvoiceNumberForDate(initDate, allInvoices);
    return {
      id: existingInvoice?.id || null,
      invoiceNumber: defaultNumber,
      invoiceDate: initDate,
      dueDate: existingInvoice?.dueDate || "",
      customerId: existingInvoice?.customerId || "",
      customerName: existingInvoice?.customerName || "",
      customerAddress: existingInvoice?.customerAddress || "",
      customerGstin: existingInvoice?.customerGstin || "",
      items: existingInvoice?.items?.length
        ? existingInvoice.items
        : [
            { description: "", hsn: "", quantity: 1, rate: 0, cgst: 0, sgst: 0, igst: 0, gstMode: "cgst_sgst", gstRate: 18, total: 0 },
          ],
      status: existingInvoice?.status || "pending",
    };
  });

  // Re-generate invoice number when date changes (only for new + not manually touched)
  useEffect(() => {
    if (existingInvoice?.id) return;
    if (touchedNumber) return;
    const next = nextInvoiceNumberForDate(invoice.invoiceDate, allInvoices);
    setInvoice((prev) => ({ ...prev, invoiceNumber: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.invoiceDate, allInvoices]);

  const subTotal = round2(sum(invoice.items.map(calcItem), "taxable"));
  const totalTax = round2(
    sum(invoice.items.map(calcItem), "cgstAmt") +
      sum(invoice.items.map(calcItem), "sgstAmt") +
      sum(invoice.items.map(calcItem), "igstAmt")
  );
  const totalAmount = round2(subTotal + totalTax);

  const onSelectCustomer = (e) => {
    const c = customers.find((x) => x.id === e.target.value);
    if (!c) return;
    setInvoice((prev) => ({
      ...prev,
      customerId: c.id,
      customerName: c.name || "",
      customerAddress: c.address || "",
      customerGstin: c.gstin || "",
    }));
  };

  const applyGstModeRate = (it) => {
    const rate = safeNum(it.gstRate);
    if ((it.gstMode || "cgst_sgst") === "igst") {
      it.igst = round2(rate);
      it.cgst = 0; it.sgst = 0;
    } else {
      it.cgst = round2(rate / 2);
      it.sgst = round2(rate / 2);
      it.igst = 0;
    }
    return it;
  };

  const updateItem = (index, field, value) => {
    setInvoice((prev) => {
      const next = { ...prev };
      const items = [...next.items];
      let it = { ...items[index] };

      if (field === "description" || field === "hsn") it[field] = value;
      else it[field] = safeNum(value);

      if (field === "gstMode") it.gstMode = value;
      if (field === "gstRate" || field === "gstMode") {
        it.gstRate = field === "gstRate" ? safeNum(value) : (it.gstRate ?? 0);
        it = applyGstModeRate(it);
      }

      if (["cgst", "sgst", "igst"].includes(field)) {
        if (it.igst > 0) { it.gstMode = "igst"; it.gstRate = round2(it.igst); }
        else { it.gstMode = "cgst_sgst"; it.gstRate = round2(safeNum(it.cgst) + safeNum(it.sgst)); }
      }

      const { total } = calcItem(it);
      it.total = total;
      items[index] = it;
      next.items = items;
      return next;
    });
  };

  const addItem = () =>
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: "", hsn: "", quantity: 1, rate: 0, cgst: 0, sgst: 0, igst: 0, gstMode: "cgst_sgst", gstRate: 18, total: 0 },
      ],
    }));

  const removeItem = (idx) =>
    setInvoice((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const submit = (e) => {
    e.preventDefault();
    if (!invoice.invoiceNumber) return alert("Invoice # is required");
    if (!invoice.customerName) return alert("Customer name is required");
    if (invoice.customerGstin && !GSTIN_REGEX.test(invoice.customerGstin)) {
      if (!window.confirm("GSTIN does not look valid. Save anyway?")) return;
    }
    onSave({ ...invoice, totalAmount });
  };

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Invoice #</label>
          <input
            value={invoice.invoiceNumber}
            onChange={(e) => { setTouchedNumber(true); setInvoice({ ...invoice, invoiceNumber: e.target.value }); }}
            className="p-2 border rounded-lg w-full"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Format: <code>PINV/YYYY/MM/DD980001</code></p>
        </div>
        <Input label="Invoice Date" type="date" value={invoice.invoiceDate} onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value })} required />
        <Input label="Due Date" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Select Customer</label>
            <select value={invoice.customerId} onChange={onSelectCustomer} className="p-2 border rounded-lg w-full bg-white">
              <option value="">— Select Existing —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label="Customer Name" value={invoice.customerName} onChange={(e) => setInvoice({ ...invoice, customerName: e.target.value })} required />
          <Input label="Customer Address" value={invoice.customerAddress} onChange={(e) => setInvoice({ ...invoice, customerAddress: e.target.value })} />
          <Input label="Customer GSTIN" value={invoice.customerGstin} onChange={(e) => setInvoice({ ...invoice, customerGstin: e.target.value.toUpperCase() })} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Invoice Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">Description</th>
                <th className="p-2">HSN/SAC</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Rate</th>
                <th className="p-2">GST Mode</th>
                <th className="p-2">GST %</th>
                <th className="p-2">Total</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => {
                const { total } = calcItem(it);
                return (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <input
                        value={it.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="p-1 border rounded w-40"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={it.hsn}
                        onChange={(e) => updateItem(idx, "hsn", e.target.value)}
                        className="p-1 border rounded w-24"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="p-1 border rounded w-16"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={it.rate}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                        className="p-1 border rounded w-20"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={it.gstMode}
                        onChange={(e) => updateItem(idx, "gstMode", e.target.value)}
                        className="p-1 border rounded"
                      >
                        <option value="cgst_sgst">CGST+SGST</option>
                        <option value="igst">IGST</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        value={it.gstRate}
                        onChange={(e) => updateItem(idx, "gstRate", e.target.value)}
                        className="p-1 border rounded"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">{fmtInr(total)}</td>
                    <td className="p-2">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-600">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addItem} className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">+ Add Item</button>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sub Total:</span><span>{fmtInr(subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Tax:</span><span>{fmtInr(totalTax)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Grand Total:</span><span>{fmtInr(totalAmount)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Invoice</button>
      </div>
    </form>
  );
};

const CustomerForm = ({ onSave, onCancel, existingCustomer }) => {
  const [c, setC] = useState(() => existingCustomer || { id: null, name: "", email: "", phone: "", address: "", gstin: "" });
  const submit = (e) => {
    e.preventDefault();
    if (!c.name) return alert("Name is required");
    if (c.gstin && !GSTIN_REGEX.test(c.gstin)) {
      if (!window.confirm("GSTIN does not look valid. Save anyway?")) return;
    }
    onSave(c);
  };
  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow space-y-4">
      <Input label="Customer Name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} required />
      <Input label="Email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
      <Input label="Phone" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
      <Input label="Address" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} />
      <Input label="GSTIN" value={c.gstin} onChange={(e) => setC({ ...c, gstin: e.target.value.toUpperCase() })} />
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
      </div>
    </form>
  );
};

/* ------------------------------ Shared Helpers ------------------------------ */
const Input = ({ label, ...props }) => (
  <div>
    <label className="mb-1 block text-sm text-gray-600">{label}</label>
    <input {...props} className="p-2 border rounded-lg w-full" />
  </div>
);

const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

const cmp = (a, b, key, dir) => {
  const va = a?.[key] ?? "";
  const vb = b?.[key] ?? "";
  if (va < vb) return dir === "asc" ? -1 : 1;
  if (va > vb) return dir === "asc" ? 1 : -1;
  return 0;
};

/* ------------------------------ Printable Invoice (A4) ------------------------------ */
function generatePrintableInvoice(inv) {
  const itemsHtml = (inv.items || [])
    .map((it) => {
      const { taxable, cgstAmt, sgstAmt, igstAmt, total } = calcItem(it);
      return `<tr>
        <td>${it.description || ""}</td>
        <td>${it.hsn || ""}</td>
        <td style="text-align:right">${it.quantity || 0}</td>
        <td style="text-align:right">${it.rate || 0}</td>
        <td style="text-align:right">${taxable.toFixed(2)}</td>
        <td style="text-align:right">${cgstAmt.toFixed(2)}</td>
        <td style="text-align:right">${sgstAmt.toFixed(2)}</td>
        <td style="text-align:right">${igstAmt.toFixed(2)}</td>
        <td style="text-align:right">${total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  return `
  <html>
  <head>
    <title>${inv.invoiceNumber}</title>
    <style>
      @page { size: A4; margin: 20mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
      h2, h3 { margin: 0; padding: 0; }
      .company { text-align: center; margin-bottom: 20px; }
      .company h2 { font-size: 18px; font-weight: bold; }
      .meta { margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #444; padding: 6px 8px; }
      th { background: #f2f2f2; text-align: center; }
      td { vertical-align: top; }
      .totals { margin-top: 15px; text-align: right; }
      .totals h3 { font-size: 14px; font-weight: bold; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div class="company">
      <h2>${companyDetails.name}</h2>
      <div>${companyDetails.address}</div>
      <div>Phone: ${companyDetails.phone} | Email: ${companyDetails.email}</div>
      <div>Owners: ${companyDetails.owners}</div>
    </div>
    <div class="meta">
      <strong>Invoice:</strong> ${inv.invoiceNumber}<br/>
      <strong>Date:</strong> ${inv.invoiceDate}<br/>
      <strong>Due:</strong> ${inv.dueDate || "—"}<br/>
      <strong>Customer:</strong> ${inv.customerName}<br/>
      <strong>Address:</strong> ${inv.customerAddress || "—"}<br/>
      <strong>GSTIN:</strong> ${inv.customerGstin || "—"}
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Taxable</th>
          <th>CGST</th>
          <th>SGST</th>
          <th>IGST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals">
      <h3>Grand Total: ${fmtInr(inv.totalAmount || 0)}</h3>
    </div>
    <div class="footer">
      <p>This is a computer-generated invoice. No signature required.</p>
    </div>
  </body>
  </html>`;
}

// DEBUG sentinel to confirm file parses fully
console.log("✅ App.js loaded");
