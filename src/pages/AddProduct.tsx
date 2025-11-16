import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";

const AddProduct = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) throw new Error("Product name is required");
      if (!sku.trim()) throw new Error("SKU is required");
      if (!category.trim()) throw new Error("Category is required");

      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0)
        throw new Error("Valid price is required");

      const qtyNum = parseInt(qty);
      if (isNaN(qtyNum) || qtyNum < 0)
        throw new Error("Valid quantity is required");

      const thresholdNum = parseInt(lowStockThreshold);
      if (isNaN(thresholdNum) || thresholdNum < 0)
        throw new Error("Valid threshold is required");

      // Insert into products table (FIXED)
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          sku: sku.trim(),
          category: category.trim(),
          price: priceNum,
          qty: qtyNum,
          low_stock_threshold: thresholdNum,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Insert into stock_logs table (for initial stock)
      if (qtyNum > 0) {
        const { error: logError } = await supabase.from("stock_logs").insert({
          product_id: data.id,
          type: "add",
          change: qtyNum,
          note: "Initial stock",
        });

        if (logError) console.warn("Stock log warning:", logError);
      }

      toast.success("Product added successfully!");
      navigate("/products");
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-secondary bg-clip-text text-transparent">
            Add Product
          </h1>
          <p className="text-muted-foreground">
            Add a new product to your inventory
          </p>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-white/50 border-white/20 shadow-glass">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU / Product Code</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter SKU"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter category"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Product Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="qty">Initial Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="3"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Alert when quantity falls below this number
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 bg-gradient-secondary"
                disabled={loading}
              >
                <PackagePlus className="w-4 h-4 mr-2" />
                {loading ? "Adding..." : "Add Product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/products")}
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

export default AddProduct;
