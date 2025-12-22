import React from 'react';

export default function GiftBox() {
    return (
        <div className="relative w-64 h-64 mx-auto group perspective-1000">
            {/* Floating Animation Wrapper */}
            <div className="relative w-full h-full animate-float">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>

                {/* Box Container (3D-ish via CSS) */}
                <div className="relative w-40 h-40 mx-auto mt-12 bg-indigo-600 rounded-xl shadow-2xl transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                    {/* Box Front Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl"></div>

                    {/* Ribbon Vertical */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-pink-500 shadow-sm"></div>

                    {/* Ribbon Horizontal (Lid) */}
                    <div className="absolute top-0 left-0 w-full h-10 bg-indigo-800 rounded-t-xl opacity-20"></div>

                    {/* Lid */}
                    <div className="absolute -top-6 -left-2 w-[110%] h-12 bg-indigo-500 rounded-lg shadow-lg z-10 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-lg"></div>
                        {/* Lid Ribbon */}
                        <div className="absolute left-1/2 -translate-x-1/2 w-8 h-full bg-pink-500"></div>

                        {/* Bow */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16">
                            <div className="absolute left-0 bottom-0 w-8 h-8 border-4 border-pink-500 rounded-tl-full rounded-bl-full transform -rotate-12 bg-pink-400"></div>
                            <div className="absolute right-0 bottom-0 w-8 h-8 border-4 border-pink-500 rounded-tr-full rounded-br-full transform rotate-12 bg-pink-400"></div>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-4 h-4 bg-pink-600 rounded-full z-20"></div>
                        </div>
                    </div>
                </div>

                {/* Stars/Particles */}
                <div className="absolute top-0 left-10 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                <div className="absolute bottom-10 right-4 w-3 h-3 bg-purple-300 rounded-full animate-bounce delay-100"></div>
                <div className="absolute top-10 right-10 w-2 h-2 bg-white rounded-full animate-ping delay-700"></div>
            </div>
        </div>
    );
}
