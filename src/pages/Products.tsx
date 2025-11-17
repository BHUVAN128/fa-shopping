import { useEffect, useState, useRef, useCallback } from "react";
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

  // PRODUCT DATA
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // CATEGORY FILTER
  const [categoryFilter, setCategoryFilter] = useState("all");

  // PAGINATION (INFINITE SCROLL)
  const limit = 50;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  // EDIT QUANTITY
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<number>(0);

  // DELETE ERROR
  const [deleteError, setDeleteError] = useState("");

  // -------------------------------------------------------
  // FETCH PRODUCTS (FILTER + SEARCH + PAGINATION)
  // -------------------------------------------------------
  const fetchProducts = async (reset = false) => {
    if (loading) return;

    setLoading(true);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("products")
      .select("*")
      .neq("category", "__archived__");

    // Apply category filter
    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }

    // Fetch data
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      toast.error("Failed to load products");
      setLoading(false);
      return;
    }

    if (data.length < limit) setHasMore(false);

    setProducts((prev) => (reset ? data : [...prev, ...data]));
    setLoading(false);
  };

  // RESET LIST WHEN CATEGORY CHANGES
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(true);
  }, [categoryFilter]);

  // RESET LIST WHEN SEARCH CHANGES
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(true);
  }, [searchTerm]);

  // Fetch when page changes
  useEffect(() => {
    fetchProducts();
  }, [page]);

  // -------------------------------------------------------
  // INFINITE SCROLL OBSERVER
  // -------------------------------------------------------
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore]
  );

  // -------------------------------------------------------
  // SEARCH FILTER
  // -------------------------------------------------------
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // -------------------------------------------------------
  // UPDATE QUANTITY
  // -------------------------------------------------------
  const updateQuantity = async (id: string) => {
    if (newQty < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ qty: newQty })
      .eq("id", id);

    if (error) toast.error("Failed to update quantity");
    else {
      toast.success("Quantity updated");
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p))
      );
      setEditingId(null);
    }
  };

  // -------------------------------------------------------
  // ARCHIVE PRODUCT
  // -------------------------------------------------------
  const handleDelete = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ category: "__archived__" })
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to archive product");
      return;
    }

    toast.success("Product archived");
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  };

  // -------------------------------------------------------
  // UI START
  // -------------------------------------------------------
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

          <Button
            onClick={() => navigate("/add-product")}
            className="bg-gradient-secondary"
          >
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
                  className="absolute right-3 top-3 text-muted-foreground hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CATEGORY FILTER BUTTONS */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {["all", "Mobiles", "Accessories", "Laptops", "Speakers"].map(
              (cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  onClick={() => setCategoryFilter(cat)}
                  className="capitalize"
                >
                  {cat === "all" ? "All Categories" : cat}
                </Button>
              )
            )}
          </div>

          {/* PRODUCT TABLE */}
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
                {filtered.map((product, index) => {
                  const isLast = filtered.length === index + 1;

                  return (
                    <TableRow
                      key={product.id}
                      ref={isLast ? lastElementRef : null}
                    >
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category}</TableCell>

                      {/* QUANTITY EDIT */}
                      <TableCell>
                        {editingId === product.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={newQty}
                              onChange={(e) =>
                                setNewQty(Number(e.target.value))
                              }
                              className="w-24"
                            />
                            <Button
                              size="sm"
                              onClick={() => updateQuantity(product.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                            >
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

                      <TableCell className="font-bold">
                        ₹{Number(product.price).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right">
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
                                {deleteError
                                  ? "Cannot Delete"
                                  : "Are you sure?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {deleteError ||
                                  "This action cannot be undone."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel
                                onClick={() => setDeleteError("")}
                              >
                                {deleteError ? "OK" : "Cancel"}
                              </AlertDialogCancel>

                              {!deleteError && (
                                <AlertDialogAction
                                  onClick={() => handleDelete(product)}
                                >
                                  Delete
                                </AlertDialogAction>
                              )}
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <p className="text-center py-4 text-muted-foreground">Loading...</p>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Products;
