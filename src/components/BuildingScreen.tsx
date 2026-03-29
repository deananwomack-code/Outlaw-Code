import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_TEXTS = [
  "Initializing sandbox environment...",
  "Installing dependencies...",
  "Configuring development server...",
  "Building application bundle...",
  "Optimizing assets...",
  "Starting preview server..."
];

export function BuildingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 2000); // Change text every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Get current, next, and next-next texts for the "3 lines" effect
  const activeTexts = [
    LOADING_TEXTS[currentIndex],
    LOADING_TEXTS[(currentIndex + 1) % LOADING_TEXTS.length],
    LOADING_TEXTS[(currentIndex + 2) % LOADING_TEXTS.length]
  ];

  return (
    <div className="absolute inset-0 bg-[#000000] flex flex-col items-center justify-center z-50 overflow-hidden font-mono">
      <div className="relative h-32 w-full max-w-md flex flex-col items-center justify-center overflow-hidden mask-gradient">
        <AnimatePresence mode="popLayout">
          {activeTexts.map((text, i) => (
            <motion.div
              key={`${text}-${i}-${currentIndex}`} // Unique key for animation
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ 
                opacity: i === 0 ? 1 : i === 1 ? 0.5 : 0.2, 
                y: 0, 
                filter: 'blur(0px)',
                scale: i === 0 ? 1 : 0.95
              }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`text-sm tracking-wide py-1 ${i === 0 ? 'text-white font-medium' : 'text-gray-500'}`}
              style={{
                position: 'absolute',
                top: `${30 + i * 30}%`, // Stack vertically
              }}
            >
              {text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Subtle loader line */}
      <div className="w-48 h-[1px] bg-gray-800 mt-8 overflow-hidden relative">
        <motion.div 
          className="absolute inset-y-0 left-0 bg-white w-1/2 opacity-50 blur-[1px]"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      </div>
    </div>
  );
}
