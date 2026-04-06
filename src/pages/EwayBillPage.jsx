import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EwayBillForm from '../components/eway/EwayBillForm';

export default function EwayBillPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={16} className="text-zinc-400" />
            </button>
            <h1 className="text-base font-bold">E-way Bill बनाएं</h1>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-4 pb-8">
          <EwayBillForm />
        </main>
      </div>
    </div>
  );
}
