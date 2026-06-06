import React, { useState, useEffect } from 'react';
import {
  User,
  BadgeCheck,
  Camera,
  Car,
  Search,
  ArrowRight,
  ArrowLeft,
  Map as MapIcon,
  CheckCircle2,
  AlertCircle,
  History,
  UserPlus,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

export default function RegistrationForm({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState(0);
  const [visitorType, setVisitorType] = useState<'new' | 'returning' | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    contactNumber: '',
    vehicle: '',
    person: '',
    reason: '',
    image: '',
  });

  useEffect(() => {
    const savedId = localStorage.getItem('vms_saved_id');
    if (savedId) {
      setVisitorType('returning');
      setStep(1);
      setFormData(prev => ({ ...prev, idNumber: savedId }));
    }
  }, []);

  // Auto-search logic when ID Number changes
  useEffect(() => {
    if (visitorType === 'returning' && formData.idNumber.length >= 6) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchVisitor(formData.idNumber);
      }, 800);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [formData.idNumber, visitorType]);

  const handleSearchVisitor = async (id: string) => {
    setIsSearching(true);
    try {
      const visitor = await api.searchVisitor(id);
      if (visitor) {
        setFormData(prev => ({
          ...prev,
          fullName: visitor.full_name,
          contactNumber: visitor.contact_number,
          vehicle: visitor.vehicle_plate,
        }));
        setToast("Welcome back! We've filled your details.");
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.log("Visitor not found or error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const compressImage = (base64: string, maxWidth = 600): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality
      };
    });
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Prevent numbers in Full Name
    if (name === 'fullName') {
      const filteredValue = value.replace(/[0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
      if (/[0-9]/.test(value)) {
        setErrors(prev => ({ ...prev, fullName: 'Name should only contain alphabets.' }));
      } else {
        setErrors(prev => ({ ...prev, fullName: '' }));
      }
      return;
    }

    // Prevent non-numbers in Contact Number
    if (name === 'contactNumber') {
      const filteredValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
      if (/[^0-9]/.test(value)) {
        setErrors(prev => ({ ...prev, contactNumber: 'Contact number should only contain digits.' }));
      } else {
        setErrors(prev => ({ ...prev, contactNumber: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (visitorType === 'new') {
        if (!formData.fullName) newErrors.fullName = 'Please fill in this field.';
        if (!formData.idNumber) newErrors.idNumber = 'Please fill in this field.';
        if (!formData.contactNumber) newErrors.contactNumber = 'Please fill in this field.';
      } else if (visitorType === 'returning') {
        if (!formData.idNumber && !formData.contactNumber) {
          newErrors.idNumber = 'Please enter IC or Phone Number to find your profile.';
        }
      }
    } else if (step === 2) {
      if (!formData.vehicle) newErrors.vehicle = 'Please fill in this field.';
      if (!formData.reason) newErrors.reason = 'Please fill in this field.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Removed Mock Database Fetch for Returning Visitor - now handled by useEffect logic
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 1) setVisitorType(null);
    setStep(s => s - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const visitorData = {
      id: 'vis_' + Date.now(),
      name: formData.fullName || 'Unknown Visitor',
      plate: formData.vehicle || 'None',
      idNumber: formData.idNumber || 'Not provided',
      contact: formData.contactNumber || 'Not provided',
      person: formData.person || 'General Visit',
      reason: formData.reason || 'No reason provided',
      image: formData.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
    };

      // 2. Save to Backend
      api.submitCheckin(visitorData).then((res) => {
        // Save to localStorage for returning visits
        localStorage.setItem('vms_saved_id', formData.idNumber);
        localStorage.setItem('vms_saved_name', formData.fullName);
        localStorage.setItem('vms_saved_vehicle', formData.vehicle);

        // Keep local fallback for current session
        const pendingData = { ...visitorData, db_id: res.id };
        localStorage.removeItem('vms_current_visitor'); 
        localStorage.setItem('vms_pending_visitor', JSON.stringify(pendingData));
        
        setTimeout(() => {
          setIsSubmitting(false);
          onNext();
        }, 1500);
      }).catch(err => {
      console.error("Submission error:", err);
      setIsSubmitting(false);
      alert("System error. Please try again or see Security.");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-lg mx-auto relative"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="bg-white/70 backdrop-blur-lg p-6 rounded-[2rem] shadow-sm border border-white mb-2 text-center relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl" />
        
        <h2 className="text-3xl font-extrabold text-primary mb-2 relative z-10 tracking-tight">
          {step === 0 ? "Welcome to AIU" : 
           step === 1 ? "Personal Info" : 
           step === 2 ? "Visit Details" : 
           step === 3 ? "Security Photo" : "Review Pass"}
        </h2>
        <p className="text-gray-700 font-semibold relative z-10">
          {step === 0 ? "Are you a new or returning visitor?" : 
           step === 1 && visitorType === 'new' ? "Please provide your personal details." :
           step === 1 && visitorType === 'returning' ? "Enter your IC or Phone to retrieve your details." :
           step === 2 ? "Who are you visiting today?" :
           step === 3 ? "Please take a selfie for your digital pass." : 
           "Review your details before submitting."}
        </p>
      </section>

      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(30,64,175,0.05)] overflow-hidden border border-blue-50 relative min-h-[300px] flex flex-col">
        <div className="h-1.5 bg-primary w-full" />
        
        {/* Progress Bar */}
        {step > 0 && (
          <div className="w-full bg-gray-100 h-1">
            <motion.div 
              className="bg-primary h-full"
              initial={{ width: `${((step - 1) / 4) * 100}%` }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <div className="p-6 flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="step-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <button 
                  onClick={() => { setVisitorType('new'); setStep(1); }}
                  className="w-full h-28 border-2 border-outline-variant hover:border-primary hover:bg-blue-50/50 rounded-2xl flex items-center p-6 gap-5 transition-all group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <UserPlus size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg text-on-surface">New Visitor</h3>
                    <p className="text-sm text-on-surface-variant">First time visiting the campus</p>
                  </div>
                  <ArrowRight className="text-outline-variant group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </button>

                <button 
                  onClick={() => { setVisitorType('returning'); setStep(1); }}
                  className="w-full h-28 border-2 border-outline-variant hover:border-primary hover:bg-blue-50/50 rounded-2xl flex items-center p-6 gap-5 transition-all group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <History size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg text-on-surface">Returning Visitor</h3>
                    <p className="text-sm text-on-surface-variant">I have visited before</p>
                  </div>
                  <ArrowRight className="text-outline-variant group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </button>

                {localStorage.getItem('vms_saved_id') && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem('vms_saved_id');
                      localStorage.removeItem('vms_saved_name');
                      localStorage.removeItem('vms_saved_vehicle');
                      setFormData({
                        fullName: '',
                        idNumber: '',
                        contactNumber: '',
                        vehicle: '',
                        person: '',
                        reason: '',
                        image: '',
                      });
                      window.location.reload();
                    }}
                    className="w-full py-3 text-red-500 font-bold text-xs hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={14} />
                    Clear Saved Profile
                  </button>
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {visitorType === 'new' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Full Name</label>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`w-full h-12 bg-gray-50 border ${errors.fullName ? 'border-red-500' : 'border-outline-variant focus:border-primary'} rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                      placeholder="As per identification card"
                    />
                    {errors.fullName && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={14}/>{errors.fullName}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">IC / Passport Number</label>
                  <input
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className={`w-full h-12 bg-gray-50 border ${errors.idNumber ? 'border-red-500' : 'border-outline-variant focus:border-primary'} rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                    placeholder="Enter identification number"
                  />
                  {errors.idNumber && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={14}/>{errors.idNumber}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Contact Number {visitorType === 'returning' && <span className="text-on-surface-variant/50 font-normal">(Optional)</span>}</label>
                  <input
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className={`w-full h-12 bg-gray-50 border ${errors.contactNumber ? 'border-red-500' : 'border-outline-variant focus:border-primary'} rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all`}
                    placeholder="Enter contact number"
                    type="tel"
                  />
                  {errors.contactNumber && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={14}/>{errors.contactNumber}</p>}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {visitorType === 'returning' && formData.fullName && (
                  <div className="bg-green-50 text-green-800 p-4 rounded-xl flex items-center gap-3 mb-2 text-sm font-medium border border-green-200">
                    <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                    <div>Welcome back, <span className="font-bold">{formData.fullName}</span>! We retrieved your details.</div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Vehicle Plate Number</label>
                  <input
                    name="vehicle"
                    value={formData.vehicle}
                    onChange={handleChange}
                    className={`w-full h-12 bg-gray-50 border ${errors.vehicle ? 'border-red-500' : 'border-outline-variant focus:border-primary'} rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase`}
                    placeholder="E.G. ABC 1234"
                  />
                  {errors.vehicle && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={14}/>{errors.vehicle}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Person to Meet <span className="text-on-surface-variant/50 font-normal">(Optional)</span></label>
                  <input
                    name="person"
                    value={formData.person}
                    onChange={handleChange}
                    className="w-full h-12 bg-gray-50 border border-outline-variant focus:border-primary rounded-xl px-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Enter Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Reason for Visit</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className={`w-full bg-gray-50 border ${errors.reason ? 'border-red-500' : 'border-outline-variant focus:border-primary'} rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none min-h-[100px]`}
                    placeholder="Describe the purpose of your visit..."
                  />
                  {errors.reason && <p className="text-red-500 text-xs flex items-center gap-1 mt-1"><AlertCircle size={14}/>{errors.reason}</p>}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                    For security purposes, please take a clear photo of your face. 
                    {visitorType === 'returning' && " Even as a returning visitor, a fresh photo is required for today's entry."}
                  </p>
                  <div className="relative h-56 w-full bg-surface-container rounded-2xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors group overflow-hidden">
                    {formData.image ? (
                      <img src={formData.image} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="text-primary group-hover:scale-110 transition-transform" size={40} />
                        <span className="text-sm font-semibold text-on-surface">Tap to open Camera</span>
                      </>
                    )}
                    <input 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      onChange={handleImageCapture}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-6">
                  <div className="flex items-center gap-4 border-b border-blue-200/50 pb-5">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary overflow-hidden border border-blue-100">
                      {formData.image ? (
                        <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-on-surface">{formData.fullName || 'Visitor Name'}</h4>
                      <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <BadgeCheck size={14} className="text-primary" />
                        {formData.idNumber}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                    <div>
                      <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block mb-1">Vehicle</span>
                      <span className="font-medium text-on-surface">{formData.vehicle || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block mb-1">Meeting</span>
                      <span className="font-medium text-on-surface">{formData.person || 'General'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider block mb-1">Reason</span>
                      <span className="font-medium text-on-surface leading-relaxed">{formData.reason}</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[11px] text-on-surface-variant px-6 leading-relaxed">
                  By submitting, you agree to our security protocols and campus privacy policies.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        {step > 0 && (
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 mt-auto">
            <button
              onClick={handleBack}
              disabled={isSubmitting || isSearching}
              className="px-5 py-3.5 bg-white border border-outline-variant text-on-surface hover:bg-gray-50 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={isSearching}
                className="flex-1 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] hover:bg-primary/95 transition-all disabled:opacity-70"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{step === 1 && visitorType === 'returning' ? 'Find My Profile' : 'Continue'}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] hover:bg-primary/95 transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Pass</span>
                    <CheckCircle2 size={20} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
