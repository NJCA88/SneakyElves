import { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Save } from 'lucide-react';

export default function TextUpdates() {
    const [aboutContent, setAboutContent] = useState('');
    const [landingContent, setLandingContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const [aboutRes, landingRes] = await Promise.all([
                axios.get('/api/about'),
                axios.get('/api/landing')
            ]);
            setAboutContent(aboutRes.data.content);
            setLandingContent(landingRes.data.content);
        } catch (err) {
            console.error('Failed to fetch content', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (type, content) => {
        try {
            await axios.put(`/api/admin/${type}`, { content });
            alert(`${type === 'about' ? 'About' : 'Landing'} page updated!`);
        } catch (err) {
            console.error('Failed to update content', err);
            alert('Failed to save changes');
        }
    };

    if (loading) return <div>Loading editors...</div>;

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">Landing Page Content</h2>
                    <button
                        onClick={() => handleSave('landing', landingContent)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
                    >
                        <Save size={18} />
                        Save Landing Page
                    </button>
                </div>
                <div className="p-6">
                    <textarea
                        value={landingContent}
                        onChange={(e) => setLandingContent(e.target.value)}
                        className="w-full h-[400px] p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono text-sm resize-y"
                        placeholder="# Welcome..."
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900">About Page Content</h2>
                    <button
                        onClick={() => handleSave('about', aboutContent)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
                    >
                        <Save size={18} />
                        Save About Page
                    </button>
                </div>
                <div className="p-6">
                    <textarea
                        value={aboutContent}
                        onChange={(e) => setAboutContent(e.target.value)}
                        className="w-full h-[400px] p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-mono text-sm resize-y"
                        placeholder="# About Us..."
                    />
                </div>
            </div>
        </div>
    );
}
