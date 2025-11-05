import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  referral_code: string;
  total_earnings: number;
  withdrawable_balance: number;
  created_at: string;
  referred_by: string | null;
  is_banned: boolean;
}

const UsersSection = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
    try {
      console.log("Attempting to ban/unban user:", userId, "Current status:", currentStatus);
      
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_banned: !currentStatus })
        .eq("id", userId)
        .select();

      console.log("Ban update result:", { data, error });

      if (error) {
        console.error("Ban error:", error);
        toast.error(`Failed to update user status: ${error.message}`);
        return;
      }

      toast.success(currentStatus ? "User unbanned successfully" : "User banned successfully");
      await loadUsers();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-background to-secondary/20">
        <CardTitle className="text-2xl">User Management</CardTitle>
        <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Username</TableHead>
                <TableHead className="font-semibold">Referral Code</TableHead>
                <TableHead className="font-semibold">Total Earnings</TableHead>
                <TableHead className="font-semibold">Available Balance</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Joined Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <code className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-mono">
                      {user.referral_code}
                    </code>
                  </TableCell>
                  <TableCell className="text-primary font-semibold">
                    ₹{Number(user.total_earnings).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-semibold" style={{ color: 'hsl(142, 76%, 36%)' }}>
                    ₹{Number(user.withdrawable_balance).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="font-medium">Banned</Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-700 font-medium">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('en-IN', { 
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.is_banned ? "outline" : "destructive"}
                      size="sm"
                      onClick={() => toggleBanStatus(user.id, user.is_banned)}
                      className="font-medium"
                    >
                      {user.is_banned ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Ban User
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersSection;
