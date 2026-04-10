import React from 'react';
import { useAuth } from './AuthContext';
import Dashboard from './Dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

function Login() {
  const { login, loading } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md border-none shadow-xl bg-white">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-neutral-900 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">نظام إدارة Mafia Club</CardTitle>
            <CardDescription>لوحة التحكم الإدارية للفريق</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
            {error && <p className="text-rose-500 text-sm text-center bg-rose-50 p-3 rounded-lg border border-rose-100">{error}</p>}
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-12 bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 text-lg font-medium transition-all"
            >
              {isLoggingIn ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>
          <p className="mt-6 text-center text-neutral-500 text-xs">
            استخدم اسم المستخدم وكلمة المرور المسلمة لك من قبل الإدارة.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return profile ? <Dashboard /> : <Login />;
}
