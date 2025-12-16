import { useState, useRef, useEffect } from 'react';
import { X, Send, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ConversationModal({ isOpen, onClose, conversation, onReply, isSending }) {
    const { user } = useAuth();
    const [replyBody, setReplyBody] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [isOpen, conversation?.messages]);

    if (!isOpen || !conversation) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!replyBody.trim()) return;

        onReply(replyBody);
        setReplyBody('');
    };

    const isOwner = user?.id === conversation.wishlist.userId;
    const otherPartyName = isOwner ? "Someone (Anonymous)" : conversation.wishlist.user.name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {isOwner ? <Shield size={18} className="text-slate-400" /> : <Shield size={18} className="text-indigo-600" />}
                            {otherPartyName}
                        </h3>
                        {conversation.item && (
                            <p className="text-xs text-slate-500 mt-1">
                                Regarding: <span className="font-medium text-slate-700">{conversation.item.name}</span>
                            </p>
                        )}
                        {!conversation.item && (
                            <p className="text-xs text-slate-500 mt-1">
                                Regarding: General Wishlist Question
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    {conversation.messages.map((msg) => {
                        const isMe = msg.authorId === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                                    }`}>
                                    <p className="text-sm">{msg.body}</p>
                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-white shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring focus:ring-indigo-100 transition-all text-sm"
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            disabled={isSending || !replyBody.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
