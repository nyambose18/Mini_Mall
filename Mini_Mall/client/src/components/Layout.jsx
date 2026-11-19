import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { roleLabel, roleLanding } from '../utils/format.js';
import { Icon } from './Icons.jsx';

function navClass({ isActive }) {
  return isActive ? 'nav-link nav-link-active' : 'nav-link';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const accountHref = user ? roleLanding(user.role) : '/auth';

  async function handleLogout() {
    await logout();
    notify('You have signed out.', 'info');
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Mini Mall home">
            MINI MALL<span className="brand-mark">.</span>
          </Link>

          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            <NavLink to="/products" className={navClass}>
              Products
            </NavLink>
            {user?.role === 'buyer' ? (
              <>
                <NavLink to="/cart" className={navClass}>
                  Cart
                </NavLink>
                <NavLink to="/orders" className={navClass}>
                  Orders
                </NavLink>
              </>
            ) : null}
            {user?.role === 'seller' ? (
              <>
                <NavLink to="/seller/products" className={navClass}>
                  Listings
                </NavLink>
                <NavLink to="/seller/orders" className={navClass}>
                  Orders
                </NavLink>
              </>
            ) : null}
            {user?.role === 'admin' ? (
              <>
                <NavLink to="/admin/sellers" className={navClass}>
                  Sellers
                </NavLink>
                <NavLink to="/admin/catalogue" className={navClass}>
                  Catalogue
                </NavLink>
                <NavLink to="/admin/orders" className={navClass}>
                  Orders &amp; refunds
                </NavLink>
                <NavLink to="/admin/statistics" className={navClass}>
                  Statistics
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="account-area">
            {user ? (
              <div className="user-chip">
                <span className="user-name">{user.name}</span>
                <span className={`role-pill role-${user.role}`}>{roleLabel(user.role)}</span>
                <button type="button" className="text-button" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            ) : (
              <Link className="btn btn-small btn-primary" to="/auth">
                Sign in
              </Link>
            )}
          </div>
        </div>

        {user?.role === 'seller' || user?.role === 'admin' ? (
          <div className="role-nav-wrap">
            <nav className="role-nav" aria-label={`${roleLabel(user.role)} workspace`}>
              <span className="role-nav-label">{roleLabel(user.role)} workspace</span>
              {user.role === 'seller' ? (
                <>
                  <NavLink to="/seller/products" className={navClass}>
                    My listings
                  </NavLink>
                  <NavLink to="/seller/orders" className={navClass}>
                    Fulfilment queue
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/admin/catalogue" className={navClass}>
                    Catalogue review
                  </NavLink>
                  <NavLink to="/admin/sellers" className={navClass}>
                    Seller applications
                  </NavLink>
                  <NavLink to="/admin/orders" className={navClass}>
                    Orders &amp; refunds
                  </NavLink>
                  <NavLink to="/admin/statistics" className={navClass}>
                    Sales statistics
                  </NavLink>
                </>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <strong>Mini Mall</strong>
            <p>A teaching marketplace for IT networking, robotics and mechatronics parts in South Africa.</p>
            <a href="/images/photos/credits.html" target="_blank" rel="noreferrer">Photo credits</a>
          </div>
          <div>
            <strong>Delivery and payment</strong>
            <p>
              Delivery estimates use working days. EFT and eligible cash on delivery are simulated —
              no real money is transferred.
            </p>
          </div>
          <div>
            <strong>Demo access</strong>
            <p>
              Lerato is the seller, Thabo the buyer and Priya the administrator. Their details are
              fictional and used only for this demonstration.
            </p>
          </div>
        </div>
      </footer>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'mobile-tab mobile-tab-active' : 'mobile-tab')}
        >
          <Icon name="home" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/products"
          className={({ isActive }) => (isActive ? 'mobile-tab mobile-tab-active' : 'mobile-tab')}
        >
          <Icon name="grid" />
          <span>Products</span>
        </NavLink>
        <NavLink
          to="/cart"
          className={({ isActive }) => (isActive ? 'mobile-tab mobile-tab-active' : 'mobile-tab')}
        >
          <Icon name="bag" />
          <span>Cart</span>
        </NavLink>
        <NavLink
          to={accountHref}
          className={({ isActive }) => (isActive ? 'mobile-tab mobile-tab-active' : 'mobile-tab')}
        >
          <Icon name="user" />
          <span>Account</span>
        </NavLink>
      </nav>
    </div>
  );
}
