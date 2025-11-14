import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@shared/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function LoginPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/app');
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      return await apiRequest('POST', '/api/auth/login', data);
    },
    onSuccess: () => {
      // Invalidate auth status to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      
      // Navigation handled by App.tsx based on auth status
    },
    onError: (error: any) => {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div 
      className="h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#4B9A4A] to-[#3d7d3d]"
    >
      <div className="max-w-md w-full px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-muted-foreground text-base">
                Sign in to your account
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-email"
                          type="email"
                          placeholder="your.email@example.com"
                          className="h-11 bg-muted/50"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-password"
                          type="password"
                          placeholder="Enter your password"
                          className="h-11 bg-muted/50"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  data-testid="button-signin"
                  className="w-full h-11 bg-[#4B9A4A] text-white hover:bg-[#3d7d3d] transition-colors"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="mt-5 text-center">
              <button 
                data-testid="link-forgot-password"
                className="text-sm text-[#4B9A4A] hover:underline transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: 'Password reset',
                    description: 'Password reset functionality coming soon!',
                  });
                }}
              >
                Forgot your password?
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
