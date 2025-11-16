import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, DollarSign } from "lucide-react";

interface Customer {
  id: string;
  phone: string;
  name: string;
}

interface Sale {
  id: string;
  total: number;
  created_at: string;
  extra_details: string;
  sale_items: {
    qty: number;
    price: number;
    products: {
      name: string;
    };
  }[];
}

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: customerData, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (custErr) throw custErr;

      const { data: salesData, error: salesErr } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            qty,
            price,
            products (name)
          )
        `)
        .eq("customer_phone", customerData?.phone)
        .order("created_at", { ascending: false });

      if (salesErr) throw salesErr;

      setCustomer(customerData);
      setSales(salesData || []);
      const total = salesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      setTotalSpent(total);
    } catch (err: any) {
      console.error("Failed to fetch customer details:", err);
      setFetchError(err?.message || "Failed to fetch customer details");
      setCustomer(null);
      setSales([]);
      setTotalSpent(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="py-8">Loading customer details...</div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div className="py-8">
          <p className="text-center text-muted-foreground">{fetchError || "Customer not found or access denied."}</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate("/customers")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 backdrop-blur-xl bg-gradient-primary border-0 shadow-glow text-white">
            <User className="w-8 h-8 mb-3" />
            <p className="text-sm opacity-80 mb-1">Name</p>
            <p className="text-2xl font-bold">{customer.name}</p>
          </Card>

          <Card className="p-6 backdrop-blur-xl bg-gradient-secondary border-0 shadow-glow text-white">
            <Phone className="w-8 h-8 mb-3" />
            <p className="text-sm opacity-80 mb-1">Phone</p>
            <p className="text-2xl font-bold">{customer.phone}</p>
          </Card>

          <Card className="p-6 backdrop-blur-xl bg-gradient-accent border-0 shadow-glow text-white">
            <DollarSign className="w-8 h-8 mb-3" />
            <p className="text-sm opacity-80 mb-1">Total Spent</p>
            <p className="text-2xl font-bold">₹{totalSpent.toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6 backdrop-blur-xl bg-white/50 border-white/20 shadow-glass">
          <h2 className="text-2xl font-bold mb-4">Purchase History</h2>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-primary hover:bg-gradient-primary">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Products</TableHead>
                  <TableHead className="text-white">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No purchases yet
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {sale.sale_items.map((item, i) => (
                          <div key={i}>
                            {(item.products && item.products.name) ? item.products.name : "(product removed)"} x{item.qty}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="font-bold">₹{Number(sale.total).toFixed(2)}</TableCell>
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

export default CustomerDetail;
