import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Check } from "lucide-react";

// Popover + Command (searchable)
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
  category: string;
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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    { productId: "", qty: 1, price: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .neq("category", "__archived__");

    if (!error) setProducts(data || []);
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
      updated[index] = {
        ...updated[index],
        productId: value,
        price: product?.price || 0,
      };
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

      for (const item of saleItems) {
        if (!item.productId) throw new Error("Please select all products");
        if (item.qty <= 0) throw new Error("Quantity must be greater than 0");

        const product = products.find((p) => p.id === item.productId);
        if (!product || product.qty < item.qty)
          throw new Error(`Not enough stock for ${product?.name}`);
      }

      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (!existingCustomer) {
        await supabase.from("customers").insert({
          phone: phone.trim(),
          name: name.trim(),
        });
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

      if (saleError) throw saleError;

      for (const item of saleItems) {
        await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: item.productId,
          qty: item.qty,
          price: item.price,
        });

        const product = products.find((p) => p.id === item.productId);

        if (product) {
          await supabase
            .from("products")
            .update({ qty: product.qty - item.qty })
            .eq("id", item.productId);

          await supabase.from("stock_logs").insert({
            product_id: item.productId,
            type: "sale",
            change: -item.qty,
            note: `Sold in sale ${sale.id}`,
          });
        }
      }

      toast.success("Purchase recorded successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
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

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Customer Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone" />
              </div>

              <div>
                <Label>Customer Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg">Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMoreProducts}>
                  <Plus className="w-4 h-4 mr-2" /> Add More
                </Button>
              </div>

              {saleItems.map((item, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex gap-3">

                    {/* SEARCHABLE PRODUCT SELECT */}
                    <div className="flex-1">
                      <Label>Product</Label>

                      <Popover>
                        <PopoverTrigger className="w-full">
                          <div className="w-full p-3 rounded-md border text-left bg-white">
                            {products.find((p) => p.id === item.productId)?.name || "Select product"}
                          </div>
                        </PopoverTrigger>

                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search products..." className="h-10" />

                            <CommandList className="max-h-60 overflow-y-auto">
                              <CommandEmpty>No products found.</CommandEmpty>

                              {products
                                .filter(
                                  (product) =>
                                    Number(product.qty) > 0 &&
                                    product.category !== "__archived__"
                                )
                                .map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      updateSaleItem(index, "productId", product.id);
                                    }}
                                    className="flex justify-between"
                                  >
                                    <span>
                                      {product.name} - ₹{product.price} (Stock: {product.qty})
                                    </span>

                                    {item.productId === product.id && (
                                      <Check className="w-4 h-4 text-green-600" />
                                    )}
                                  </CommandItem>
                                ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Quantity */}
                    <div className="w-32">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateSaleItem(index, "qty", parseInt(e.target.value))}
                      />
                    </div>

                    {/* Remove */}
                    {saleItems.length > 1 && (
                      <Button type="button" variant="destructive" size="icon" className="mt-8"
                        onClick={() => removeProduct(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Extra Details */}
            <div>
              <Label>Extra Details</Label>
              <Textarea value={extraDetails} onChange={(e) => setExtraDetails(e.target.value)} />
            </div>

            {/* Total */}
            <div className="p-4 bg-gradient-primary rounded-lg text-white flex justify-between">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-3xl font-bold">₹{calculateTotal().toFixed(2)}</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-gradient-primary" disabled={loading}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Complete Purchase"}
              </Button>

              <Button variant="outline" onClick={() => navigate("/dashboard")}>
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
