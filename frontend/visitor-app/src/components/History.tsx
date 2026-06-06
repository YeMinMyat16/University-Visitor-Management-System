import React from 'react';
import { History as HistoryIcon, MapPin, Calendar, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

const VISITS = [
  {
    id: 1,
    host: 'Dr. Sarah Jenkins',
    department: 'Dept of Computer Science',
    date: 'Apr 24, 2026',
    status: 'Completed'
  },
  {
    id: 2,
    host: 'Prof. Michael Chen',
    department: 'Research & Innovation',
    date: 'Apr 18, 2026',
    status: 'Completed'
  },
  {
    id: 3,
    host: 'Admin Office',
    department: 'Registrar',
    date: 'Mar 12, 2026',
    status: 'Completed'
  }
];

export default function History() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">Visit History</h2>
          <p className="text-on-surface-variant">Review your past campus visits.</p>
        </div>
        
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-red-100 shadow-sm"
          title="Clear localStorage to test empty states"
        >
          Reset Demo
        </button>
      </section>

      <div className="space-y-4">
        {VISITS.map((visit, index) => (
          <motion.div 
            key={visit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary">
              <HistoryIcon size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-on-surface">{visit.host}</h4>
                <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-tighter">{visit.date}</span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                <MapPin size={12} />
                {visit.department}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  {visit.status}
                </span>
                <ArrowUpRight size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
