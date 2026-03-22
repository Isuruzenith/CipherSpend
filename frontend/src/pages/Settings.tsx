import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCrypto } from '@/context/CryptoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { KeyRound, ShieldAlert, DownloadCloud, ArrowLeft } from 'lucide-react';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/currency';
import { getDefaultCurrency, setDefaultCurrency } from '@/lib/preferences';

export default function Settings() {
  const { rotatePassphrase, exportWrappedKey, token, decryptAmount } = useCrypto();
  const [newPassphrase, setNewPassphrase] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState<SupportedCurrency>('LKR');

  useEffect(() => {
    try {
      setDefaultCurrencyState(getDefaultCurrency());
    } catch {
      setDefaultCurrencyState('LKR');
    }
  }, []);

  const handleDefaultCurrencyChange = (value: string) => {
    const next = value as SupportedCurrency;
    setDefaultCurrencyState(next);
    setDefaultCurrency(next);
    toast.success(`Default currency set to ${next}`);
  };

  const handleRotateKey = async () => {
    if (!newPassphrase) return;
    setIsRotating(true);
    toast('Rotating keys...', { description: 'Re-deriving KEK and wrapping secret key via AES-GCM.' });
    try {
      await rotatePassphrase(newPassphrase);
      toast.success('Passphrase changed successfully. New encrypted key synced to server!');
      setNewPassphrase('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rotate passphrase');
    } finally {
      setIsRotating(false);
    }
  };

  const handleBackup = async () => {
    try {
      const wrappedKeyBase64 = await exportWrappedKey();
      navigator.clipboard.writeText(wrappedKeyBase64);
      toast.success('Wrapped Secret Key copied to clipboard!');
    } catch (err) {
      toast.error('Could not export key');
    }
  };

  const handleCSVExport = async () => {
    if (!token) return;
    const loadToast = toast.loading("Fetching encrypted data...");
    try {
      const res = await fetch('http://localhost:8000/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      toast.loading("Decrypting " + data.length + " rows locally...", { id: loadToast });
      let csvContent = "data:text/csv;charset=utf-8,ID,Date,Currency,Category,Description,DecryptedAmount\n";
      
      data.forEach((exp: any) => {
        let val = 0;
        try { val = decryptAmount(exp.amountCiphertext); } catch(e){}
        const row = [exp.id, exp.timestamp, exp.currency || 'LKR', exp.category, `"${exp.description}"`, val.toFixed(2)].join(",");
        csvContent += row + "\r\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "cipherspend_decrypted_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("CSV Decrypted & Exported successfully!", { id: loadToast });
    } catch (e) {
      console.error(e);
      toast.error('Export failed', { id: loadToast });
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50 tracking-tight">Vault Settings</h2>
          <p className="text-zinc-400 text-sm">Manage advanced security, cryptographic keys, and edge nodes.</p>
          <div className="mt-4">
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-zinc-100">
              <Link to="/dashboard" className="inline-flex items-center gap-2">
                <ArrowLeft size={14} />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <KeyRound className="text-teal-500 w-5 h-5" />
              Cryptographic Key Management
            </h3>
            
            <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <div className="space-y-1">
                <Label className="text-zinc-300">Change Master Passphrase</Label>
                <p className="text-xs text-zinc-500">
                  This will re-derive your Key Encryption Key (KEK) and re-encrypt your secret key blindly on your device before sending it to the server.
                </p>
              </div>
              <Input 
                type="password"
                placeholder="New strong passphrase"
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!newPassphrase || isRotating} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
                    {isRotating ? "Re-wrapping SK..." : "Rotate Key & Update Server"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-950 border-zinc-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-50 flex items-center gap-2">
                      <ShieldAlert className="text-red-500" />
                      Rotate Cryptographic Vault?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This action will immediately encrypt your CKKS secret key with a new KEK derived from the new passphrase. If you lose this new passphrase, your data is permanently inaccessible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRotateKey} className="bg-red-500 hover:bg-red-600 text-white border-none">
                      Proceed with Rotation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <div className="space-y-1">
                <Label className="text-zinc-300">Backup AES-Wrapped SK</Label>
                <p className="text-xs text-zinc-500">
                  Securely copy your fully encrypted homomorphic secret key to your clipboard.
                </p>
              </div>
              <Button onClick={handleBackup} variant="outline" className="w-full border-zinc-800 bg-zinc-900 text-zinc-200">
                Copy `wrapped_sk` Blob
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <KeyRound className="text-zinc-400 w-5 h-5" />
              Preferences
            </h3>

            <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <div className="space-y-1">
                <Label className="text-zinc-300">Default Currency</Label>
                <p className="text-xs text-zinc-500">
                  Used as the default selection when adding new expenses and as initial dashboard currency filter.
                </p>
              </div>
              <Select value={defaultCurrency} onValueChange={handleDefaultCurrencyChange}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Default currency" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <div className="space-y-1">
                <Label className="text-zinc-300">Data Export</Label>
                <p className="text-xs text-zinc-500">
                  Download decrypted CSV directly from browser memory without sending plaintext to the server.
                </p>
              </div>
              <Button onClick={handleCSVExport} variant="outline" className="border-teal-500/20 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 w-auto gap-2">
                <DownloadCloud size={16} />
                Export Decrypted CSV Locally
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
