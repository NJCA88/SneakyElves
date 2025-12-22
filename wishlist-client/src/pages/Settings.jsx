import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Settings() {
    const { user, login } = useAuth();
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        profilePictureUrl: user?.profilePictureUrl || '',
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const res = await axios.put(`/api/users/${user.id}`, profileData);
            login({ ...user, ...res.data.user });
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLink = async (credentialResponse) => {
        setLoading(true);
        setStatus({ type: '', message: '' });
        try {
            const res = await axios.post('/api/auth/google/link', {
                userId: user.id,
                token: credentialResponse.credential
            });
            login({ ...user, ...res.data.user });
            setStatus({ type: 'success', message: 'Google account linked successfully!' });
        } catch (err) {
            console.error('Link error', err);
            setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to link Google account' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setStatus({ type: 'error', message: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            await axios.put(`/api/users/${user.id}/password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>

            {status.message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {status.message}
                </div>
            )}

            {/* Profile Settings */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <User size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Profile Picture URL</label>
                        <input
                            type="text"
                            value={profileData.profilePictureUrl}
                            onChange={(e) => setProfileData({ ...profileData, profilePictureUrl: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="https://example.com/avatar.jpg"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </form>
            </div>

            {/* Connected Accounts */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Connected Accounts</h2>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <svg className="w-6 h-6 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Google Account</h3>
                            <p className="text-sm text-slate-500">
                                {user.googleId ? 'Connected to your Google identity' : 'Not connected'}
                            </p>
                        </div>
                    </div>

                    {user.googleId ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-100 px-3 py-1 rounded-full">
                            <CheckCircle size={14} />
                            Connected
                        </span>
                    ) : (
                        <div className="transform scale-90 origin-right">
                            <GoogleLogin
                                onSuccess={handleGoogleLink}
                                onError={() => setStatus({ type: 'error', message: 'Google Link Failed' })}
                                shape="pill"
                                text="signin_with"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Security</h2>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                    >
                        <Save size={18} />
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}
