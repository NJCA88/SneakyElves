import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { addAffiliateTag } from '../utils/affiliate';

import { ArrowLeft, Check, Plus, ShoppingBag, ExternalLink, Trash2, Edit2, X, Gift, GripVertical, MessageCircle, Mail, Share2, Link as LinkIcon, Copy, Lock } from 'lucide-react';

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import QuestionModal from '../components/QuestionModal';
import ConversationModal from '../components/ConversationModal';

export default function WishlistDetail() {
    const { id } = useParams();
    const location = useLocation();
    const [wishlist, setWishlist] = useState(location.state?.initialData || null);
    const { user, loading: authLoading } = useAuth(); // Assume useAuth provides 'loading'

    const [newItem, setNewItem] = useState({ name: '', price: '', url: '', note: '' });
    const [editingItem, setEditingItem] = useState(null);
    const [editData, setEditData] = useState({ name: '', price: '', url: '', note: '' });
    const [instructions, setInstructions] = useState('');
    const [isEditingInstructions, setIsEditingInstructions] = useState(false);

    // Q&A State
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingReply, setIsSendingReply] = useState(false);

    // Share Modal
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareToken, setShareToken] = useState(null);
    const [shareUrl, setShareUrl] = useState('');


    const fetchWishlist = useCallback(() => {
        const params = new URLSearchParams(location.search);
        const tokenFromUrl = params.get('shareToken');

        console.log('[DEBUG] fetchWishlist', {
            id,
            authLoading,
            userId: user?.id,
            tokenFromUrl
        });

        // If we are still determining auth state, and we DON'T have a token, we should wait.
        if (authLoading && !tokenFromUrl) {
            console.log('[DEBUG] Waiting for auth...');
            return;
        }

        axios.get(`/api/wishlists/${id}`, {
            params: {
                viewerId: user?.id,
                shareToken: tokenFromUrl
            }
        })
            .then(res => {
                console.log('[DEBUG] fetchWishlist success', res.data);
                setWishlist(res.data);
                setInstructions(res.data.generalInstructions || '');
            })
            .catch(err => {
                console.error('[DEBUG] fetchWishlist failed', err);
            });
    }, [id, user?.id, location.search, authLoading]);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);



    useEffect(() => {
        if (wishlist && location.hash) {
            // Tiny timeout to ensure DOM render
            setTimeout(() => {
                const id = location.hash.replace('#', '');
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Add a temporary highlight class
                    element.classList.add('ring-4', 'ring-indigo-200');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-200'), 2000);
                }
            }, 100);
        }
    }, [wishlist, location.hash]);

    const togglePurchased = async (itemId, currentStatus) => {
        try {
            await axios.patch(`/api/items/${itemId}/purchase`, {
                purchased: !currentStatus,
                purchasedBy: user?.id
            });
            fetchWishlist();
        } catch (err) {
            console.error(err);
        }
    };

    const addItem = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/items', { ...newItem, wishlistId: id });
            setNewItem({ name: '', price: '', url: '', note: '' });
            fetchWishlist();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await axios.delete(`/api/items/${itemId}`);
            fetchWishlist();
        } catch (err) {
            console.error(err);
            alert('Failed to delete item');
        }
    };

    const startEditItem = (item) => {
        setEditingItem(item.id);
        setEditData({ name: item.name, price: item.price || '', url: item.url || '', note: item.note || '' });
    };

    const cancelEditItem = () => {
        setEditingItem(null);
        setEditData({ name: '', price: '', url: '', note: '' });
    };

    const saveItem = async (itemId) => {
        try {
            await axios.put(`/api/items/${itemId}`, editData);
            setEditingItem(null);
            setEditData({ name: '', price: '', url: '', note: '' });
            fetchWishlist();
        } catch (err) {
            console.error(err);
            alert('Failed to update item');
        }
    };

    const saveInstructions = async () => {
        try {
            await axios.put(`/api/wishlists/${id}`, {
                title: wishlist.title,
                generalInstructions: instructions
            });
            setIsEditingInstructions(false);
            fetchWishlist();
        } catch (err) {
            console.error(err);
            alert('Failed to update instructions');
        }
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        if (result.destination.index === result.source.index) return;

        const items = Array.from(wishlist.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Optimistic update
        setWishlist(prev => ({ ...prev, items }));

        try {
            await axios.put(`/api/wishlists/${id}/reorder`, {
                itemIds: items.map(item => item.id)
            });
        } catch (err) {
            console.error('Failed to reorder items', err);
            fetchWishlist(); // Revert on error
        }
    };

    // Fetch Conversations
    useEffect(() => {
        if (id && user) {
            fetchConversations();
        }
    }, [id, user]);

    const fetchConversations = async () => {
        try {
            const res = await axios.get(`/api/wishlists/${id}/conversations?userId=${user.id}`);
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        }
    };

    // Handle deep link to conversation
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const conversationId = params.get('conversationId');
        if (conversationId && conversations.length > 0) {
            const conv = conversations.find(c => c.id === parseInt(conversationId));
            if (conv) {
                openConversation(conv);
                // Clean up URL without reload
                window.history.replaceState({}, '', location.pathname);
            }
        } else if (conversationId && !activeConversation) {
            // Need to fetch individual conversation if not in list (unlikely based on API logic but good safety)
            axios.get(`/api/conversations/${conversationId}`)
                .then(res => openConversation(res.data))
                .catch(err => console.error(err));
            window.history.replaceState({}, '', location.pathname);
        }
    }, [location.search, conversations, activeConversation]);

    const openConversation = async (summaryOrId) => {
        try {
            let fullConv = summaryOrId;
            // If we only have summary data or ID, fetch full details
            if (typeof summaryOrId === 'number' || (summaryOrId.id && !summaryOrId.messages)) {
                const idToFetch = typeof summaryOrId === 'number' ? summaryOrId : summaryOrId.id;
                const res = await axios.get(`/api/conversations/${idToFetch}`);
                fullConv = res.data;
            }

            // Refresh details if we have an object but want latest messages
            if (typeof summaryOrId === 'object' && summaryOrId.id) {
                const res = await axios.get(`/api/conversations/${summaryOrId.id}`);
                fullConv = res.data;
            }

            setActiveConversation(fullConv);
            setIsConversationModalOpen(true);
        } catch (err) {
            console.error("Failed to open conversation", err);
        }
    };

    const handleAskQuestion = async ({ body, itemId }) => {
        setIsSubmitting(true);
        try {
            await axios.post(`/api/wishlists/${id}/conversations`, {
                authorId: user.id,
                body,
                itemId
            });
            setIsQuestionModalOpen(false);
            fetchConversations();
            alert('Question sent!');
        } catch (err) {
            console.error(err);
            alert('Failed to send question');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReply = async (body) => {
        if (!activeConversation) return;
        setIsSendingReply(true);
        try {
            const res = await axios.post(`/api/conversations/${activeConversation.id}/messages`, {
                authorId: user.id,
                body
            });
            // Append message locally
            setActiveConversation(prev => ({
                ...prev,
                messages: [...prev.messages, res.data]
            }));
            fetchConversations(); // Update list
        } catch (err) {
            console.error(err);
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleShare = async () => {
        setIsShareModalOpen(true);
        if (shareToken) return; // Already have it

        try {
            const res = await axios.post(`/api/wishlists/${id}/share`, { userId: user.id });
            const token = res.data.shareToken;
            setShareToken(token);
            const baseUrl = window.location.hostname === 'localhost' ? window.location.origin : 'https://sneakyelves.com';
            setShareUrl(`${baseUrl}/wishlists/${id}?shareToken=${token}`);
        } catch (err) {
            console.error('Failed to generate share link', err);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        alert('Copied to clipboard!');
    };

    if (!wishlist) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    const isOwner = user && user.id === wishlist.userId;

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
            </Link>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {wishlist.user?.profilePictureUrl ? (
                            <img
                                src={wishlist.user.profilePictureUrl}
                                alt={wishlist.user.name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0"
                            />
                        ) : (
                            // No image placeholder?
                            // Let's hide if none, or show a large initial?
                            // For now, if they don't have one, we just don't show the big circle.
                            null
                        )}

                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">{wishlist.title}</h1>

                            <div className="inline-flex items-center gap-2 text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-sm">
                                <span className="font-medium">Curated by</span>
                                <span className="font-bold text-indigo-700">{wishlist.user?.name}</span>
                            </div>


                            {/* Share Button (Owner Only) */}
                            {isOwner && (
                                <div className="mt-4 mb-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                                    <button
                                        onClick={handleShare}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <Share2 size={16} /> Share Wishlist
                                    </button>
                                </div>
                            )}

                            {/* Q&A Buttons */}
                            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                                {!isOwner && (
                                    <button
                                        onClick={() => setIsQuestionModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                                    >
                                        <MessageCircle size={16} /> Ask Question
                                    </button>
                                )}

                                {conversations.length > 0 && (
                                    <button
                                        onClick={() => {
                                            // If mostly one conversation, maybe just open it? 
                                            // But nicer to have a dropdown or just list. 
                                            // For now, let's list them in a simple modal or drawer?
                                            // Let's reuse the simple list logic: active conversation modal handles one.
                                            // We need a list view.
                                            // For simplicity, let's just use the first one if length is 1, or open a selector?
                                            // Let's implement a simple "Conversations List" part of the ConversationModal? NO, better to keep separate.
                                            // Actually, user requested "Inbox".
                                            // Let's make this button check:
                                            // If 1 conversation -> Open it.
                                            // If multiple -> We need a list UI.
                                            // Hack for now: If multiple, alert asking which one? No.
                                            // We'll iterate and list them below the header if there are any.
                                        }}
                                        className="relative inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        <Mail size={16} />
                                        {isOwner ? 'Inbox' : 'My Questions'}
                                        <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full ml-1">
                                            {conversations.length}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:block bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-indigo-600">
                            <ShoppingBag size={24} />
                        </div>
                    </div>
                </div>

                {/* Inbox / Conversations List (Visible if conversations exist) */}
                {conversations.length > 0 && (
                    <div className="bg-white border-b border-slate-100 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                            <Mail size={12} /> {isOwner ? 'Inbox' : 'Your Questions'}
                        </h3>
                        <div className="space-y-2">
                            {conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => openConversation(conv)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">
                                                {isOwner ? "Someone" : `Question to ${wishlist.user?.name}`}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Re: {conv.item ? conv.item.name : 'General Wishlist'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(conv.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {conv.messages && conv.messages[0] && (
                                        <p className="text-sm text-slate-600 mt-2 line-clamp-1 bg-slate-50/50 p-2 rounded-lg group-hover:bg-white">
                                            <span className="font-medium text-slate-900">{conv.messages[0].authorId === user.id ? 'You: ' : 'Them: '}</span>
                                            {conv.messages[0].body}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* General Instructions Section */}
                {(isOwner || instructions) && (
                    <div className="p-8 border-b border-slate-100 bg-white">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Edit2 size={14} /> General Instructions
                            </h3>
                            {isOwner && !isEditingInstructions && (
                                <button
                                    onClick={() => setIsEditingInstructions(true)}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {isEditingInstructions ? (
                            <div className="space-y-4">
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Share general preferences, clothing sizes, or gift giving tips..."
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={saveInstructions}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                    >
                                        Save Instructions
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingInstructions(false);
                                            setInstructions(wishlist.generalInstructions || '');
                                        }}
                                        className="text-slate-600 hover:text-slate-800 px-4 py-2 text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={`prose prose-slate max-w-none whitespace-pre-wrap ${!instructions ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                                {instructions || "No general instructions provided yet."}
                            </div>
                        )}
                    </div>
                )}

                {/* Add Item Form */}
                {isOwner && (
                    <div className="p-8 bg-indigo-50/30 border-b border-indigo-100">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 mb-4 flex items-center gap-2">
                            <Plus size={16} /> Add New Item
                        </h3>
                        <form onSubmit={addItem} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Item Name (e.g. Wireless Headphones)"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="w-full md:w-32">
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={newItem.price}
                                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="url"
                                    placeholder="Product URL (optional)"
                                    value={newItem.url}
                                    onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Note (optional)"
                                    value={newItem.note}
                                    onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm">
                                Add Item
                            </button>
                        </form>
                    </div>
                )}

                {/* Items List */}
                <div className="divide-y divide-slate-100">
                    {wishlist.items?.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <p>No items yet. {isOwner ? "Add your first wish!" : "Check back later!"}</p>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="wishlist-items">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                        {wishlist.items?.map((item, index) => (
                                            <Draggable key={item.id} draggableId={item.id.toString()} index={index} isDragDisabled={!isOwner}>
                                                {(provided, snapshot) => {
                                                    const isEditingThis = editingItem === item.id;
                                                    return (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            id={`item-${item.id}`}
                                                            className={`p-4 sm:p-6 transition-colors ${item.purchased ? 'bg-slate-50' : 'hover:bg-slate-50'} ${snapshot.isDragging ? 'bg-white shadow-xl ring-2 ring-indigo-500/20 rotate-1 rounded-xl z-50' : ''}`}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            <div className="flex gap-3 sm:gap-4">
                                                                {/* Drag Handle */}
                                                                {isOwner && (
                                                                    <div {...provided.dragHandleProps} className="flex-shrink-0 self-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1">
                                                                        <GripVertical size={20} />
                                                                    </div>
                                                                )}

                                                                {/* Icon */}
                                                                <div className={`flex-shrink-0 p-2 rounded-lg self-start ${item.purchased ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                                                    {item.purchased ? <Check size={20} /> : <Gift size={20} />}
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1 min-w-0">
                                                                    {/* Image & Title Section */}
                                                                    <div className="flex gap-3 mb-3">
                                                                        {item.imageUrl && (
                                                                            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200">
                                                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            {isEditingThis ? (
                                                                                <div className="space-y-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editData.name}
                                                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                                                        className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                        placeholder="Item name"
                                                                                    />
                                                                                    <div className="flex gap-2">
                                                                                        <input
                                                                                            type="number"
                                                                                            value={editData.price}
                                                                                            onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                                                                                            className="w-24 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                            placeholder="Price"
                                                                                        />
                                                                                        <input
                                                                                            type="url"
                                                                                            value={editData.url}
                                                                                            onChange={(e) => setEditData({ ...editData, url: e.target.value })}
                                                                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                            placeholder="URL (optional)"
                                                                                        />
                                                                                    </div>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editData.note}
                                                                                        onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                                                                                        className="w-full border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
                                                                                        placeholder="Note (optional)"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <h3 className={`text-base sm:text-lg font-semibold mb-2 ${item.purchased ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-900'}`}>
                                                                                        {item.name}
                                                                                    </h3>
                                                                                    {item.note && (
                                                                                        <p className="text-slate-500 text-sm italic mb-2">Note: {item.note}</p>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Price & Link - Mobile Optimized */}
                                                                    {!isEditingThis && (item.price || item.url) && (
                                                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                                                            {item.price && (
                                                                                <span className="inline-flex items-center text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                                                                                    ${item.price}
                                                                                </span>
                                                                            )}
                                                                            {item.url && (
                                                                                <a
                                                                                    href={addAffiliateTag(item.url)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                                                                    View Link <ExternalLink size={14} />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Action Buttons */}
                                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                        {isOwner && (
                                                                            <>
                                                                                {isEditingThis ? (
                                                                                    <div className="flex gap-2">
                                                                                        <button
                                                                                            onClick={() => saveItem(item.id)}
                                                                                            className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                                                                        >
                                                                                            <Check size={16} /> Save
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={cancelEditItem}
                                                                                            className="flex-1 sm:flex-none bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                                                                        >
                                                                                            <X size={16} /> Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button
                                                                                            onClick={() => startEditItem(item)}
                                                                                            className="text-indigo-600 hover:text-indigo-800 transition-colors p-2"
                                                                                            title="Edit item"
                                                                                        >
                                                                                            <Edit2 size={18} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => deleteItem(item.id)}
                                                                                            className="text-red-600 hover:text-red-800 transition-colors p-2"
                                                                                            title="Delete item"
                                                                                        >
                                                                                            <Trash2 size={18} />
                                                                                        </button>
                                                                                        {item.purchased && (
                                                                                            <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wider rounded-full">
                                                                                                Purchased
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {!isOwner && (
                                                                            user ? (
                                                                                <button
                                                                                    onClick={() => togglePurchased(item.id, item.purchased)}
                                                                                    className={`
                                                                                        w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                                                                                        ${item.purchased
                                                                                            ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                                                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'}
                                                                                    `}
                                                                                >
                                                                                    {item.purchased ? (
                                                                                        <>
                                                                                            <Check size={16} /> Purchased
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            Mark as Purchased
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            ) : (
                                                                                <div className="relative group">
                                                                                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] z-10 rounded-xl" />
                                                                                    <div className="filter blur-[4px] select-none pointer-events-none opacity-50
                                                                                        w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white flex items-center justify-center gap-2
                                                                                    ">
                                                                                        Mark as Purchased
                                                                                    </div>
                                                                                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                                                                                        <Link to={{ pathname: "/signup", search: window.location.search }} className="bg-slate-900/90 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-transform transform group-hover:scale-105">
                                                                                            <Lock size={12} /> Login to Claim
                                                                                        </Link>
                                                                                    </div>

                                                                                    {/* Hover Tooltip */}
                                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl text-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 shadow-xl translate-y-2 group-hover:translate-y-0">
                                                                                        Some items are already purchased. Login to see accurate availability and avoid duplicates!
                                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        )}

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </div>
            </div >

            <QuestionModal
                isOpen={isQuestionModalOpen}
                onClose={() => setIsQuestionModalOpen(false)}
                onSubmit={handleAskQuestion}
                items={wishlist?.items || []}
                isSubmitting={isSubmitting}
            />

            <ConversationModal
                isOpen={isConversationModalOpen}
                onClose={() => setIsConversationModalOpen(false)}
                conversation={activeConversation}
                onReply={handleReply}
                isSending={isSendingReply}
            />

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsShareModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                <Share2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Share your Wishlist</h3>
                            <p className="text-slate-500 mt-2 text-sm">Send a link to friends so they can see what you want!</p>
                        </div>

                        <ShareModalContent
                            wishlistId={id}
                            userId={user.id}
                            existingShareToken={shareToken}
                            onInitialShareUrl={(url) => setShareUrl(url)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for Share Modal Logic to avoid cluttering main component
function ShareModalContent({ wishlistId, userId, existingShareToken, onInitialShareUrl }) {
    // Mode: 'simple' (just view) or 'invite' (adds to groups)
    const [mode, setMode] = useState('invite'); // Default to invite
    const [myGroups, setMyGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState(['new']); // Default select "new"
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch user's groups
        axios.get(`/api/dashboard/${userId}`)
            .then(res => {
                const groups = res.data.memberships.map(m => m.group);
                // Add the special "New Group" option at the start
                const options = [
                    { id: 'new', name: 'New group (Just me created now)' },
                    ...groups
                ];
                setMyGroups(options);
            })
            .catch(err => console.error("Failed to fetch groups", err));

        // Initial setup doesn't auto-generate invalid link if defaulting to invite mode
        // But if we want to show existing simple share, we can load it if mode toggles.
    }, [userId]);

    const handleCreateLink = async () => {
        setLoading(true);
        try {
            if (mode === 'simple') {
                // Legacy simple share
                const res = await axios.post(`/api/wishlists/${wishlistId}/share`, { userId });
                const token = res.data.shareToken;
                setGeneratedUrl(`${window.location.origin}/wishlists/${wishlistId}?shareToken=${token}`);
                onInitialShareUrl(`${window.location.origin}/wishlists/${wishlistId}?shareToken=${token}`); // Callback to parent
            } else {
                // Smart Invite with Groups
                const createNewGroup = selectedGroups.includes('new');
                const groupIdsToConnect = selectedGroups.filter(id => id !== 'new');

                const res = await axios.post(`/api/wishlists/${wishlistId}/invites`, {
                    userId,
                    groupIds: groupIdsToConnect,
                    createNewGroup
                });
                const token = res.data.token;
                setGeneratedUrl(`${window.location.origin}/wishlists/${wishlistId}?shareToken=${token}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to create link");
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId) => {
        if (selectedGroups.includes(groupId)) {
            setSelectedGroups(selectedGroups.filter(id => id !== groupId));
        } else {
            setSelectedGroups([...selectedGroups, groupId]);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedUrl);
        alert('Copied to clipboard!');
    };

    return (
        <div>
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                    onClick={() => { setMode('invite'); setGeneratedUrl(''); setSelectedGroups(['new']); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'invite' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    View and Invite
                </button>
                <button
                    onClick={() => { setMode('simple'); setGeneratedUrl(''); setSelectedGroups([]); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'simple' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Public View
                </button>
            </div>

            {mode === 'simple' ? (
                <div className="text-sm text-slate-600 mb-4 px-2">
                    <p>Create a link for anyone to view your list. They can mark items as purchased, but won't join your permanent groups.</p>
                </div>
            ) : (
                <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-3 px-2">When new users register through this link, they will <strong>automatically join</strong> the selected groups:</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 mb-4 p-2 border border-slate-100 rounded-xl bg-slate-50">
                        {myGroups.map(group => (
                            <label key={group.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedGroups.includes(group.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                    {selectedGroups.includes(group.id) && <Check size={12} />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedGroups.includes(group.id)}
                                    onChange={() => toggleGroup(group.id)}
                                />
                                <span className={`text-sm font-medium ${group.id === 'new' ? 'text-indigo-700 font-bold' : 'text-slate-700'}`}>
                                    {group.id === 'new' ? "New group with just me" : group.name}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {!generatedUrl ? (
                <button
                    onClick={handleCreateLink}
                    disabled={mode === 'invite' && selectedGroups.length === 0}
                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200"
                >
                    {loading ? 'Generating...' : (mode === 'simple' ? 'Create Public Link' : 'Create Invite Link')}
                </button>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <LinkIcon size={14} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                                {mode === 'simple' ? 'Public Link' : 'Invite Link'}
                            </span>
                        </div>
                        <div className="break-all text-sm font-medium text-slate-800 font-mono bg-white p-3 rounded-lg border border-slate-200 mb-3 shadow-inner">
                            {generatedUrl}
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <Copy size={16} /> Copy Link
                        </button>
                    </div>
                    <button
                        onClick={() => setGeneratedUrl('')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline w-full text-center"
                    >
                        Create a different link
                    </button>
                    <div className="text-center mt-4">
                    </div>
                </div>
            )}
        </div>
    );
}
