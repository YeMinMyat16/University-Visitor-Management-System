import React, { useState, useEffect } from 'react';
import { QrCode, ShieldCheck, Calendar, Clock, MapPin, CheckCircle2, Car, Hourglass, LogOut, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';

export default function MyPass({ onGoToCheckIn }: { onGoToCheckIn?: () => void }) {
  const [hasRequestedCheckout, setHasRequestedCheckout] = useState(false);
  const [visitorData, setVisitorData] = useState<any>(null);
  const [pendingVisitor, setPendingVisitor] = useState<any>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [rejectedInfo, setRejectedInfo] = useState<{ name: string; reason: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const active = localStorage.getItem('vms_current_visitor');
      const pending = localStorage.getItem('vms_pending_visitor');
      const success = localStorage.getItem('vms_checkout_success') === 'true';
      const rejected = localStorage.getItem('vms_rejected_visitor');
      
      const activeData = active ? JSON.parse(active) : null;
      const pendingData = pending ? JSON.parse(pending) : null;
      const rejectedData = rejected ? JSON.parse(rejected) : null;
      
      // 1. Set local state immediately for fast UI response
      setVisitorData(activeData);
      setPendingVisitor(pendingData);
      setCheckoutSuccess(success);
      setRejectedInfo(rejectedData);

      // 2. Background verify active pass with backend
      if (activeData?.id) {
        try {
          const res = await api.getVisitStatus(activeData.id);
          if (res.status === 'completed') {
            localStorage.removeItem('vms_current_visitor');
            localStorage.setItem('vms_checkout_success', 'true');
            setVisitorData(null);
            setCheckoutSuccess(true);
          }
        } catch (err) {
          console.error("Status verification error (clearing stale pass):", err);
          localStorage.removeItem('vms_current_visitor');
          setVisitorData(null);
        }
      }

      // 3. Clear success flag if a new visit is already approved
      if (activeData && success) {
        localStorage.removeItem('vms_checkout_success');
        setCheckoutSuccess(false);
      }
    };

    checkStatus();
    
    // Status Polling for Pending Visitors
    const pollInterval = setInterval(async () => {
      const pending = localStorage.getItem('vms_pending_visitor');
      const active = localStorage.getItem('vms_current_visitor');
      
      // Case 1: Waiting for Entry Approval
      if (pending) {
        const data = JSON.parse(pending);
        if (data.db_id) {
          try {
            const res = await api.getVisitStatus(data.db_id);
            if (res.status === 'inside') {
              const activeVisitor = {
                ...data,
                id: data.db_id, // Use DB ID as the consistent ID
                checkInTime: res.checkin_time || new Date().toLocaleString()
              };
              localStorage.setItem('vms_current_visitor', JSON.stringify(activeVisitor));
              localStorage.removeItem('vms_pending_visitor');
              checkStatus();
            } else if (res.status === 'rejected') {
              // Store rejection info so the denied screen persists
              const rejectedInfo = { name: data.name, reason: res.rejection_reason || 'No reason provided.' };
              localStorage.setItem('vms_rejected_visitor', JSON.stringify(rejectedInfo));
              localStorage.removeItem('vms_pending_visitor');
              checkStatus();
            }
          } catch (err) { console.error("Entry polling error:", err); }
        }
      }
      
      // Case 2: Waiting for Checkout Approval
      if (active) {
        const data = JSON.parse(active);
        if (data.id) {
          try {
            const res = await api.getVisitStatus(data.id);
            if (res.status === 'completed') {
              localStorage.removeItem('vms_current_visitor');
              localStorage.setItem('vms_checkout_success', 'true');
              checkStatus();
            } else if (res.status === 'request_checkout') {
              setHasRequestedCheckout(true);
            }
          } catch (err) { console.error("Checkout polling error:", err); }
        }
      }
    }, 4000); // Polling every 4 seconds

    window.addEventListener('storage', checkStatus);
    window.addEventListener('vms_update', checkStatus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', checkStatus);
      window.removeEventListener('vms_update', checkStatus);
    };
  }, []);


  if (rejectedInfo) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl border border-red-100 mt-12 min-h-[400px]"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
          <XCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Entry Denied</h2>
        <p className="text-on-surface-variant mb-4 text-sm leading-relaxed max-w-xs mx-auto">
          Sorry, <span className="font-bold">{rejectedInfo.name}</span>. Security has denied your entry request.
        </p>
        <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-4 w-full max-w-xs mb-8">
          <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Reason</p>
          <p className="text-sm font-semibold text-red-700 italic">"{rejectedInfo.reason}"</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('vms_rejected_visitor');
            setRejectedInfo(null);
            onGoToCheckIn?.();
          }}
          className="bg-primary hover:bg-primary/90 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          Back to Check-In
        </button>
      </motion.div>
    );
  }

  if (pendingVisitor) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl border border-yellow-100 mt-12 min-h-[400px]"
      >
        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-6 relative">
          <Hourglass size={40} className="animate-pulse" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Pending Approval</h2>
        <p className="text-on-surface-variant mb-4 text-sm leading-relaxed max-w-xs mx-auto">
          Your check-in request has been sent to Security. Please wait at the gate while they verify your details.
        </p>
        <div className="bg-gray-50 px-6 py-3 rounded-xl border border-gray-100 w-full max-w-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Status</p>
          <p className="text-sm font-semibold text-yellow-600 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Waiting for Security
          </p>
        </div>
        
        <button 
          onClick={() => {
            console.log("Manual refresh requested");
            window.dispatchEvent(new Event('vms_update'));
          }}
          className="mt-8 text-primary font-bold text-sm flex items-center gap-2 hover:underline"
        >
          <Clock size={16} />
          Refresh Status
        </button>
      </motion.div>
    );
  }
  
  if (checkoutSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl border border-green-100 mt-12 min-h-[400px]"
      >
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-lg shadow-green-100">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-extrabold text-on-surface mb-2">Check-Out Successful!</h2>
        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed max-w-xs mx-auto">
          Thank you for visiting our campus. Your exit has been recorded by Security. Have a safe journey!
        </p>
        <button 
          onClick={() => {
            localStorage.removeItem('vms_checkout_success');
            onGoToCheckIn?.();
          }}
          className="bg-primary hover:bg-primary/90 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center gap-2"
        >
          Return to Entrance
        </button>
      </motion.div>
    );
  }

  if (!visitorData) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl border border-blue-50 mt-12 min-h-[400px]"
      >
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
          <QrCode size={40} />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">No Active Pass</h2>
        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed max-w-xs mx-auto">
          You haven't checked in yet. Please fill out the registration form to receive your digital pass.
        </p>
        <button 
          onClick={onGoToCheckIn}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          Go to Check-In
        </button>
      </motion.div>
    );
  }

  const handleCheckoutRequest = () => {
    if (!visitorData?.id) return;

    // 1. Send to Backend
    api.requestCheckout(visitorData.id).then(() => {
      setHasRequestedCheckout(true);
    }).catch(err => {
      console.error("Checkout request error:", err);
      alert("System error. Please try again or see Security.");
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <section>
        <h2 className="text-3xl font-bold text-primary mb-2">My Active Pass</h2>
        <p className="text-on-surface-variant">You are currently checked in. Tap below when leaving.</p>
      </section>

      <div className="bg-white rounded-3xl shadow-xl border border-blue-50 overflow-hidden">
        <div className="p-8 flex flex-col items-center gap-6 text-center">
          <div className="p-4 bg-white border-2 border-primary/10 rounded-2xl shadow-inner w-full">
            {hasRequestedCheckout ? (
              <div className="w-full py-4 bg-green-50 border-2 border-green-500 text-green-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                <CheckCircle2 size={24} />
                Check-Out Requested!
              </div>
            ) : (
              <button 
                onClick={() => setShowCheckoutConfirm(true)}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                <ShieldCheck size={24} />
                Request Check-Out
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-on-surface">{visitorData.name}</h3>
            <p className="text-on-surface-variant font-medium text-sm flex items-center justify-center gap-2 uppercase tracking-wide">
              <Car size={14} className="text-primary"/> 
              {visitorData.plate}
            </p>
            <p className="text-on-surface-variant text-xs mt-1 font-mono">PASS ID: #CP-{visitorData.id?.toString().padStart(5, '0') || '00000'}</p>
          </div>

          <div className="flex gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
              <ShieldCheck size={14} />
              ACTIVE
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              ONE-DAY ACCESS
            </span>
          </div>
        </div>

        <div className="bg-primary p-6 text-white grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 col-span-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold opacity-70">Check-In Time</p>
              <p className="text-sm font-semibold">
                {visitorData.checkInTime ? (
                  isNaN(Date.parse(visitorData.checkInTime)) 
                    ? visitorData.checkInTime 
                    : new Date(visitorData.checkInTime).toLocaleString([], { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                ) : 'Just now'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold opacity-70">Validity</p>
              <p className="text-sm font-semibold">Today Only</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold opacity-70">Location</p>
              <p className="text-sm font-semibold text-white/90">Main Campus</p>
            </div>
        </div>
      </div>
    </div>

    {/* Confirmation Modal */}
      {showCheckoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Request Check-Out?</h3>
            <p className="text-sm text-on-surface-variant mb-8">
              Are you sure you want to request your vehicle checkout now? This will notify the security team at the gate.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCheckoutConfirm(false)}
                className="flex-1 px-6 py-3 border border-gray-100 rounded-xl font-bold text-on-surface-variant hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowCheckoutConfirm(false);
                  handleCheckoutRequest();
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
