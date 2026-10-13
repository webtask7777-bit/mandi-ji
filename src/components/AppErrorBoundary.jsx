import { Component } from 'react';

// A deployment can replace a lazy-loaded bundle while a visitor has an old tab
// open. Keep a useful recovery screen instead of leaving that tab blank.
export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
        <section role="alert" className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <img src="/brand/logo.svg" alt="सही भाव" className="mx-auto mb-8 h-12 w-auto" />
          <h1 className="text-2xl font-bold text-foreground">यह पेज अभी नहीं खुल सका</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            नया अपडेट या इंटरनेट में रुकावट इसकी वजह हो सकती है। कनेक्शन जाँचकर पेज दोबारा खोलें।
          </p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-12 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
            पेज दोबारा खोलें
          </button>
        </section>
      </main>
    );
  }
}
