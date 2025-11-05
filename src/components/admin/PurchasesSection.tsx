import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Purchase {
  id: string;
  user_id: string;
  card_id: string;
  amount: number;
  commission_to_referrer: number;
  created_at: string;
  verification_status: string;
  payment_screenshot_url: string | null;
  profiles: {
    username: string;
  };
  cards: {
    title: string;
  };
}

const PurchasesSection = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, totalAmount: 0, totalCommission: 0 });

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          *,
          profiles!purchases_user_id_fkey (username),
          cards (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Convert storage paths to public URLs
      const purchasesWithUrls = data?.map(purchase => {
        if (purchase.payment_screenshot_url) {
          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(purchase.payment_screenshot_url);
          return {
            ...purchase,
            payment_screenshot_url: urlData.publicUrl
          };
        }
        return purchase;
      }) || [];

      setPurchases(purchasesWithUrls);

      // Calculate stats
      const total = data?.length || 0;
      const totalAmount = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalCommission = data?.reduce((sum, p) => sum + Number(p.commission_to_referrer), 0) || 0;

      setStats({ total, totalAmount, totalCommission });
    } catch (error) {
      console.error("Error loading purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateVerificationStatus = async (purchaseId: string, status: string) => {
    const { error } = await supabase
      .from("purchases")
      .update({ verification_status: status })
      .eq("id", purchaseId);

    if (error) {
      toast.error("Failed to update verification status");
      return;
    }

    toast.success(`Payment ${status}`);
    loadPurchases();
  };

  if (loading) {
    return <div className="text-center py-8">Loading purchases...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">₹{stats.totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">₹{stats.totalCommission.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-background to-secondary/20">
          <CardTitle className="text-2xl">Payment Verification</CardTitle>
          <p className="text-sm text-muted-foreground">Review and verify payment submissions</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Card</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Commission</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Screenshot</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{purchase.profiles.username}</TableCell>
                    <TableCell>{purchase.cards.title}</TableCell>
                    <TableCell className="text-primary font-semibold">₹{Number(purchase.amount).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold" style={{ color: 'hsl(142, 76%, 36%)' }}>
                      ₹{Number(purchase.commission_to_referrer).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {purchase.verification_status === "pending" && (
                        <Badge className="bg-yellow-600 hover:bg-yellow-700 font-medium">Pending</Badge>
                      )}
                      {purchase.verification_status === "approved" && (
                        <Badge className="bg-green-600 hover:bg-green-700 font-medium">Approved</Badge>
                      )}
                      {purchase.verification_status === "rejected" && (
                        <Badge variant="destructive" className="font-medium">Rejected</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.payment_screenshot_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedScreenshot(purchase.payment_screenshot_url)}
                          className="font-medium"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No screenshot</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {purchase.verification_status === "pending" && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updateVerificationStatus(purchase.id, "approved")}
                            className="bg-green-600 hover:bg-green-700 font-medium"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateVerificationStatus(purchase.id, "rejected")}
                            className="font-medium"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
              <img
                src={selectedScreenshot}
                alt="Payment proof"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchasesSection;
