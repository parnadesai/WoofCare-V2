import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ai' | 'ghost';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "w-full py-3.5 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer shadow-sm";
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200",
    secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
    outline: "border-2 border-orange-600 text-orange-600 hover:bg-orange-50",
    ai: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
    ghost: "bg-transparent text-stone-500 hover:bg-stone-50"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
