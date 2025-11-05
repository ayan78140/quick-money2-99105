import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, TrendingUp, IndianRupee } from "lucide-react";

interface AnalyticsSectionProps {
  userId: string;
}

interface Stats {
  totalReferrals: number;
  totalPurchases: number;
  totalEarnings: number;
  recentEarnings: any[];
}

const AnalyticsSection = ({ userId }: AnalyticsSectionProps) => {
  const [stats, setStats] = useState<Stats>({
    totalReferrals: 0,
    totalPurchases: 0,
    totalEarnings: 0,
    recentEarnings: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      // Get referred users count
      const { count: referralCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", userId);

      // Get purchases made by referrals
      const { data: purchases } = await supabase
        .from("purchases")
        .select("*")
        .eq("referrer_id", userId);

      // Get earnings
      const { data: earnings } = await supabase
        .from("earnings")
        .select("*, from_user_id(username)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get current profile for total earnings
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_earnings")
        .eq("id", userId)
        .single();

      setStats({
        totalReferrals: referralCount || 0,
        totalPurchases: purchases?.length || 0,
        totalEarnings: profile?.total_earnings || 0,
        recentEarnings: earnings || [],
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Users who signed up</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">Cards purchased by referrals</p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-accent/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success flex items-center gap-1">
              <IndianRupee className="h-5 w-5" />
              {stats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">50% commission earned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Your latest commission payments</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentEarnings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No earnings yet. Share your referral link to start earning!
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-success/10 p-2">
                      <IndianRupee className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">₹{earning.amount}</p>
                      <p className="text-sm text-muted-foreground">
                        From: {earning.from_user_id?.username || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(earning.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsSection;
