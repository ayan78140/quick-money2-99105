import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  account_details: any;
  status: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

const WithdrawalsSection = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select(`
          *,
          profiles (username)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Withdrawal ${status}`);
      loadWithdrawals();
    } catch (error) {
      console.error("Error updating withdrawal:", error);
      toast.error("Failed to update withdrawal");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading withdrawals...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-background to-secondary/20">
          <CardTitle className="text-2xl">Withdrawal Management</CardTitle>
          <p className="text-sm text-muted-foreground">Review and process withdrawal requests</p>
        </CardHeader>
        <CardContent className="p-6">
          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold text-lg">
                          {withdrawal.profiles?.username || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(withdrawal.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">₹{withdrawal.amount.toFixed(2)}</p>
                        {withdrawal.status === "completed" && (
                          <Badge className="bg-green-600 hover:bg-green-700 font-medium">Completed</Badge>
                        )}
                        {withdrawal.status === "rejected" && (
                          <Badge variant="destructive" className="font-medium">Rejected</Badge>
                        )}
                        {withdrawal.status === "pending" && (
                          <Badge className="bg-yellow-600 hover:bg-yellow-700 font-medium">Pending</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold">Payment Method:</span> {withdrawal.method.toUpperCase()}
                      </p>
                      {withdrawal.method === "upi" && (
                        <p className="text-sm">
                          <span className="font-semibold">UPI ID:</span>{" "}
                          <code className="bg-background px-2 py-1 rounded">{withdrawal.account_details.upiId}</code>
                        </p>
                      )}
                      {withdrawal.method === "bank" && (
                        <>
                          <p className="text-sm">
                            <span className="font-semibold">Account Number:</span>{" "}
                            <code className="bg-background px-2 py-1 rounded">{withdrawal.account_details.accountNumber}</code>
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">IFSC Code:</span>{" "}
                            <code className="bg-background px-2 py-1 rounded">{withdrawal.account_details.ifscCode}</code>
                          </p>
                          <p className="text-sm">
                            <span className="font-semibold">Account Holder:</span> {withdrawal.account_details.accountHolderName}
                          </p>
                        </>
                      )}
                    </div>

                    {withdrawal.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateStatus(withdrawal.id, "completed")}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="lg"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve & Complete
                        </Button>
                        <Button
                          onClick={() => updateStatus(withdrawal.id, "rejected")}
                          className="flex-1"
                          variant="destructive"
                          size="lg"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsSection;
