import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

const readStored = (key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error(`Failed to parse ${key} from local storage`, e);
        localStorage.removeItem(key);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => readStored('user'));
    // When an admin uses "Login as", `impersonator` holds the admin's own
    // account and `user` holds the account being viewed as.
    const [impersonator, setImpersonator] = useState(() => readStored('impersonator'));
    // Stored session is read synchronously above, so there's nothing to wait for.
    const loading = false;

    const login = (userData) => {
        setUser(userData);
        setImpersonator(null);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('impersonator');
    };

    const logout = () => {
        setUser(null);
        setImpersonator(null);
        localStorage.removeItem('user');
        localStorage.removeItem('impersonator');
    };

    const startImpersonation = (targetUser) => {
        // Keep the original admin if we're already impersonating someone.
        const admin = impersonator || user;
        setImpersonator(admin);
        setUser(targetUser);
        localStorage.setItem('impersonator', JSON.stringify(admin));
        localStorage.setItem('user', JSON.stringify(targetUser));
    };

    const stopImpersonation = () => {
        if (!impersonator) return;
        setUser(impersonator);
        setImpersonator(null);
        localStorage.setItem('user', JSON.stringify(impersonator));
        localStorage.removeItem('impersonator');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, impersonator, startImpersonation, stopImpersonation }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
