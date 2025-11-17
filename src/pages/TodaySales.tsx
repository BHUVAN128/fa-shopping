import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Sale {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  created_at: string;
  sale_items: {
    qty: number;
    products: { name: string };
  }[];
}

const TodaySales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchTodaySales();
  }, []);

  const fetchTodaySales = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.toISOString().split("T")[0] + "T00:00:00.000Z";

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            qty,
            products (name)
          )
        `)
        .gte("created_at", startOfDay)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSales(data || []);
      const total =
        data?.reduce((sum: number, s) => sum + Number(s.total), 0) || 0;

      setTotalRevenue(total);
    } catch (e: any) {
      toast.error("Failed to load today's sales");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-accent bg-clip-text text-transparent">
              Today's Sales
            </h1>
            <p className="text-muted-foreground">View all sales made today</p>
          </div>

          <Card className="p-4 bg-gradient-accent">
            <div className="text-white">
              <p className="text-sm opacity-80">Total Revenue</p>
              <p className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</p>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-white/70 backdrop-blur-xl shadow-glass">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-accent">
                  <TableHead className="text-white">Time</TableHead>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Items</TableHead>
                  <TableHead className="text-white">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No sales today
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell>{sale.customer_phone}</TableCell>
                      <TableCell>
                        {sale.sale_items?.map((item, i) => (
                          <div key={i}>
                            {item.products.name} x{item.qty}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="font-bold">₹{sale.total.toFixed(2)}</TableCell>
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

export default TodaySales;
