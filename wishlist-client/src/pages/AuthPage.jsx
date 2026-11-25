import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

const inputClass =
    'w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-slate-50';

// One page for both logging in and signing up (/continue, /login and /signup
// all render it). Google is the primary option; email + password sits below.
export default function AuthPage({ initialMode = 'login' }) {
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('shareToken') || '';
    const [inviteCode, setInviteCode] = useState((searchParams.get('invite') || '').toUpperCase());
    const [groupName, setGroupName] = useState(null);

    const [mode, setMode] = useState(initialMode); // email form: 'login' | 'signup'
    // Google is the strongly preferred path: the email form stays collapsed
    // until someone explicitly asks for it.
    const [showEmail, setShowEmail] = useState(false);
    const emailInputRef = useRef(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Show which group an invite link joins.
    useEffect(() => {
        const code = searchParams.get('invite');
        if (!code) return;
        axios.get(`/api/groups/validate/${encodeURIComponent(code)}`)
            .then(res => { if (res.data.valid) setGroupName(res.data.groupName); })
            .catch(() => {});
    }, [searchParams]);

    const finish = (user) => {
        login(user);
        navigate('/');
    };

    const handleGoogle = async (credentialResponse) => {
        setError('');
        setIsSubmitting(true);
        try {
            const res = await axios.post('/api/auth/google', {
                token: credentialResponse.credential,
                inviteCode: inviteCode || undefined,
                inviteToken: inviteToken || undefined,
            });
            finish(res.data.user);
        } catch (err) {
            console.error('Google sign-in error:', err);
            setError("Google sign-in didn't work. Please try again, or use email below.");
            setIsSubmitting(false);
        }
    };

    const canSubmit = email && password && (mode === 'login' || name.trim());

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || isSubmitting) return;
        setError('');
        setIsSubmitting(true);
        try {
            const res = mode === 'login'
                ? await axios.post('/api/login', { email, password })
                : await axios.post('/api/signup', {
                    name: name.trim(),
                    email,
                    password,
                    inviteCode: inviteCode || undefined,
                    inviteToken: inviteToken || undefined,
                });
            finish(res.data.user);
        } catch {
            setError(mode === 'login'
                ? 'Incorrect email or password.'
                : "Couldn't create the account. That email may already be in use.");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (showEmail) emailInputRef.current?.focus();
    }, [showEmail]);

    const switchMode = () => {
        setMode(m => (m === 'login' ? 'signup' : 'login'));
        setError('');
    };

    return (
        <div className="max-w-md mx-auto mt-12 sm:mt-16">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center mb-8">
                    <img src="/elf_icon.jpg" alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-sm border border-slate-100" />
                    <h1 className="text-2xl font-bold text-slate-900">Welcome to SneakyElves</h1>
                    <p className="text-slate-500 mt-2">
                        {groupName
                            ? <>You&apos;re joining <span className="font-semibold text-indigo-600">{groupName}</span></>
                            : 'Log in or create your account'}
                    </p>
                </div>

                {error && (
                    <div role="alert" className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 text-center">
                        {error}
                    </div>
                )}

                {/* Primary: Google (works for new and returning users) */}
                <div className="flex justify-center" data-testid="google-signin">
                    <GoogleLogin
                        onSuccess={handleGoogle}
                        onError={() => setError("Google sign-in didn't work. Please try again, or use email below.")}
                        text="continue_with"
                        size="large"
                        shape="pill"
                        width="320"
                        useOneTap
                    />
                </div>
                <p className="text-center text-xs text-slate-400 mt-3">New here? Google creates your account automatically.</p>

                {!showEmail ? (
                    <div className="mt-8 text-center">
                        <button
                            type="button"
                            onClick={() => setShowEmail(true)}
                            aria-expanded="false"
                            className="text-sm text-slate-400 hover:text-slate-600 hover:underline underline-offset-4 transition-colors"
                        >
                            or continue with email and password
                        </button>
                    </div>
                ) : (
                    <div className="mt-7 pt-7 border-t border-slate-200">
                    {/* Secondary: email + password */}
                    <form className="space-y-4" onSubmit={handleEmailSubmit}>
                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                                <input id="auth-name" type="text" value={name} onChange={e => setName(e.target.value)}
                                    className={inputClass} placeholder="Alice Smith" autoComplete="name" disabled={isSubmitting} />
                            </div>
                        )}
                        <div>
                            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input id="auth-email" ref={emailInputRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className={inputClass} placeholder="you@example.com" autoComplete="email" disabled={isSubmitting} />
                        </div>
                        <div>
                            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                                className={inputClass} placeholder="••••••••"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={isSubmitting} />
                        </div>
                        {mode === 'signup' && !groupName && (
                            <div>
                                <label htmlFor="auth-invite" className="block text-sm font-medium text-slate-700 mb-1.5">Group invite code <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input id="auth-invite" type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                    className={`${inputClass} uppercase tracking-widest`} placeholder="ABC123" maxLength={6} disabled={isSubmitting} />
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className="w-full py-3 rounded-xl font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? <><Loader2 className="animate-spin mr-2" size={18} /> {mode === 'login' ? 'Logging in…' : 'Creating account…'}</>
                                : (mode === 'login' ? 'Log in with email' : 'Create account with email')}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                        <button type="button" onClick={switchMode} className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
                            {mode === 'login' ? 'Create an account with email' : 'Log in instead'}
                        </button>
                    </p>
                    </div>
                )}
            </div>
        </div>
    );
}
