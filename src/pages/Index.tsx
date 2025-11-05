import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Coins, TrendingUp, Users, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary p-4">
              <Coins className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Quick Money
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Start Earning Today with Our Simple Referral System
          </p>
          <div className="flex items-center justify-center gap-2 text-lg font-semibold text-success">
            <TrendingUp className="h-6 w-6" />
            <span>Earn 50% Commission on Every Referral Purchase</span>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-primary/20 hover:border-primary transition-all duration-300">
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">1. Sign Up & Get Your Link</h3>
              <p className="text-muted-foreground">
                Create your account and receive a unique referral code instantly
              </p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 hover:border-secondary transition-all duration-300">
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-full bg-secondary/10 w-12 h-12 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">2. Share with Friends</h3>
              <p className="text-muted-foreground">
                Share your referral link with friends and family on social media
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 hover:border-accent transition-all duration-300">
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-full bg-accent/10 w-12 h-12 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">3. Earn Commission</h3>
              <p className="text-muted-foreground">
                Get 50% commission when your referrals purchase any card
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Cards Preview Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Available Cards</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { title: "Starter Card", price: 100, commission: 50 },
            { title: "Silver Card", price: 200, commission: 100 },
            { title: "Gold Card", price: 300, commission: 150 },
            { title: "Platinum Card", price: 500, commission: 250 },
          ].map((card) => (
            <Card key={card.title} className="border-2 hover:border-primary transition-all">
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-xl font-bold">{card.title}</h3>
                <div className="text-2xl font-bold text-primary">₹{card.price}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Earn ₹{card.commission} per referral</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Unlimited earnings</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Instant activation</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="pt-6 space-y-6">
            <h2 className="text-3xl font-bold">Ready to Start Earning?</h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of users already earning through our referral system
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Quick Money. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
