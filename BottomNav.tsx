import React from 'react';
import { LayoutList, Map, Camera, Stethoscope, User } from 'lucide-react';
import { View } from '../types';

interface BottomNavProps {
  setView: (view: View) => void;
  currentView: View;
}

const BottomNav: React.FC<BottomNavProps> = ({ setView, currentView }) => {
  const navItemClass = (viewName: View) => 
    `flex flex-col items-center p-2 transition-all duration-300 ${currentView === viewName ? 'text-orange-600 scale-110' : 'text-stone-400 hover:text-stone-600'}`;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 px-4 py-2 pb-6 sm:pb-3 flex justify-around items-center z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <button onClick={() => setView(View.FEED)} className={navItemClass(View.FEED)}>
        <LayoutList size={24} strokeWidth={2.5} />
      </button>
      <button onClick={() => setView(View.MAPS)} className={navItemClass(View.MAPS)}>
        <Map size={24} strokeWidth={2.5} />
      </button>
      <div className="relative -top-8">
        <button 
          onClick={() => setView(View.CAMERA)}
          className="bg-gradient-to-br from-orange-500 to-red-500 text-white p-5 rounded-full shadow-xl shadow-orange-200 hover:scale-105 active:scale-95 transition-all border-4 border-white"
        >
          <Camera size={32} />
        </button>
      </div>
      <button onClick={() => setView(View.AI_CHAT)} className={navItemClass(View.AI_CHAT)}>
        <Stethoscope size={24} strokeWidth={2.5} />
      </button>
      <button onClick={() => setView(View.PROFILE)} className={navItemClass(View.PROFILE)}>
        <User size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default BottomNav;
