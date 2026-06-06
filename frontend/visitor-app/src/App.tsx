import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { 
  School, 
  UserPlus, 
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RegistrationForm from './components/RegistrationForm';
import MyPass from './components/MyPass';

type Tab = 'check-in' | 'my-pass';

function VisitorApp() {
  const [activeTab, setActiveTab] = useState<Tab>('check-in');
  
  // Auto-switch to My Pass if there's active/pending data
  React.useEffect(() => {
    const hasActive = localStorage.getItem('vms_current_visitor');
    const hasPending = localStorage.getItem('vms_pending_visitor');
    if (hasActive || hasPending) {
      setActiveTab('my-pass');
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'check-in':
        return <RegistrationForm onNext={() => setActiveTab('my-pass')} />;
      case 'my-pass':
        return <MyPass onGoToCheckIn={() => setActiveTab('check-in')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: 'url("/aiu-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[3px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 h-16 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/aiu-logo.png" alt="AIU Logo" className="h-8 w-auto object-contain drop-shadow-sm" />
          <div className="h-6 w-[2px] bg-gray-200 rounded-full" />
          <h1 className="text-xl font-extrabold text-primary tracking-tight font-display">CampusPass</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-32 px-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <div key={activeTab}>
            {renderContent()}
          </div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-lg border-t border-blue-50 px-4 py-3 pb-safe shadow-[0_-4px_12px_rgba(30,64,175,0.05)] rounded-t-[2.5rem]">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <NavButton 
            active={activeTab === 'check-in'} 
            onClick={() => setActiveTab('check-in')}
            icon={<UserPlus size={20} />}
            label="Check-in"
          />
          <NavButton 
            active={activeTab === 'my-pass'} 
            onClick={() => setActiveTab('my-pass')}
            icon={<QrCode size={20} />}
            label="My Pass"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 px-6 py-2 rounded-2xl transition-all duration-300
        ${active ? 'text-primary scale-105' : 'text-on-surface-variant opacity-60 hover:opacity-100'}
      `}
    >
      {active && (
        <motion.div 
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary/5 rounded-2xl -z-10"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`${active ? 'text-primary' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="w-1 h-1 rounded-full bg-primary mt-0.5"
        />
      )}
    </button>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VisitorApp />} />
    </Routes>
  );
}

