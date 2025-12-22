import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    const [inviteCode, setInviteCode] = useState(searchParams.get('invite') || '');
    const [inviteToken] = useState(searchParams.get('shareToken') || ''); // Capture token from URL
    const [groupName, setGroupName] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential,
                inviteCode: inviteCode || undefined,
                inviteToken: inviteToken || undefined
            });
            login(res.data.user);
            navigate('/');
        } catch (err) {
            console.error('Google Signup Error:', err);
            setError('Google Signup Failed');
        }
    };

    // ... (useEffect for existing invite code check)

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/signup', {
                name,
                email,
                password,
                inviteCode,
                inviteToken
            });
            login(res.data.user);
            navigate('/');
        } catch (err) {
            setError('Error creating account. Email might be taken.');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <UserPlus size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
                    <p className="text-slate-500 mt-2">
                        {groupName ? (
                            <span>Joining <span className="font-semibold text-indigo-600">{groupName}</span></span>
                        ) : (
                            "Join to start sharing your wishes"
                        )}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center justify-center">
                        {error}
                    </div>
                )}

                <div className="space-y-5" onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="Alice Smith"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {!groupName && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Invite Code (Optional)</label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase tracking-widest"
                                placeholder="ABC123"
                                maxLength={6}
                            />
                        </div>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                    >
                        Create Account
                    </button>
                </div>

                <div className="mt-8 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to={{ pathname: '/login', search: window.location.search }} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
                        Sign in instead
                    </Link>
                </div>
                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or sign up with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        text="signup_with"
                        onSuccess={handleGoogleLogin}
                        onError={() => {
                            console.log('Signup Failed');
                            setError('Google Signup Failed');
                        }}
                        shape="circle"
                    />
                </div>
            </div>
        </div>
    );
}
