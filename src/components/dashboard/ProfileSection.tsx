import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, Mail } from "lucide-react";
import { toast } from "sonner";

interface ProfileSectionProps {
  userId: string;
}

const ProfileSection = ({ userId }: ProfileSectionProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchase, setHasPurchase] = useState(false);

  useEffect(() => {
    loadProfile();
    checkPurchases();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select("id, verification_status")
        .eq("user_id", userId)
        .eq("verification_status", "verified")
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasPurchase(true);
      }
    } catch (error) {
      console.error("Error checking purchases:", error);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const copyReferralLink = () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  const shareReferralLink = async () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      const text = `Join Quick Money and start earning! Use my referral code: ${profile.referral_code}\n\n${link}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join Quick Money",
            text: text,
          });
        } catch (error) {
          console.error("Error sharing:", error);
        }
      } else {
        navigator.clipboard.writeText(text);
        toast.success("Message copied! Share it with your friends.");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-center py-8">Profile not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.username} disabled />
          </div>

          <div className="space-y-2">
            <Label>Account Created</Label>
            <Input
              value={new Date(profile.created_at).toLocaleDateString()}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {hasPurchase ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share this code to earn 50% commission on purchases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Referral Code</Label>
              <div className="flex gap-2">
                <Input
                  value={profile.referral_code}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button onClick={copyReferralCode} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Referral Link</Label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/auth?ref=${profile.referral_code}`}
                  readOnly
                  className="text-sm"
                />
                <Button onClick={copyReferralLink} size="icon" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={shareReferralLink} className="w-full" size="lg">
              <Share2 className="h-4 w-4 mr-2" />
              Share Referral Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Referral Code Locked
            </CardTitle>
            <CardDescription>
              Purchase a card and get it verified to unlock your referral code and start earning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 text-center bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Complete your first verified purchase to get your unique referral link and start earning 50% commission!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Total Earnings</span>
            <span className="text-xl font-bold text-success">
              ₹{profile.total_earnings.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Available Balance</span>
            <span className="text-xl font-bold text-primary">
              ₹{profile.withdrawable_balance.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSection;
