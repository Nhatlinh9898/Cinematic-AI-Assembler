import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Clapperboard, 
  FileVideo, 
  Mic, 
  Settings, 
  Download, 
  Code, 
  Play, 
  Plus, 
  Trash2, 
  MoveRight,
  Layers,
  MonitorPlay,
  Music
} from 'lucide-react';

// --- Types ---

interface Scene {
  id: string;
  video: string;
  voice: string;
  transition: 'crossfade' | 'fade' | 'none';
}

interface AppConfig {
  resolution: '8K' | '4K' | '1080p';
  voiceModel: string;
  bgMusicVolume: number;
  duckingLevel: number;
  useRealESRGAN: boolean;
}

// --- Default Data ---

const DEFAULT_CONFIG: AppConfig = {
  resolution: '8K',
  voiceModel: 'vi-VN-HoaiMyNeural',
  bgMusicVolume: 0.8,
  duckingLevel: 0.15,
  useRealESRGAN: true,
};

const INITIAL_SCENES: Scene[] = [
  {
    id: '1',
    video: 'scene_forest_droneshots.mp4',
    voice: 'Ngày xửa ngày xưa, ở một khu rừng già bí ẩn.',
    transition: 'fade',
  },
  {
    id: '2',
    video: 'character_hero_closeup.mp4',
    voice: 'Người chiến binh ấy đã đứng lên bảo vệ công lý.',
    transition: 'crossfade',
  },
];

// --- Components ---

