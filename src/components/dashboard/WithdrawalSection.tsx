import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, Wallet } from "lucide-react";
import { toast } from "sonner";

interface WithdrawalSectionProps {
  userId: string;
}

const WithdrawalSection = ({ userId }: WithdrawalSectionProps) => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountName: "",
    upiId: "",
  });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBalance();
    loadWithdrawals();
  }, [userId]);

  const loadBalance = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("withdrawable_balance")
      .eq("id", userId)
      .single();

    if (data) {
      setBalance(data.withdrawable_balance);
    }
  };

  const loadWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setWithdrawals(data);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (withdrawAmount < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      return;
    }

    setLoading(true);
    try {
      let details = {};
      if (method === "bank") {
        details = {
          accountNumber: accountDetails.accountNumber,
          ifscCode: accountDetails.ifscCode,
          accountName: accountDetails.accountName,
        };
      } else if (method === "upi") {
        details = { upiId: accountDetails.upiId };
      }

      const { error } = await supabase.from("withdrawals").insert({
        user_id: userId,
        amount: withdrawAmount,
        method,
        account_details: details,
      });

      if (error) throw error;

      // Update balance
      await supabase
        .from("profiles")
        .update({ withdrawable_balance: balance - withdrawAmount })
        .eq("id", userId);

      toast.success("Withdrawal request submitted successfully!");
      setAmount("");
      setAccountDetails({
        accountNumber: "",
        ifscCode: "",
        accountName: "",
        upiId: "",
      });
      loadBalance();
      loadWithdrawals();
    } catch (error: any) {
      toast.error("Failed to submit withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-success/20 bg-gradient-to-br from-success/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-success" />
            Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-success flex items-center gap-2">
            <IndianRupee className="h-8 w-8" />
            {balance.toFixed(2)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Ready to withdraw</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdraw Funds</CardTitle>
          <CardDescription>Minimum withdrawal amount: ₹100</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWithdrawal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="100"
                max={balance}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Withdrawal Method</Label>
              <Select value={method} onValueChange={setMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="paytm">Paytm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {method === "bank" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Account holder name"
                    value={accountDetails.accountName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    placeholder="Enter IFSC code"
                    value={accountDetails.ifscCode}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, ifscCode: e.target.value })
                    }
                    required
                  />
                </div>
              </>
            )}

            {method === "upi" && (
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  value={accountDetails.upiId}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, upiId: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {method === "paytm" && (
              <div className="space-y-2">
                <Label htmlFor="paytm">Paytm Number</Label>
                <Input
                  id="paytm"
                  placeholder="Enter Paytm number"
                  value={accountDetails.upiId}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, upiId: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !method}>
              {loading ? "Processing..." : "Request Withdrawal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No withdrawals yet</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">₹{withdrawal.amount}</p>
                    <p className="text-sm text-muted-foreground capitalize">{withdrawal.method}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        withdrawal.status === "completed"
                          ? "default"
                          : withdrawal.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {withdrawal.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalSection;
