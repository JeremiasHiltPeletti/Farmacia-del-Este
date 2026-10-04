
import React from 'react';
import { 
  CheckCircle2, Circle, Clock, MessageCircle, Mic, Plus, 
  Settings, Trash2, User, Users, X, ChevronRight, Menu, 
  Store, Box, Sparkles, FileText, Calendar,
  Send, MoreVertical, Paperclip, ChevronLeft, MicOff,
  LayoutDashboard, CalendarDays, LogOut, Bell, 
  Filter, ChevronDown, ChevronUp, Leaf, MoreHorizontal, BarChart3,
  ListTodo, Search, AlertCircle, AlertTriangle, Check, Play, PlayCircle,
  Pill, Heart, Syringe, Truck, Zap, Thermometer, Droplets,
  Activity, BadgeAlert, Bandage, Beaker, Brain, Cross,
  Dna, Eye, FlaskConical, Stethoscope, Tag, Briefcase,
  Pencil, Lock, Megaphone, Pause, Copy,
  Bold, Italic, Underline, List, ListOrdered,
  Scale, TrendingUp, TrendingDown, History, ShoppingCart, Info
} from 'lucide-react';

export const Icons = {
  Check: CheckCircle2,
  CheckSimple: Check,
  Uncheck: Circle,
  Clock,
  Chat: MessageCircle,
  Mic,
  MicOff,
  Plus,
  Settings,
  Delete: Trash2,
  User,
  Users,
  Close: X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  Store,
  Box,
  Clean: Sparkles,
  Doc: FileText,
  Calendar,
  Send,
  More: MoreVertical,
  MoreHoriz: MoreHorizontal,
  Attach: Paperclip,
  Dashboard: LayoutDashboard,
  CalendarDays,
  Logout: LogOut,
  Bell,
  Filter,
  ShoppingCart,
  Leaf,
  Chart: BarChart3,
  List: ListTodo,
  Search,
  Alert: AlertCircle,
  AlertTriangle,
  Info,
  Play,
  PlayCircle,
  Pause,
  Lock,
  Megaphone,
  Copy,
  // New Category Icons
  Pill, Heart, Syringe, Truck, Zap, Thermometer, Droplets,
  Activity, BadgeAlert, Bandage, Beaker, Brain, Cross,
  Dna, Eye, FlaskConical, Stethoscope, Tag, Briefcase, 
  Edit: Pencil,
  Pencil,
  // Rich Text Icons
  Bold, Italic, Underline, ListBulleted: List, ListOrdered,
  // Compensatory Icons
  Scale, TrendingUp, TrendingDown, History
};

export const ICON_OPTIONS = [
  'Store', 'Box', 'Clean', 'Doc', 'Calendar', 'Pill', 'Heart', 
  'Syringe', 'Truck', 'Zap', 'Thermometer', 'Droplets', 'Activity',
  'BadgeAlert', 'Bandage', 'Beaker', 'Brain', 'Cross', 'Dna',
  'Eye', 'FlaskConical', 'Stethoscope', 'Tag', 'Briefcase'
];

export const getCategoryIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName] || Icons.Box;
  return <IconComponent size={18} />;
};
