import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-50 p-6">
      <div className="max-w-3xl text-center space-y-8">
        <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10 px-4 py-1">
          <Lock className="w-3 h-3 mr-2 inline" />
          Zero-Knowledge Architecture
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Your money stays private.<br/>
          <span className="text-zinc-500">Even from us.</span>
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          CipherSpend Cloud uses Fully Homomorphic Encryption (FHE) to track your finances. 
          We securely compute your totals without ever decrypting your data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button asChild size="lg" className="bg-teal-500 hover:bg-teal-600 text-zinc-950 font-semibold">
            <Link to="/signup">Create Secure Vault</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50">
            <Link to="/login">Unlock Vault</Link>
          </Button>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100 mb-2">Zero-Knowledge Storage</h3>
          <p className="text-zinc-400 text-sm">Your expense amounts are encrypted into unreadable ciphertexts before leaving your device.</p>
        </Card>
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100 mb-2">Blind Computation</h3>
          <p className="text-zinc-400 text-sm">Our servers perform mathematical additions directly on encrypted data using CKKS FHE.</p>
        </Card>
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100 mb-2">Local Decryption</h3>
          <p className="text-zinc-400 text-sm">Meaningful numbers are only ever revealed in your browser memory via WASM.</p>
        </Card>
      </div>
    </div>
  );
}
