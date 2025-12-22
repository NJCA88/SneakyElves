import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GiftBox from '../components/GiftBox';

export default function Landing() {
    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 text-slate-900">
            {/* Background Effects (Subtle for Light Mode) */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 -z-10 mix-blend-multiply"></div>

            {/* Ambient Blobs (Softer colors) */}
            <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-200/50 rounded-full blur-[100px] animate-pulse-slow"></div>
            <div className="absolute bottom-20 -right-20 w-96 h-96 bg-pink-200/50 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

            {/* Main Content */}
            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-8">

                {/* 3D Gift Animation */}
                <div className="mb-8 transform hover:scale-105 transition-transform duration-500 ease-out">
                    <GiftBox />
                </div>

                {/* Typography */}
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-2 text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-sm">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-indigo-900 to-indigo-700 pb-2">
                            The joy of giving
                        </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-purple-900 to-purple-700 pb-2">
                            The joy of receiving
                        </span>
                        {/* Strikethrough Line */}
                        <span className="text-slate-400 line-through decoration-red-500/80 decoration-2 opacity-80 text-3xl md:text-5xl mt-2">
                            The chaos of logistics
                        </span>
                    </div>

                    <p className="text-lg md:text-2xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
                        Create beautiful wishlists, organize Secret Santas, and never track a spreadsheet again.
                    </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Link
                        to="/signup"
                        className="group relative px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Signup
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                        </span>
                    </Link>

                    <Link
                        to="/login"
                        className="px-8 py-4 text-slate-600 hover:text-indigo-700 font-medium rounded-2xl hover:bg-white transition-all border border-slate-200 hover:border-indigo-100"
                    >
                        Login
                    </Link>
                </div>

                {/* Social Proof / Stats Lite */}
                <div className="pt-12 flex items-center justify-center gap-8 text-slate-400 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Items Added Live
                    </div>
                    <div>•</div>
                    <div>Secret Santas Organized</div>
                </div>
            </div>
        </div>
    );
}
