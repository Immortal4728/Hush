import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert, PlusCircle, Home } from 'lucide-react';
import { Header } from '../components/Header';

export const ExpiredPage: React.FC = () => {
  const location = useLocation();
  const reason = (location.state as any)?.reason || 'The maximum lifetime or empty grace period was reached.';

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Header />

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16 flex flex-col justify-center text-center">
        <div className="glass-panel p-8">
          <div className="w-12 h-12 rounded border border-[#27272a] text-white flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 font-mono">This room has ended.</h1>
          
          <p className="text-xs font-mono text-[#a1a1aa] mb-4">
            Chat history is not retained.
          </p>

          <p className="text-xs font-mono text-[#71717a] border border-[#27272a] bg-[#09090b] rounded p-3 mb-8 leading-relaxed">
            {reason}
          </p>

          <div className="flex flex-col gap-3 font-mono">
            <Link to="/create" className="btn-primary w-full py-3 text-xs">
              <PlusCircle className="w-4 h-4" />
              <span>Create New Chat</span>
            </Link>

            <Link to="/" className="btn-secondary w-full py-3 text-xs">
              <Home className="w-4 h-4 text-white" />
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
