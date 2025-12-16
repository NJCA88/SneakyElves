import React, { useState } from 'react';
import axios from '../api/axios';
import { X, Trash2, Shield, ShieldCheck } from 'lucide-react';

export default function GroupManagementModal({ user, allGroups, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [addingGroup, setAddingGroup] = useState(false);

    if (!user) return null;

    // Filter out groups the user is already in
    const availableGroups = allGroups.filter(
        g => !user.memberships?.some(m => m.group.id === g.id)
    );

    const handleRoleUpdate = async (groupId, currentRole) => {
        const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        try {
            await axios.put(`/api/admin/users/${user.id}/groups/${groupId}`, { role: newRole });
            onUpdate(); // Trigger refresh in parent
        } catch (err) {
            console.error(err);
            alert('Failed to update role');
        }
    };

    const handleRemoveGroup = async (groupId) => {
        if (!confirm('Are you sure you want to remove the user from this group?')) return;
        try {
            await axios.delete(`/api/admin/users/${user.id}/groups/${groupId}`);
            onUpdate();
        } catch (err) {
            console.error(err);
            alert('Failed to remove user from group');
        }
    };

    const handleAddGroup = async () => {
        if (!selectedGroupId) return;
        setAddingGroup(true);
        try {
            await axios.post(`/api/admin/users/${user.id}/groups`, {
                groupId: selectedGroupId,
                role: 'MEMBER' // Default role
            });
            onUpdate();
            setSelectedGroupId('');
        } catch (err) {
            console.error(err);
            alert('Failed to add user to group');
        } finally {
            setAddingGroup(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Manage Groups</h3>
                        <p className="text-sm text-slate-500">For {user.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Current Groups List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Memberships</h4>
                        {user.memberships && user.memberships.length > 0 ? (
                            <div className="space-y-2">
                                {user.memberships.map(m => (
                                    <div key={m.group.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="font-semibold text-slate-700">{m.group.name}</span>
                                        <div className="flex items-center gap-3">

                                            <button
                                                onClick={() => handleRemoveGroup(m.group.id)}
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
                            <div className="text-sm text-slate-400 italic">User is not in any groups.</div>
                        )}
                    </div>

                    {/* Add New Group Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add to Group</h4>
                        <div className="flex gap-2">
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select a group...</option>
                                {availableGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddGroup}
                                disabled={!selectedGroupId || addingGroup}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {addingGroup ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="text-slate-600 font-medium text-sm hover:text-slate-900 px-4 py-2"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
