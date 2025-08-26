import React, { useState, useEffect } from 'react';
import { Icon } from '../../Icon';
import './Dashboard.css';

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  description: string;
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: string;
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      title: 'Total Users',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: 'users',
      description: 'Active users this month'
    },
    {
      title: 'Companies',
      value: '156',
      change: '+3%',
      changeType: 'positive',
      icon: 'building',
      description: 'Active companies'
    },
    {
      title: 'Desktop App Installs',
      value: '1,892',
      change: '+8%',
      changeType: 'positive',
      icon: 'desktop',
      description: 'Total installations'
    },
    {
      title: 'Support Tickets',
      value: '23',
      change: '-15%',
      changeType: 'positive',
      icon: 'ticket',
      description: 'Open tickets'
    },
    {
      title: 'System Uptime',
      value: '99.9%',
      change: '0%',
      changeType: 'neutral',
      icon: 'server',
      description: 'Last 30 days'
    },
    {
      title: 'API Requests',
      value: '2.4M',
      change: '+18%',
      changeType: 'positive',
      icon: 'activity',
      description: 'This month'
    }
  ]);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'healthy',
    message: 'All systems operational',
    lastChecked: new Date().toLocaleString()
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'user_signup',
      message: 'New user registered: john.doe@company.com',
      timestamp: '2 minutes ago',
      priority: 'low'
    },
    {
      id: 2,
      type: 'company_created',
      message: 'New company created: TechCorp Solutions',
      timestamp: '15 minutes ago',
      priority: 'medium'
    },
    {
      id: 3,
      type: 'support_ticket',
      message: 'Support ticket #1234 opened by user',
      timestamp: '1 hour ago',
      priority: 'high'
    },
    {
      id: 4,
      type: 'system_update',
      message: 'System maintenance completed successfully',
      timestamp: '2 hours ago',
      priority: 'low'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Monitor your system's performance and user activity</p>
      </div>

      {/* System Status */}
      <div className="system-status-card">
        <div className="status-header">
          <h3>System Status</h3>
          <span className="last-updated">Last updated: {systemStatus.lastChecked}</span>
        </div>
        <div className="status-content">
          <div className="status-indicator">
            <div 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(systemStatus.status) }}
            ></div>
            <span className="status-text">{systemStatus.message}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <Icon name={metric.icon} />
              </div>
              <div className="metric-change">
                <span className={`change-value ${metric.changeType}`}>
                  {metric.change}
                </span>
              </div>
            </div>
            <div className="metric-content">
              <h3 className="metric-title">{metric.title}</h3>
              <div className="metric-value">{metric.value}</div>
              <p className="metric-description">{metric.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Recent Activity</h3>
          <button className="view-all-btn">View All</button>
        </div>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-priority">
                <div 
                  className="priority-dot" 
                  style={{ backgroundColor: getPriorityColor(activity.priority) }}
                ></div>
              </div>
              <div className="activity-content">
                <p className="activity-message">{activity.message}</p>
                <span className="activity-timestamp">{activity.timestamp}</span>
              </div>
              <div className="activity-actions">
                <button className="action-btn">View</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-card">
            <Icon name="user-plus" />
            <span>Add User</span>
          </button>
          <button className="action-card">
            <Icon name="building" />
            <span>Create Company</span>
          </button>
          <button className="action-card">
            <Icon name="ticket" />
            <span>View Tickets</span>
          </button>
          <button className="action-card">
            <Icon name="download" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
