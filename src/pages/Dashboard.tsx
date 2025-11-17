import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Users, Package, DollarSign, AlertTriangle, UserPlus, PackagePlus } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    todaySales: 0,
    lowStock: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 1️⃣ CUSTOMER COUNT
      const { count: customerCount, error: custError } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      if (custError) throw custError;

      // 2️⃣ PRODUCTS
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("*");

      if (prodError) throw prodError;

      // -----------------------------------
      // 3️⃣ TODAY SALES (consistent function)
      // -----------------------------------
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.toISOString().split("T")[0] + "T00:00:00.000Z";

      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total")
        .gte("created_at", startOfDay);

      if (salesError) throw salesError;

      const todayTotal =
        salesData?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;

      // 4️⃣ LOW STOCK (qty <= 2)
      const lowStockCount = products?.filter((p) => Number(p.qty) <= 2).length || 0;

      setStats({
        totalCustomers: customerCount || 0,
        totalProducts: products?.length || 0,
        todaySales: todayTotal,
        lowStock: lowStockCount,
      });
    } catch (error: any) {
      console.error("Dashboard Error:", error.message);
      toast.error("Failed to load dashboard stats");
    }
  };

  const statCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      gradient: "bg-gradient-primary",
      onClick: () => navigate("/customers"),
    },
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      gradient: "bg-gradient-secondary",
      onClick: () => navigate("/products"),
    },
    {
      title: "Today's Sales",
      value: `₹${stats.todaySales.toFixed(2)}`,
      icon: DollarSign,
      gradient: "bg-gradient-accent",
      onClick: () => navigate("/today-sales"),
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangle,
      gradient: "bg-gradient-hero",
      onClick: () => navigate("/products"),
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome to FA Shopping</p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                onClick={stat.onClick}
                className="p-6 cursor-pointer backdrop-blur-xl bg-white/50 border-white/20 shadow-glass hover:shadow-glow transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.gradient}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="p-8 backdrop-blur-xl bg-gradient-primary cursor-pointer group"
            onClick={() => navigate("/add-customer")}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Add Customer</h3>
              </div>
              <div className="p-4 rounded-2xl bg-white/20 group-hover:bg-white/30">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>

          <Card
            className="p-8 backdrop-blur-xl bg-gradient-secondary cursor-pointer group"
            onClick={() => navigate("/add-product")}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Add Product</h3>
              </div>
              <div className="p-4 rounded-2xl bg-white/20 group-hover:bg-white/30">
                <PackagePlus className="w-8 h-8 text-white" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
