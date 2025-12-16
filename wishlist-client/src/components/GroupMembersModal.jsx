import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { X, Trash2, Shield, ShieldCheck } from 'lucide-react';

export default function GroupMembersModal({ group, allUsers, currentUser, onClose, onUpdate }) {
    const [currentGroup, setCurrentGroup] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [addingUser, setAddingUser] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        fetchGroupDetails();
    }, [group.id]);

    const fetchGroupDetails = async () => {
        try {
            const res = await axios.get(`/api/admin/groups/${group.id}`);
            if (!res.data || !res.data.memberships) {
                console.warn('Invalid group data received');
                return;
            }
            setCurrentGroup(res.data);
        } catch (err) {
            console.error('Fetch error:', err);
            // ErrorBoundary will catch this if we re-throw, or we can just alert
            alert(`Failed to load group: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!currentGroup && loading) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 shadow-xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        </div>
    );
    if (!currentGroup) return null;

    // Defensive check
    if (!allUsers) {
        console.error('GroupMembersModal: allUsers is undefined');
        return <div className="p-4 text-red-600">Error: User list not initialized.</div>;
    }

    if (!currentGroup.memberships) {
        console.error('GroupMembersModal: memberships is undefined', currentGroup);
        return <div className="p-4 text-red-600">Error: Group membership data missing.</div>;
    }

    // Filter users not in the group
    const availableUsers = allUsers.filter(u =>
        !currentGroup.memberships.some(m => m.user.id === u.id)
    );

    const handleRoleUpdate = async (userId, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        try {
            await axios.put(`/api/admin/users/${userId}/groups/${currentGroup.id}`, { role: newRole });
            fetchGroupDetails();
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to update role');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Are you sure you want to remove this user from the group?')) return;
        try {
            await axios.delete(`/api/admin/users/${userId}/groups/${currentGroup.id}`);
            fetchGroupDetails();
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to remove user from group');
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) return;
        setAddingUser(true);
        try {
            await axios.post(`/api/admin/users/${selectedUserId}/groups`, {
                groupId: currentGroup.id,
                role: 'MEMBER'
            });
            fetchGroupDetails();
            onUpdate();
            setSelectedUserId('');
        } catch (err) {
            console.error(err);
            alert('Failed to add user to group');
        } finally {
            setAddingUser(false);
        }
    };



    const handleDeleteGroup = async () => {
        try {
            await axios.delete(`/api/admin/groups/${currentGroup.id}`, {
                params: { currentUserId: currentUser.id }
            });
            alert('Group deleted successfully');
            onClose();
            onUpdate(); // This will refresh the dashboard list
        } catch (err) {
            console.error(err);
            alert('Failed to delete group');
        }
    };

    // Check if user is allowed to delete: System Admin or Group Admin
    const canDelete = currentUser?.isAdmin || currentGroup.memberships.some(m => m.user.id === currentUser.id && m.role === 'ADMIN');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Manage Members</h3>
                        <p className="text-sm text-slate-500">Group: {currentGroup.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Current Members List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Members ({currentGroup.memberships.length})</h4>
                        {currentGroup.memberships?.length > 0 ? (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {currentGroup.memberships.map(m => (
                                    <div key={m.user.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-700">{m.user.name || 'Unknown'}</span>
                                            <span className="text-xs text-slate-400">{m.user.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {m.role}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveMember(m.user.id)}
                                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                title="Remove from group"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic">No members in this group.</div>
                        )}
                    </div>

                    {/* Add New Member Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Member</h4>
                        <div className="flex gap-2">
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select a user...</option>
                                <option disabled className="text-xs font-bold bg-slate-100">--- Available Users ---</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddMember}
                                disabled={!selectedUserId || addingUser}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {addingUser ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>



                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    {canDelete ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-red-600 font-medium text-sm hover:text-red-700 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} /> Delete Group
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    <button
                        onClick={onClose}
                        className="text-slate-600 font-medium text-sm hover:text-slate-900 px-4 py-2"
                    >
                        Done
                    </button>
                </div>

                {showDeleteConfirm && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>

                        {/* Alert Box */}
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center relative z-20 max-w-xs w-full transform scale-100 animate-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto text-red-600">
                                <Trash2 size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Delete Group?</h4>
                            <p className="text-sm text-slate-500 mb-6">
                                "{currentGroup.name}" will be permanently deleted.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteGroup}
                                    className="flex-1 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
