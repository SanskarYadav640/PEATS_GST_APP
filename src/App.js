import React, { useState, useEffect, useRef } from 'react';

// --- Main App Component ---
export default function App() {
    // All data is now stored in the browser's memory (React state).
    // It will reset every time you close or refresh the page.
    const [user, setUser] = useState({ uid: 'local-user' }); // Mock user object
    const [currentView, setCurrentView] = useState('dashboard');
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false); // No initial loading needed
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // --- Dynamically load xlsx library for Excel import/export ---
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.full.min.js';
        script.async = true;
        document.head.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }
    }, []);

    // --- Event Handlers ---
    const handleSetView = (view) => {
        setEditingInvoice(null);
        setEditingCustomer(null);
        setCurrentView(view);
    };

    const handleEditInvoice = (invoice) => {
        setEditingInvoice(invoice);
        setCurrentView('invoiceForm');
    };

    const handleEditCustomer = (customer) => {
        setEditingCustomer(customer);
        setCurrentView('customerForm');
    };
    
    // --- Data Management Functions (replaces Firebase) ---
    const saveData = (type, data) => {
        const id = data.id || Date.now().toString();
        const finalData = { ...data, id };

        if (type === 'invoice') {
            setInvoices(prev => {
                const exists = prev.some(item => item.id === id);
                if (exists) {
                    return prev.map(item => item.id === id ? finalData : item);
                }
                return [...prev, finalData];
            });
        } else if (type === 'customer') {
            setCustomers(prev => {
                const exists = prev.some(item => item.id === id);
                if (exists) {
                    return prev.map(item => item.id === id ? finalData : item);
                }
                return [...prev, finalData];
            });
        }
    };

    const deleteData = (type, id) => {
        if (type === 'invoice') {
            setInvoices(prev => prev.filter(item => item.id !== id));
        } else if (type === 'customer') {
            setCustomers(prev => prev.filter(item => item.id !== id));
        }
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView invoices={invoices} customers={customers} setInvoices={setInvoices} setCustomers={setCustomers} />;
            case 'invoices':
                return <InvoiceListView invoices={invoices} onEdit={handleEditInvoice} onDelete={deleteData} setView={handleSetView} />;
            case 'invoiceForm':
                return <InvoiceForm 
                    customers={customers} 
                    onSave={(data) => { saveData('invoice', data); handleSetView('invoices'); }} 
                    onCancel={() => handleSetView('invoices')}
                    existingInvoice={editingInvoice} 
                />;
            case 'customers':
                return <CustomerListView customers={customers} onEdit={handleEditCustomer} onDelete={deleteData} setView={handleSetView} />;
            case 'customerForm':
                return <CustomerForm 
                    onSave={(data) => { saveData('customer', data); handleSetView('customers'); }}
                    onCancel={() => handleSetView('customers')}
                    existingCustomer={editingCustomer}
                />;
            case 'reports':
                return <ReportsView invoices={invoices} />;
            default:
                return <DashboardView invoices={invoices} customers={customers} />;
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading PEATS Invoicing System...</div></div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar currentView={currentView} setView={handleSetView} />
            <main className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto">
                <Header currentView={currentView} setView={handleSetView} />
                {renderView()}
            </main>
        </div>
    );
}

// --- SVG Icons ---
const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const ICONS = {
    dashboard: "M3.75 13.5l3.75-3.75m0 0h16.5m-16.5 0l3.75 3.75M3.75 6.75h16.5",
    invoice: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    customers: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.042-2.72a3 3 0 00-4.682 2.72 9.094 9.094 0 003.741.479m7.042-2.72a3 3 0 00-4.682 2.72M12 18.72a9.094 9.094 0 01-3.741-.479 3 3 0 014.682-2.72m-3.182 2.72a3 3 0 014.682 2.72 9.094 9.094 0 01-3.741.479M12 12a3 3 0 100-6 3 3 0 000 6z",
    reports: "M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 3H20.25M3.75 3v.375c0 .621.504 1.125 1.125 1.125h14.25c.621 0 1.125-.504 1.125-1.125V3",
    add: "M12 4.5v15m7.5-7.5h-15",
    edit: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
    delete: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
    print: "M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 18.25M10 3.75v9.75m-10-8.25h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75A1.5 1.5 0 012.25 16.5v-12a1.5 1.5 0 011.5-1.5H10V3.75z",
    download: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
    upload: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
};

