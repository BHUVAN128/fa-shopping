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

  // data + ui
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // pagination / infinite scroll
  const limit = 50;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // edit qty
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState<number>(0);

  // delete handling
  const [deleteError, setDeleteError] = useState<string>("");

  // Reset list when filters/search change
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
  }, [searchTerm, selectedCategory]);

  // Load categories once
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Fetch categories, then dedupe client-side to ensure all are included
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .neq("category", "__archived__");

      if (error) throw error;

      const uniq = Array.from(
        new Set((data || []).map((r: any) => (r.category || "Uncategorized") as string))
      );
      uniq.sort();
      setCategories(["All", ...uniq]);
    } catch (err: any) {
      console.error("Failed to load categories", err);
      toast.error("Failed to load categories");
    }
  };

  // Fetch products page (server-side range)
  const fetchProducts = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const offset = (page - 1) * limit;
      let query = supabase
        .from("products")
        .select("*")
        .neq("category", "__archived__")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // apply category filter server-side if not "All"
      if (selectedCategory && selectedCategory !== "All") {
        query = query.eq("category", selectedCategory);
      }

      // apply search server-side if present (search in name or sku)
      if (searchTerm && searchTerm.trim().length > 0) {
        const term = `%${searchTerm.trim()}%`;
        // Use ilike for case-insensitive partial match
        query = query.or(`name.ilike.${term},sku.ilike.${term},category.ilike.${term}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch products error:", error);
        toast.error("Failed to load products");
        setLoading(false);
        return;
      }

      const fetched = data as Product[];

      // If fewer than limit returned, there is no more
      if (!fetched || fetched.length < limit) {
        setHasMore(false);
      }

      // Append results (avoid duplicates)
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of fetched || []) {
          if (!ids.has(p.id)) merged.push(p);
        }
        return merged;
      });
    } catch (err: any) {
      console.error("Fetch products failed:", err);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // fetch when page changes
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategory, searchTerm]);

  // infinite scroll observer
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore]
  );

  // search handler (debounce lightly)
  useEffect(() => {
    const id = setTimeout(() => {
      // resetting page and list is handled by dependency effect
      setPage(1);
      setProducts([]);
      setHasMore(true);
    }, 300);
    return () => clearTimeout(id);
  }, [searchTerm, selectedCategory]);

  // update qty
  const updateQuantity = async (id: string) => {
    if (newQty < 0) {
      toast.error("Quantity cannot be negative");
      return;
    }
    try {
      const { error } = await supabase.from("products").update({ qty: newQty }).eq("id", id);
      if (error) {
        console.error("Update qty error:", error);
        toast.error("Failed to update quantity");
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, qty: newQty } : p)));
      toast.success("Quantity updated");
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update quantity");
    }
  };

  // archive/delete product
  const handleDelete = async (product: Product) => {
    try {
      const { error } = await supabase.from("products").update({ category: "__archived__" }).eq("id", product.id);
      if (error) {
        console.error("Archive error:", error);
        toast.error("Failed to archive product");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product archived");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to archive product");
    }
  };

  // filtered list for UI (search/category server-side used, but keep a final client-side filter just in case)
  const visibleProducts = products.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (searchTerm.trim() !== "") {
      const s = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s);
    }
    return true;
  });

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
          {/* Search + Category filters */}
          <div className="mb-6 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, SKU or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-3 text-muted-foreground hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* category filter list (horizontal scroll if many) */}
            <div className="flex gap-2 overflow-x-auto max-w-md">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setProducts([]);
                    setPage(1);
                    setHasMore(true);
                  }}
                  className={`px-3 py-1 rounded-full border ${
                    selectedCategory === cat ? "bg-foreground text-white" : "bg-white/60"
                  }`}
                >
                  {cat}
                </button>
              ))}
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
                {visibleProducts.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleProducts.map((product, index) => {
                    const isLast = index === visibleProducts.length - 1;
                    // attach observer ref to last visible row
                    return (
                      <TableRow key={product.id} ref={isLast ? (el => lastElementRef(el as HTMLTableRowElement)) : null}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category}</TableCell>

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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" onClick={() => setDeleteError("")}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{deleteError ? "Cannot Delete" : "Are you sure?"}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {deleteError || "This action archives the product (keeps history)."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteError("")}>{deleteError ? "OK" : "Cancel"}</AlertDialogCancel>

                                {!deleteError && (
                                  <AlertDialogAction onClick={() => handleDelete(product)}>
                                    Delete
                                  </AlertDialogAction>
                                )}
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
