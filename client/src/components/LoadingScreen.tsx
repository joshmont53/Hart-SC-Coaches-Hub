import { motion } from 'motion/react';

export function LoadingScreen() {
  return (
    <div 
      className="h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #4B9A4A 0%, #3d7d3d 100%)'
      }}
      data-testid="loading-screen"
    >
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="text-center select-none">
            {/* Hart SC - White text */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-2"
              style={{
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: 'clamp(3rem, 10vw, 5rem)',
                lineHeight: '1',
                color: 'white',
                letterSpacing: '-0.02em',
              }}
              data-testid="text-hart-sc"
            >
              Hart SC
            </motion.div>

            {/* Coaches - Green text on white background */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="inline-block px-6 py-2"
              style={{
                backgroundColor: 'white',
                fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: 'clamp(3rem, 10vw, 5rem)',
                lineHeight: '1',
                color: '#4B9A4A',
                letterSpacing: '-0.02em',
              }}
              data-testid="text-coaches"
            >
              Coaches
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
