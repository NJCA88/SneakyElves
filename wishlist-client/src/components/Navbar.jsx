import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gift, LogOut, User, LogIn, LayoutDashboard, Settings, UserPlus, Bell, Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Left Side: Logo & Navigation */}
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white group-hover:bg-indigo-700 transition-colors">
                                <Gift size={20} />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                SneakyElves
                            </span>
                        </Link>

                        <Link to="/about" className={`hidden md:block font-medium transition-colors ${isActive('/about') ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                            About
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <NotificationBell />
                                <UserMenu user={user} logout={logout} />
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className={`text-sm font-medium transition-colors ${isActive('/login') ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
                                >
                                    <LogIn size={16} />
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav >
    );
}

function UserMenu({ user, logout }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
            >
                {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                    <div className="bg-slate-300 rounded-full p-1">
                        <User size={16} className="text-slate-600" />
                    </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-slate-700">{user.name}</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden">
                    {(user.isAdmin || (user.memberships && user.memberships.length > 0)) && (
                        <Link
                            to="/admin"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                            <LayoutDashboard size={18} />
                            {user.isAdmin ? 'Admin' : 'Group Management'}
                        </Link>
                    )}

                    <Link
                        to="/invite"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    >
                        <UserPlus size={18} />
                        Invite Friends
                    </Link>
                    <Link
                        to="/settings"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    >
                        <Settings size={18} />
                        My Profile
                    </Link>

                    <div className="h-px bg-slate-100 my-1"></div>

                    <button
                        onClick={() => {
                            logout();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                <Bell className="mx-auto mb-2 opacity-20" size={32} />
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-slate-400 hover:text-indigo-600 self-start"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