const App = () => {
  const [activeTab, setActiveTab] = useState<'editor' | 'settings' | 'export'>('editor');
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [generatedCode, setGeneratedCode] = useState<{main: string, config: string, utils: string, script: string}>({ main: '', config: '', utils: '', script: '' });

  // Scene Management
  const addScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      video: `clip_${scenes.length + 1}.mp4`,
      voice: '',
      transition: 'crossfade',
    };
    setScenes([...scenes, newScene]);
  };

  const removeScene = (id: string) => {
    setScenes(scenes.filter((s) => s.id !== id));
  };

  const updateScene = (id: string, field: keyof Scene, value: string) => {
    setScenes(scenes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Code Generation Logic
  useEffect(() => {
    generateProjectFiles();
  }, [scenes, config]);

  const generateProjectFiles = () => {
    // 1. Script JSON
    const scriptJson = JSON.stringify(scenes.map(({video, voice, transition}) => ({video, voice, transition})), null, 2);

    // 2. Config Python
    const configPy = `import os

# Output Resolution
TARGET_WIDTH = ${config.resolution === '8K' ? 7680 : config.resolution === '4K' ? 3840 : 1920}
TARGET_HEIGHT = ${config.resolution === '8K' ? 4320 : config.resolution === '4K' ? 2160 : 1080}
FPS = 24

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
TEMP_DIR = os.path.join(ASSETS_DIR, 'temp')
OUTPUT_FILE = os.path.join(BASE_DIR, 'output_${config.resolution}_masterpiece.mp4')

# AI Models
REAL_ESRGAN_BIN = ${config.useRealESRGAN ? "os.path.join(BASE_DIR, 'models', 'realesrgan-ncnn-vulkan.exe')" : "None"}

# Audio Settings
VOICE_NAME = "${config.voiceModel}"
BG_MUSIC_VOLUME_NORMAL = ${config.bgMusicVolume}
BG_MUSIC_VOLUME_DUCKING = ${config.duckingLevel}`;

    // 3. Main Python (Simplified for view)
    const mainPy = `import json
import os
import asyncio
from moviepy.editor import concatenate_videoclips, CompositeAudioClip
from src.config import *
from src.audio_utils import generate_tts_audio, create_ducking_effect
from src.video_utils import upscale_video_8k, apply_cinematic_color, sync_video_audio, apply_transition

async def main():
    if not os.path.exists(TEMP_DIR): os.makedirs(TEMP_DIR)
    
    print("=== STARTING CINEMATIC AI ASSEMBLER (${config.resolution}) ===")
    
    with open('script.json', 'r', encoding='utf-8') as f:
        script = json.load(f)

    final_clips = []
    voice_clips_metadata = [] 
    current_time = 0.0

    for idx, scene in enumerate(script):
        print(f"\\nProcessing Scene {idx + 1}: {scene['video']}")
        
        # Audio
        tts_path = os.path.join(TEMP_DIR, f"voice_{idx}.mp3")
        await generate_tts_audio(scene['voice'], tts_path, VOICE_NAME)
        
        # Video Processing
        video_path = os.path.join(ASSETS_DIR, 'clips', scene['video'])
        processed_clip = upscale_video_8k(video_path, f"upscaled_{idx}.mp4")
        processed_clip = apply_cinematic_color(processed_clip)
        
        # Sync & Transition
        synced_clip = sync_video_audio(processed_clip, tts_path)
        synced_clip = apply_transition(synced_clip, scene.get('transition', 'crossfade'))
        
        final_clips.append(synced_clip)
        voice_clips_metadata.append((synced_clip.audio, current_time))
        current_time += synced_clip.duration

    print("\\nAssembling Timeline...")
    final_video = concatenate_videoclips(final_clips, method="compose")

    # Audio Ducking
    bg_music_path = os.path.join(ASSETS_DIR, 'music', 'bg_music.mp3')
    if os.path.exists(bg_music_path):
        bg_music = create_ducking_effect(bg_music_path, voice_clips_metadata, final_video.duration)
        final_video = final_video.set_audio(CompositeAudioClip([bg_music, final_video.audio]))

    # Rendering
    print(f"\\nRendering to {OUTPUT_FILE} using NVENC...")
    final_video.write_videofile(
        OUTPUT_FILE,
        fps=FPS,
        codec="hevc_nvenc",
        audio_codec="aac",
        bitrate="50000k",
        ffmpeg_params=["-profile:v", "main10", "-preset", "p4", "-pix_fmt", "yuv420p10le"],
        threads=8
    )

if __name__ == "__main__":
    asyncio.run(main())`;

    setGeneratedCode({
        main: mainPy,
        config: configPy,
        utils: '# ... video_utils.py and audio_utils.py content included in download ...',
        script: scriptJson
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
              <Clapperboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
                Cinematic AI Assembler
              </h1>
              <p className="text-xs text-slate-400">8K Automated Video Pipeline Architect</p>
            </div>
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'editor' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Script Editor
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pipeline Config
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'export' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Export Code
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* TAB: EDITOR */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-cyan-400" /> 
                Timeline Sequence
              </h2>
              <button 
                onClick={addScene}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-cyan-900/20"
              >
                <Plus className="w-4 h-4" /> Add Scene
              </button>
            </div>

            <div className="grid gap-4">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 relative group hover:border-cyan-500/50 transition-all">
                  <div className="absolute top-4 left-4 bg-slate-900 text-slate-400 text-xs font-mono px-2 py-1 rounded border border-slate-700">
                    #{index + 1}
                  </div>
                  
                  <div className="ml-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Video Source */}
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileVideo className="w-3 h-3" /> Source Clip
                      </label>
                      <input
                        type="text"
                        value={scene.video}
                        onChange={(e) => updateScene(scene.id, 'video', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
                        placeholder="e.g. clip_01.mp4"
                      />
                    </div>

                    {/* Dialogue */}
                    <div className="md:col-span-6 space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Dialogue / Voiceover
                      </label>
                      <textarea
                        value={scene.voice}
                        onChange={(e) => updateScene(scene.id, 'voice', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
                        placeholder="Enter the dialogue for this scene..."
                      />
                    </div>

                    {/* Transition */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MoveRight className="w-3 h-3" /> Transition
                      </label>
                      <select
                        value={scene.transition}
                        onChange={(e) => updateScene(scene.id, 'transition', e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="crossfade">Crossfade</option>
                        <option value="fade">Fade to Black</option>
                        <option value="none">None (Cut)</option>
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex justify-end pt-6">
                      <button 
                        onClick={() => removeScene(scene.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Remove Scene"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {scenes.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl">
                <p className="text-slate-500">No scenes added. Start by adding a scene to your timeline.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-cyan-400" /> 
              Pipeline Configuration
            </h2>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Resolution */}
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <MonitorPlay className="w-5 h-5 text-cyan-500" /> Rendering Output
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Resolution</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                      {['1080p', '4K', '8K'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setConfig({...config, resolution: res as any})}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                            config.resolution === res 
                              ? 'bg-cyan-600 text-white shadow-lg' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                    {config.resolution === '8K' && (
                      <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                        ⚠️ Requires 12GB+ VRAM GPU
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">AI Upscaling Model</label>
                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-200">Real-ESRGAN (Detail Enhancement)</span>
                      <button
                        onClick={() => setConfig({...config, useRealESRGAN: !config.useRealESRGAN})}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${config.useRealESRGAN ? 'bg-cyan-600' : 'bg-slate-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.useRealESRGAN ? 'translate-x-6' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-purple-500" /> Audio Engine
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Edge-TTS Voice ID</label>
                    <input
                      type="text"
                      value={config.voiceModel}
                      onChange={(e) => setConfig({...config, voiceModel: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">e.g. vi-VN-HoaiMyNeural, en-US-ChristopherNeural</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Audio Ducking Level ({Math.round(config.duckingLevel * 100)}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.duckingLevel}
                      onChange={(e) => setConfig({...config, duckingLevel: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Background music volume during dialogue</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: EXPORT */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg flex items-start gap-3">
              <div className="bg-blue-900 p-2 rounded text-blue-300">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-blue-200 font-bold">Ready for Production</h3>
                <p className="text-sm text-blue-300 mt-1">
                  This interface has generated the Python architecture required to render your project. 
                  Browsers cannot process 8K video or use NVENC directly. Download these files and run them locally.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Script JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4" /> script.json
                  </h3>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-green-400 overflow-auto h-64 shadow-inner">
                  <pre>{generatedCode.script}</pre>
                </div>
              </div>

              {/* Config Python */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4" /> src/config.py
                  </h3>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-purple-400 overflow-auto h-64 shadow-inner">
                  <pre>{generatedCode.config}</pre>
                </div>
              </div>

               {/* Main Python */}
               <div className="space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Play className="w-4 h-4" /> main.py
                  </h3>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-cyan-300 overflow-auto h-96 shadow-inner">
                  <pre>{generatedCode.main}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-6">
              <button 
                onClick={() => alert("Normally this would download a ZIP file containing the project structure.")}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-cyan-900/30 transition-all transform hover:scale-105"
              >
                <Download className="w-6 h-6" /> Download Python Project
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
