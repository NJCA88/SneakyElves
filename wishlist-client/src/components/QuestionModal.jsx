import { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

export default function QuestionModal({ isOpen, onClose, onSubmit, items = [], isSubmitting }) {
    const [body, setBody] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            body,
            itemId: selectedItemId || null
        });
        setBody('');
        setSelectedItemId('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <MessageCircle size={20} className="text-indigo-600" />
                        Ask a Question
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Your question will be sent anonymously. The wishlist owner will see "Someone asked...".
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Related Item (Optional)
                        </label>
                        <select
                            value={selectedItemId}
                            onChange={(e) => setSelectedItemId(e.target.value)}
                            className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-100 transition-all text-sm"
                        >
                            <option value="">General Question / No specific item</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Your Question
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            required
                            placeholder="e.g. Is this the blue one or the red one?"
                            className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-100 transition-all text-sm min-h-[100px]"
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !body.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 focus:ring focus:ring-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Sending...' : (
                                <>
                                    Send Anonymously <Send size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
