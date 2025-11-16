import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface SaleItem {
  productId: string;
  qty: number;
  price: number;
}

const AddCustomer = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([{ productId: "", qty: 1, price: 0 }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  const addMoreProducts = () => {
    setSaleItems([...saleItems, { productId: "", qty: 1, price: 0 }]);
  };

  const removeProduct = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateSaleItem = (index: number, field: string, value: any) => {
    const updated = [...saleItems];
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      updated[index] = { ...updated[index], productId: value, price: product?.price || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setSaleItems(updated);
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!phone.trim()) throw new Error("Phone number is required");
      if (!name.trim()) throw new Error("Customer name is required");
      if (saleItems.length === 0) throw new Error("At least one product is required");

      for (const item of saleItems) {
        if (!item.productId) {
          throw new Error("Please select all products");
        }
        if (item.qty <= 0) {
          throw new Error("Quantity must be greater than 0");
        }
        const product = products.find((p) => p.id === item.productId);
        if (!product || product.qty < item.qty) {
          throw new Error(`Not enough stock for ${product?.name}`);
        }
      }

      const { data: existingCustomer, error: custError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim())
        .single();

      if (custError && custError.code !== 'PGRST116') {
        console.warn("Customer fetch warning:", custError);
      }

      if (!existingCustomer) {
        const { error: insertError } = await supabase
          .from("customers")
          .insert({ phone: phone.trim(), name: name.trim() });
        if (insertError) {
          console.warn("Customer insert warning:", insertError);
        }
      }

      const total = calculateTotal();
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_phone: phone.trim(),
          customer_name: name.trim(),
          extra_details: extraDetails,
          total,
        })
        .select()
        .single();

      if (saleError) throw new Error(`Sale insert failed: ${saleError.message}`);
      if (!sale) throw new Error("No sale data returned");

      for (const item of saleItems) {
        const { error: itemError } = await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.productId,
          qty: item.qty,
          price: item.price,
        });
        if (itemError) throw new Error(`Sale item insert failed: ${itemError.message}`);

        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ qty: product.qty - item.qty })
            .eq("id", item.productId);
          if (updateError) throw new Error(`Product update failed: ${updateError.message}`);
        }
      }

      for (const item of saleItems) {
        const { error: logError } = await supabase.from("stock_logs").insert({
          product_id: item.productId,
          type: "sale",
          change: -Math.abs(item.qty),
          note: `Sold in sale ${sale.id}`,
        });
        if (logError) console.warn("Stock log warning:", logError);
      }

      toast.success("Purchase recorded successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("AddCustomer error:", error);
      toast.error(error.message || "Failed to record purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Add Customer Purchase
          </h1>
          <p className="text-muted-foreground">Create a new purchase and customer</p>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-white/50 border-white/20 shadow-glass">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Customer Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">Products</Label>
                <Button type="button" onClick={addMoreProducts} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add More
                </Button>
              </div>

              {saleItems.map((item, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <Label>Product</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) => updateSaleItem(index, "productId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                           .filter((product) => Number(product.qty) > 0)   // HIDE ZERO STOCK
                           .map((product) => (

                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ₹{product.price} (Stock: {product.qty})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateSaleItem(index, "qty", parseInt(e.target.value))}
                      />
                    </div>
                    {saleItems.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="mt-8"
                        onClick={() => removeProduct(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Subtotal: ₹{(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="details">Extra Details</Label>
              <Textarea
                id="details"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <div className="p-4 bg-gradient-primary rounded-lg">
              <div className="flex justify-between items-center text-white">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-3xl font-bold">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-gradient-primary" disabled={loading}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Complete Purchase"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default AddCustomer;
