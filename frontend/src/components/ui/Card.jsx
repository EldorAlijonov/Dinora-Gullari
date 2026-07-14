import { motion } from 'framer-motion';

export function Card({ children, className = '', delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-lg border border-white/10 bg-panel/80 p-5 shadow-panel backdrop-blur ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
