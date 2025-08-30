# OnTimely Staff Portal

A comprehensive management portal for OnTimely staff to manage companies, users, support tickets, and monitor system health.

## Features

- **Company Management**: Create, view, and manage company accounts
- **User Management**: Add users to companies, manage roles and permissions
- **Support System**: Track and manage support tickets
- **Analytics Dashboard**: Real-time metrics and system health monitoring
- **Desktop App Support**: Manage app versions and provide support resources
- **Admin Tools**: Bulk operations and system administration

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Routing**: React Router DOM

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### 2. Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to **Settings > API**
3. Copy your **Project URL** and **anon/public key**
4. Go to **SQL Editor** and run the contents of `database-schema.sql`

### 3. Environment Configuration

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

The portal will open at `http://localhost:3001`

## Database Schema

The portal uses the following main tables:

- **companies**: Company information, plans, and status
- **users**: User accounts with roles and company associations
- **support_tickets**: Support requests and tracking
- **system_metrics**: System health and performance data
- **desktop_app_versions**: App version management
- **knowledge_articles**: Support documentation
- **user_activity_logs**: User activity tracking

## API Services

The portal includes comprehensive database services:

- **Company Service**: CRUD operations for companies
- **User Service**: User management with bulk operations
- **Support Service**: Ticket management and statistics
- **Analytics Service**: System metrics and activity tracking

## Usage

### Creating a Company

1. Navigate to **Companies** page
2. Click **Add Company**
3. Fill in company details (name, domain, plan, admin email)
4. Click **Create Company**

### Adding Users

1. Navigate to **Users** page
2. Click **Add User**
3. Select company, enter user details
4. Assign role and status
5. Click **Create User**

### Managing Support Tickets

1. Navigate to **Support** page
2. View all tickets with filtering options
3. Update ticket status and priority
4. Assign tickets to staff members

### Monitoring System Health

1. Check **Dashboard** for overview metrics
2. View **Analytics** for detailed performance data
3. Monitor system metrics in real-time

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Companies.tsx   # Company management
│   ├── Users.tsx       # User management
│   ├── Support.tsx     # Support system
│   ├── Analytics.tsx   # Analytics and monitoring
│   ├── Admin.tsx       # Admin tools
│   └── DesktopApp.tsx  # Desktop app support
├── lib/                # Utilities and services
│   ├── supabase.ts     # Supabase client
│   └── database.ts     # Database service functions
└── App.tsx             # Main app component
```

### Adding New Features

1. Create new database tables in Supabase
2. Add types to `supabase.ts`
3. Create service functions in `database.ts`
4. Build UI components in the appropriate page
5. Update navigation if needed

### Database Operations

All database operations go through the service layer in `database.ts`:

```typescript
// Example: Creating a company
import { db } from '@/lib/database'

const newCompany = await db.companies.createCompany({
  name: 'New Company',
  domain: 'newcompany.com',
  plan: 'Professional',
  admin_email: 'admin@newcompany.com'
})
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

### Environment Variables for Production

Ensure these are set in your production environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security

- Row Level Security (RLS) is enabled on all tables
- API keys are restricted to necessary operations
- User authentication and authorization handled by Supabase
- Input validation on all forms

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify environment variables are correct
   - Check Supabase project status
   - Ensure database schema is created

2. **Build Errors**
   - Clear `node_modules` and reinstall
   - Check TypeScript compilation
   - Verify all dependencies are installed

3. **Database Errors**
   - Check Supabase logs
   - Verify table permissions
   - Ensure RLS policies are correct

### Getting Help

- Check Supabase documentation
- Review browser console for errors
- Check network tab for API failures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary to OnTimely.

## Support

For technical support or questions about the portal, contact the development team.
# Trigger redeploy
