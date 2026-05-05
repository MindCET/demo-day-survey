
import { motion } from 'motion/react';

interface HeaderProps {
  showLogo?: boolean;
}

export default function Header({ showLogo = true }: HeaderProps) {
  return (
    <div className="relative w-full overflow-hidden h-24 mb-6">
      {/* The angled white background like in the website image */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-0 right-[-10%] w-[60%] h-full bg-white transform -skew-x-12 flex items-center justify-center shadow-lg"
      >
        {showLogo && (
          <div className="transform skew-x-12 pr-10">
            <img 
              src="https://www.mindcet.org/wp-content/themes/mindcet/assets/images/logo.png" 
              alt="MindCET Logo" 
              className="h-10 md:h-12 w-auto"
            />
          </div>
        )}
      </motion.div>
      
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
