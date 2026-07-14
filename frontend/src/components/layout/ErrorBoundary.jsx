import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Frontend runtime error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-app px-4 text-slate-100">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-panel/80 p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-rose-300/20 bg-rose-400/10 text-rose-200">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Sahifada xatolik yuz berdi</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Iltimos sahifani qayta yuklang. Agar xatolik takrorlansa, admin loglaridan tekshirish kerak bo'ladi.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Qayta yuklash
          </Button>
        </div>
      </div>
    );
  }
}
