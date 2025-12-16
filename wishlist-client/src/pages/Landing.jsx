import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import axios from '../api/axios';
import { Link } from 'react-router-dom';

export default function Landing() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const res = await axios.get('/api/landing');
            setContent(res.data.content);
        } catch (err) {
            console.error('Failed to fetch landing content', err);
            setContent('# Welcome to Wishlist App\n\nPlease login to continue.'); // Fallback
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                {/* Hero Section Content (Markdown) */}
                <div className="p-8 md:p-12 prose prose-lg prose-indigo max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {content || "# Welcome\n\nCreate and share your wishlists with friends and family."}
                    </ReactMarkdown>
                </div>

                {/* Call to Action Section */}
                <div className="bg-slate-50 p-8 md:p-12 border-t border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-center">
                    <Link
                        to="/login"
                        className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        Login
                    </Link>
                    <span className="text-slate-400 font-medium">or</span>
                    <Link
                        to="/signup"
                        className="bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg hover:border-indigo-600 hover:text-indigo-600 transition-all"
                    >
                        Signup
                    </Link>
                </div>
            </div>
        </div>
    );
}
