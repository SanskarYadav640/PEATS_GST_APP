import React, { useState, useEffect } from 'react';

/* global XLSX */

// --- Main App Component ---
export default function App() {
    // --- State Initialization ---
    const [invoices, setInvoices] = useState(() => {
        try {
            const savedInvoices = localStorage.getItem('peats-invoices');
            return savedInvoices ? JSON.parse(savedInvoices) : [];
        } catch (error) {
            console.error("Error parsing invoices from localStorage", error);
            return [];
        }
    });

    const [customers, setCustomers] = useState(() => {
        try {
            const savedCustomers = localStorage.getItem('peats-customers');
            return savedCustomers ? JSON.parse(savedCustomers) : [];
        } catch (error) {
            console.error("Error parsing customers from localStorage", error);
            return [];
        }
    });

    const [currentView, setCurrentView] = useState('dashboard');
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isXlsxLoaded, setIsXlsxLoaded] = useState(false);

    // --- Effect to save data to localStorage whenever it changes ---
    useEffect(() => {
        try {
            localStorage.setItem('peats-invoices', JSON.stringify(invoices));
            localStorage.setItem('peats-customers', JSON.stringify(customers));
        } catch (error) {
            console.error("Error saving data to localStorage", error);
        }
    }, [invoices, customers]);

    // --- Dynamically load xlsx library ---
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.full.min.js';
        script.async = true;
        script.onload = () => {
            setIsXlsxLoaded(true);
        };
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
    
    // --- Data Management Functions ---
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

    const getNextInvoiceNumber = () => {
        const lastInvoice = invoices
            .filter(inv => inv.invoiceNumber.startsWith('PINV980'))
            .map(inv => parseInt(inv.invoiceNumber.replace('PINV980', ''), 10))
            .sort((a, b) => a - b)
            .pop();

        const lastNum = lastInvoice || 0;
        return `PINV980${(lastNum + 1).toString().padStart(3, '0')}`;
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView invoices={invoices} customers={customers} />;
            case 'invoices':
                return <InvoiceListView invoices={invoices} onEdit={handleEditInvoice} onDelete={deleteData} />;
            case 'invoiceForm':
                return <InvoiceForm 
                    customers={customers} 
                    onSave={(data) => { saveData('invoice', data); handleSetView('invoices'); }} 
                    onCancel={() => handleSetView('invoices')}
                    existingInvoice={editingInvoice} 
                    getNextInvoiceNumber={getNextInvoiceNumber}
                />;
            case 'customers':
                return <CustomerListView customers={customers} onEdit={handleEditCustomer} onDelete={deleteData} />;
            case 'customerForm':
                return <CustomerForm 
                    onSave={(data) => { saveData('customer', data); handleSetView('customers'); }}
                    onCancel={() => handleSetView('customers')}
                    existingCustomer={editingCustomer}
                />;
            case 'reports':
                return <ReportsView invoices={invoices} customers={customers} isXlsxLoaded={isXlsxLoaded} />;
            default:
                return <DashboardView invoices={invoices} customers={customers} />;
        }
    };

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
    email: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
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
const DashboardView = ({ invoices, customers }) => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const outstanding = invoices.reduce((sum, inv) => sum + ((inv.totalAmount || 0) - (inv.amountPaid || 0)), 0);

    return (
        <div>
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Welcome Back!</h2>
                <p className="text-gray-600 mb-4">
                    Your data is saved automatically in your browser. You can export a backup from the 'Reports' page.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Invoices" value={invoices.length} />
                <StatCard title="Total Customers" value={customers.length} />
                <StatCard title="Total Revenue (Paid)" value={`₹${totalRevenue.toFixed(2)}`} />
                <StatCard title="Outstanding Amount" value={`₹${outstanding.toFixed(2)}`} />
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
    const getStatus = (invoice) => {
        const amountPaid = invoice.amountPaid || 0;
        const totalAmount = invoice.totalAmount || 0;
        if (amountPaid >= totalAmount) {
            return { text: 'Paid', color: 'green' };
        }
        if (amountPaid > 0) {
            return { text: 'Partially Paid', color: 'blue' };
        }
        return { text: 'Pending', color: 'yellow' };
    };

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
                        {invoices.map(invoice => {
                            const status = getStatus(invoice);
                            const colorClasses = {
                                green: 'bg-green-100 text-green-800',
                                blue: 'bg-blue-100 text-blue-800',
                                yellow: 'bg-yellow-100 text-yellow-800',
                            };
                            return (
                                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-700">{invoice.invoiceNumber}</td>
                                    <td className="p-3">{invoice.customerName}</td>
                                    <td className="p-3">{invoice.invoiceDate}</td>
                                    <td className="p-3">₹{invoice.totalAmount?.toFixed(2)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status.color]}`}>
                                            {status.text}
                                        </span>
                                    </td>
                                    <td className="p-3 flex items-center space-x-2">
                                        <button onClick={() => onEdit(invoice)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                        <button onClick={() => handleDelete(invoice.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"><Icon path={ICONS.delete} className="w-5 h-5" /></button>
                                        <button onClick={() => handlePrint(invoice)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.print} className="w-5 h-5" /></button>
                                    </td>
                                </tr>
                            );
                        })}
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
                            <th className="p-3">Company</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(customer => (
                            <tr key={customer.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-700">{customer.name}</td>
                                <td className="p-3">{customer.companyName}</td>
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

const ReportsView = ({ invoices, customers, isXlsxLoaded }) => {
    const exportToExcel = () => {
        if (!isXlsxLoaded) {
            console.error('Excel library (XLSX) is not loaded yet.');
            alert('Excel library is loading. Please try again in a moment.');
            return;
        }

        try {
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
                    'Freight Charges': invoice.freightCharges || 0,
                    'Invoice Total': invoice.totalAmount,
                    'Amount Paid': invoice.amountPaid || 0,
                    'Remaining Amount': (invoice.totalAmount || 0) - (invoice.amountPaid || 0),
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
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("Error exporting to Excel:", error);
            alert("An error occurred while creating the Excel file.");
        }
    };

    const handleSendReminder = (invoice, customer, remainingAmount, dueDays) => {
        const subject = `Payment Reminder for Invoice #${invoice.invoiceNumber}`;
        const body = `
Dear ${customer.name},

This is a friendly reminder regarding invoice #${invoice.invoiceNumber}, which was due ${dueDays} days ago.

The remaining amount to be paid is ₹${remainingAmount.toFixed(2)}.

We would appreciate it if you could look into this at your earliest convenience. Please let us know if you have any questions.

Thank you for your business.

Best regards,
ParthaSarthi Engineering and Training Services
        `;
        const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
        window.location.href = mailtoLink;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-700">Financial Reports</h2>
                <button 
                    onClick={exportToExcel} 
                    disabled={!isXlsxLoaded}
                    className={`flex items-center px-4 py-2 rounded-lg transition text-white ${!isXlsxLoaded ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                >
                    <Icon path={ICONS.download} className="w-5 h-5 mr-2" />
                    {isXlsxLoaded ? 'Export Master Excel' : 'Loading...'}
                </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-600 mb-4">Outstanding Invoices</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Amount Received</th>
                            <th className="p-3">Remaining Amount</th>
                            <th className="p-3">Due Since (Days)</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.filter(inv => (inv.totalAmount || 0) > (inv.amountPaid || 0)).map(invoice => {
                            const remainingAmount = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
                            const dueDate = new Date(invoice.dueDate);
                            const today = new Date();
                            const dueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                            const customer = customers.find(c => c.id === invoice.customerId);

                            return (
                                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{invoice.invoiceNumber}</td>
                                    <td className="p-3">{invoice.customerName}</td>
                                    <td className="p-3">₹{(invoice.amountPaid || 0).toFixed(2)}</td>
                                    <td className="p-3 font-bold">₹{remainingAmount.toFixed(2)}</td>
                                    <td className={`p-3 ${dueDays > 0 ? 'text-red-600 font-semibold' : ''}`}>{dueDays > 0 ? dueDays : 'N/A'}</td>
                                    <td className="p-3">
                                        {customer && customer.email && dueDays > 0 && (
                                            <button 
                                                onClick={() => handleSendReminder(invoice, customer, remainingAmount, dueDays)}
                                                className="flex items-center text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition">
                                                <Icon path={ICONS.email} className="w-4 h-4 mr-2" />
                                                Send Reminder
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Form Components ---
const InvoiceForm = ({ customers, onSave, onCancel, existingInvoice, getNextInvoiceNumber }) => {
    const [invoiceData, setInvoiceData] = useState({
        id: existingInvoice?.id || null,
        invoiceNumber: existingInvoice?.invoiceNumber || getNextInvoiceNumber(),
        invoiceDate: existingInvoice?.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: existingInvoice?.dueDate || '',
        customerId: existingInvoice?.customerId || '',
        customerName: existingInvoice?.customerName || '',
        customerAddress: existingInvoice?.customerAddress || '',
        customerGstin: existingInvoice?.customerGstin || '',
        items: existingInvoice?.items || [{ description: '', hsn: '', quantity: 1, rate: 0, gstType: 'cgst_sgst', cgst: 0, sgst: 0, igst: 0, total: 0 }],
        freightCharges: existingInvoice?.freightCharges || 0,
        amountPaid: existingInvoice?.amountPaid || 0,
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

        if(field === 'gstType') {
            newItems[index].cgst = 0;
            newItems[index].sgst = 0;
            newItems[index].igst = 0;
        }
        
        const item = newItems[index];
        const taxableValue = (item.quantity || 0) * (item.rate || 0);
        const cgstAmount = item.gstType === 'cgst_sgst' ? taxableValue * (item.cgst || 0) / 100 : 0;
        const sgstAmount = item.gstType === 'cgst_sgst' ? taxableValue * (item.sgst || 0) / 100 : 0;
        const igstAmount = item.gstType === 'igst' ? taxableValue * (item.igst || 0) / 100 : 0;
        newItems[index].total = taxableValue + cgstAmount + sgstAmount + igstAmount;
        
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const addItem = () => {
        setInvoiceData({
            ...invoiceData,
            items: [...invoiceData.items, { description: '', hsn: '', quantity: 1, rate: 0, gstType: 'cgst_sgst', cgst: 0, sgst: 0, igst: 0, total: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = invoiceData.items.filter((_, i) => i !== index);
        setInvoiceData({ ...invoiceData, items: newItems });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const subTotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const totalTax = invoiceData.items.reduce((sum, item) => sum + (item.total - (item.quantity * item.rate)), 0);
        const freight = parseFloat(invoiceData.freightCharges) || 0;
        const totalAmount = subTotal + totalTax + freight;
        onSave({ ...invoiceData, totalAmount });
    };
    
    const subTotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = invoiceData.items.reduce((sum, item) => sum + (item.total - (item.quantity * item.rate)), 0);
    const freight = parseFloat(invoiceData.freightCharges) || 0;
    const totalAmount = subTotal + totalTax + freight;
    const amountPaid = parseFloat(invoiceData.amountPaid) || 0;
    const amountDue = totalAmount - amountPaid;

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField label="Invoice #" value={invoiceData.invoiceNumber} readOnly />
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
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName})</option>)}
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
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-32">GST Type</th>
                                <th className="p-2 text-left text-sm font-semibold text-gray-600 w-20">Tax (%)</th>
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
                                    <td>
                                        <select value={item.gstType} onChange={e => handleItemChange(index, 'gstType', e.target.value)} className="w-full p-2 border rounded-md bg-white">
                                            <option value="cgst_sgst">CGST/SGST</option>
                                            <option value="igst">IGST</option>
                                        </select>
                                    </td>
                                    <td>
                                        {item.gstType === 'cgst_sgst' ? (
                                            <div className="flex space-x-1">
                                                <input placeholder="CGST" type="number" value={item.cgst} onChange={e => handleItemChange(index, 'cgst', parseFloat(e.target.value))} className="w-1/2 p-2 border rounded-md" />
                                                <input placeholder="SGST" type="number" value={item.sgst} onChange={e => handleItemChange(index, 'sgst', parseFloat(e.target.value))} className="w-1/2 p-2 border rounded-md" />
                                            </div>
                                        ) : (
                                            <input placeholder="IGST" type="number" value={item.igst} onChange={e => handleItemChange(index, 'igst', parseFloat(e.target.value))} className="w-full p-2 border rounded-md" />
                                        )}
                                    </td>
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
                <div className="w-full md:w-1/2 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Freight Charges:</span>
                        <input type="number" value={invoiceData.freightCharges} onChange={e => setInvoiceData({...invoiceData, freightCharges: e.target.value})} className="w-32 p-2 border rounded-md" />
                    </div>
                     <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span> <span>₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Total Tax:</span> <span>₹{totalTax.toFixed(2)}</span></div>
                    <hr/>
                    <div className="flex justify-between font-bold text-lg"><span className="text-gray-800">Total Amount:</span> <span>₹{totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Amount Paid:</span>
                        <input type="number" value={invoiceData.amountPaid} onChange={e => setInvoiceData({...invoiceData, amountPaid: e.target.value})} className="w-32 p-2 border rounded-md" />
                    </div>
                    <div className="flex justify-between font-bold text-xl text-red-600"><span className="text-gray-800">Amount Due:</span> <span>₹{amountDue.toFixed(2)}</span></div>

                </div>
            </div>
            <div className="flex justify-end space-x-4 border-t pt-6">
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
        companyName: existingCustomer?.companyName || '',
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
            <InputField label="Contact Person Name" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} required />
            <InputField label="Company Name" value={customerData.companyName} onChange={e => setCustomerData({...customerData, companyName: e.target.value})} />
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

const InputField = ({ label, type = 'text', value, onChange, required = false, readOnly = false }) => (
    <div className="flex flex-col">
        <label className="mb-1 font-medium text-gray-600">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            readOnly={readOnly}
            className={`p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${readOnly ? 'bg-gray-100' : ''}`}
        />
    </div>
);

// --- Printable Invoice Generator ---
const generatePrintableInvoice = (invoice) => {
    const subTotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = invoice.items.reduce((sum, item) => sum + (item.total - (item.quantity * item.rate)), 0);
    const freight = parseFloat(invoice.freightCharges) || 0;
    const totalAmount = invoice.totalAmount;
    const amountPaid = invoice.amountPaid || 0;
    const amountDue = totalAmount - amountPaid;

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
                         ${freight > 0 ? `
                        <tr class="total">
                            <td colspan="6" class="text-right">Freight Charges:</td>
                            <td class="text-right">₹${freight.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr class="total">
                            <td colspan="6" class="text-right"><strong>Total Amount:</strong></td>
                            <td class="text-right"><strong>₹${totalAmount.toFixed(2)}</strong></td>
                        </tr>
                         <tr class="total">
                            <td colspan="6" class="text-right">Amount Paid:</td>
                            <td class="text-right">₹${amountPaid.toFixed(2)}</td>
                        </tr>
                         <tr class="total" style="color: red;">
                            <td colspan="6" class="text-right"><strong>Amount Due:</strong></td>
                            <td class="text-right"><strong>₹${amountDue.toFixed(2)}</strong></td>
                        </tr>
                    </table>
                </div>
            </body>
        </html>
    `;
};
