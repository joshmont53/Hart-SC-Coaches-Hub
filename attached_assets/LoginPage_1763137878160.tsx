import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  autoLogin?: boolean;
}

export function LoginPage({ onLogin, autoLogin = false }: LoginPageProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // If autoLogin, don't show the login form - loading screen will automatically complete
    if (autoLogin) {
      return;
    }
    
    // Show login form after 2 seconds
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div 
      className="h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #4B9A4A 0%, #3d7d3d 100%)'
      }}
    >
      <div className="max-w-md w-full px-6">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            // Loading screen with logo
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                >
                  Coaches
                </motion.div>
              </div>
            </motion.div>
          ) : (
            // Login form
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-sm mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
                <div className="text-center mb-6">
                  <p className="text-muted-foreground">
                    Sign in to your account
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-white"
                    style={{ backgroundColor: '#4B9A4A' }}
                  >
                    Sign In
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <a 
                    href="#" 
                    className="text-sm hover:underline"
                    style={{ color: '#4B9A4A' }}
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset functionality coming soon!');
                    }}
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
