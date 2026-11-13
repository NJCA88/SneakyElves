import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Yellow bar shown on every page while an admin is using "Login as".
export default function ImpersonationBanner() {
    const { user, impersonator, stopImpersonation } = useAuth();
    const navigate = useNavigate();

    if (!impersonator || !user) return null;

    return (
        <div role="alert" className="bg-yellow-300 text-yellow-950 border-b border-yellow-500">
            <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                <span>
                    Logged in AS <strong>{user.name}</strong>
                    {user.email && <span className="opacity-75"> ({user.email})</span>}
                </span>
                <button
                    onClick={() => {
                        stopImpersonation();
                        navigate('/admin');
                    }}
                    className="px-3 py-1 rounded-full bg-yellow-950 text-yellow-100 font-medium hover:bg-yellow-900 transition-colors"
                >
                    Back to {impersonator.name}
                </button>
            </div>
        </div>
    );
}