// --- Company Details ---
const companyDetails = {
    name: "ParthaSarthi Engineering and Training Services (PEATS)",
    phone: "7617001477, 9889031719",
    email: "Parthasarthiconsultancy@gmail.com",
    owners: "Mr. Ramkaran Yadav & Mr. Ajay Shankar Amist",
    address: "Tower 3, Goldfinch, Paarth Republic, Kanpur Road, Miranpur, Pinvat, Banthra, Sikandarpur, Post- Banthra Dist. - Lucknow, Pin- 226401"
};

// --- Layout Components ---
const Sidebar = ({ currentView, setView }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
        { id: 'invoices', label: 'Invoices', icon: ICONS.invoice },
        { id: 'customers', label: 'Customers', icon: ICONS.customers },
        { id: 'reports', label: 'Reports', icon: ICONS.reports },
    ];

    return (
        <nav className="w-20 lg:w-64 bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-center lg:justify-start p-4 lg:p-6 border-b">
                <span className="text-2xl font-bold text-indigo-600">PEATS</span>
            </div>
            <ul className="flex-1 mt-6">
                {navItems.map(item => (
                    <li key={item.id} className="px-4 lg:px-6 mb-2">
                        <button
                            onClick={() => setView(item.id)}
                            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                                currentView === item.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                        >
                            <Icon path={item.icon} className="w-6 h-6" />
                            <span className="ml-4 hidden lg:block font-medium">{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const Header = ({ currentView, setView }) => {
    const getTitle = () => {
        switch(currentView) {
            case 'dashboard': return 'Dashboard';
            case 'invoices': return 'Invoices';
            case 'invoiceForm': return 'Create/Edit Invoice';
            case 'customers': return 'Customers';
            case 'customerForm': return 'Create/Edit Customer';
            case 'reports': return 'Reports';
            default: return 'Dashboard';
        }
    };

    const showAddButton = ['invoices', 'customers'].includes(currentView);
    const handleAddClick = () => {
        if (currentView === 'invoices') setView('invoiceForm');
        if (currentView === 'customers') setView('customerForm');
    };

    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">{getTitle()}</h1>
                <p className="text-gray-500">Your GST Invoicing and Management Hub</p>
            </div>
            {showAddButton && (
                 <button onClick={handleAddClick} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow">
                    <Icon path={ICONS.add} className="w-5 h-5 mr-2" />
                    Add New
                </button>
            )}
        </div>
    );
};


// --- View Components ---
const DashboardView = ({ invoices, customers, setInvoices, setCustomers }) => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const outstanding = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const fileInputRef = useRef(null);

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    alert('Excel library not loaded yet. Please wait a moment and try again.');
                    return;
                }
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Reconstruct invoices and customers from the flat Excel data
                const invoiceSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(invoiceSheet);
                
                const importedInvoices = {};
                const importedCustomers = {};

                jsonData.forEach(row => {
                    const invoiceId = row['Invoice ID'];
                    if (!importedInvoices[invoiceId]) {
                        importedInvoices[invoiceId] = {
                            id: invoiceId,
                            invoiceNumber: row['Invoice #'],
                            invoiceDate: row['Invoice Date'],
                            dueDate: row['Due Date'],
                            customerId: row['Customer ID'],
                            customerName: row['Customer Name'],
                            customerAddress: row['Customer Address'],
                            customerGstin: row['Customer GSTIN'],
                            status: row['Invoice Status'],
                            totalAmount: row['Invoice Total'],
                            items: []
                        };
                    }
                    
                    importedInvoices[invoiceId].items.push({
                        description: row['Item Description'],
                        hsn: row['HSN/SAC'],
                        quantity: row['Quantity'],
                        rate: row['Rate'],
                        cgst: row['CGST Rate (%)'],
                        sgst: row['SGST Rate (%)'],
                        igst: row['IGST Rate (%)'],
                        total: row['Total Item Value'],
                    });

                    const customerId = row['Customer ID'];
                    if (!importedCustomers[customerId]) {
                        importedCustomers[customerId] = {
                            id: customerId,
                            name: row['Customer Name'],
                            address: row['Customer Address'],
                            gstin: row['Customer GSTIN'],
                            // Assuming email/phone are not in this export, add if they are
                            email: '', 
                            phone: ''
                        };
                    }
                });

                setInvoices(Object.values(importedInvoices));
                setCustomers(Object.values(importedCustomers));
                alert('Data imported successfully!');

            } catch (error) {
                console.error("Error importing file:", error);
                alert("Failed to import data. The file might be corrupted or in the wrong format.");
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset file input to allow re-uploading the same file
        event.target.value = null;
    };

    return (
        <div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Manage Your Data</h2>
                <p className="text-gray-600 mb-4">
                    Your data is not saved automatically. Please import your last saved file to begin, and export your data before closing.
                </p>
                <div className="flex space-x-4">
                    <button 
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
                        <Icon path={ICONS.upload} className="w-5 h-5 mr-2" />
                        Import Data from Excel
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Invoices" value={invoices.length} />
                <StatCard title="Total Customers" value={customers.length} />
                <StatCard title="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} />
                <StatCard title="Outstanding" value={`₹${outstanding.toFixed(2)}`} />
            </div>
        </div>
    );
};

const StatCard = ({ title, value }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
        <h3 className="text-gray-500 font-medium">{title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
);

const InvoiceListView = ({ invoices, onEdit, onDelete }) => {
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this invoice? This cannot be undone.")) {
            onDelete('invoice', id);
        }
    };

    const handlePrint = (invoice) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(generatePrintableInvoice(invoice));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => (
                            <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-700">{invoice.invoiceNumber}</td>
                                <td className="p-3">{invoice.customerName}</td>
                                <td className="p-3">{invoice.invoiceDate}</td>
                                <td className="p-3">₹{invoice.totalAmount?.toFixed(2)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>{invoice.status}</span>
                                </td>
                                <td className="p-3 flex items-center space-x-2">
                                    <button onClick={() => onEdit(invoice)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(invoice.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"><Icon path={ICONS.delete} className="w-5 h-5" /></button>
                                    <button onClick={() => handlePrint(invoice)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.print} className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const CustomerListView = ({ customers, onEdit, onDelete }) => {
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this customer? This cannot be undone.")) {
            onDelete('customer', id);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-700">{customer.name}</td>
                                <td className="p-3">{customer.email}</td>
                                <td className="p-3">{customer.phone}</td>
                                <td className="p-3 flex items-center space-x-2">
                                    <button onClick={() => onEdit(customer)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                    <button onClick={() => handleDelete(customer.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"><Icon path={ICONS.delete} className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ReportsView = ({ invoices }) => {
    const exportToExcel = () => {
        if (typeof XLSX === 'undefined') {
            alert('Excel library is loading. Please try again in a moment.');
            return;
        }

        const worksheetData = invoices.flatMap(invoice => 
            (invoice.items || []).map(item => ({
                'Invoice ID': invoice.id,
                'Invoice #': invoice.invoiceNumber,
                'Invoice Date': invoice.invoiceDate,
                'Due Date': invoice.dueDate,
                'Customer ID': invoice.customerId,
                'Customer Name': invoice.customerName,
                'Customer Address': invoice.customerAddress,
                'Customer GSTIN': invoice.customerGstin,
                'Item Description': item.description,
                'HSN/SAC': item.hsn,
                'Quantity': item.quantity,
                'Rate': item.rate,
                'Taxable Value': item.quantity * item.rate,
                'CGST Rate (%)': item.cgst,
                'CGST Amount': (item.quantity * item.rate * item.cgst) / 100,
                'SGST Rate (%)': item.sgst,
                'SGST Amount': (item.quantity * item.rate * item.sgst) / 100,
                'IGST Rate (%)': item.igst,
                'IGST Amount': (item.quantity * item.rate * item.igst) / 100,
                'Total Item Value': item.total,
                'Invoice Total': invoice.totalAmount,
                'Invoice Status': invoice.status,
            }))
        );

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'PEATS_Master_Invoice_Data.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Simple monthly summary
    const monthlyData = invoices.reduce((acc, inv) => {
        try {
            const month = new Date(inv.invoiceDate).toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!acc[month]) {
                acc[month] = { total: 0, count: 0 };
            }
            acc[month].total += inv.totalAmount || 0;
            acc[month].count += 1;
        } catch (e) {
            // Ignore invalid dates
        }
        return acc;
    }, {});

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700">GST & Sales Reports</h2>
                <button onClick={exportToExcel} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">
                    <Icon path={ICONS.download} className="w-5 h-5 mr-2" />
                    Export Master Excel
                </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Monthly Summary</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-3">Month</th>
                            <th className="p-3">Invoices Issued</th>
                            <th className="p-3">Total Sales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(monthlyData).map(([month, data]) => (
                            <tr key={month} className="border-b hover:bg-gray-50">
                                <td className="p-3">{month}</td>
                                <td className="p-3">{data.count}</td>
                                <td className="p-3">₹{data.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Form Components ---
const InvoiceForm = ({ customers, onSave, onCancel, existingInvoice }) => {
    const [invoiceData, setInvoiceData] = useState({
        id: existingInvoice?.id || null,
        invoiceNumber: existingInvoice?.invoiceNumber || '',
        invoiceDate: existingInvoice?.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: existingInvoice?.dueDate || '',
        customerId: existingInvoice?.customerId || '',
        customerName: existingInvoice?.customerName || '',
        customerAddress: existingInvoice?.customerAddress || '',
        customerGstin: existingInvoice?.customerGstin || '',
        items: existingInvoice?.items || [{ description: '', hsn: '', quantity: 1, rate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }],
        status: existingInvoice?.status || 'pending',
    });

    const handleCustomerSelect = (e) => {
        const selectedCustomer = customers.find(c => c.id === e.target.value);
        if (selectedCustomer) {
            setInvoiceData({
                ...invoiceData,
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                customerAddress: selectedCustomer.address,
                customerGstin: selectedCustomer.gstin,
            });
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...invoiceData.items];
        newItems[index][field] = value;
        
        const item = newItems[index];
        const taxableValue = (item.quantity || 0) * (item.rate || 0);
        const cgstAmount = taxableValue * (item.cgst || 0) / 100;
        const sgstAmount = taxableValue * (item.sgst || 0) / 100;
        const igstAmount = taxableValue * (item.igst || 0) / 100;
        newItems[index].total = taxableValue + cgstAmount + sgstAmount + igstAmount;
        
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const addItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { description: '', hsn: '', quantity: 1, rate: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = invoiceData.items.filter((_, i) => i !== index);
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.total, 0);
        onSave({ ...invoiceData, totalAmount });
    };
    
    const subTotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = invoiceData.items.reduce((sum, item) => sum + (item.total - (item.quantity * item.rate)), 0);
    const totalAmount = subTotal + totalTax;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField label="Invoice #" value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})} required />
                <InputField label="Invoice Date" type="date" value={invoiceData.invoiceDate} onChange={e => setInvoiceData({...invoiceData, invoiceDate: e.target.value})} required />
                <InputField label="Due Date" type="date" value={invoiceData.dueDate} onChange={e => setInvoiceData({...invoiceData, dueDate: e.target.value})} />
            </div>
            <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                        <label className="mb-1 font-medium text-gray-600">Select Customer</label>
                        <select onChange={handleCustomerSelect} value={invoiceData.customerId} className="p-2 border rounded-md bg-white">
                            <option value="">-- Select Existing Customer --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <InputField label="Customer Name" value={invoiceData.customerName} onChange={e => setInvoiceData({...invoiceData, customerName: e.target.value})} required />
                    <InputField label="Customer Address" value={invoiceData.customerAddress} onChange={e => setInvoiceData({...invoiceData, customerAddress: e.target.value})} />
                    <InputField label="Customer GSTIN" value={invoiceData.customerGstin} onChange={e => setInvoiceData({...invoiceData, customerGstin: e.target.value})} />
                </div>
            </div>
            <div className="border-t pt-6">
                 <h3 className="text-lg font-semibold text-gray-700 mb-4">Invoice Items</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-2 text-left text-sm font-semibold text-gray-600">Description</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-24">HSN/SAC</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-20">Qty</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-28">Rate</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-20">CGST (%)</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-20">SGST (%)</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-20">IGST (%)</th>
                                <th className="p-2 text-right text-sm font-semibold text-gray-600 w-32">Total</th>
                                <th className="p-2 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.items.map((item, index) => (
                                <tr key={index}>
                                    <td><input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="text" value={item.hsn} onChange={e => handleItemChange(index, 'hsn', e.target.value)} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="number" value={item.rate} onChange={e => handleItemChange(index, 'rate', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="number" value={item.cgst} onChange={e => handleItemChange(index, 'cgst', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="number" value={item.sgst} onChange={e => handleItemChange(index, 'sgst', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" /></td>
                                    <td><input type="number" value={item.igst} onChange={e => handleItemChange(index, 'igst', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" /></td>
                                    <td className="p-2 text-right font-medium">₹{item.total.toFixed(2)}</td>
                                    <td><button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2"><Icon path={ICONS.delete} className="w-5 h-5"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                <button type="button" onClick={addItem} className="mt-4 flex items-center text-indigo-600 font-semibold hover:text-indigo-800">
                    <Icon path={ICONS.add} className="w-5 h-5 mr-2"/> Add Item
                </button>
            </div>
            <div className="flex justify-end mt-6">
                <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span> <span>₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Total Tax:</span> <span>₹{totalTax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-xl"><span className="text-gray-800">Total:</span> <span>₹{totalAmount.toFixed(2)}</span></div>
                </div>
            </div>
            <div className="flex justify-end space-x-4 border-t pt-6">
                 <div className="flex-1">
                    <label className="mb-1 font-medium text-gray-600">Status</label>
                    <select value={invoiceData.status} onChange={e => setInvoiceData({...invoiceData, status: e.target.value})} className="p-2 border rounded-md bg-white w-full md:w-auto">
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">{existingInvoice ? 'Update Invoice' : 'Save Invoice'}</button>
            </div>
        </form>
    );
};

const CustomerForm = ({ onSave, onCancel, existingCustomer }) => {
    const [customerData, setCustomerData] = useState({
        id: existingCustomer?.id || null,
        name: existingCustomer?.name || '',
        email: existingCustomer?.email || '',
        phone: existingCustomer?.phone || '',
        address: existingCustomer?.address || '',
        gstin: existingCustomer?.gstin || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(customerData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6 max-w-lg mx-auto">
            <InputField label="Name" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} required />
            <InputField label="Email" type="email" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} />
            <InputField label="Phone" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} />
            <InputField label="Address" value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} />
            <InputField label="GSTIN" value={customerData.gstin} onChange={e => setCustomerData({...customerData, gstin: e.target.value})} />
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">{existingCustomer ? 'Update Customer' : 'Save Customer'}</button>
            </div>
        </form>
    );
};

const InputField = ({ label, type = 'text', value, onChange, required = false }) => (
    <div className="flex flex-col">
        <label className="mb-1 font-medium text-gray-600">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            className="p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
    </div>
);

// --- Printable Invoice Generator ---
const generatePrintableInvoice = (invoice) => {
    const subTotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = invoice.items.reduce((sum, item) => sum + (item.total - (item.quantity * item.rate)), 0);
    const totalAmount = invoice.totalAmount;

    const itemsHtml = invoice.items.map(item => `
        <tr class="item">
            <td>${item.description}</td>
            <td>${item.hsn}</td>
            <td>${item.quantity}</td>
            <td>${item.rate.toFixed(2)}</td>
            <td>${((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)).toFixed(1)}%</td>
            <td>${(item.quantity * item.rate).toFixed(2)}</td>
            <td class="text-right">${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <html>
            <head>
                <title>Invoice #${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .header h1 { font-size: 45px; line-height: 45px; color: #333; margin: 0; }
                    .company-details { text-align: right; }
                    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .details-box { line-height: 1.4; }
                    table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                    table td { padding: 8px; vertical-align: top; }
                    table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
                    table tr.item td { border-bottom: 1px solid #eee; }
                    table tr.total td { border-top: 2px solid #eee; font-weight: bold; }
                    .text-right { text-align: right; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <div>
                            <h1>INVOICE</h1>
                            <div class="details-box">
                                Invoice #: ${invoice.invoiceNumber}<br>
                                Date: ${invoice.invoiceDate}<br>
                                Due Date: ${invoice.dueDate}
                            </div>
                        </div>
                        <div class="company-details">
                            <strong>${companyDetails.name}</strong><br>
                            ${companyDetails.address.replace(/\n/g, '<br>')}<br>
                            ${companyDetails.phone}<br>
                            ${companyDetails.email}
                        </div>
                    </div>
                    <div class="details">
                        <div class="details-box">
                            <strong>Bill To:</strong><br>
                            ${invoice.customerName}<br>
                            ${(invoice.customerAddress || '').replace(/\n/g, '<br>')}<br>
                            GSTIN: ${invoice.customerGstin}
                        </div>
                    </div>
                    <table>
                        <tr class="heading">
                            <td>Description</td>
                            <td>HSN/SAC</td>
                            <td>Qty</td>
                            <td>Rate</td>
                            <td>Tax %</td>
                            <td>Taxable Value</td>
                            <td class="text-right">Total</td>
                        </tr>
                        ${itemsHtml}
                        <tr class="total">
                            <td colspan="6" class="text-right">Subtotal:</td>
                            <td class="text-right">₹${subTotal.toFixed(2)}</td>
                        </tr>
                        <tr class="total">
                            <td colspan="6" class="text-right">Total Tax:</td>
                            <td class="text-right">₹${totalTax.toFixed(2)}</td>
                        </tr>
                        <tr class="total">
                            <td colspan="6" class="text-right"><strong>Total Amount:</strong></td>
                            <td class="text-right"><strong>₹${totalAmount.toFixed(2)}</strong></td>
                        </tr>
                    </table>
                </div>
            </body>
        </html>
    `;
};
