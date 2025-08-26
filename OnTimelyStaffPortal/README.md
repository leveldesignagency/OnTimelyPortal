# OnTimely Staff Portal

A comprehensive management portal for OnTimely staff to manage users, companies, desktop app support, analytics, and system administration.

## 🚀 Features

### 📱 Desktop App Support
- **Installation Guides**: Step-by-step guides for Windows, macOS, and Linux
- **Troubleshooting**: Common issues and solutions database
- **Update Management**: Version tracking and release management
- **Feature Tutorials**: Comprehensive documentation and video guides

### 👥 User Management
- **Company User Onboarding**: Streamlined user creation and setup
- **Role Management**: Admin, user, and moderator role assignments
- **Access Controls**: Permission management and security settings
- **Team Setup**: Company team organization and management

### 📊 Analytics & Monitoring
- **App Usage Statistics**: User activity and engagement metrics
- **User Activity Tracking**: Real-time user behavior monitoring
- **Performance Metrics**: System health and performance indicators
- **Error Reporting**: Incident tracking and resolution management

### 🛠️ Admin Tools
- **Bulk User Creation**: CSV import/export for user management
- **Company Management**: Company account administration
- **System Health Monitoring**: Real-time system status and alerts
- **Support Ticket System**: Help desk and issue resolution tracking

## 🏗️ Architecture

```
/management
├── /dashboard          # Overview & metrics
├── /users             # User management
├── /companies         # Company management  
├── /desktop-app       # Desktop app support
├── /analytics         # Usage analytics
├── /support           # Help & support
└── /admin             # Admin tools
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite
- **Routing**: React Router DOM

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd OnTimelyStaffPortal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Dashboard
- View system overview and key metrics
- Monitor recent activity and system health
- Access quick actions for common tasks

### User Management
- Search and filter users by various criteria
- Manage user roles and permissions
- Bulk user operations (import/export)

### Company Management
- Manage company accounts and settings
- View company statistics and user counts
- Handle company onboarding and support

### Desktop App Support
- Provide installation guides for all platforms
- Troubleshoot common user issues
- Manage app updates and documentation

### Analytics
- Monitor user engagement and system performance
- Track feature usage and adoption rates
- Generate reports and export data

### Support System
- Manage support tickets and user requests
- Maintain knowledge base and help articles
- Track support metrics and response times

### Admin Tools
- Monitor system health and performance
- Manage security settings and access controls
- Handle system backups and recovery

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Tailwind CSS
The portal uses Tailwind CSS with custom color schemes and components. Custom styles are defined in `src/index.css`.

## 📱 Responsive Design

The portal is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🎨 Customization

### Colors
Primary colors can be customized in `tailwind.config.js`:

```javascript
colors: {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... more shades
  }
}
```

### Components
All components are built with Tailwind CSS classes and can be easily customized by modifying the CSS classes.

## 🔒 Security Features

- Role-based access control
- Secure authentication integration
- API key management
- Security audit logging
- Incident monitoring and alerting

## 📊 Data Management

- Real-time data updates
- Export functionality for reports
- Bulk import/export operations
- Data backup and recovery

## 🚀 Deployment

### Vercel
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Netlify
1. Build the project: `npm run build`
2. Upload the `dist` folder
3. Configure redirects for SPA routing

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software for OnTimely staff use only.

## 🆘 Support

For technical support or questions about the staff portal:
- Create an issue in the repository
- Contact the development team
- Check the internal documentation

## 🔄 Updates

The portal is regularly updated with:
- New features and improvements
- Security patches and updates
- Performance optimizations
- Bug fixes and stability improvements

---

**Built with ❤️ for the OnTimely team**
