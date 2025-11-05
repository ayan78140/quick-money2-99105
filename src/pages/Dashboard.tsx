import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, TrendingUp, Wallet, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardsSection from "@/components/dashboard/CardsSection";
import AnalyticsSection from "@/components/dashboard/AnalyticsSection";
import WithdrawalSection from "@/components/dashboard/WithdrawalSection";
import ProfileSection from "@/components/dashboard/ProfileSection";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Quick Money
            </h1>
            <p className="text-muted-foreground">Your earnings dashboard</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="cards" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="cards" className="flex flex-col gap-1 py-3">
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col gap-1 py-3">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="flex flex-col gap-1 py-3">
              <Wallet className="h-5 w-5" />
              <span className="text-xs">Withdraw</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col gap-1 py-3">
              <UserIcon className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cards">
            <CardsSection userId={user.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsSection userId={user.id} />
          </TabsContent>

          <TabsContent value="withdrawal">
            <WithdrawalSection userId={user.id} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSection userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
