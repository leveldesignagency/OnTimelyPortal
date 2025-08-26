import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import './ManagementPortal.css';

const ManagementPortal: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      path: '/management/dashboard',
      label: 'Dashboard',
      icon: 'chart-bar',
      description: 'Overview & metrics'
    },
    {
      path: '/management/users',
      label: 'Users',
      icon: 'users',
      description: 'User management'
    },
    {
      path: '/management/companies',
      label: 'Companies',
      icon: 'building',
      description: 'Company management'
    },
    {
      path: '/management/desktop-app',
      label: 'Desktop App',
      icon: 'desktop',
      description: 'Desktop app support'
    },
    {
      path: '/management/analytics',
      label: 'Analytics',
      icon: 'chart-line',
      description: 'Usage analytics'
    },
    {
      path: '/management/support',
      label: 'Support',
      icon: 'life-ring',
      description: 'Help & support'
    },
    {
      path: '/management/admin',
      label: 'Admin',
      icon: 'cog',
      description: 'Admin tools'
    }
  ];

  useEffect(() => {
    // Redirect to dashboard if no specific route is selected
    if (location.pathname === '/management') {
      navigate('/management/dashboard');
    }
  }, [location.pathname, navigate]);

  return (
    <div className="management-portal">
      {/* Header */}
      <header className="management-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <Icon name="bars" />
          </button>
          <h1>Management Portal</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <Icon name="user-circle" />
            <span>Staff User</span>
          </div>
        </div>
      </header>

      <div className="management-content">
        {/* Sidebar */}
        <aside className={`management-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <div className="nav-icon">
                  <Icon name={item.icon} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-description">{item.description}</span>
                  </div>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="management-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ManagementPortal;
