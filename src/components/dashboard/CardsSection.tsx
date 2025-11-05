import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import ManualPaymentDialog from "./ManualPaymentDialog";

interface CardItem {
  id: string;
  title: string;
  price: number;
  description: string;
}

interface CardsSectionProps {
  userId: string;
}

const CardsSection = ({ userId }: CardsSectionProps) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("is_active", true)
        .order("price");

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      toast.error("Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (card: CardItem) => {
    setSelectedCard(card);
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = () => {
    loadCards();
  };

  if (loading) {
    return <div className="text-center py-8">Loading cards...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Choose Your Card
          </CardTitle>
          <CardDescription>
            Purchase a card to get your unique referral link and start earning 50% commission
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.id}
            className="relative overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-lg"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-bl-full" />
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {card.title}
                <Badge variant="secondary" className="bg-accent text-accent-foreground">
                  ₹{card.price}
                </Badge>
              </CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>✓ Get unique referral link</p>
                  <p>✓ Earn ₹{card.price / 2} per referral</p>
                  <p>✓ Unlimited earnings</p>
                </div>
                <Button
                  onClick={() => handlePurchase(card)}
                  className="w-full"
                >
                  Purchase Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCard && (
        <ManualPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          cardId={selectedCard.id}
          cardTitle={selectedCard.title}
          cardPrice={selectedCard.price}
          userId={userId}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
};

export default CardsSection;
