import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Gift, ArrowRight, Snowflake, Activity } from 'lucide-react';
import NewsFeed from '../components/NewsFeed';

export default function Dashboard() {
    const [wishlists, setWishlists] = useState([]);
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);
    const [secretSantaAssignment, setSecretSantaAssignment] = useState(null);
    const [secretSantaParticipants, setSecretSantaParticipants] = useState([]);
    // Still fetching memberships for other purposes if needed, but not displaying invite UI here
    const [memberships, setMemberships] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/dashboard/${user.id}`);

            // 1. Wishlists
            setWishlists(res.data.wishlists || []);

            // 2. Memberships
            setMemberships(res.data.memberships || []);

            // 3. Secret Santa
            setSecretSantaAssignment(res.data.secretSantaAssignment);
            setSecretSantaParticipants(res.data.secretSantaParticipants || []);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const createMyWishlist = async () => {
        if (!user) return;
        setCreating(true);
        try {
            await axios.post('/api/wishlists', { userId: user.id });
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert('Failed to create wishlist');
        } finally {
            setCreating(false);
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const myWishlist = wishlists.find(w => w.userId === user?.id);
    const otherWishlists = wishlists.filter(w => w.userId !== user?.id);
    const hasSecretSanta = user && (secretSantaAssignment?.santa || secretSantaAssignment?.elves?.length > 0);

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {/* News Feed Section */}
            {user && (
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-6 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="text-indigo-600" />
                            Activity Feed
                        </h2>

                        {/* Quick Navigation Links */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => scrollToSection('my-wishlist')}
                                className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <Gift size={16} className="text-indigo-500" />
                                My Wishlist
                            </button>

                            {hasSecretSanta && (
                                <button
                                    onClick={() => scrollToSection('secret-santa')}
                                    className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all shadow-sm flex items-center gap-1.5"
                                >
                                    <Snowflake size={16} className="text-red-500" />
                                    Secret Santa
                                </button>
                            )}

                            <button
                                onClick={() => scrollToSection('community-wishlists')}
                                className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <Gift size={16} className="text-purple-500" />
                                Community
                            </button>
                        </div>
                    </div>
                    <NewsFeed />
                </div>
            )}

            {/* My Wishlist Section */}
            {user && (
                <div id="my-wishlist" className="scroll-mt-24">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Gift className="text-indigo-600" />
                        My Wishlist
                    </h2>
                    {loading ? (
                        <div className="animate-pulse bg-white rounded-2xl p-8 shadow-lg border border-slate-100 h-64 flex flex-col justify-between">
                            <div className="flex items-start justify-between mb-6">
                                <div className="bg-slate-200 p-3 rounded-xl w-14 h-14"></div>
                                <div className="bg-slate-200 h-6 w-20 rounded-full"></div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                            </div>
                            <div className="flex items-center mt-4">
                                <div className="h-6 bg-slate-200 rounded w-32"></div>
                            </div>
                        </div>
                    ) : myWishlist ? (
                        <Link
                            to={`/wishlists/${myWishlist.id}`}
                            className="group block bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-white"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                    {user.profilePictureUrl ? (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20">
                                            <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <Gift size={32} className="text-white" />
                                    )}
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                    {myWishlist.items?.length || 0} Items
                                </span>

                            </div>

                            <h3 className="text-3xl font-bold mb-2">
                                {myWishlist.title}
                            </h3>
                            <p className="text-indigo-100 mb-8">
                                Manage your wishes and share with friends
                            </p>

                            <div className="flex items-center font-bold text-lg group-hover:translate-x-2 transition-transform">
                                View My List <ArrowRight size={20} className="ml-2" />
                            </div>
                        </Link>
                    ) : (
                        <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Gift size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">You don't have a wishlist yet</h3>
                            <p className="text-slate-500 mb-6 max-w-md">
                                Create your personal wishlist to start adding items you love.
                            </p>
                            <button
                                onClick={createMyWishlist}
                                disabled={creating}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {creating ? (
                                    <>Creating...</>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Create My Wishlist
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Secret Santa Section */}
            {user && (secretSantaAssignment?.santa || secretSantaAssignment?.elves?.length > 0) && (
                <div id="secret-santa" className="bg-gradient-to-br from-red-50 to-green-50 rounded-3xl p-8 border-2 border-red-200 shadow-sm scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-red-600 p-3 rounded-xl">
                            <Snowflake className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Secret Santa 🎅</h2>
                            <p className="text-slate-600 text-sm">You're participating this year!</p>
                        </div>
                    </div>

                    {/* Santa Assignment */}
                    {secretSantaAssignment?.santa && (
                        <div className="bg-white rounded-2xl p-6 mb-4 border border-red-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🎅</span>
                                <p className="text-sm font-semibold text-red-700">You are Secret Santa for:</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-red-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold">
                                        {secretSantaAssignment.santa.receiver.name[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{secretSantaAssignment.santa.receiver.name}</h4>
                                        <p className="text-xs text-slate-500">{secretSantaAssignment.santa.receiver.email}</p>
                                    </div>
                                </div>
                                <Link
                                    to={`/wishlists/${wishlists.find(w => w.userId === secretSantaAssignment.santa.receiver.id)?.id}`}
                                    className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    View Wishlist <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Elf Assignments */}
                    {secretSantaAssignment?.elves?.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 mb-4 border border-green-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🧝</span>
                                <p className="text-sm font-semibold text-green-700">You are an Elf for:</p>
                            </div>
                            <div className="space-y-3">
                                {secretSantaAssignment.elves.map((elfAssignment) => (
                                    <div key={elfAssignment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-green-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold">
                                                {elfAssignment.receiver.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{elfAssignment.receiver.name}</h4>
                                                <p className="text-xs text-slate-500">{elfAssignment.receiver.email}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/wishlists/${wishlists.find(w => w.userId === elfAssignment.receiver.id)?.id}`}
                                            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            View Wishlist <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {secretSantaParticipants.length > 0 && (
                        <div className="bg-white/50 rounded-xl p-4">
                            <p className="text-sm font-semibold text-slate-700 mb-2">All Participants ({secretSantaParticipants.length}):</p>
                            <div className="flex flex-wrap gap-2">
                                {secretSantaParticipants.map(participant => (
                                    <span key={participant.id} className="bg-white px-3 py-1 rounded-full text-sm text-slate-700 border border-slate-200">
                                        {participant.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Community Wishlists Section */}
            <div id="community-wishlists" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Community Wishlists</h2>
                {otherWishlists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {otherWishlists.map(list => (
                            <Link
                                key={list.id}
                                to={`/wishlists/${list.id}`}
                                className="group block bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    {list.user?.profilePictureUrl ? (
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200">
                                            <img src={list.user.profilePictureUrl} alt={list.user.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="bg-indigo-50 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors text-indigo-600">
                                            <Gift size={24} />
                                        </div>
                                    )}
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                        {list.items?.length || 0} Items
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                    {list.title}
                                </h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Created by <span className="font-medium text-slate-700">{list.user?.name}</span>
                                </p>

                                <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                                    View List <ArrowRight size={16} className="ml-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-slate-500">No other wishlists found. Invite your friends!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
