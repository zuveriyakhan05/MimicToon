import React, { useState, useRef } from 'react';
import { CharacterProfile } from '../../types';
import { CHARACTERS } from '../../data/characters';
import { Sparkles, Upload, Link, Check, RefreshCw } from 'lucide-react';

interface CharacterSelectorProps {
  selectedCharacter: CharacterProfile;
  onSelectCharacter: (char: CharacterProfile) => void;
  customModelUrl?: string;
  onSelectCustomModel: (url: string | undefined) => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacter,
  onSelectCharacter,
  customModelUrl,
  onSelectCustomModel,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset sample humanoid GLTF models for testing
  const sampleModels = [
    {
      name: 'Sample Cartoon Robot',
      url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
    },
    {
      name: 'Sample Low-Poly Astronaut',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
    },
  ];

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onSelectCustomModel(urlInput.trim());
      setShowCustomModal(false);
    }
  };

  const handleClearCustom = () => {
    onSelectCustomModel(undefined);
    setUrlInput('');
    setShowCustomModal(false);
  };

  // Drag and drop / file upload
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      const objectUrl = URL.createObjectURL(file);
      onSelectCustomModel(objectUrl);
      setShowCustomModal(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      const objectUrl = URL.createObjectURL(file);
      onSelectCustomModel(objectUrl);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Choose Your Cartoon Buddy</span>
        </h3>

        {/* Custom 3D Model button */}
        <button
          onClick={() => setShowCustomModal(true)}
          className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all ${
            customModelUrl
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{customModelUrl ? 'Custom 3D Active' : 'Custom GLB/GLTF'}</span>
        </button>
      </div>

      {/* Grid of 5 Core Cartoon Characters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {CHARACTERS.map((char) => {
          const isSelected = selectedCharacter.id === char.id && !customModelUrl;
          return (
            <button
              key={char.id}
              onClick={() => {
                onSelectCharacter(char);
                onSelectCustomModel(char.modelUrl); // Apply character's model (GLB or fallback procedural)
              }}
              className={`relative p-2.5 rounded-2xl border-2 text-left transition-all flex flex-col items-center gap-1.5 ${
                isSelected
                  ? 'border-amber-400 bg-amber-50/80 shadow-md scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-slate-50'
              }`}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs"
                style={{ backgroundColor: `${char.primaryColor}25` }}
              >
                {char.icon || (
                  char.species === 'Bunny' ? '🐰' :
                  char.species === 'Bear' ? '🐻' :
                  char.species === 'Fox' ? '🦊' :
                  char.species === 'Cat' ? '🐱' :
                  char.species === 'Robot' ? '🤖' : '🐾'
                )}
              </div>

              <div className="text-center w-full">
                <div className="text-xs font-black text-slate-800 truncate">{char.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{char.species}</div>
              </div>

              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Model Modal / Popover */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border-4 border-amber-300 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">Load 3D Character Model</h4>
                  <p className="text-xs text-slate-500">Supports .glb, .gltf, Ready Player Me, or Mixamo humanoid rigs</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black p-1"
              >
                ✕
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-amber-500 mx-auto mb-2" />
              <div className="text-xs font-black text-slate-700">
                Drop your .glb / .gltf file here, or <span className="text-amber-600 underline">browse</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Single humanoid file up to 30MB</div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-slate-500" />
                <span>Or Paste Web Model URL (.glb / .gltf)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/character.glb"
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-950 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-xs"
                >
                  Load
                </button>
              </div>
            </div>

            {/* Ready to try samples */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500">Quick Test Models:</div>
              <div className="grid grid-cols-2 gap-2">
                {sampleModels.map((sample) => (
                  <button
                    key={sample.name}
                    onClick={() => {
                      onSelectCustomModel(sample.url);
                      setShowCustomModal(false);
                    }}
                    className="text-left p-2 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50 text-[11px] font-bold text-slate-700 truncate hover:bg-amber-50"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              {customModelUrl ? (
                <button
                  onClick={handleClearCustom}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to Cartoon Buddy</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
