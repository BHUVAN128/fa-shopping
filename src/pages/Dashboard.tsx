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
      /** 🟦 TOTAL CUSTOMERS */
      const { data: customers, error: custError } = await supabase
        .from("customers")
        .select("*");

      if (custError) throw custError;

      /** 🟦 TOTAL PRODUCTS */
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("*")
        .neq("is_deleted", true);

      if (prodError) throw prodError;

      /** 🟦 CORRECT TODAY SALES (IST FIXED) */
      const now = new Date();

      // Local midnight
      const localStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0
      );

      // Convert to UTC ISO format
      const todayStartUTC = new Date(
        localStart.getTime() - localStart.getTimezoneOffset() * 60000
      ).toISOString();

      const { data: todaySalesData, error: salesError } = await supabase
        .from("sales")
        .select("total")
        .gte("created_at", todayStartUTC);

      if (salesError) throw salesError;

      const todayTotal =
        todaySalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

      /** 🟦 LOW STOCK COUNT */
      const lowStockCount =
        products?.filter((p) => p.qty <= p.low_stock_threshold).length || 0;

      /** 🟦 SET STATS */
      setStats({
        totalCustomers: customers?.length || 0,
        totalProducts: products?.length || 0,
        todaySales: todayTotal,
        lowStock: lowStockCount,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard stats");
    }
  };

  /** DASHBOARD CARDS */
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
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome to FA Shopping</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                onClick={stat.onClick}
                className="p-6 cursor-pointer bg-white/50 backdrop-blur-xl shadow-glass hover:shadow-glow hover:-translate-y-1 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.gradient}`}>
                    <Icon className="text-white w-6 h-6" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="p-8 bg-gradient-primary text-white cursor-pointer hover:-translate-y-1 transition-all"
            onClick={() => navigate("/add-customer")}
          >
            <h3 className="text-2xl font-bold">Add Customer</h3>
            <p>Create new purchase</p>
          </Card>

          <Card
            className="p-8 bg-gradient-secondary text-white cursor-pointer hover:-translate-y-1 transition-all"
            onClick={() => navigate("/add-product")}
          >
            <h3 className="text-2xl font-bold">Add Product</h3>
            <p>Add new inventory</p>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
