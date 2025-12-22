import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { LogIn, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('shareToken');
    const inviteCode = searchParams.get('invite');

    const handleGoogleLogin = async (credentialResponse) => {
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential,
                inviteToken: inviteToken || undefined,
                inviteCode: inviteCode || undefined
            });
            login(res.data.user);
            navigate('/');
        } catch (err) {
            console.error('Google Login Error:', err);
            setError('Google Login Failed');
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/login', { email, password });
            login(res.data.user);
            navigate('/');
        } catch (err) {
            setError('Invalid email or password');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <LogIn size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500 mt-2">Sign in to manage your wishlists</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 flex items-center justify-center">
                        {error}
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="you@example.com"
                            required
                            disabled={isSubmitting}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
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
                            disabled={isSubmitting}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                        />
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !email || !password}
                        className={`w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all transform flex items-center justify-center
                            ${isSubmitting || !email || !password
                                ? 'bg-indigo-400 cursor-not-allowed text-indigo-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </div>

                <div className="mt-8 text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <Link to={{ pathname: '/signup', search: window.location.search }} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
                        Create one now
                    </Link>
                </div>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or continue with</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => {
                            console.log('Login Failed');
                            setError('Google Login Failed');
                        }}
                        useOneTap
                        shape="circle"
                    />
                </div>
            </div>
        </div>
    );
}
