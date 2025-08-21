import React, { useEffect, useMemo, useRef, useState } from "react";

/* global XLSX */

/**
 * PEATS — GST Invoice System
 * (Single-file App.js build)
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
const todayISO = () => new Date().toISOString().split("T")[0];
function addDaysISO(isoStr, days) {
  const base = isoStr ? new Date(isoStr) : new Date();
  if (Number.isNaN(+base)) return todayISO();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().split("T")[0];
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const GST_RATES = [2.5, 5, 8, 9, 18, 28]; // make sure this matches everywhere

function addDaysISO(isoStr, days) {
  const base = isoStr ? new Date(isoStr) : new Date();
  if (Number.isNaN(+base)) return todayISO();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().split("T")[0];
}

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

function daysUntilDue(dueISO) {
  if (!dueISO) return null;
  const due = new Date(dueISO);
  if (Number.isNaN(+due)) return null;
  const start = new Date(todayISO());
  start.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffMs = due - start; // positive => remaining, negative => overdue
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function buildGmailLink({ to, subject, body }) {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  const params = new URLSearchParams({
    to: to || "",
    su: subject || "",
    body: body || "",
  });
  return `${base}&${params.toString()}`;
}

function formatReminderEmail(inv) {
  const days = daysUntilDue(inv.dueDate);
  const duePart = inv.dueDate
    ? ` (Due Date: ${inv.dueDate}${
        typeof days === "number"
          ? `, ${days < 0 ? `${Math.abs(days)} day(s) overdue` : `${days} day(s) remaining`}`
          : ""
      })`
    : "";
  const lines = [
    `Dear ${inv.customerName || "Sir/Madam"},`,
    "",
    `This is a gentle reminder regarding Invoice ${inv.invoiceNumber || ""}${duePart}.`,
    `Amount Due: ${fmtInr(inv.totalAmount || 0)}`,
    "",
    "Kindly arrange the payment at your earliest convenience. If it has already been paid, please ignore this email and accept our thanks.",
    "",
    "Best regards,",
    "ParthaSarthi Engineering and Training Services (PEATS)",
    "parthasarthiconsultancy@gmail.com",
  ];
  return {
    subject: `Payment Reminder — Invoice ${inv.invoiceNumber || ""}`,
    body: lines.join("\n"),
  };
}

// Invoice number generator — PINV/YYYY/MM/DD980001 (per day; start 980001)
function nextInvoiceNumberForDate(dateStr, existingInvoices = []) {
  if (!dateStr) {
    const t = new Date();
    const yyyy = String(t.getFullYear());
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
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
  phone: "7617001477", // removed 9889031719
  email: "Parthasarthiconsultancy@gmail.com",
  owners: "Mr. Ramkaran Yadav", // removed Mr. Ajay Shankar Amist
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

  // Load SheetJS robustly (with fallback)
  useEffect(() => {
    if (window.XLSX) {
      setXlsxReady(true);
      return;
    }
    function addScript(src, onload) {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = onload;
      s.onerror = () => console.error("Failed to load", src);
      document.head.appendChild(s);
      return s;
    }
    const primary = addScript("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.full.min.js", () =>
      setXlsxReady(!!window.XLSX)
    );
    const t = setTimeout(() => {
      if (!window.XLSX)
        addScript("https://unpkg.com/xlsx@0.20.1/dist/xlsx.full.min.js", () =>
          setXlsxReady(!!window.XLSX)
        );
    }, 2000);
    return () => {
      primary && primary.remove();
      clearTimeout(t);
    };
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

  // Quick in-place invoice updater (for inline status change)
  const quickUpdateInvoice = (patched) => {
    setInvoices((prev) => prev.map((x) => (x.id === patched.id ? patched : x)));
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
            onQuickUpdate={quickUpdateInvoice}
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
        return <ReportsView invoices={invoices} customers={customers} xlsxReady={xlsxReady} />;
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
                currentView === n.id ? "bg-indigo-600 text-white shadow-md" : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <Icon path={n.icon} className="w-6 h-6" />
              <span className="ml-4 hidden lg:block font-medium">{n.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-4 text-xs text-gray-400">v1.5</div>
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
    const outstanding = invoices.filter((inv) => inv.status !== "paid").reduce((acc, inv) => acc + safeNum(inv.totalAmount), 0);
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
              customerEmail: row["Customer Email"] ?? row["customer_email"] ?? row["email"] ?? "",
              status: String(row["Invoice Status"] ?? row["status"] ?? "pending").toLowerCase(),
              poNumber: row["PO Number"] ?? row["po_number"] ?? "",
              poImage: row["PO Image"] ?? row["po_image"] ?? "",
              poBaseValue: safeNum(row["PO Base Value"] ?? row["po_base_value"] ?? 0),
              poGstMode: row["PO GST Mode"] ?? row["po_gst_mode"] ?? "cgst_sgst",
              poGstRate: safeNum(row["PO GST %"] ?? row["po_gst_rate"] ?? 18),
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
            cgst,
            sgst,
            igst,
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
              email: row["Customer Email"] ?? row["customer_email"] ?? row["email"] ?? "",
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
        <p className="text-sm text-gray-600 mb-4">Data autosaves in your browser. Import/Export Excel or JSON backups anytime.</p>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!xlsxReady}
            onClick={() => fileRef.current?.click()}
            className={`inline-flex items-center px-4 py-2 rounded-lg shadow ${
              xlsxReady ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Icon path={ICONS.upload} className="w-5 h-5 mr-2" /> Import from Excel
          </button>
          <input type="file" ref={fileRef} onChange={importExcel} className="hidden" accept=".xlsx,.xls" />
          <ExportExcelButton invoices={invoices} disabled={!xlsxReady} />
          <ExportJsonButton invoices={invoices} customers={customers} />
          {/* Clear Local Data removed as requested */}
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
          "Customer Email": invoice.customerEmail || "",
          "Invoice Status": invoice.status,
          "PO Number": invoice.poNumber || "",
          "PO Image": invoice.poImage || "",
          "PO Base Value": round2(invoice.poBaseValue || 0),
          "PO GST Mode": invoice.poGstMode || "cgst_sgst",
          "PO GST %": round2(invoice.poGstRate ?? 0),
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
        };
      })
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
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
    <button
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 rounded-lg shadow bg-gray-800 text-white hover:bg-black"
    >
      <Icon path={ICONS.download} className="w-5 h-5 mr-2" /> Backup JSON
    </button>
  );
};
/* ------------------------------ Invoices List ------------------------------ */
const InvoiceListView = ({ invoices, onEdit, onDelete, onDuplicate, onQuickUpdate }) => {
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
    <th className={`p-3 ${width ?? ""} cursor-pointer select-none whitespace-nowrap`} onClick={() => toggleSort(key)} title="Sort">
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
            <option value="paid-half">Paid-Half</option>
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
            {pageData.map((inv) => {
              const { subject, body } = formatReminderEmail(inv);
              const mailto = buildGmailLink({
                to: inv.customerEmail || "",
                subject,
                body,
              });
              return (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{inv.invoiceNumber || "—"}</td>
                  <td className="p-3">{inv.customerName || "—"}</td>
                  <td className="p-3">{inv.invoiceDate || "—"}</td>
                  <td className="p-3">{fmtInr(safeNum(inv.totalAmount))}</td>
                  <td className="p-3">
                    <select
                      value={inv.status}
                      onChange={(e) => onQuickUpdate({ ...inv, status: e.target.value })}
                      className={`px-2 py-1 border rounded-lg ${
                        inv.status === "paid" ? "bg-green-50 text-green-700" : inv.status === "paid-half" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid-half">Paid-Half</option>
                      <option value="paid">Paid</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <IconBtn title="Edit" onClick={() => onEdit(inv)} icon={ICONS.edit} className="text-blue-600 hover:bg-blue-50" />
                      <IconBtn title="Duplicate" onClick={() => onDuplicate(inv)} icon={ICONS.duplicate} className="text-purple-600 hover:bg-purple-50" />
                      <IconBtn title="Delete" onClick={() => handleDelete(inv.id)} icon={ICONS.delete} className="text-red-600 hover:bg-red-50" />
                      <a href={mailto} target="_blank" rel="noreferrer" title="Send Reminder" className="p-2 rounded-lg text-amber-700 hover:bg-amber-50">✉</a>
                      <IconBtn title="Print" onClick={() => handlePrint(inv)} icon={ICONS.print} className="text-gray-700 hover:bg-gray-100" />
                    </div>
                  </td>
                </tr>
              );
            })}
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
    <button onClick={() => onPageChange(Math.max(1, page - 1))} className="px-3 py-1 border rounded-lg disabled:opacity-50" disabled={page === 1}>
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
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ------------------------------ Reports ------------------------------ */
const ReportsView = ({ invoices, customers, xlsxReady }) => {
  const totals = useMemo(() => {
    const received = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + safeNum(i.totalAmount), 0);
    const remaining = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + safeNum(i.totalAmount), 0);
    return { received: round2(received), remaining: round2(remaining) };
  }, [invoices]);

  const pendingRows = useMemo(() => {
    return invoices
      .filter((i) => i.status !== "paid")
      .map((i) => {
        const d = daysUntilDue(i.dueDate);
        let email = i.customerEmail || "";
        if (!email && i.customerId) {
          const c = customers.find((x) => x.id === i.customerId);
          email = c?.email || "";
        }
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          customerName: i.customerName,
          customerEmail: email,
          dueDate: i.dueDate || "—",
          amount: round2(safeNum(i.totalAmount)),
          days: d,
        };
      })
      .sort((a, b) => {
        const da = a.days ?? 9999, db = b.days ?? 9999;
        return da - db; // most overdue first
      });
  }, [invoices, customers]);

  // Client summary (pending totals per customer)
  const clientSummary = useMemo(() => {
    const map = new Map();
    invoices.forEach((i) => {
      if (i.status === "paid") return;
      const key = i.customerId || i.customerName || "—";
      const email = i.customerEmail || customers.find((c) => c.id === i.customerId)?.email || "";
      const prev = map.get(key) || { customerName: i.customerName || "—", email, totalPending: 0, invoices: [] };
      prev.totalPending += safeNum(i.totalAmount);
      prev.invoices.push(i);
      map.set(key, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.totalPending - a.totalPending);
  }, [invoices, customers]);

  function summaryEmailPayload(entry) {
    const lines = [
      `Dear ${entry.customerName || "Sir/Madam"},`,
      "",
      "This is a friendly reminder of your pending payments with us:",
      "",
      ...entry.invoices.map((inv) => {
        const days = daysUntilDue(inv.dueDate);
        const aging =
          typeof days === "number"
            ? days < 0
              ? `${Math.abs(days)} day(s) overdue`
              : `${days} day(s) remaining`
            : "No due date";
        return `• ${inv.invoiceNumber} — ${fmtInr(inv.totalAmount)} — Due: ${inv.dueDate || "—"} (${aging})`;
      }),
      "",
      `Total pending: ${fmtInr(entry.totalPending)}`,
      "",
      "Kindly arrange the payment at your earliest convenience.",
      "",
      "Best regards,",
      "ParthaSarthi Engineering and Training Services (PEATS)",
      "parthasarthiconsultancy@gmail.com",
    ];
    return {
      subject: "Payment Reminder — Pending Invoices Summary",
      body: lines.join("\n"),
    };
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">GST & Sales Reports</h2>
        <ExportExcelButton invoices={invoices} disabled={!xlsxReady} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Amount Received" value={fmtInr(totals.received)} />
        <StatCard title="Amount Remaining" value={fmtInr(totals.remaining)} />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Client Summary (Pending)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="p-3">Customer</th>
                <th className="p-3">Email</th>
                <th className="p-3">Pending Total</th>
                <th className="p-3">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {clientSummary.map((entry, idx) => {
                const { subject, body } = summaryEmailPayload(entry);
                const link = buildGmailLink({ to: entry.email || "", subject, body });
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3">{entry.customerName}</td>
                    <td className="p-3">{entry.email || "—"}</td>
                    <td className="p-3">{fmtInr(entry.totalPending)}</td>
                    <td className="p-3">
                      <a href={link} target="_blank" rel="noreferrer" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                        Send Summary
                      </a>
                    </td>
                  </tr>
                );
              })}
              {clientSummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">No pending balances 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Pending Invoices (Aging & Reminders)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="p-3">Invoice #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Email</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Days</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Reminder</th>
              </tr>
            </thead>
            <tbody>
              {pendingRows.map((r) => {
                const { subject, body } = formatReminderEmail({
                  invoiceNumber: r.invoiceNumber,
                  dueDate: r.dueDate === "—" ? "" : r.dueDate,
                  customerName: r.customerName,
                  totalAmount: r.amount,
                });
                const link = buildGmailLink({ to: r.customerEmail || "", subject, body });
                const badge =
                  typeof r.days === "number" ? (
                    r.days < 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        {Math.abs(r.days)} day(s) overdue
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                        {r.days} day(s) remaining
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">—</span>
                  );

                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{r.invoiceNumber}</td>
                    <td className="p-3">{r.customerName}</td>
                    <td className="p-3">{r.customerEmail || "—"}</td>
                    <td className="p-3">{r.dueDate}</td>
                    <td className="p-3">{badge}</td>
                    <td className="p-3">{fmtInr(r.amount)}</td>
                    <td className="p-3">
                      <a href={link} target="_blank" rel="noreferrer" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                        Send Reminder
                      </a>
                    </td>
                  </tr>
                );
              })}
              {pendingRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No pending invoices 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
/* ------------------------------ Forms ------------------------------ */
const InvoiceForm = ({ customers, allInvoices, onSave, onCancel, existingInvoice }) => {
  const [touchedNumber] = useState(false); // kept but unused since number is read-only now
  const [invoice, setInvoice] = useState(() => {
    const initDate = existingInvoice?.invoiceDate || todayISO();
    const defaultNumber = existingInvoice?.invoiceNumber || nextInvoiceNumberForDate(initDate, allInvoices);
    const initialDue = existingInvoice?.dueDate || addDaysISO(initDate, 45); // +45 days auto
    return {
      id: existingInvoice?.id || null,
      invoiceNumber: defaultNumber,
      invoiceDate: initDate,
      dueDate: initialDue,
      customerId: existingInvoice?.customerId || "",
      customerName: existingInvoice?.customerName || "",
      customerAddress: existingInvoice?.customerAddress || "",
      customerGstin: existingInvoice?.customerGstin || "",
      customerEmail: existingInvoice?.customerEmail || "",
      /* PO fields */
      poNumber: existingInvoice?.poNumber || "",
      poImage: existingInvoice?.poImage || "",
      poBaseValue: safeNum(existingInvoice?.poBaseValue || 0),
      poGstMode: existingInvoice?.poGstMode || "cgst_sgst",
      poGstRate: safeNum(existingInvoice?.poGstRate || 18),
      items: existingInvoice?.items?.length
        ? existingInvoice.items
        : [
            {
              description: "",
              hsn: "",
              quantity: 1,
              rate: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              gstMode: "cgst_sgst",
              gstRate: 18,
              total: 0,
            },
          ],
      status: existingInvoice?.status || "pending",
      amountPaid: safeNum(existingInvoice?.amountPaid || 0),
    };
  });

  // Auto-update due date when invoice date changes (only for new invoices)
  useEffect(() => {
    if (existingInvoice?.id) return;
    if (touchedNumber) return;
    setInvoice((prev) => ({ ...prev, dueDate: addDaysISO(prev.invoiceDate, 45) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.invoiceDate, allInvoices]);

  const subTotal = round2(sum(invoice.items.map(calcItem), "taxable"));
  const totalTax = round2(
    sum(invoice.items.map(calcItem), "cgstAmt") + sum(invoice.items.map(calcItem), "sgstAmt") + sum(invoice.items.map(calcItem), "igstAmt")
  );
  const totalAmount = round2(subTotal + totalTax);
  const remainingAmount = round2(Math.max(0, totalAmount - safeNum(invoice.amountPaid)));

  const onSelectCustomer = (e) => {
    const c = customers.find((x) => x.id === e.target.value);
    if (!c) return;
    setInvoice((prev) => ({
      ...prev,
      customerId: c.id,
      customerName: c.name || "",
      customerAddress: c.address || "",
      customerGstin: c.gstin || "",
      customerEmail: c.email || "",
    }));
  };

  const applyGstModeRate = (it) => {
    const rate = safeNum(it.gstRate);
    if ((it.gstMode || "cgst_sgst") === "igst") {
      it.igst = round2(rate);
      it.cgst = 0;
      it.sgst = 0;
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
        it.gstRate = field === "gstRate" ? safeNum(value) : it.gstRate ?? 0;
        it = applyGstModeRate(it);
      }

      if (["cgst", "sgst", "igst"].includes(field)) {
        if (it.igst > 0) {
          it.gstMode = "igst";
          it.gstRate = round2(it.igst);
        } else {
          it.gstMode = "cgst_sgst";
          it.gstRate = round2(safeNum(it.cgst) + safeNum(it.sgst));
        }
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

  const removeItem = (idx) => setInvoice((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  function validateBeforeSave() {
    // Required: dates
    if (!invoice.invoiceDate || !invoice.dueDate) {
      alert("Please select Invoice Date and Due Date.");
      return false;
    }
    // Required: customer core details
    if (!invoice.customerName?.trim()) {
      alert("Customer name is required.");
      return false;
    }
    if (!invoice.customerAddress?.trim()) {
      alert("Customer address is required.");
      return false;
    }
    if (!invoice.customerEmail?.trim()) {
      alert("Customer email is required.");
      return false;
    }
    // Items: at least one valid line
    const hasValidItem = invoice.items.some(
      (it) => it.description?.trim() && safeNum(it.quantity) > 0 && safeNum(it.rate) > 0
    );
    if (!hasValidItem) {
      alert("Add at least one item with description, quantity > 0, and rate > 0.");
      return false;
    }
    // Paid-Half requires amountPaid
    if (invoice.status === "paid-half") {
      if (!(safeNum(invoice.amountPaid) > 0)) {
        alert("Please enter the Amount Paid for Paid-Half invoices.");
        return false;
      }
      if (safeNum(invoice.amountPaid) >= totalAmount) {
        alert("Amount Paid must be less than the Grand Total for Paid-Half.");
        return false;
      }
    }
    // (Optional) Validate GSTIN if present
    if (invoice.customerGstin && !GSTIN_REGEX.test(invoice.customerGstin)) {
      if (!window.confirm("Customer GSTIN does not look valid. Save anyway?")) return false;
    }
    return true;
  }

  const submit = (e) => {
    e.preventDefault();
    if (!validateBeforeSave()) return;
    onSave({ ...invoice, totalAmount, amountPaid: safeNum(invoice.amountPaid) });
  };

  const poGrossValue = round2(safeNum(invoice.poBaseValue || 0) * (1 + safeNum(invoice.poGstRate || 0) / 100));
  const gstSplitHint = (rate, mode) => {
    rate = safeNum(rate);
    return mode === "igst" ? `IGST ${rate}%` : `CGST ${(rate / 2).toFixed(2)}% + SGST ${(rate / 2).toFixed(2)}%`;
  };

  return (
    <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm text-gray-600">Invoice #</label>
          <input
            value={invoice.invoiceNumber}
            readOnly
            className="p-2 border rounded-lg w-full bg-gray-100 cursor-not-allowed"
            title="Auto-generated and locked"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: <code>PINV/YYYY/MM/DD980001</code>
          </p>
        </div>
        <Input
          label="Invoice Date"
          type="date"
          value={invoice.invoiceDate}
          onChange={(e) => setInvoice({ ...invoice, invoiceDate: e.target.value, dueDate: addDaysISO(e.target.value, 45) })}
          required
        />
        <Input label="Due Date" type="date" value={invoice.dueDate} onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })} required />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">Select Customer</label>
            <select value={invoice.customerId} onChange={onSelectCustomer} className="p-2 border rounded-lg w-full bg-white">
              <option value="">— Select Existing —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Customer Name" value={invoice.customerName} onChange={(e) => setInvoice({ ...invoice, customerName: e.target.value })} required />
          <Input label="Customer Address" value={invoice.customerAddress} onChange={(e) => setInvoice({ ...invoice, customerAddress: e.target.value })} required />
          {/* Keep default format; no toUpperCase */}
          <Input label="Customer GSTIN" value={invoice.customerGstin} onChange={(e) => setInvoice({ ...invoice, customerGstin: e.target.value })} />
          <Input label="Customer Email" value={invoice.customerEmail} onChange={(e) => setInvoice({ ...invoice, customerEmail: e.target.value })} required />
        </div>
      </div>

      {/* PO & Status */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">PO & Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Against PO Number" value={invoice.poNumber} onChange={(e) => setInvoice({ ...invoice, poNumber: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm text-gray-600">PO Image (PNG/JPG)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (ev) => setInvoice((prev) => ({ ...prev, poImage: String(ev.target.result) })); // dataURL
                reader.readAsDataURL(f);
              }}
              className="p-2 border rounded-lg w-full bg-white"
            />
            {invoice.poImage && (
              <div className="mt-2 space-y-1">
                <img
                  src={invoice.poImage}
                  alt="PO"
                  className="max-h-32 rounded border"
                />
                <div>
                  <a href={invoice.poImage} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm inline-block underline">
                    View full size
                  </a>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Invoice Status</label>
            <select
              value={invoice.status}
              onChange={(e) => setInvoice({ ...invoice, status: e.target.value })}
              className="p-2 border rounded-lg w-full bg-white"
            >
              <option value="pending">Pending</option>
              <option value="paid-half">Paid-Half</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {/* PO Value + GST */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <Input
            label="PO Base Value (Taxable)"
            type="number"
            value={invoice.poBaseValue}
            onChange={(e) => setInvoice({ ...invoice, poBaseValue: safeNum(e.target.value) })}
          />
          <div>
            <label className="mb-1 block text-sm text-gray-600">PO GST Mode</label>
            <select
              value={invoice.poGstMode}
              onChange={(e) => setInvoice({ ...invoice, poGstMode: e.target.value })}
              className="p-2 border rounded-lg w-full bg-white"
            >
              <option value="cgst_sgst">CGST+SGST</option>
              <option value="igst">IGST</option>
            </select>
            <div className="text-xs text-gray-500 mt-1">{gstSplitHint(invoice.poGstRate, invoice.poGstMode)}</div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">PO GST %</label>
            <select
              value={invoice.poGstRate}
              onChange={(e) => setInvoice({ ...invoice, poGstRate: safeNum(e.target.value) })}
              className="p-2 border rounded-lg w-full bg-white"
            >
              {GST_RATES.map((r) => (
                <option key={`po-${r}`} value={r}>{r}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">PO Gross (Auto)</label>
            <input value={poGrossValue} readOnly className="p-2 border rounded-lg w-full bg-gray-50" />
          </div>
        </div>
      </div>

      {/* Items */}
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
                <th className="p-2">Tax Split</th>
                <th className="p-2">Total</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => {
                const { total } = calcItem(it);
                const splitText =
                  it.gstMode === "igst"
                    ? `IGST ${safeNum(it.gstRate)}%`
                    : `CGST ${(safeNum(it.gstRate) / 2).toFixed(2)}% + SGST ${(safeNum(it.gstRate) / 2).toFixed(2)}%`;

                return (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} className="p-1 border rounded w-40" />
                    </td>
                    <td className="p-2">
                      <input value={it.hsn} onChange={(e) => updateItem(idx, "hsn", e.target.value)} className="p-1 border rounded w-24" />
                    </td>
                    <td className="p-2">
                      <input type="number" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} className="p-1 border rounded w-16" min="0" step="0.01" />
                    </td>
                    <td className="p-2">
                      <input type="number" value={it.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} className="p-1 border rounded w-20" min="0" step="0.01" />
                    </td>
                    <td className="p-2">
                      <select value={it.gstMode} onChange={(e) => updateItem(idx, "gstMode", e.target.value)} className="p-1 border rounded">
                        <option value="cgst_sgst">CGST+SGST</option>
                        <option value="igst">IGST</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={it.gstRate} onChange={(e) => updateItem(idx, "gstRate", e.target.value)} className="p-1 border rounded">
                        {GST_RATES.map((r) => (
                          <option key={`item-gst-${idx}-${r}`} value={r}>{r}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-xs text-gray-600">{splitText}</td>
                    <td className="p-2">{fmtInr(total)}</td>
                    <td className="p-2">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:underline" aria-label="Remove item" title="Remove item">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addItem} className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
          + Add Item
        </button>
      </div>

      {/* Paid-Half capture */}
      {invoice.status === "paid-half" && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Payment (Half)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
              label="Amount Paid"
              type="number"
              value={invoice.amountPaid}
              onChange={(e) => setInvoice({ ...invoice, amountPaid: safeNum(e.target.value) })}
              required
            />
            <div>
              <label className="mb-1 block text-sm text-gray-600">Remaining (Auto)</label>
              <input readOnly value={remainingAmount} className="p-2 border rounded-lg w-full bg-gray-50" />
            </div>
            <div className="text-sm text-gray-500">
              Grand Total: <strong>{fmtInr(totalAmount)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sub Total:</span>
          <span>{fmtInr(subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Tax:</span>
          <span>{fmtInr(totalTax)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Grand Total:</span>
          <span>{fmtInr(totalAmount)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Save Invoice
        </button>
      </div>
    </form>
  );
};


/* ------------------------------ Shared Helpers ------------------------------ */
const Input = ({ label, ...props }) => (
  <div>
    <label className="mb-1 block text-sm text-gray-600">{label}</label>
    <input {...props} className={`p-2 border rounded-lg w-full ${props.className || ""}`} />
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

/* ------------------------------ Printable Invoice (A4 boxed, portrait) ------------------------------ */
function generatePrintableInvoice(inv) {
  const itemsHtml = (inv.items || [])
    .map((it, idx) => {
      const { taxable, cgstAmt, sgstAmt, igstAmt, total } = calcItem(it);
      const splitText =
        safeNum(it.igst) > 0
          ? `IGST ${safeNum(it.igst).toFixed(2)}%`
          : `CGST ${safeNum(it.cgst).toFixed(2)}% + SGST ${safeNum(it.sgst).toFixed(2)}%`;

      return `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>
          ${escapeHtml(it.description || "")}
          <div style="color:#666;font-size:10px;margin-top:2px">${escapeHtml(splitText)}</div>
        </td>
        <td style="text-align:center">${escapeHtml(it.hsn || "")}</td>
        <td style="text-align:right">${safeNum(it.quantity).toFixed(2)}</td>
        <td style="text-align:right">${safeNum(it.rate).toFixed(2)}</td>
        <td style="text-align:right">${taxable.toFixed(2)}</td>
        <td style="text-align:right">${cgstAmt.toFixed(2)}</td>
        <td style="text-align:right">${sgstAmt.toFixed(2)}</td>
        <td style="text-align:right">${igstAmt.toFixed(2)}</td>
        <td style="text-align:right; font-weight:600">${total.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const subTotal   = round2(sum(inv.items.map(calcItem), "taxable"));
  const totalCgst  = round2(sum(inv.items.map(calcItem), "cgstAmt"));
  const totalSgst  = round2(sum(inv.items.map(calcItem), "sgstAmt"));
  const totalIgst  = round2(sum(inv.items.map(calcItem), "igstAmt"));
  const grandTotal = round2(safeNum(inv.totalAmount));

  const dueInfo = inv.dueDate ? `Due Date: ${inv.dueDate}` : "";
  const poBlock = `
    <div style="margin-top:6px">
      <strong>PO No:</strong> ${escapeHtml(inv.poNumber || "—")}
      ${inv.poImage ? `&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${inv.poImage}" target="_blank">View PO Image</a>` : ""}
    </div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(inv.invoiceNumber || "Invoice")}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, sans-serif; color:#222; }
    .sheet { border: 2px solid #111; border-radius: 6px; padding: 14px 16px; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .muted { color:#666; }
    h1 { font-size:18px; margin:0; }
    h2 { font-size:14px; margin:0 0 8px 0; }
    .hr { height:1px; background:#ddd; margin:10px 0; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #333; padding:6px 8px; font-size:12px; }
    th { background:#f5f5f5; text-align:center; }
    .totals td { border:none; padding:3px 0; font-size:12px; }
    .totals .label { text-align:right; padding-right:8px; }
    .totals .value { text-align:right; width:120px; font-weight:600; }
    .footer { margin-top:18px; text-align:center; font-size:11px; color:#666; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="row">
      <div>
        <h1>${escapeHtml(companyDetails.name)}</h1>
        <div>${escapeHtml(companyDetails.address)}</div>
        <div>Phone: ${escapeHtml(companyDetails.phone)} &nbsp;|&nbsp; Email: ${escapeHtml(companyDetails.email)}</div>
        <div class="muted">Owners: ${escapeHtml(companyDetails.owners)}</div>
      </div>
      <div style="text-align:right">
        <h2>Tax Invoice</h2>
        <div><strong>Invoice #:</strong> ${escapeHtml(inv.invoiceNumber || "")}</div>
        <div><strong>Date:</strong> ${escapeHtml(inv.invoiceDate || "")}</div>
        <div><strong>Status:</strong> ${escapeHtml((inv.status || "pending").toUpperCase())}</div>
        <div>${escapeHtml(dueInfo)}</div>
        ${poBlock}
      </div>
    </div>

    <div class="hr"></div>

    <div class="row" style="margin-bottom:8px">
      <div>
        <h2>Bill To</h2>
        <div><strong>${escapeHtml(inv.customerName || "")}</strong></div>
        <div>${escapeHtml(inv.customerAddress || "—")}</div>
        <div>GSTIN: ${escapeHtml(inv.customerGstin || "—")}</div>
        <div>Email: ${escapeHtml(inv.customerEmail || "—")}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:42px">#</th>
          <th>Description</th>
          <th style="width:90px">HSN/SAC</th>
          <th style="width:70px">Qty</th>
          <th style="width:90px">Rate</th>
          <th style="width:100px">Taxable</th>
          <th style="width:85px">CGST</th>
          <th style="width:85px">SGST</th>
          <th style="width:85px">IGST</th>
          <th style="width:110px">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="10" style="text-align:center">No items</td></tr>`}
      </tbody>
    </table>

    <table style="margin-top:10px; border:none">
      <tbody class="totals">
        <tr><td class="label">Sub Total:</td><td class="value">${subTotal.toFixed(2)}</td></tr>
        <tr><td class="label">CGST Total:</td><td class="value">${totalCgst.toFixed(2)}</td></tr>
        <tr><td class="label">SGST Total:</td><td class="value">${totalSgst.toFixed(2)}</td></tr>
        <tr><td class="label">IGST Total:</td><td class="value">${totalIgst.toFixed(2)}</td></tr>
        <tr><td class="label" style="font-size:13px"><strong>Grand Total:</strong></td>
            <td class="value" style="font-size:13px"><strong>${grandTotal.toFixed(2)}</strong></td></tr>
      </tbody>
    </table>

    <!-- Stamp & Signature row -->
    <div class="row" style="margin-top:14px; gap:20px">
      <div style="flex:1">
        <div style="border:1px dashed #888; height:90px; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#666;">
          Company Stamp
        </div>
      </div>
      <div style="flex:1; text-align:right">
        <div style="margin-top:56px; border-top:1px solid #333; display:inline-block; padding-top:6px;">
          Authorized Signature
        </div>
      </div>
    </div>

    <div class="footer">This is a computer-generated invoice. No signature required.</div>
  </div>
</body>
</html>`;
}

/* escape for printing */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

console.log("✅ App.js loaded");
