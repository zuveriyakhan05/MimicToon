import React from 'react';
import { Sparkles, Video, Mic, Award, Zap, ShieldCheck } from 'lucide-react';
import { Badge } from '../common/Badge';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <Video className="w-6 h-6 text-blue-500" />,
      title: 'Real-Time Body & Gesture Mirror',
      description: 'Using high-speed on-device MediaPipe AI, every tilt of your head, wave of your arm, and crouch is mirrored smoothly by your cartoon avatar.',
      badge: 'MediaPipe AI',
      color: 'border-blue-200 bg-blue-50/40',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      title: 'Articulated 3D Cartoon Avatars',
      description: 'Built with Three.js graphics and kinematic joints that bend, wave, and lean. Animated eyes blink and mouths open when you speak!',
      badge: 'Three.js 3D',
      color: 'border-amber-200 bg-amber-50/40',
    },
    {
      icon: <Mic className="w-6 h-6 text-rose-500" />,
      title: 'Cartoon Voice Changer',
      description: 'Speak into your microphone and hear your voice transformed into a high-pitched Chipmunk, deep Robot, Baby Echo, or Alien creature!',
      badge: 'Web Audio DSP',
      color: 'border-rose-200 bg-rose-50/40',
    },
    {
      icon: <Award className="w-6 h-6 text-purple-500" />,
      title: 'Pose Challenge Mini-Games',
      description: 'Test your balance and agility! Match challenges like "Touch the Sky", "Soaring Airplane", and "Bunny Crouch" to score stars and combos.',
      badge: 'Motion Games',
      color: 'border-purple-200 bg-purple-50/40',
    },
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: 'Instant Play & Streak Rewards',
      description: 'No complicated sign-up or app downloads. Launch right in your browser, build daily activity streaks, and collect celebration stars.',
      badge: 'Zero Friction',
      color: 'border-orange-200 bg-orange-50/40',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: '100% On-Device Child Privacy',
      description: 'Safety first. Video frames and microphone audio are computed locally in client RAM and never transmitted across the network.',
      badge: 'Safe for Kids',
      color: 'border-emerald-200 bg-emerald-50/40',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-8 bg-white/60 border-y border-amber-200/60">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="amber" size="md">Playful Innovation</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            How MimicToon Works Its Magic
          </h2>
          <p className="text-slate-600 font-medium text-base sm:text-lg">
            A seamless blend of computer vision, 3D character kinematics, and real-time audio filters designed for kids to move and laugh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl border-2 ${feat.color} hover:border-amber-400 hover:shadow-lg transition-all space-y-3 bg-white`}
            >
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-white shadow-xs border border-slate-100">
                  {feat.icon}
                </div>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {feat.badge}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 pt-1">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
