import React from 'react';
import { ShieldCheck, EyeOff, ServerOff, WifiOff } from 'lucide-react';
import { Badge } from '../common/Badge';

export const PrivacyNotice: React.FC = () => {
  return (
    <section className="py-12 px-4 sm:px-8 bg-amber-100/50">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 border-3 border-amber-300 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="p-4 bg-emerald-100 text-emerald-700 rounded-3xl shrink-0">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">
                Built with a Parents & Kids First Privacy Promise
              </h3>
              <Badge variant="emerald" size="sm">COPPA Compliant</Badge>
            </div>
            <p className="text-sm text-slate-600 font-medium">
              We believe kids should be able to create, play, and dance freely without compromising privacy.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
              <EyeOff className="w-4 h-4 text-amber-600" />
              <span>Zero Cloud Video</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Camera frames are evaluated in local browser RAM by MediaPipe WASM and discarded immediately.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
              <ServerOff className="w-4 h-4 text-emerald-600" />
              <span>Local Voice DSP</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Audio effects are applied live through your device Web Audio graph without saving voice files.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
              <WifiOff className="w-4 h-4 text-blue-600" />
              <span>Offline Ready</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Once loaded, the tracking models run locally on your graphics chip without requiring external servers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
