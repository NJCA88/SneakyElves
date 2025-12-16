import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Gift, ShoppingBag, UserPlus, Clock, RefreshCw } from 'lucide-react';

export default function NewsFeed() {
    const { user } = useAuth();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 10;

    useEffect(() => {
        if (user) {
            fetchFeed(0);
        }
    }, [user]);

    const fetchFeed = async (offset) => {
        if (offset === 0) setLoading(true);
        try {
            const res = await axios.get(`/api/feed?userId=${user.id}&limit=${LIMIT}&offset=${offset}`);
            if (res.data.length < LIMIT) setHasMore(false);

            if (offset === 0) {
                setActivities(res.data);
            } else {
                setActivities(prev => [...prev, ...res.data]);
            }
        } catch (err) {
            console.error('Failed to fetch feed:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchFeed(nextPage * LIMIT);
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const renderActivity = (activity) => {
        const data = JSON.parse(activity.data);
        const actorName = activity.actor.name;

        // Activity Types
        switch (activity.type) {
            case 'ITEM_ADDED':
                return (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="bg-indigo-100 p-3 rounded-full h-fit">
                            <Gift className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <p className="text-slate-800">
                                <Link to={`/wishlists/${data.wishlistId}`} className="font-bold hover:text-indigo-600 hover:underline">{actorName}</Link> added <Link to={`/wishlists/${data.wishlistId}#item-${activity.relatedId}`} className="font-semibold text-indigo-600 hover:underline">{data.itemName}</Link> to their wishlist.
                            </p>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock size={12} /> {formatTime(activity.createdAt)}
                            </span>
                        </div>
                    </div>
                );
            case 'PURCHASED':
                return (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="bg-green-100 p-3 rounded-full h-fit">
                            <ShoppingBag className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-slate-800">
                                <span className="font-bold">Someone</span> purchased <Link to={`/wishlists/${data.wishlistId}#item-${activity.relatedId}`} className="font-semibold text-green-600 hover:underline">{data.itemName}</Link> for <Link to={`/wishlists/${data.wishlistId}`} className="font-bold hover:text-indigo-600 hover:underline">{data.recipientName}</Link>.
                            </p>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock size={12} /> {formatTime(activity.createdAt)}
                            </span>
                        </div>
                    </div>
                );
            case 'ITEM_UPDATED':
                return (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="bg-orange-100 p-3 rounded-full h-fit">
                            <RefreshCw className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <p className="text-slate-800">
                                <Link to={`/wishlists/${data.wishlistId}`} className="font-bold hover:text-indigo-600 hover:underline">{actorName}</Link> updated <Link to={`/wishlists/${data.wishlistId}#item-${activity.relatedId}`} className="font-semibold text-orange-600 hover:underline">{data.itemName}</Link> on their wishlist.
                            </p>
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                <Clock size={12} /> {formatTime(activity.createdAt)}
                            </span>
                        </div>
                    </div>
                );
            // Future: JOINED_GROUP
            default:
                return null;
        }
    };

    if (loading && activities.length === 0) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>)}
        </div>;
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                <p>No activity yet. Invite friends to see what they're up to!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map(activity => (
                <div key={activity.id}>
                    {renderActivity(activity)}
                </div>
            ))}

            {hasMore && (
                <button
                    onClick={loadMore}
                    className="w-full py-3 text-slate-500 font-medium hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    Show Older Activity
                </button>
            )}
        </div>
    );
}
