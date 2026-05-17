"use client";
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, PenTool, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Generator() {
  const [apiKey, setApiKey] = useState('');
  const [startImage, setStartImage] = useState<File | null>(null);
  const [videoRef, setVideoRef] = useState<File | null>(null);
  const [duration, setDuration] = useState('5');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blur, distort, and low quality');
  const [cfgScale, setCfgScale] = useState(0.5);
  const [generateAudio, setGenerateAudio] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [isError, setIsError] = useState(false);

  const startImageRef = useRef<HTMLInputElement>(null);
  const videoRefInput = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      toast.error('Silakan masukkan API Key Magnific Anda!');
      return;
    }
    if (!startImage) {
      toast.error('Start Image WAJIB diunggah!');
      return;
    }

    setIsGenerating(true);
    setIsError(false);
    setResultData(null);

    try {
      const formData = new FormData();
      formData.append('start_image', startImage);
      if (videoRef) formData.append('video', videoRef);
      
      const payload = {
        prompt,
        negative_prompt: negativePrompt,
        duration,
        aspect_ratio: aspectRatio,
        cfg_scale: cfgScale,
        generate_audio: generateAudio
      };
      formData.append('payload', JSON.stringify(payload));

      const response = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: { 'Authorization': "Bearer " + apiKey.trim() },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        let errorMessage = "HTTP Error " + response.status;
        if (result.details) {
          errorMessage = typeof result.details === 'object' ? JSON.stringify(result.details) : result.details;
          if (result.details.message) errorMessage = result.details.message;
          if (result.details.error) errorMessage = result.details.error;
        } else if (result.error) {
          errorMessage = result.error;
        }
        throw new Error(errorMessage);
      }
      
      setResultData(result);
      toast.success('Pipeline Berhasil Dibuat!');
      
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);

    } catch (error: any) {
      console.error(error);
      setIsError(true);
      setResultData(error.message);
      toast.error('Gagal memproses permintaan.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="Mulai-Create" className="flex flex-col lg:flex-row gap-8 pt-12">
      <div className="lg:w-64 space-y-2">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-3 border-white/5"
        >
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] px-3 mb-3">Main Console</div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-blue/10 text-neon-cyan border border-blue-500/20 cursor-pointer">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="font-semibold text-sm">V3 Pro Generator</span>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4">Auth Terminal</h3>
          <input 
            type="password" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="MASUKKAN API KEY MAGNIFIC (Contoh: FPSXe1f...)" 
            className="w-full bg-bg-primary border border-white/5 rounded-xl px-4 py-4 text-sm font-mono text-neon-cyan focus:border-accent-blue outline-none transition-all placeholder:text-[#2a3c54]" 
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid sm:grid-cols-2 gap-6"
        >
          <div>
            <input type="file" ref={startImageRef} onChange={(e) => setStartImage(e.target.files?.[0] || null)} className="hidden" accept="image/png, image/jpeg, image/webp" />
            <div 
              onClick={() => startImageRef.current?.click()}
              className={"block glass-card p-6 group cursor-pointer border-dashed border-2 transition-all h-full " + (startImage ? 'border-green-500/50' : 'border-white/5 hover:border-neon-cyan/40')}
            >
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-neon-cyan group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className={"text-sm font-bold " + (startImage ? 'text-green-400' : '')}>
                    {startImage ? startImage.name : 'Upload Start Image'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">(Wajib) Frame awal video</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <input type="file" ref={videoRefInput} onChange={(e) => setVideoRef(e.target.files?.[0] || null)} className="hidden" accept="video/mp4, video/quicktime, video/webm" />
            <div 
              onClick={() => videoRefInput.current?.click()}
              className={"block glass-card p-6 group cursor-pointer border-dashed border-2 transition-all h-full " + (videoRef ? 'border-green-500/50' : 'border-white/5 hover:border-neon-cyan/40')}
            >
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-neon-cyan group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className={"text-sm font-bold " + (videoRef ? 'text-green-400' : '')}>
                    {videoRef ? videoRef.name : 'Upload Reference Video'}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">(Opsional) Video referensi gerak</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 space-y-8"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Duration (Seconds)</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-bg-primary border border-white/5 rounded-xl px-4 py-3 text-sm text-text-primary outline-none cursor-pointer">
                <option value="5">5 Seconds</option>
                <option value="10">10 Seconds</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Aspect Ratio</label>
              <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-bg-primary border border-white/5 rounded-xl px-4 py-3 text-sm text-text-primary outline-none cursor-pointer">
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:3">4:3</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2"><PenTool className="w-3 h-3"/> Positive Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="Describe the motion dynamics..." className="w-full bg-bg-primary border border-white/5 rounded-2xl px-4 py-4 text-sm text-text-primary outline-none resize-none focus:border-accent-blue transition-all"></textarea>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2"><PenTool className="w-3 h-3 text-red-400"/> Negative Prompt</label>
            <textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} rows={2} className="w-full bg-bg-primary border border-white/5 rounded-2xl px-4 py-4 text-sm text-text-primary outline-none resize-none focus:border-accent-blue transition-all"></textarea>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">CFG Scale</label>
              <div className="flex items-center gap-4">
                <input type="range" min="0.1" max="1.0" step="0.05" value={cfgScale} onChange={(e) => setCfgScale(parseFloat(e.target.value))} className="flex-1" />
                <span className="text-xs font-mono text-neon-cyan w-8 text-right">{cfgScale}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-bg-primary border border-white/5 rounded-xl">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                {generateAudio ? <Volume2 className="w-4 h-4 text-neon-cyan"/> : <VolumeX className="w-4 h-4"/>}
                Generate Audio
              </label>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" checked={generateAudio} onChange={(e) => setGenerateAudio(e.target.checked)} id="toggle-audio" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 transition-all duration-300"/>
                <label htmlFor="toggle-audio" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-600 cursor-pointer transition-all duration-300"></label>
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className="w-full btn-primary py-5 text-base tracking-[0.1em] uppercase">
            {isGenerating ? ( <><span className="spinner"></span> Processing Pipeline...</> ) : ( 'Initialize Generation Pipeline' )}
          </button>
        </motion.div>

        <AnimatePresence>
          {resultData && (
            <motion.div id="result-section" initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="glass-card p-8 flex flex-col items-center justify-center text-center mt-6">
              <h3 className={"text-lg font-bold mb-2 " + (isError ? 'text-red-500' : 'text-green-400')}>{isError ? 'Error System' : 'Pipeline Berhasil Dibuat!'}</h3>
              <p className="text-sm text-text-secondary mb-6">{isError ? 'Gagal memproses permintaan. Detail error dari server:' : 'Task sedang diproses oleh server Magnific.'}</p>
              <div className="w-full bg-bg-primary rounded-xl overflow-hidden border border-white/5 flex items-center justify-center p-6">
                {isError ? ( <div className="text-red-400 p-4 text-sm font-mono text-center break-all">{String(resultData)}</div> ) : ( <div className="text-neon-cyan p-4 text-sm font-mono text-center">Task Created Successfully!<br/><br/><span className="text-white bg-blue-900/50 px-4 py-2 rounded-lg inline-block my-2 border border-accent-blue/30">Task ID: {resultData.id || resultData.task_id || 'N/A'}</span><br/><br/><span className="text-xs text-text-secondary">(Silakan periksa dashboard Magnific Anda)</span></div> )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
