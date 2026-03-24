import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  FileText, 
  Building2, 
  User, 
  Package, 
  Calculator, 
  History,
  Printer,
  X,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- Types ---
interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CompanyInfo {
  name: string;
  gstin: string;
  address: string;
  logo: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  company: CompanyInfo;
  clientName: string;
  items: InvoiceItem[];
  gstPercentage: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  createdAt: number;
}

export default function App() {
  // --- State ---
  const [company, setCompany] = useState<CompanyInfo>({
    name: '',
    gstin: '',
    address: '',
    logo: null
  });
  const [clientName, setClientName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }
  ]);
  const [gstPercentage, setGstPercentage] = useState(18);
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const invoiceRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const timestamp = Date.now();
    setInvoiceNumber(`INV-${timestamp}`);
    setDate(new Date().toISOString().split('T')[0]);

    // Load saved invoices
    const stored = localStorage.getItem('probill_invoices');
    if (stored) {
      try {
        setSavedInvoices(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved invoices", e);
      }
    }

    // Load company info if exists
    const storedCompany = localStorage.getItem('probill_company');
    if (storedCompany) {
      try {
        setCompany(JSON.parse(storedCompany));
      } catch (e) {
        console.error("Failed to parse company info", e);
      }
    }
  }, []);

  // --- Calculations ---
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const gstAmount = (subtotal * gstPercentage) / 100;
  const total = subtotal + gstAmount;

  // --- Actions ---
  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveInvoice = () => {
    if (!clientName || items.some(i => !i.name)) {
      setNotification({ message: 'Please fill in all required fields', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      invoiceNumber,
      date,
      company,
      clientName,
      items,
      gstPercentage,
      subtotal,
      gstAmount,
      total,
      createdAt: Date.now()
    };

    const updated = [newInvoice, ...savedInvoices];
    setSavedInvoices(updated);
    localStorage.setItem('probill_invoices', JSON.stringify(updated));
    localStorage.setItem('probill_company', JSON.stringify(company));
    
    setNotification({ message: 'Invoice saved successfully!', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const deleteInvoice = (id: string) => {
    const updated = savedInvoices.filter(inv => inv.id !== id);
    setSavedInvoices(updated);
    localStorage.setItem('probill_invoices', JSON.stringify(updated));
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${invoiceNumber}.pdf`);
      
      setNotification({ message: 'PDF Downloaded!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("PDF Generation failed", error);
      setNotification({ message: 'Failed to generate PDF', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const loadInvoice = (inv: Invoice) => {
    setCompany(inv.company);
    setClientName(inv.clientName);
    setInvoiceNumber(inv.invoiceNumber);
    setDate(inv.date);
    setItems(inv.items);
    setGstPercentage(inv.gstPercentage);
    setShowHistory(false);
  };

  const resetInvoice = () => {
    const timestamp = Date.now();
    setInvoiceNumber(`INV-${timestamp}`);
    setDate(new Date().toISOString().split('T')[0]);
    setClientName('');
    setItems([{ id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }]);
    setNotification({ message: 'New invoice started', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="text-indigo-600" />
              ProBill
            </h1>
            <p className="text-slate-500 text-sm">Professional Billing & Invoice Management</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm font-medium"
            >
              <History size={18} />
              History
            </button>
            <button 
              onClick={resetInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm font-medium"
            >
              <Plus size={18} />
              New Invoice
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Editor Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Details */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
                <Building2 size={20} />
                <h2>Company Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
                    <input 
                      type="text" 
                      value={company.gstin}
                      onChange={(e) => setCompany({...company, gstin: e.target.value})}
                      placeholder="22AAAAA0000A1Z5"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                    <textarea 
                      value={company.address}
                      onChange={(e) => setCompany({...company, address: e.target.value})}
                      placeholder="Business Address"
                      rows={2}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  {company.logo ? (
                    <div className="relative group">
                      <img src={company.logo} alt="Logo" className="max-h-32 object-contain rounded-lg shadow-sm" />
                      <button 
                        onClick={() => setCompany({...company, logo: null})}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors">
                      <ImageIcon size={40} />
                      <span className="text-sm font-medium">Upload Logo</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* Client & Invoice Info */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
                    <User size={20} />
                    <h2>Client Details</h2>
                  </div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Name</label>
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4 text-indigo-600 font-semibold">
                    <FileText size={20} />
                    <h2>Invoice Info</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice #</label>
                      <input 
                        type="text" 
                        value={invoiceNumber}
                        readOnly
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Items Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                  <Package size={20} />
                  <h2>Items</h2>
                </div>
                <button 
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <div className="col-span-6">Item Name</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-3">Price</div>
                  <div className="col-span-1"></div>
                </div>
                
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center p-3 md:p-0 bg-slate-50 md:bg-transparent rounded-xl md:rounded-none">
                    <div className="col-span-1 md:col-span-6">
                      <label className="md:hidden block text-[10px] font-bold text-slate-400 uppercase mb-1">Item Name</label>
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Product or Service"
                        className="w-full px-4 py-2 bg-white md:bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="md:hidden block text-[10px] font-bold text-slate-400 uppercase mb-1">Qty</label>
                      <input 
                        type="number" 
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 bg-white md:bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="md:hidden block text-[10px] font-bold text-slate-400 uppercase mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <input 
                          type="number" 
                          min="0"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full pl-7 pr-4 py-2 bg-white md:bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button 
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Summary & Preview Section */}
          <div className="space-y-6">
            {/* Summary Card */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-indigo-600 font-semibold">
                <Calculator size={20} />
                <h2>Summary</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">GST</span>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
                      <input 
                        type="number" 
                        value={gstPercentage}
                        onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                        className="w-8 bg-transparent text-xs font-bold outline-none text-center"
                      />
                      <span className="text-[10px] font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <span className="font-semibold">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-2xl font-black text-indigo-600 tracking-tight">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button 
                  onClick={saveInvoice}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <Save size={18} />
                  Save Invoice
                </button>
                <button 
                  onClick={downloadPDF}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>
            </section>

            {/* Quick Preview Hint */}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Printer size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-900">Print Preview</h4>
                <p className="text-xs text-indigo-700/70 leading-relaxed mt-1">Scroll down to see the official invoice layout. This is what will be exported to PDF.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Preview (The Printable Part) */}
        <div className="mt-12 mb-20">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Printer className="text-slate-400" size={20} />
            Live Preview
          </h3>
          
          <div className="overflow-x-auto pb-8">
            <div 
              ref={invoiceRef}
              className="w-[210mm] min-h-[297mm] bg-white mx-auto p-[20mm] shadow-2xl border border-[#f1f5f9] text-[#0f172a]"
              style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#ffffff', color: '#0f172a' }}
            >
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-4">
                  {company.logo && (
                    <img src={company.logo} alt="Logo" className="max-h-20 object-contain" />
                  )}
                  <div>
                    <p className="text-xs text-[#64748b] mt-1 max-w-[250px] leading-relaxed" style={{ color: '#64748b' }}>{company.address || 'Address not provided'}</p>
                    {company.gstin && (
                      <p className="text-[10px] font-bold text-[#4f46e5] mt-2" style={{ color: '#4f46e5' }}>GSTIN: {company.gstin}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-4xl font-black text-[#e2e8f0] uppercase tracking-widest mb-4" style={{ color: '#e2e8f0' }}>Invoice</h2>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Invoice Number</p>
                    <p className="text-sm font-bold text-[#0f172a]" style={{ color: '#0f172a' }}>{invoiceNumber}</p>
                  </div>
                  <div className="space-y-1 mt-4">
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Date</p>
                    <p className="text-sm font-bold text-[#0f172a]" style={{ color: '#0f172a' }}>{date}</p>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-12">
                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Bill To</p>
                <h3 className="text-lg font-bold text-[#0f172a]" style={{ color: '#0f172a' }}>{clientName || 'Client Name'}</h3>
              </div>

              {/* Items Table */}
              <table className="w-full mb-12">
                <thead>
                  <tr className="border-b-2 border-[#0f172a]" style={{ borderBottomColor: '#0f172a' }}>
                    <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-[#0f172a]" style={{ color: '#0f172a' }}>Description</th>
                    <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-[#0f172a]" style={{ color: '#0f172a' }}>Qty</th>
                    <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[#0f172a]" style={{ color: '#0f172a' }}>Price</th>
                    <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-[#0f172a]" style={{ color: '#0f172a' }}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]" style={{ borderTopColor: '#f1f5f9' }}>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-4">
                        <p className="text-sm font-semibold text-[#1e293b]" style={{ color: '#1e293b' }}>{item.name || `Item ${idx + 1}`}</p>
                      </td>
                      <td className="py-4 text-center text-sm text-[#475569]" style={{ color: '#475569' }}>{item.quantity}</td>
                      <td className="py-4 text-right text-sm text-[#475569]" style={{ color: '#475569' }}>₹{item.price.toFixed(2)}</td>
                      <td className="py-4 text-right text-sm font-bold text-[#0f172a]" style={{ color: '#0f172a' }}>₹{(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-20">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]" style={{ color: '#64748b' }}>Subtotal</span>
                    <span className="font-semibold text-[#0f172a]" style={{ color: '#0f172a' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]" style={{ color: '#64748b' }}>GST ({gstPercentage}%)</span>
                    <span className="font-semibold text-[#0f172a]" style={{ color: '#0f172a' }}>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-[#0f172a] flex justify-between items-center" style={{ borderTopColor: '#0f172a' }}>
                    <span className="text-base font-black uppercase tracking-widest text-[#0f172a]" style={{ color: '#0f172a' }}>Total</span>
                    <span className="text-xl font-black text-[#4f46e5]" style={{ color: '#4f46e5' }}>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-20 mt-auto">
                <div className="text-center">
                  <div className="border-t border-[#cbd5e1] pt-2" style={{ borderTopColor: '#cbd5e1' }}>
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Customer Signature</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-[#cbd5e1] pt-2" style={{ borderTopColor: '#cbd5e1' }}>
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest" style={{ color: '#94a3b8' }}>Authorized Signature</p>
                    {company.name && (
                      <p className="text-[8px] text-[#94a3b8] mt-1" style={{ color: '#94a3b8' }}>For {company.name}</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="mt-20 pt-8 border-t border-[#f8fafc] text-center" style={{ borderTopColor: '#f8fafc' }}>
                <p className="text-[10px] text-[#94a3b8] font-medium" style={{ color: '#94a3b8' }}>Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="text-indigo-600" />
                  Saved Invoices
                </h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {savedInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">No saved invoices yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedInvoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="group p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer relative"
                      onClick={() => loadInvoice(inv)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{inv.invoiceNumber}</p>
                          <h4 className="font-bold text-slate-900 mt-1">{inv.clientName}</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">{inv.date}</p>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <p className="text-lg font-black text-slate-900">₹{inv.total.toFixed(2)}</p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteInvoice(inv.id);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
            <span className="font-bold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
