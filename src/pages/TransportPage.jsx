import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TransportCalc from '../components/transport/TransportCalc';
import SEO from '../components/SEO';

export default function TransportPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="ट्रांसपोर्ट कैलकुलेटर" description="मंडी से मंडी ट्रांसपोर्ट खर्च कैलकुलेट करें। दूरी, किराया, टोल, लोडिंग — सब एक जगह।" path="/transport" />
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
            <h1 className="text-base font-bold">ट्रांसपोर्ट कैलकुलेटर</h1>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-4 pb-8">
          <TransportCalc />
        </main>
      </div>
    </div>
  );
}
