import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Phone, 
  UserPlus, 
  Calendar, 
  Search, 
  Plus, 
  X, 
  Mail, 
  Building,
  PhoneCall,
  Trash2,
  Upload
} from 'lucide-react';
import { fetchContacts, addContact, deleteContact, bulkImportContacts } from '../store/contactSlice';
import { startOutboundCall } from '../store/callSlice';
import { addReminder } from '../store/reminderSlice';
import { socketInstance } from '../components/Layout';

export default function Contacts() {
  const dispatch = useDispatch();
  const { list: contacts, loading } = useSelector((state) => state.contacts);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '', phone: '', email: '', company: '', status: 'Lead'
  });
  const [addContactError, setAddContactError] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [excelPasteData, setExcelPasteData] = useState('');
  const [excelImportError, setExcelImportError] = useState('');

  // Schedule Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [reminderData, setReminderData] = useState({
    title: '', description: '', dueDate: ''
  });
  const [reminderError, setReminderError] = useState(null);

  useEffect(() => {
    dispatch(fetchContacts());
  }, [dispatch]);

  const handleCall = (contact) => {
    dispatch(startOutboundCall(contact));
  };

  const handleSimulateInbound = (contact) => {
    if (socketInstance) {
      socketInstance.emit('simulate_inbound_call', {
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone
      });
    }
  };

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    setAddContactError(null);
    if (!newContact.name || !newContact.phone) {
      setAddContactError('Name and Phone number are required.');
      return;
    }
    try {
      await dispatch(addContact(newContact)).unwrap();
      setShowAddContactModal(false);
      setNewContact({ name: '', phone: '', email: '', company: '', status: 'Lead' });
    } catch (err) {
      setAddContactError(err || 'Failed to add contact.');
    }
  };

  const handleExcelPasteImport = async (event) => {
    event.preventDefault();
    await importExcelRows(excelPasteData);
  };

  const importExcelRows = async (rawData) => {
    setImportMessage('');
    setExcelImportError('');
    try {
      const rows = rawData.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,/).map(value => value.trim()));
      if (rows.length === 0) throw new Error('Copy one or more contact rows from Excel first.');
      // The downloadable Excel template includes a title and instructions above
      // its columns, so locate the Name / Phone header rather than assuming row 1.
      const headerRowIndex = rows.findIndex(row => row[0]?.toLowerCase() === 'name' && row[1]?.toLowerCase() === 'phone');
      const contactRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex + 1) : rows;
      const contactsToImport = contactRows.map(([name, phone, email = '', company = '', status = 'Lead']) => ({ name, phone, email, company, status: status || 'Lead' }));
      if (!contactsToImport.length || contactsToImport.some(contact => !contact.name || !contact.phone)) throw new Error('Each row must include Name and Phone.');
      const result = await dispatch(bulkImportContacts(contactsToImport)).unwrap();
      setImportMessage(`${result.imported.length} contact(s) imported${result.skipped ? `; ${result.skipped} skipped.` : '.'}`);
      setExcelPasteData('');
      setShowExcelImport(false);
    } catch (error) {
      setExcelImportError(typeof error === 'string' ? error : 'Unable to import the pasted contacts.');
    }
  };

  const handleTemplateFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let fileData;
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        fileData = XLSX.utils.sheet_to_csv(firstSheet, { FS: '\t' });
      } else {
        fileData = await file.text();
      }
      if (!fileData.trim()) throw new Error('The selected template is empty. Add contact rows in Excel, save it, and choose the file again.');
      setExcelPasteData(fileData);
      setExcelImportError('');
    } catch (error) {
      setExcelImportError(error.message || 'Unable to load the selected template.');
    } finally {
      event.target.value = '';
    }
  };

  const downloadExcelTemplate = () => {
    const template = 'Name\tPhone\tEmail\tCompany\tStatus\nAisha Sharma\t+91 98765 43210\taisha@example.com\tExample Company\tLead';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([template], { type: 'text/tab-separated-values' }));
    link.download = 'contact-import-template.tsv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openReminderModal = (contact) => {
    setSelectedContact(contact);
    // Set default reminder time to 1 hour from now formatted for datetime-local input
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const timezoneOffset = d.getTimezoneOffset() * 60000; // in milliseconds
    const localISOTime = new Date(d.getTime() - timezoneOffset).toISOString().slice(0, 16);

    setReminderData({
      title: 'Follow-up call',
      description: `Schedule follow-up discussion with ${contact.name}.`,
      dueDate: localISOTime
    });
    setShowReminderModal(true);
  };

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    setReminderError(null);
    if (!reminderData.title || !reminderData.dueDate) {
      setReminderError('Title and due date are required.');
      return;
    }
    try {
      await dispatch(addReminder({
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactPhone: selectedContact.phone,
        title: reminderData.title,
        description: reminderData.description,
        dueDate: new Date(reminderData.dueDate).toISOString()
      })).unwrap();
      setShowReminderModal(false);
      setSelectedContact(null);
    } catch (err) {
      setReminderError(err || 'Failed to schedule reminder.');
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search and Action Header */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm"
          />
        </div>

        <div className="w-full sm:w-auto flex gap-2">
          <button onClick={() => { setShowExcelImport(true); setExcelImportError(''); }} className="px-4 py-2.5 rounded-xl border border-slate-700 bg-dark-900 text-slate-300 font-semibold flex items-center justify-center space-x-2 hover:border-royal-500 transition-colors text-sm">
            <Upload className="w-4 h-4" /><span>Upload Excel Data</span>
          </button>
          <button onClick={() => setShowAddContactModal(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-royal-700 to-royal-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-glow-royal hover:shadow-glow-royal-lg hover:from-royal-600 hover:to-royal-400 transition-all duration-205">
            <UserPlus className="w-4 h-4" /><span>Add Contact</span>
          </button>
        </div>
      </div>

      {importMessage && <div className="text-xs px-4 py-3 rounded-xl border border-slate-700 bg-dark-900 text-slate-300">{importMessage}</div>}

      {/* Directory Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading contacts directory...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No contacts found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/85 bg-dark-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Segment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-dark-900/30 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {contact.name}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {contact.phone}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-slate-400">
                      {contact.email ? (
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Company */}
                    <td className="px-6 py-4 text-slate-400">
                      {contact.company ? (
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          <span>{contact.company}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Status Segment */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        contact.status === 'Lead' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                          : contact.status === 'Contact'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {contact.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Simulation Incoming */}
                        <button
                          onClick={() => handleSimulateInbound(contact)}
                          className="px-2.5 py-1.5 bg-dark-850 hover:bg-dark-800 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-royal-400 rounded-lg transition-colors flex items-center space-x-1"
                          title="Simulate incoming call from this contact"
                        >
                          <PhoneCall className="w-3 h-3 text-slate-500" />
                          <span className="hidden md:inline">Test Ring</span>
                        </button>

                        {/* Schedule Reminder */}
                        <button
                          onClick={() => openReminderModal(contact)}
                          className="p-2 bg-dark-850 hover:bg-dark-800 border border-slate-800 text-slate-400 hover:text-royal-400 rounded-lg transition-colors"
                          title="Schedule Follow-up Reminder"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>

                        {/* Click-to-Call Dialer */}
                        <button
                          onClick={() => handleCall(contact)}
                          className="p-2 bg-royal-900 border border-royal-700 hover:bg-royal-500 hover:text-white text-royal-400 rounded-lg transition-all shadow-sm shadow-royal-950 active:scale-95"
                          title="Click-to-Call Dial"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        
                        {/* Delete Contact */}
                        <button
                          onClick={() => {
                            if(window.confirm('Are you sure you want to delete this contact?')) {
                              dispatch(deleteContact(contact.id));
                            }
                          }}
                          className="p-2 bg-red-900/30 border border-red-800 hover:bg-red-600 hover:text-white text-red-400 rounded-lg transition-all shadow-sm shadow-red-950/30 active:scale-95"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal Dialog */}
      {showExcelImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleExcelPasteImport} className="w-full max-w-3xl bg-dark-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button type="button" onClick={() => setShowExcelImport(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
            <h4 className="text-base font-bold text-white">Excel Contact Import</h4>
            <p className="text-xs text-slate-400 mt-1">Open your Excel sheet, select the contact rows, copy, and paste them below. The first row may include headers.</p>
            <div className="mt-4 grid grid-cols-5 text-xs font-bold text-royal-300 bg-royal-950/40 border border-royal-800/50 rounded-t-xl px-4 py-3"><span>Name *</span><span>Phone *</span><span>Email</span><span>Company</span><span>Status</span></div>
            <textarea autoFocus required value={excelPasteData} onChange={(event) => setExcelPasteData(event.target.value)} placeholder={'Aisha Sharma\t+91 98765 43210\taisha@example.com\tExample Company\tLead'} className="w-full h-52 p-4 bg-dark-950 border border-slate-800 rounded-b-xl text-sm text-slate-200 font-mono focus:outline-none focus:border-royal-500 resize-y" />
            {excelImportError && <p className="mt-3 text-xs text-red-400">{excelImportError}</p>}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between">
              <div className="flex gap-2">
                <button type="button" onClick={downloadExcelTemplate} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-royal-500">Download Excel Template</button>
                <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm hover:border-royal-500">Load Filled Template<input type="file" accept=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/tab-separated-values" className="hidden" onChange={handleTemplateFileImport} /></label>
              </div>
              <button className="px-5 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold text-sm">Import Shared Contacts</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Contact Modal Dialog */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-dark-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAddContactModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-base font-bold text-white mb-4">Create New CRM Contact</h4>
            {addContactError && <p className="text-xs text-red-500 mb-3">{addContactError}</p>}
            <form onSubmit={handleAddContactSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amanda Smith"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 012-3456"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. amanda@domain.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Company / Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Stripe Inc"
                  value={newContact.company}
                  onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Lead Segment</label>
                <select
                  value={newContact.status}
                  onChange={(e) => setNewContact({...newContact, status: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                >
                  <option value="Lead">Lead</option>
                  <option value="Contact">Contact</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold transition-all shadow-glow-royal"
              >
                Save Contact
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Reminder Modal Dialog */}
      {showReminderModal && selectedContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-dark-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowReminderModal(false);
                setSelectedContact(null);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-base font-bold text-white mb-2">Schedule Follow-up Call</h4>
            <p className="text-xs text-slate-450 mb-4">Setting reminder for: <strong className="text-slate-300">{selectedContact.name} ({selectedContact.phone})</strong></p>
            {reminderError && <p className="text-xs text-red-500 mb-3">{reminderError}</p>}
            <form onSubmit={handleReminderSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Call to finalize contract"
                  value={reminderData.title}
                  onChange={(e) => setReminderData({...reminderData, title: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={reminderData.dueDate}
                  onChange={(e) => setReminderData({...reminderData, dueDate: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase mb-1">Description / Notes</label>
                <textarea
                  placeholder="Provide call instructions or details..."
                  value={reminderData.description}
                  onChange={(e) => setReminderData({...reminderData, description: e.target.value})}
                  className="w-full px-3.5 py-2 bg-dark-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500"
                  rows="3"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-royal-600 hover:bg-royal-500 text-white font-bold transition-all shadow-glow-royal"
              >
                Schedule Call
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
