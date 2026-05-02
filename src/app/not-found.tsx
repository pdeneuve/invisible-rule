import Link from 'next/link';

// Fix 4: Custom dark-themed 404 page matching site design
export default function NotFound() {
    return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                        <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
                                    style={{
                                                  background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706, #92400e)',
                                                  boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)',
                                    }}
                                  >
                                  <span className="text-white text-2xl font-light">IR</span>span>
                        </div>div>
                        <h1 className="text-6xl font-light text-white mb-4">404</h1>h1>
                        <p className="text-slate-400 text-lg mb-8">
                                  This page could not be found.
                        </p>p>
                        <Link
                                    href="/"
                                    className="inline-block px-8 py-4 rounded-2xl text-slate-900 font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95"
                                    style={{
                                                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                                  boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                                    }}
                                  >
                                  Return to Home
                        </Link>Link>
                </div>div>
          </div>div>
        );
}</div>
