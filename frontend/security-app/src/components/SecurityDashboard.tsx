import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Car, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  LogOut,
  ListOrdered,
  History,
  Search,
  Users,
  Phone,
  FileText,
  BadgeCheck,
  MapPin,
  LogIn,
  Archive,
  BookOpen,
  Clock,
  Calendar,
  Download,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  rawTime?: string;
  image?: string;
  plate?: string;
}

interface ApprovalRequest {
  id: string;
  name: string;
  idNumber: string;
  contact: string;
  plate: string;
  person: string;
  reason: string;
  image: string;
  requestTime?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

const INITIAL_ACTIVITY: ActivityItem[] = [];

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'requests' | 'history' | 'check-in' | 'archive'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [visibleArchiveCount, setVisibleArchiveCount] = useState(20);
  const [activity, setActivity] = useState<ActivityItem[]>(INITIAL_ACTIVITY);
  const [queue, setQueue] = useState<ApprovalRequest[]>([]);
  const [checkInQueue, setCheckInQueue] = useState<any[]>([]);
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedArchiveVisitor, setSelectedArchiveVisitor] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'check-in' | 'check-out' | 'export-pdf' | 'sign-out' | null;
    request: any;
  }>({ isOpen: false, type: null, request: null });
  const [denyModal, setDenyModal] = useState<{ isOpen: boolean; id: number | null; reason: string }>({ isOpen: false, id: null, reason: '' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString([], { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const mapVisitor = (v: any) => ({
    id: v.id,
    name: v.full_name,
    plate: v.vehicle_plate,
    image: v.image_base64,
    idNumber: v.id_number,
    contact: v.contact_number,
    person: v.person_to_meet,
    reason: v.reason,
    checkInTime: formatDateTime(v.checkin_time),
    checkOutTime: formatDateTime(v.checkout_time),
    requestTime: formatDateTime(v.created_at),
    rawCheckIn: v.checkin_time,
    rawCheckOut: v.checkout_time,
    rawCreated: v.created_at,
    status: v.status
  });

  useEffect(() => {
    // Double-check token existence on mount
    const token = localStorage.getItem('vms_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const syncData = async () => {
      try {
        const checkins = await api.getCheckins();
        setCheckInQueue(checkins.map(mapVisitor));

        const checkoutReqs = await api.getCheckoutRequests();
        setQueue(checkoutReqs.map(mapVisitor));

        const active = await api.getActive();
        setActiveVisitors(active.map(mapVisitor));
        
        const history = await api.getHistory();
        
        // Group by id_number for the "Archive" tab to show unique visitors (latest visit)
        const uniqueVisitorsMap = new Map();
        history.forEach((v: any) => {
          if (!uniqueVisitorsMap.has(v.id_number)) {
            uniqueVisitorsMap.set(v.id_number, mapVisitor(v));
          }
        });
        setVisitorHistory(Array.from(uniqueVisitorsMap.values()));

        // Use history for activity log too
        setActivity(history.slice(0, 15).map((v: any) => {
          const checkIn = formatDateTime(v.checkin_time);
          const checkOut = formatDateTime(v.checkout_time);
          
          let statusText = 'Requested entry';
          if (v.status === 'inside') statusText = `Checked in at ${checkIn}`;
          else if (v.status === 'request_checkout') statusText = `Inside (Requested checkout at ${formatDateTime(new Date().toISOString())})`; // Note: simplified for display
          else if (v.status === 'completed') statusText = `Visit Completed: ${checkIn} - ${checkOut}`;
          else if (v.status === 'rejected') statusText = 'Entry Denied';

            return {
              id: v.id.toString(),
              user: v.full_name,
              action: statusText,
              time: formatDateTime(v.created_at),
              rawTime: v.checkin_time || v.created_at,
              image: v.image_base64,
              plate: v.vehicle_plate
            };
          }));

      } catch (err) {
        console.error("Failed to sync with server:", err);
      }
    };

    // Load initial data
    syncData();

    // Polling every 5 seconds for real-time updates
    const interval = setInterval(syncData, 5000);
    
    // Listen for manual updates
    window.addEventListener('vms_update', syncData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('vms_update', syncData);
    };
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.checkoutVisitor(id);
      window.dispatchEvent(new Event('vms_update'));
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  const handleApproveCheckIn = async (request: any) => {
    try {
      await api.approveCheckin(request.id);
      window.dispatchEvent(new Event('vms_update'));
    } catch (err) {
      console.error("Check-in error:", err);
    }
  };

  const handleDenyCheckIn = async (id: number, reason: string) => {
    try {
      await api.rejectCheckin(id, reason);
      window.dispatchEvent(new Event('vms_update'));
    } catch (err) {
      console.error("Deny error:", err);
    }
  };

  const executeExportPDF = (filteredHistory: any[]) => {
    const doc = new jsPDF();
    
    const generateReport = (logoImg?: HTMLImageElement) => {
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 95, 10, 20, 20);
      }

      // Add centered title
      doc.setFontSize(18);
      doc.setTextColor(13, 71, 161);
      doc.text('AIU Visitor Management System', 105, 40, { align: 'center' });
      
      // Add centered subtitle
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Visitor Report - ${dateFilter ? dateFilter : 'All Time'}`, 105, 48, { align: 'center' });
      
      const tableData = filteredHistory.map((v, index) => [
        index + 1,
        v.name,
        v.contact || 'N/A',
        v.idNumber,
        v.plate,
        v.checkInTime,
        v.checkOutTime === '---' ? 'Active' : v.checkOutTime,
        v.person || 'N/A'
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['No', 'Name', 'Contact', 'IC / Passport', 'Vehicle', 'Check-In', 'Check-Out', 'Meeting With']],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 8,
          valign: 'middle'
        },
        headStyles: { fillColor: [13, 71, 161] }
      });

      doc.save(`Visitor_Report_${dateFilter || 'All'}.pdf`);
    };

    const img = new Image();
    img.src = '/aiu-logo.png';
    img.onload = () => generateReport(img);
    img.onerror = () => generateReport(); // Fallback if logo fails to load
  };

  const renderContent = () => {
    if (activeTab === 'archive') {
      const filteredHistory = visitorHistory.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             v.checkInTime.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesDate = !dateFilter || 
                           (v.rawCheckIn ? v.rawCheckIn.startsWith(dateFilter) : (v.rawCreated && v.rawCreated.startsWith(dateFilter)));
                           
        return matchesSearch && matchesDate;
      });

      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white p-4 rounded-2xl border border-blue-50 flex items-center gap-3 shadow-sm">
              <Search className="text-on-surface-variant" size={20} />
              <input 
                type="text" 
                placeholder="Search by name, plate or time..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleArchiveCount(20);
                }}
                className="flex-1 outline-none font-medium bg-transparent"
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setVisibleArchiveCount(20);
                  }} 
                  className="text-on-surface-variant hover:text-red-500"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-50 flex items-center gap-3 shadow-sm">
              <Calendar className="text-primary" size={20} />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setVisibleArchiveCount(20);
                }}
                className="outline-none font-bold text-primary bg-transparent text-sm cursor-pointer"
              />
              {dateFilter && (
                <button 
                  onClick={() => {
                    setDateFilter('');
                    setVisibleArchiveCount(20);
                  }}
                  className="text-on-surface-variant hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <button 
              onClick={() => setConfirmModal({ isOpen: true, type: 'export-pdf', request: filteredHistory })}
              disabled={filteredHistory.length === 0}
              className="bg-primary text-white px-6 rounded-2xl font-bold shadow-sm shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/95 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              <span className="hidden md:inline">Export PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistory.length > 0 ? filteredHistory.slice(0, visibleArchiveCount).map((v) => (
              <motion.div 
                key={v.id}
                layoutId={v.id}
                onClick={() => setSelectedArchiveVisitor(v)}
                className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-100 shrink-0">
                  <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{v.name}</h4>
                  <p className="text-xs font-medium text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                    <Car size={12} /> {v.plate}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest">Check-In</p>
                    <p className="text-[11px] font-bold text-primary">{v.checkInTime}</p>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100" />
                  <div className="text-right">
                    <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest">Check-Out</p>
                    <p className="text-[11px] font-bold text-green-600">{v.checkOutTime === '---' ? 'Active' : v.checkOutTime}</p>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center text-on-surface-variant flex flex-col items-center">
                <BookOpen size={48} className="text-gray-200 mb-4" />
                <p className="font-bold">No records found in archive</p>
              </div>
            )}
          </div>
          
          {filteredHistory.length > visibleArchiveCount && (
            <div className="flex justify-center mt-8">
              <button 
                onClick={() => setVisibleArchiveCount(prev => prev + 20)}
                className="px-6 py-3 bg-white border border-blue-100 hover:border-primary/50 text-primary font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                Load More Records ({filteredHistory.length - visibleArchiveCount} remaining)
              </button>
            </div>
          )}

          {/* Archive Detail Modal */}
          <AnimatePresence>
            {selectedArchiveVisitor && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedArchiveVisitor(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="h-32 bg-primary relative">
                    <button 
                      onClick={() => setSelectedArchiveVisitor(null)}
                      className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                    >
                      <XCircle size={24} />
                    </button>
                    <div 
                      className="absolute -bottom-12 left-8 w-24 h-24 rounded-3xl border-4 border-white overflow-hidden shadow-lg bg-white cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setSelectedImage(selectedArchiveVisitor.image)}
                    >
                      <img src={selectedArchiveVisitor.image} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="p-8 pt-16">
                    <h3 className="text-2xl font-bold text-on-surface">{selectedArchiveVisitor.name}</h3>
                    <p className="text-sm font-medium text-on-surface-variant mb-6">Visitor Record ID: {selectedArchiveVisitor.id}</p>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">IC / Passport</p>
                        <p className="font-bold text-on-surface flex items-center gap-2">
                          <BadgeCheck size={16} className="text-primary" /> {selectedArchiveVisitor.idNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Vehicle Plate</p>
                        <p className="font-bold text-on-surface flex items-center gap-2">
                          <Car size={16} className="text-primary" /> {selectedArchiveVisitor.plate}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Contact</p>
                        <p className="font-bold text-on-surface flex items-center gap-2">
                          <Phone size={16} className="text-primary" /> {selectedArchiveVisitor.contact}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Person to Meet</p>
                        <p className="font-bold text-on-surface flex items-center gap-2">
                          <UserCheck size={16} className="text-primary" /> {selectedArchiveVisitor.person}
                        </p>
                      </div>
                      <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Check-In</p>
                          <p className="text-sm font-bold text-primary flex items-center gap-2">
                            <LogIn size={14} /> {selectedArchiveVisitor.checkInTime || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Check-Out</p>
                          <p className="text-sm font-bold text-green-600 flex items-center gap-2">
                            <LogOut size={14} /> {selectedArchiveVisitor.checkOutTime || 'Currently Active'}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Reason for Visit</p>
                        <p className="font-medium text-on-surface bg-white p-3 rounded-xl border border-gray-100 italic">
                          "{selectedArchiveVisitor.reason}"
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (activeTab === 'check-in') {
      return (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {checkInQueue.length > 0 ? checkInQueue.map((request) => (
              <motion.div 
                key={request.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="bg-white p-6 rounded-[2rem] border border-yellow-100 shadow-sm shadow-yellow-100/50 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400" />
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div 
                    className="w-16 h-16 rounded-full border-2 border-yellow-200 p-0.5 shrink-0 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedImage(request.image)}
                  >
                    <img 
                      src={request.image} 
                      alt={request.name} 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-1">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <h4 className="text-xl font-bold text-on-surface">{request.name}</h4>
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-black uppercase rounded tracking-widest">Entry Request</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <div className="px-3 py-1 bg-blue-50 text-primary rounded-lg flex items-center gap-2">
                        <BadgeCheck size={14} />
                        <span className="text-sm font-bold">{request.idNumber}</span>
                      </div>
                      <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                        <Phone size={14} />
                        <span className="text-sm font-bold">{request.contact}</span>
                      </div>
                      <div className="px-3 py-1 bg-gray-100 rounded-lg flex items-center gap-2">
                        <Car size={14} className="text-primary" />
                        <span className="text-sm font-bold tracking-wider">{request.plate}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium">To see: <span className="text-primary font-bold">{request.person}</span></span>
                    </div>
                    <p className="text-xs text-on-surface-variant/70 italic mt-2">"{request.reason}"</p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setDenyModal({ isOpen: true, id: request.id, reason: '' })}
                      className="flex-1 md:w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Deny Check-In"
                    >
                      <XCircle size={24} />
                    </button>
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'check-in', request })}
                      className="flex-[2] md:px-6 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                      <ShieldCheck size={20} />
                      <span className="whitespace-nowrap">Approve Entry</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[400px]">
                <LogIn size={48} className="text-primary/20 mb-4" />
                <h3 className="text-xl font-bold text-on-surface mb-2">Check-In Queue Empty</h3>
                <p>No visitors are currently waiting for entry approval.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (activeTab === 'history') {
      const filteredActivity = activity.filter(item => {
        const matchesSearch = item.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             item.action.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesDate = !dateFilter || 
                           (item.rawTime && item.rawTime.startsWith(dateFilter));
                           
        return matchesSearch && matchesDate;
      });

      return (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white p-4 rounded-2xl border border-blue-50 flex items-center gap-3 shadow-sm">
              <Search className="text-on-surface-variant" size={20} />
              <input 
                type="text" 
                placeholder="Search logs by name or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none font-medium bg-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-red-500">
                  <XCircle size={18} />
                </button>
              )}
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-50 flex items-center gap-3 shadow-sm">
              <Calendar className="text-primary" size={20} />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="outline-none font-bold text-primary bg-transparent text-sm cursor-pointer"
              />
              {dateFilter && (
                <button 
                  onClick={() => setDateFilter('')}
                  className="text-on-surface-variant hover:text-red-500 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {filteredActivity.length > 0 ? filteredActivity.map((item) => (
                <div key={item.id} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-primary shrink-0 overflow-hidden border border-blue-100">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.user} 
                        className="w-full h-full object-cover"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(item.image!);
                        }}
                      />
                    ) : (
                      <UserCheck size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-on-surface">{item.user}</p>
                      {item.plate && (
                        <span className="px-2 py-0.5 bg-gray-100 text-primary rounded text-[10px] font-bold tracking-wider uppercase border border-gray-200">
                          {item.plate}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-on-surface-variant">{item.action}</p>
                    <p className="text-xs text-on-surface-variant/60 mt-1 flex items-center gap-1">
                      <Activity size={12} /> Log ID: {item.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-on-surface-variant whitespace-nowrap">
                      {item.time}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-3">
                  <History size={48} className="text-primary/20" />
                  <p className="font-bold text-lg">No logs found</p>
                  <p className="text-sm">Try adjusting your search criteria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'active') {
      return (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {activeVisitors.length > 0 ? activeVisitors.map((v) => (
              <motion.div 
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div 
                    className="w-16 h-16 rounded-full border-2 border-primary/10 p-0.5 shrink-0 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedImage(v.image)}
                  >
                    <img 
                      src={v.image} 
                      alt={v.name} 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h4 className="text-xl font-bold text-on-surface">{v.name}</h4>
                      <div className="flex items-center gap-2">
                         {v.status === 'request_checkout' ? (
                           <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase rounded tracking-widest flex items-center gap-1 border border-yellow-200">
                             <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" /> WAITING AT GATE
                           </span>
                         ) : (
                           <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded tracking-widest flex items-center gap-1">
                             <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" /> ON CAMPUS
                           </span>
                         )}
                         {v.checkInTime && (
                           <span className="text-[10px] font-bold text-on-surface-variant/40 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 flex items-center gap-1">
                             <Clock size={10} /> {v.checkInTime}
                           </span>
                         )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <div className="px-3 py-1 bg-blue-50 text-primary rounded-lg flex items-center gap-2">
                        <BadgeCheck size={14} />
                        <span className="text-sm font-bold">{v.idNumber}</span>
                      </div>
                      <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                        <Phone size={14} />
                        <span className="text-sm font-bold">{v.contact}</span>
                      </div>
                      <div className="px-3 py-1 bg-gray-100 rounded-lg flex items-center gap-2">
                        <Car size={14} className="text-primary" />
                        <span className="text-sm font-bold tracking-wider">{v.plate}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant font-medium">To see: <span className="text-primary font-bold">{v.person}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'check-out', request: v })}
                      className={`flex-1 md:px-6 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] 
                        ${v.status === 'request_checkout' 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-100 animate-pulse' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100'}
                      `}
                    >
                      <LogOut size={20} />
                      <span className="whitespace-nowrap">{v.status === 'request_checkout' ? 'Approve Exit' : 'Checkout'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[400px]">
                <Users size={64} className="text-primary/20 mb-4" />
                <h3 className="text-xl font-bold text-on-surface mb-2">No Active Visitors</h3>
                <p>There are currently no registered visitors actively on campus.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    
    if (activeTab === 'requests') {
      return (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {queue.length > 0 ? queue.map((request) => (
              <motion.div 
                key={request.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div 
                    className="w-16 h-16 rounded-full border-2 border-primary/10 p-0.5 shrink-0 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setSelectedImage(request.image)}
                  >
                    <img 
                      src={request.image} 
                      alt={request.name} 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h4 className="text-xl font-bold text-on-surface">{request.name}</h4>
                      {request.requestTime && (
                        <span className="text-[10px] font-bold text-on-surface-variant/40 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 flex items-center gap-1">
                          <Clock size={10} /> Requested: {request.requestTime}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <div className="px-3 py-1 bg-blue-50 text-primary rounded-lg flex items-center gap-2">
                        <BadgeCheck size={14} />
                        <span className="text-sm font-bold">{request.idNumber}</span>
                      </div>
                      <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
                        <Phone size={14} />
                        <span className="text-sm font-bold">{request.contact}</span>
                      </div>
                      <div className="px-3 py-1 bg-gray-100 rounded-lg flex items-center gap-2">
                        <Car size={14} className="text-primary" />
                        <span className="text-sm font-bold tracking-wider">{request.plate}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant/60 font-medium tracking-tight">Access #CP-{(Math.random()*10000).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setConfirmModal({ isOpen: true, type: 'check-out', request })}
                      className="flex-1 md:px-6 h-12 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-[0.98]"
                    >
                      <CheckCircle size={20} />
                      <span className="whitespace-nowrap">Approve Checkout</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-[2rem] h-64 flex flex-col items-center justify-center text-on-surface-variant/40 gap-4">
                <ListOrdered size={48} className="text-primary/20" />
                <p className="font-bold text-lg">No Check-Out Requests</p>
                <p className="text-sm">The queue is currently empty.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    }


    // Overview Tab
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Activity Feed */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              Live Feed
            </h3>
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>
          </div>

          <div className="bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {activity.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setSearchQuery(item.user);
                    setActiveTab('history');
                  }}
                  className="p-4 flex items-start gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <UserCheck size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{item.user}</p>
                    <p className="text-xs text-on-surface-variant">{item.action}</p>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Queues */}
        <section className="lg:col-span-7 space-y-8">
          
          {/* Check-In Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold flex items-center gap-2">
                <LogIn size={20} className="text-primary" />
                Pending Check-In
              </h3>
              {checkInQueue.length > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">{checkInQueue.length} Pending</span>}
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {checkInQueue.length > 0 ? checkInQueue.map((request) => (
                  <motion.div 
                    key={request.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="bg-white p-6 rounded-[2rem] border border-yellow-100 shadow-sm shadow-yellow-100/50 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div 
                        className="w-16 h-16 rounded-full border-2 border-yellow-200 p-0.5 shrink-0 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => setSelectedImage(request.image)}
                      >
                        <img 
                          src={request.image} 
                          alt={request.name} 
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex-1 text-center md:text-left space-y-1">
                        <h4 className="text-xl font-bold text-on-surface">{request.name}</h4>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <div className="px-2 py-0.5 bg-blue-50 text-primary rounded-md flex items-center gap-1.5">
                            <BadgeCheck size={12} />
                            <span className="text-[11px] font-bold">{request.idNumber}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md flex items-center gap-1.5">
                            <Phone size={12} />
                            <span className="text-[11px] font-bold">{request.contact}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-gray-100 rounded-md flex items-center gap-1.5">
                            <Car size={12} className="text-primary" />
                            <span className="text-[11px] font-bold tracking-wider">{request.plate}</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant/80 font-medium truncate max-w-[100px]">To see: {request.person}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => setConfirmModal({ isOpen: true, type: 'check-in', request })}
                          className="flex-1 md:px-6 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
                        >
                          <ShieldCheck size={20} />
                          <span className="whitespace-nowrap">Approve Entry</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[2rem] h-32 flex flex-col items-center justify-center text-on-surface-variant/40 gap-2">
                    <CheckCircle size={24} />
                    <p className="font-bold text-sm">No Pending Check-Ins</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Check-Out Queue */}
          <div className="space-y-4 pt-4 border-t border-blue-50">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold flex items-center gap-2">
              <Car size={20} className="text-primary" />
              Checkout Queue
            </h3>
            <span className="text-xs text-primary font-bold">{queue.length} Pending</span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {queue.length > 0 ? queue.map((request) => (
                <motion.div 
                  key={request.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div 
                      className="w-16 h-16 rounded-full border-2 border-primary/10 p-0.5 shrink-0 shadow-inner cursor-pointer hover:scale-110 transition-transform"
                      onClick={() => setSelectedImage(request.image)}
                    >
                      <img 
                        src={request.image} 
                        alt={request.name} 
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                        <h4 className="text-xl font-bold text-on-surface">{request.name}</h4>
                        {request.requestTime && (
                          <span className="text-[10px] font-bold text-on-surface-variant/40 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 flex items-center gap-1">
                            <Clock size={10} /> {request.requestTime}
                          </span>
                        )}
                      </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                          <div className="px-2 py-0.5 bg-blue-50 text-primary rounded-md flex items-center gap-1.5">
                            <BadgeCheck size={12} />
                            <span className="text-[11px] font-bold">{request.idNumber}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md flex items-center gap-1.5">
                            <Phone size={12} />
                            <span className="text-[11px] font-bold">{request.contact}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-gray-100 rounded-md flex items-center gap-1.5">
                            <Car size={12} className="text-primary" />
                            <span className="text-[11px] font-bold tracking-wider">{request.plate}</span>
                          </div>
                          <span className="text-[10px] text-on-surface-variant/60 font-medium tracking-tight">Access #CP-{(Math.random()*10000).toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setConfirmModal({ isOpen: true, type: 'check-out', request })}
                        className="flex-1 md:px-6 h-12 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-[0.98]"
                      >
                        <CheckCircle size={20} />
                        <span className="whitespace-nowrap">Approve Checkout</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-[2rem] h-48 flex flex-col items-center justify-center text-on-surface-variant/40 gap-2">
                  <CheckCircle size={32} />
                  <p className="font-bold">Queue is empty</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-blue-50 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/aiu-logo.png" alt="AIU Logo" className="h-8 w-auto" />
          <h1 className="text-sm font-black text-primary tracking-widest uppercase">Security</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-primary bg-primary/5 rounded-xl transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-blue-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        lg:shadow-[4px_0_24px_rgba(30,64,175,0.02)]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
      `}>
        <div className="p-8 border-b border-blue-50">
          <div className="flex items-center gap-4">
            <img src="/aiu-logo.png" alt="AIU Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
            <div className="h-8 w-[2px] bg-gray-100 rounded-full" />
            <div>
              <h1 className="text-sm font-black text-primary tracking-widest uppercase">Security</h1>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => {
              setActiveTab('overview');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
              ${activeTab === 'overview' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
            `}
          >
            <LayoutDashboard size={20} />
            Dashboard Overview
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('active');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
              ${activeTab === 'active' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
            `}
          >
            <Users size={20} />
            Active Visitors
            {activeVisitors.length > 0 && (
              <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{activeVisitors.length}</span>
            )}
          </button>


          <button 
            onClick={() => {
              setActiveTab('history');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
              ${activeTab === 'history' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
            `}
          >
            <History size={20} />
            Access Logs
          </button>

          <button 
            onClick={() => {
              setActiveTab('archive');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
              ${activeTab === 'archive' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
            `}
          >
            <Archive size={20} />
            Visitor Archive
          </button>

          <div className="pt-4 mt-2 border-t border-blue-50/50">
            <p className="px-4 mb-2 text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Pending Queues</p>
            <button 
              onClick={() => {
                setActiveTab('check-in');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
                ${activeTab === 'check-in' ? 'bg-yellow-50 text-yellow-700' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
              `}
            >
              <LogIn size={20} />
              Check-In Requests
              {checkInQueue.length > 0 && (
                <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{checkInQueue.length}</span>
              )}
            </button>

            <button 
              onClick={() => {
                setActiveTab('requests');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm
                ${activeTab === 'requests' ? 'bg-primary/5 text-primary' : 'text-on-surface-variant hover:bg-gray-50 hover:text-on-surface'}
              `}
            >
              <ListOrdered size={20} />
              Check-Out Requests
              {queue.length > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{queue.length}</span>
              )}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-blue-50 space-y-2">
          <button 
            onClick={() => setConfirmModal({ isOpen: true, type: 'sign-out', request: null })}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-on-surface-variant hover:bg-gray-50 transition-colors font-bold text-sm"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className={`flex-1 p-4 md:p-10 min-h-screen overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Info */}
          <section className="flex items-start gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex mt-1 p-2 text-primary bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
              title={isSidebarOpen ? "Hide sidebar" : "Open sidebar"}
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-primary">
              {activeTab === 'archive' && 'Visitor Records Archive'}
              {activeTab === 'history' && 'Security Access Logs'}
            </h2>
            <p className="text-on-surface-variant">
              {activeTab === 'overview' && 'Live activity and pending requests at Gate B.'}
              {activeTab === 'active' && 'View detailed profiles of visitors currently inside the premises.'}
              {activeTab === 'requests' && 'Manage all queued departure requests.'}
              {activeTab === 'check-in' && 'Verify and approve visitors waiting for entry.'}
              {activeTab === 'archive' && 'A comprehensive searchable database of all past campus visitors.'}
              {activeTab === 'history' && 'Search and review all historical campus entry and exit data.'}
            </p>
            </div>
          </section>

          {renderContent()}
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 
                ${confirmModal.type === 'export-pdf' ? 'bg-blue-50 text-primary' : 
                  confirmModal.type === 'sign-out' ? 'bg-red-50 text-red-500' :
                  (confirmModal.type === 'check-in' ? 'bg-primary/10 text-primary' : 'bg-green-50 text-green-600')}`}>
                {confirmModal.type === 'export-pdf' ? <Download size={32} /> : 
                 confirmModal.type === 'sign-out' ? <LogOut size={32} /> :
                 (confirmModal.type === 'check-in' ? <LogIn size={32} /> : <LogOut size={32} />)}
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">
                {confirmModal.type === 'export-pdf' ? 'Confirm Export' : 
                 confirmModal.type === 'sign-out' ? 'Sign Out?' :
                 `Confirm ${confirmModal.type === 'check-in' ? 'Entry' : 'Exit'}?`}
              </h3>
              <p className="text-sm text-on-surface-variant mb-8">
                {confirmModal.type === 'export-pdf' 
                  ? `Are you sure you want to generate a PDF report for ${confirmModal.request?.length || 0} visitor${confirmModal.request?.length === 1 ? '' : 's'}?` 
                  : confirmModal.type === 'sign-out'
                  ? 'Are you sure you want to log out of the system?'
                  : `Are you sure you want to approve the ${confirmModal.type} request for `}
                {confirmModal.type !== 'export-pdf' && confirmModal.type !== 'sign-out' && <span className="font-bold text-on-surface">{confirmModal.request?.name}</span>}
                {confirmModal.type !== 'export-pdf' && confirmModal.type !== 'sign-out' && '?'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  className="flex-1 px-6 py-3 border border-gray-100 rounded-xl font-bold text-on-surface-variant hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'sign-out') {
                      localStorage.removeItem('vms_token');
                      localStorage.removeItem('guardName');
                      window.location.href = '/login';
                      return;
                    }

                    if (confirmModal.type === 'export-pdf') {
                      try {
                        executeExportPDF(confirmModal.request);
                      } catch (err) {
                        console.error("PDF export error:", err);
                      } finally {
                        setConfirmModal({ isOpen: false, type: null, request: null });
                      }
                      return;
                    }

                    const req = confirmModal.request;
                    if (!req) {
                      setConfirmModal({ isOpen: false, type: null, request: null });
                      return;
                    }
                    
                    try {
                      if (confirmModal.type === 'check-in') {
                        handleApproveCheckIn(req);
                      } else {
                        handleApprove(req.id);
                      }
                    } catch (err) {
                      console.error("Approval error:", err);
                    } finally {
                      setConfirmModal({ isOpen: false, type: null, request: null });
                    }
                  }}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] 
                    ${confirmModal.type === 'sign-out' ? 'bg-red-500 shadow-red-500/20' :
                      confirmModal.type === 'export-pdf' ? 'bg-primary shadow-primary/20' : 
                      (confirmModal.type === 'check-in' ? 'bg-primary shadow-primary/20' : 'bg-green-600 shadow-green-600/20')}`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deny Check-In Modal */}
      <AnimatePresence>
        {denyModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setDenyModal({ isOpen: false, id: null, reason: '' })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle size={30} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-on-surface text-center mb-1">Deny Entry?</h3>
              <p className="text-sm text-on-surface-variant text-center mb-6">Provide a reason so the visitor knows why their entry was denied.</p>
              <textarea
                rows={3}
                placeholder="e.g. Visitor not on appointment list, missing ID, etc."
                value={denyModal.reason}
                onChange={e => setDenyModal(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium resize-none outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 transition-all mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setDenyModal({ isOpen: false, id: null, reason: '' })}
                  className="flex-1 px-4 py-3 border border-gray-100 rounded-xl font-bold text-on-surface-variant hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (denyModal.id !== null) {
                      await handleDenyCheckIn(denyModal.id, denyModal.reason);
                    }
                    setDenyModal({ isOpen: false, id: null, reason: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-[0.98]"
                >
                  Deny Entry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-8"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl w-full flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-16 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2 font-bold"
              >
                Close Preview <XCircle size={32} />
              </button>
              <div className="bg-white p-2 rounded-[2rem] shadow-2xl overflow-hidden border-8 border-white/10">
                <img 
                  src={selectedImage} 
                  alt="Visitor Full Profile" 
                  className="max-h-[70vh] w-auto object-contain rounded-2xl"
                />
              </div>
              <p className="mt-6 text-white/40 text-sm font-medium tracking-widest uppercase">Identity Verification Mode</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
