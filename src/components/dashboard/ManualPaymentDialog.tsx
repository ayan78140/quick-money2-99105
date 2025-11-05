import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Copy, Check } from "lucide-react";
import paymentQR from "@/assets/payment-qr.png";

interface ManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardTitle: string;
  cardPrice: number;
  userId: string;
  onPaymentComplete: () => void;
}

const ManualPaymentDialog = ({
  open,
  onOpenChange,
  cardId,
  cardTitle,
  cardPrice,
  userId,
  onPaymentComplete,
}: ManualPaymentDialogProps) => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const paymentDetails = {
    upiId: "zansb35@oksbi",
    accountNumber: "1457",
    bankName: "Canara Bank",
    accountHolder: "Faiz",
    qrCodeUrl: paymentQR,
  };

  const handlePayNow = () => {
    // Add ₹0.01 for verification
    const amountWithFee = (cardPrice + 0.01).toFixed(2);
    const upiUrl = `upi://pay?pa=${paymentDetails.upiId}&pn=${encodeURIComponent(paymentDetails.accountHolder)}&am=${amountWithFee}&cu=INR&tn=${encodeURIComponent(`Payment for ${cardTitle}`)}`;
    window.location.href = upiUrl;
    toast.info("₹0.01 platform fee added for verification security");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setUploading(true);

    try {
      // Upload screenshot to storage
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Process purchase with screenshot
      const { data: purchaseData, error: purchaseError } = await supabase.rpc(
        "process_purchase",
        {
          p_card_id: cardId,
          p_user_id: userId,
        }
      );

      if (purchaseError) throw purchaseError;

      let purchaseId = null;
      
      // Update purchase with screenshot URL
      if (purchaseData && typeof purchaseData === 'object' && 'purchase_id' in purchaseData) {
        purchaseId = (purchaseData as any).purchase_id;
        
        const { error: updateError } = await supabase
          .from("purchases")
          .update({
            payment_screenshot_url: fileName, // Store path, not URL
            payment_method: "manual",
            verification_status: "pending",
          })
          .eq("id", purchaseId);

        if (updateError) throw updateError;
      }

      // Call verification edge function
      if (purchaseId) {
        toast.info("Verifying payment screenshot...");
        
        const expectedAmount = (cardPrice + 0.01).toFixed(2);
        
        const { data: session } = await supabase.auth.getSession();
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
          'verify-payment-screenshot',
          {
            body: {
              screenshotUrl: publicUrl,
              purchaseId: purchaseId,
              cardTitle: cardTitle,
              expectedAmount: expectedAmount,
            },
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
            },
          }
        );

        if (verifyError) {
          console.error("Verification error:", verifyError);
          toast.warning("Payment submitted but auto-verification failed. Admin will review manually.");
        } else if (verifyResult?.verified) {
          toast.success(verifyResult.message);
          onPaymentComplete();
          onOpenChange(false);
        } else {
          toast.error(verifyResult?.message || "Payment verification failed");
          onOpenChange(false);
        }
      } else {
        toast.success("Payment submitted for review!");
        onPaymentComplete();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Payment submission error:", error);
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment - {cardTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-primary/5 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">₹{cardPrice}</p>
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-xs text-muted-foreground mt-1">
              + ₹0.01 platform fee for verification security
            </p>
          </div>

          {/* Pay Now Button */}
          <Button onClick={handlePayNow} className="w-full" size="lg">
            Pay Now with UPI
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or scan QR code</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label>Scan QR Code</Label>
            <div className="border rounded-lg p-4 flex justify-center">
              <img
                src={paymentDetails.qrCodeUrl}
                alt="Payment QR Code"
                className="w-64 h-64 object-contain"
              />
            </div>
          </div>

          {/* UPI ID */}
          <div className="space-y-2">
            <Label>UPI ID</Label>
            <div className="flex gap-2">
              <Input value={paymentDetails.upiId} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(paymentDetails.upiId, "UPI ID")}
              >
                {copied === "UPI ID" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-3 border-t pt-4">
            <p className="font-semibold text-center text-sm text-muted-foreground">
              Bank: {paymentDetails.bankName} - Account: {paymentDetails.accountNumber}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Account Holder: {paymentDetails.accountHolder}
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="screenshot">Upload Payment Screenshot *</Label>
            <div className="flex gap-2">
              <Input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1"
              />
              {screenshot && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Selected
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a screenshot of your successful payment
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!screenshot || uploading}
            className="w-full"
          >
            {uploading ? (
              "Submitting..."
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment & Unlock Referral Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPaymentDialog;
