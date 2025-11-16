import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddCustomer from "./pages/AddCustomer";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import AddProduct from "./pages/AddProduct";
import Products from "./pages/Products";
import TodaySales from "./pages/TodaySales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-customer" element={<AddCustomer />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customer/:id" element={<CustomerDetail />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/products" element={<Products />} />
          <Route path="/today-sales" element={<TodaySales />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
