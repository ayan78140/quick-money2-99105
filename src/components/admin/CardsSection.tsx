import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface CardItem {
  id: string;
  title: string;
  price: number;
  description: string | null;
  is_active: boolean;
}

const CardsSection = () => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error loading cards:", error);
      toast.error("Failed to load cards");
      return;
    }

    setCards(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cardData = {
      title: formData.title,
      price: parseFloat(formData.price),
      description: formData.description,
      is_active: formData.is_active,
    };

    if (editingCard) {
      const { error } = await supabase
        .from("cards")
        .update(cardData)
        .eq("id", editingCard.id);

      if (error) {
        toast.error("Failed to update card");
        return;
      }

      toast.success("Card updated successfully");
    } else {
      const { error } = await supabase
        .from("cards")
        .insert([cardData]);

      if (error) {
        toast.error("Failed to create card");
        return;
      }

      toast.success("Card created successfully");
    }

    setIsDialogOpen(false);
    resetForm();
    loadCards();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      price: "",
      description: "",
      is_active: true,
    });
    setEditingCard(null);
  };

  const openEditDialog = (card: CardItem) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      price: card.price.toString(),
      description: card.description || "",
      is_active: card.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading cards...</div>;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-background to-secondary/20">
        <div>
          <CardTitle className="text-2xl">Card Management</CardTitle>
          <p className="text-sm text-muted-foreground">Create and manage purchase cards</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingCard ? "Edit Card" : "Create New Card"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Card Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter card title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter card description"
                  rows={4}
                />
              </div>
              <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">Card is Active (visible to users)</Label>
              </div>
              <Button type="submit" className="w-full" size="lg">
                {editingCard ? "Update Card" : "Create Card"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card) => (
                <TableRow key={card.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{card.title}</TableCell>
                  <TableCell className="text-primary font-semibold">₹{card.price.toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{card.description || "No description"}</TableCell>
                  <TableCell>
                    {card.is_active ? (
                      <Badge className="bg-green-600 hover:bg-green-700 font-medium">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-medium">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(card)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
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

export default CardsSection;
