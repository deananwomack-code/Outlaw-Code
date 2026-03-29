import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingAnimationProps {
  steps?: string[];
}

const DEFAULT_STEPS = [
  "Analyzing build requirements...",
  "Compiling source files...",
  "Generating static assets...",
  "Resolving dependencies...",
  "Optimizing application bundle...",
  "Starting development server...",
  "Hot module replacement active...",
  "Finalizing build artifacts..."
];

export function LoadingAnimation({ steps = DEFAULT_STEPS }: LoadingAnimationProps) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-background/50 backdrop-blur-sm gap-8 p-12 overflow-hidden">
      <div className="h-32 flex flex-col items-center justify-center relative w-full max-w-sm">
        <AnimatePresence mode="popLayout">
          {[0, 1, 2].map((offset) => {
            const currentIdx = (index + offset) % steps.length;
            return (
              <motion.div
                key={`${steps[currentIdx]}-${offset}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{
                  opacity: offset === 0 ? 1 : offset === 1 ? 0.4 : 0.1,
                  y: offset === 0 ? 0 : offset === 1 ? -35 : -70,
                  scale: offset === 0 ? 1 : 0.95,
                  filter: offset === 0 ? 'blur(0px)' : 'blur(2px)'
                }}
                exit={{ opacity: 0, y: -100, filter: 'blur(5px)' }}
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                className="absolute text-sm font-medium text-foreground text-center w-full"
              >
                {steps[currentIdx]}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              repeat: Infinity,
              duration: 1,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        ))}
      </div>
    </div>
  );
}