import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { twoFactorService } from "@/services/twoFactorService";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TwoFactorSetup({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    try {
      setLoading(true);
      const data = await twoFactorService.setup();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    } catch (error: any) {
      toast.error(error.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      await twoFactorService.verify(verificationCode);
      setStep('backup');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    toast.success('Two-factor authentication enabled successfully');
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    setStep('setup');
    setQrCode('');
    setSecret('');
    setBackupCodes([]);
    setVerificationCode('');
    setCopied(false);
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAllBackupCodes = () => {
    const codes = backupCodes.join('\n');
    copyToClipboard(codes);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'setup' && (
          <>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Add an extra layer of security to your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app in addition to your password.
              </p>
              <Alert>
                <AlertDescription>
                  You'll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSetup} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Scan this QR code with your authenticator app
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Or enter this code manually:</Label>
                <div className="flex gap-2">
                  <Input value={secret} readOnly className="font-mono text-sm" />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(secret)}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Enter verification code</Label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'backup' && (
          <>
            <DialogHeader>
              <DialogTitle>Save Backup Codes</DialogTitle>
              <DialogDescription>
                Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription className="text-sm">
                  ⚠️ Each backup code can only be used once. Save them securely!
                </AlertDescription>
              </Alert>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="font-mono text-sm">
                    {code}
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={copyAllBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleComplete} className="w-full">
                I've Saved My Backup Codes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}