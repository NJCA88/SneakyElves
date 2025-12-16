import { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, ChevronDown } from 'lucide-react';

export default function Invite() {
    const { user } = useAuth();
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedMap, setCopiedMap] = useState({}); // { [groupId]: boolean }
    const [inviteExpandedMap, setInviteExpandedMap] = useState({}); // { [groupId]: boolean }

    useEffect(() => {
        if (user) {
            fetchInviteData();
        }
    }, [user]);

    const fetchInviteData = async () => {
        setLoading(true);
        try {
            // We can reuse the dashboard endpoint or fetch user details directly.
            // Dashboard endpoint returns memberships, so let's stick with that for consistency/simplicity,
            // or we could just fetch user with memberships include.
            const res = await axios.get(`/api/dashboard/${user.id}`);
            setMemberships(res.data.memberships || []);
        } catch (err) {
            console.error('Error fetching invite data:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleInviteExpanded = (groupId) => {
        setInviteExpandedMap(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const copyInviteLink = async (group) => {
        const link = `${window.location.origin}/signup?invite=${group.inviteCode}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedMap(prev => ({ ...prev, [group.id]: true }));
            setTimeout(() => {
                setCopiedMap(prev => ({ ...prev, [group.id]: false }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
                    <div className="h-40 bg-slate-200 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-extrabold text-slate-900 mb-4">
                    Invite Friends & Family
                </h1>
                <p className="text-lg text-slate-600">
                    Share the joy of gifting! Invite others to your groups so you can see each other's wishlists.
                </p>
            </div>

            {memberships.length > 0 ? (
                <div className="space-y-6">
                    {memberships.map(m => (
                        <div key={m.group.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900">{m.group.name}</h3>
                                    <p className="text-sm text-slate-500">
                                        Invite Code: <span className="font-mono font-bold text-slate-700">{m.group.inviteCode}</span>
                                    </p>
                                </div>
                                <div className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                                    {m.role}
                                </div>
                            </div>

                            <button
                                onClick={() => copyInviteLink(m.group)}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                {copiedMap[m.group.id] ? <Check size={20} /> : <Copy size={20} />}
                                {copiedMap[m.group.id] ? 'Invite Link Copied!' : 'Copy Invite Link'}
                            </button>

                            <p className="text-xs text-center text-slate-400 mt-3">
                                Anyone with this link can join the group properly.
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 mb-4">You are not in any groups yet.</p>
                    <p className="text-sm text-slate-400">Create or join a group to start inviting friends!</p>
                </div>
            )}
        </div>
    );
}
