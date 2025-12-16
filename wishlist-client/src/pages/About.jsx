import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Edit2, Save, X } from 'lucide-react';

export default function About() {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const res = await axios.get('/api/about');
            setContent(res.data.content);
            setEditContent(res.data.content);
        } catch (err) {
            console.error('Failed to fetch about content', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await axios.put('/api/admin/about', { content: editContent });
            setContent(editContent);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update content', err);
            alert('Failed to save changes');
        }
    };

    if (loading) return <div className="text-center py-12">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">About</h1>
                {user?.isAdmin && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                                >
                                    <X size={18} />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
                                >
                                    <Save size={18} />
                                    Save
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition-colors"
                            >
                                <Edit2 size={18} />
                                Edit Page
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                {isEditing ? (
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-[600px] p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono text-sm resize-y"
                        placeholder="Enter markdown content..."
                    />
                ) : (
                    <div className="prose prose-slate max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
