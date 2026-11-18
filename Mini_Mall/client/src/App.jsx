import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout.jsx';
import RequireRole from './components/RequireRole.jsx';
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Auth from './pages/Auth.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import RefundCase from './pages/RefundCase.jsx';
import SellerProducts from './pages/SellerProducts.jsx';
import SellerProductEditor from './pages/SellerProductEditor.jsx';
import SellerOrders from './pages/SellerOrders.jsx';
import AdminCatalogue from './pages/AdminCatalogue.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import AdminStatistics from './pages/AdminStatistics.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="auth" element={<Auth />} />

              <Route
                path="cart"
                element={
                  <RequireRole role="buyer">
                    <Cart />
                  </RequireRole>
                }
              />
              <Route
                path="checkout"
                element={
                  <RequireRole role="buyer">
                    <Checkout />
                  </RequireRole>
                }
              />
              <Route
                path="orders"
                element={
                  <RequireRole role="buyer">
                    <Orders />
                  </RequireRole>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <RequireRole role="buyer">
                    <OrderDetail />
                  </RequireRole>
                }
              />
              <Route
                path="refunds/:id"
                element={
                  <RequireRole role="buyer">
                    <RefundCase />
                  </RequireRole>
                }
              />

              <Route
                path="seller/products"
                element={
                  <RequireRole role="seller">
                    <SellerProducts />
                  </RequireRole>
                }
              />
              <Route
                path="seller/products/new"
                element={
                  <RequireRole role="seller">
                    <SellerProductEditor />
                  </RequireRole>
                }
              />
              <Route
                path="seller/products/:id/edit"
                element={
                  <RequireRole role="seller">
                    <SellerProductEditor />
                  </RequireRole>
                }
              />
              <Route
                path="seller/orders"
                element={
                  <RequireRole role="seller">
                    <SellerOrders />
                  </RequireRole>
                }
              />

              <Route
                path="admin/catalogue"
                element={
                  <RequireRole role="admin">
                    <AdminCatalogue />
                  </RequireRole>
                }
              />
              <Route
                path="admin/orders"
                element={
                  <RequireRole role="admin">
                    <AdminOrders />
                  </RequireRole>
                }
              />
              <Route
                path="admin/statistics"
                element={
                  <RequireRole role="admin">
                    <AdminStatistics />
                  </RequireRole>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}