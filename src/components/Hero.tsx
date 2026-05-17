"use client";
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export default function Hero() {
  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center mb-24 pt-8">
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-neon-cyan text-xs font-bold tracking-widest uppercase"
        >
          KLING V3 PRO EDITION (GRATIS TIDAK DI PERJUALBELIKAN)
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight"
        >
          Future of <span className="neon-text">Motion</span> Control.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-text-secondary leading-relaxed max-w-md"
        >
          Alat produksi video AI premium untuk content creator. Menggunakan engine Kling V3 Pro dengan kontrol durasi, audio, dan aspect ratio penuh.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 pt-4"
        >
          <a href="#Mulai-Create" className="btn-primary px-8 py-4 text-base flex gap-2">
            Mulai Create <ArrowDown className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
