import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import UsersSection from "@/components/admin/UsersSection";
import WithdrawalsSection from "@/components/admin/WithdrawalsSection";
import PurchasesSection from "@/components/admin/PurchasesSection";
import CardsSection from "@/components/admin/CardsSection";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log("No user found, redirecting to auth");
        navigate("/auth");
        return;
      }

      setUser(user);
      console.log("User found:", user.email);

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      console.log("Role check result:", { roleData, roleError });

      if (!roleData || roleError) {
        toast.error("Access denied. Admin privileges required.");
        console.log("User is not admin, redirecting to dashboard");
        navigate("/dashboard");
        return;
      }

      console.log("Admin access granted");
      setIsAdmin(true);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Complete control over users, payments, and system settings</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="lg" className="shadow-sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1">
            <TabsTrigger value="purchases" className="text-base">Purchases</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-base">Withdrawals</TabsTrigger>
            <TabsTrigger value="users" className="text-base">Users</TabsTrigger>
            <TabsTrigger value="cards" className="text-base">Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases">
            <PurchasesSection />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalsSection />
          </TabsContent>

          <TabsContent value="users">
            <UsersSection />
          </TabsContent>

          <TabsContent value="cards">
            <CardsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
