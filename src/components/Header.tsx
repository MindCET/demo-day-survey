
import { motion } from 'motion/react';

export default function Header() {
  return (
    <div className="relative w-full overflow-hidden h-24 mb-6">

      <div className="absolute top-0 left-0 h-full flex items-center pl-6">
        <motion.h1 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight"
        >
          MindCET <span className="text-mindcet-orange">Demo Day</span>
        </motion.h1>
      </div>
    </div>
  );
}
