import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  qty: number;
  low_stock_threshold: number;
  description?: string | null;
  image_url?: string | null;
  created_at?: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string>("");

  // NEW STATES FOR EDITING QUANTITY
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .neq("category", "__archived__")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch products");
    }
  };

  const updateQuantity = async (id: string) => {
    if (newQty < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ qty: newQty })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update quantity");
    } else {
      toast.success("Quantity updated");
      setEditingId(null);
      fetchProducts();
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ category: "__archived__" })
        .eq("id", product.id);

      if (updateError) {
        toast.error(updateError.message);
        return;
      }

      setDeleteError("");
      toast.success("Product archived successfully");
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Failed to archive product");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-secondary bg-clip-text text-transparent">
              Product Stock
            </h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>

          <Button onClick={() => navigate("/add-product")} className="bg-gradient-secondary">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-white/50 border-white/20 shadow-glass">

          {/* SEARCH BAR */}
          <div className="mb-6 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-secondary hover:bg-gradient-secondary">
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">SKU</TableHead>
                  <TableHead className="text-white">Category</TableHead>
                  <TableHead className="text-white">Quantity</TableHead>
                  <TableHead className="text-white">Price</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>

                      {/* QUANTITY CELL WITH EDIT */}
                      <TableCell>
                        {editingId === product.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={newQty}
                              onChange={(e) => setNewQty(Number(e.target.value))}
                              className="w-24"
                            />
                            <Button size="sm" onClick={() => updateQuantity(product.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{product.qty}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(product.id);
                                setNewQty(product.qty);
                              }}
                            >
                              Edit
                            </Button>

                            {product.qty <= product.low_stock_threshold && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-bold">₹{Number(product.price).toFixed(2)}</TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">

                          {/* DELETE BUTTON */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteError("")}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {deleteError ? "Cannot Delete" : "Are you sure?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {deleteError || "This action cannot be undone."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteError("")}>
                                  {deleteError ? "OK" : "Cancel"}
                                </AlertDialogCancel>

                                {!deleteError && (
                                  <AlertDialogAction onClick={() => handleDelete(product)}>
                                    Delete
                                  </AlertDialogAction>
                                )}
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Products;
