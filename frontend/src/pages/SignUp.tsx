import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCrypto } from '@/context/CryptoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function SignUp() {
  const navigate = useNavigate();
  const { registerAndGenerateVault } = useCrypto();
  
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      toast('Generating secure vault...', { description: 'This uses WASM and may take a few seconds.' });
      await registerAndGenerateVault(email, passphrase);
      toast.success('Vault created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create vault.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-zinc-900 border-zinc-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Lock className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-50">Create Secure Vault</h2>
          <p className="text-zinc-400 mt-2 text-sm">Your passphrase derives the key that protects your homomorphic secret key. Do not lose it.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/50 text-red-400">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passphrase" className="text-zinc-300">Master Passphrase</Label>
            <Input 
              id="passphrase" 
              type="password" 
              required 
              value={passphrase}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-zinc-950 font-semibold" disabled={loading}>
            {loading ? 'Generating FHE Keys...' : 'Create Vault'}
          </Button>
        </form>

        {loading && (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-2 w-full bg-zinc-800" />
            <Skeleton className="h-2 w-3/4 bg-zinc-800 mx-auto" />
            <p className="text-xs text-center text-teal-500/70 mt-2 animate-pulse">Running CKKS KeyGen (WASM)...</p>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-zinc-500">
          Already have a vault? <Link to="/login" className="text-teal-400 hover:underline">Unlock it</Link>
        </div>
      </Card>
    </div>
  );
}
