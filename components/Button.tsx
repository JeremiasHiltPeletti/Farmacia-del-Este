import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'iconDanger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  icon,
  fullWidth = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-bold transition-all lg:active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-teal-500 text-white lg:hover:bg-teal-600 shadow-lg shadow-teal-200",
    secondary: "bg-gray-100 text-gray-700 lg:hover:bg-gray-200",
    danger: "bg-red-500 text-white lg:hover:bg-red-600 shadow-lg shadow-red-200",
    ghost: "bg-transparent text-gray-500 lg:hover:bg-gray-100",
    icon: "bg-transparent text-gray-400 lg:hover:text-teal-600 lg:hover:bg-teal-50",
    iconDanger: "bg-transparent text-gray-400 lg:hover:text-red-600 lg:hover:bg-red-50"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 rounded-xl",
    lg: "px-6 py-3 rounded-2xl",
    icon: "p-1.5 rounded-lg"
  };

  const widthClass = fullWidth ? "w-full flex-1" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
