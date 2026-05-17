"use client";
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-6 z-50 mx-auto max-w-5xl px-4"
    >
      <div className="flex items-center justify-between glass-card px-6 py-3 border-white/5 bg-bg-secondary/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-blue to-neon-cyan flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-text-primary">ADITYA .AI</span>
        </div>
        <div className="flex gap-3">
          <a href="https://www.magnific.com/" target="_blank" className="btn-primary px-4 py-2 text-xs uppercase tracking-wider text-white hidden md:flex">
            Ambil Key Magnific
          </a>
          <a href="https://www.facebook.com/Aditya.su.ll/" target="_blank" className="btn-primary px-4 py-2 text-xs uppercase tracking-wider">
            CS ADMIN
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
