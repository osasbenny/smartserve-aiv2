# SmartServe AI - AI-Powered Chat Agent Platform

A comprehensive web platform that enables businesses and institutions (hospitals, schools, SMEs) to create, manage, and deploy custom AI chatbots without coding. Features intelligent conversation handling, appointment scheduling, automated reminders, and detailed analytics.

## 🚀 Features

### Core Capabilities
- **AI Chat Agents**: Create intelligent chatbots powered by OpenAI that understand context and provide helpful responses
- **FAQ Management**: Upload and organize frequently asked questions for agent training
- **Appointment Scheduling**: Seamless calendar integration for booking and managing appointments
- **Automated Reminders**: Email and WhatsApp notifications for appointments and follow-ups
- **Client Management**: Centralized dashboard for managing customer interactions and history
- **Analytics Dashboard**: Track chat metrics, booking statistics, and customer satisfaction scores

### Business Features
- **Multi-tenant Architecture**: Support for multiple businesses and organizations
- **Subscription Plans**: Flexible pricing tiers (Free, Starter, Pro, Enterprise)
- **Stripe Integration**: Secure payment processing with webhook support
- **Business Hours Configuration**: Set availability windows for your agents
- **Integration Support**: WhatsApp and email integration for notifications

### Technical Features
- **Real-time Chat**: WebSocket-enabled messaging with streaming responses
- **OAuth Authentication**: Secure user authentication via Manus OAuth
- **Type-Safe APIs**: tRPC for end-to-end type safety
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Professional Components**: Pre-built UI components with shadcn/ui

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS 4, shadcn/ui
- **Backend**: Node.js, Express, tRPC 11
- **Database**: MySQL with Drizzle ORM
- **AI**: OpenAI API for chat intelligence
- **Payments**: Stripe for subscription management
- **Authentication**: Manus OAuth
- **Notifications**: Email and WhatsApp integration

### Database Schema
The platform includes 11 core tables:
- `users` - User accounts and authentication
- `businesses` - Organization/business profiles
- `agents` - AI chatbot configurations
- `clients` - Customer contact information
- `chatMessages` - Conversation history
- `appointments` - Scheduled meetings
- `notifications` - Reminder and notification logs
- `analytics` - Performance metrics
- `subscriptions` - Subscription management
- `invoices` - Billing records
- `activityLogs` - Audit trail

## 📋 Project Structure

```
smartserve-ai/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities and helpers
│   │   ├── App.tsx           # Main app router
│   │   └── index.css         # Global styles
│   └── public/               # Static assets
├── server/                    # Node.js backend
│   ├── routers.ts            # tRPC procedure definitions
│   ├── db.ts                 # Database query helpers
│   ├── stripe/               # Stripe integration
│   │   ├── products.ts       # Product definitions
│   │   ├── procedures.ts     # Stripe tRPC procedures
│   │   └── webhook.ts        # Webhook handlers
│   └── _core/                # Core framework files
├── drizzle/                  # Database schema and migrations
│   └── schema.ts             # Table definitions
├── shared/                   # Shared types and constants
└── storage/                  # S3 file storage helpers
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- MySQL database
- OpenAI API key
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/osasbenny/smartserve-aiv2.git
cd smartserve-aiv2
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
Create a `.env.local` file with:
```
DATABASE_URL=mysql://user:password@localhost:3306/smartserve_ai
VITE_APP_TITLE=SmartServe AI
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. **Run database migrations**
```bash
pnpm db:push
```

5. **Start the development server**
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 📖 API Documentation

### Key tRPC Procedures

#### Business Management
- `business.create` - Create a new business
- `business.getMyBusinesses` - List user's businesses
- `business.update` - Update business details

#### Agent Management
- `agent.create` - Create a new AI agent
- `agent.getByBusinessId` - List agents for a business
- `agent.getById` - Get agent details
- `agent.update` - Update agent configuration
- `agent.delete` - Delete an agent
- `agent.uploadFAQ` - Upload FAQ data

#### Chat System
- `chatData.sendMessage` - Send a message to an agent
- `chatData.getHistory` - Retrieve chat history
- `chatData.getByClientId` - Get all chats for a client

#### Appointments
- `appointment.create` - Book an appointment
- `appointment.getByAgentId` - List appointments
- `appointment.update` - Update appointment
- `appointment.cancel` - Cancel appointment

#### Analytics
- `analyticsData.getByAgentAndDate` - Get metrics for a date range
- `analyticsData.getClientSatisfaction` - Get satisfaction scores

#### Payments
- `stripe.createCheckoutSession` - Create Stripe checkout
- `stripe.getSubscriptionStatus` - Check subscription status
- `stripe.getInvoices` - Retrieve billing history

## 🎨 UI Components

The platform includes pre-built components:
- **DashboardLayout** - Sidebar navigation for admin panels
- **AIChatBox** - Full-featured chat interface
- **Card Components** - Reusable card layouts
- **Forms** - Input, textarea, and form components
- **Dialogs** - Modal dialogs for confirmations
- **Buttons** - Styled button variants

## 💳 Payment Integration

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the dashboard
3. Add keys to environment variables
4. Test with card: `4242 4242 4242 4242`

### Webhook Configuration
The platform includes webhook handlers at `/api/stripe/webhook` for:
- Checkout session completion
- Subscription creation/updates
- Invoice payment events
- Payment intent status changes

## 📊 Analytics

The analytics dashboard provides:
- **Chat Metrics**: Total chats, messages, average conversation length
- **Booking Metrics**: Appointments created, completed, cancelled
- **Client Metrics**: New clients, satisfaction scores
- **Date Range Filtering**: View metrics for specific periods
- **Export Options**: Download reports as CSV or PDF

## 🔐 Security

- **OAuth Authentication**: Secure user login via Manus
- **Type-Safe APIs**: tRPC prevents type mismatches
- **Database Encryption**: Sensitive data encrypted at rest
- **Webhook Verification**: Stripe webhooks verified with signatures
- **Environment Variables**: Secrets stored securely

## 📱 Responsive Design

The platform is fully responsive with:
- Mobile-first design approach
- Tailwind CSS breakpoints
- Touch-friendly interfaces
- Optimized performance

## 🧪 Testing

### Manual Testing
1. Create a business account
2. Create an AI agent
3. Test chat functionality
4. Create appointments
5. View analytics

### Payment Testing
Use Stripe test card: `4242 4242 4242 4242`
- Any future expiration date
- Any 3-digit CVC

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `VITE_APP_TITLE` | App title | Yes |
| `VITE_APP_ID` | Manus OAuth app ID | Yes |
| `OAUTH_SERVER_URL` | OAuth server URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Yes |

## 🚀 Deployment

### Build for Production
```bash
pnpm build
```

### Environment Setup
Set all required environment variables in your hosting platform.

### Database Migration
```bash
pnpm db:push
```

### Start Production Server
```bash
pnpm start
```

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Drizzle ORM Guide](https://orm.drizzle.team)
- [tRPC Documentation](https://trpc.io)
- [React Documentation](https://react.dev)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For support, please:
1. Check the documentation
2. Review existing issues on GitHub
3. Create a new issue with detailed information
4. Contact the development team

## 🎯 Roadmap

### Upcoming Features
- [ ] Advanced AI training with custom data
- [ ] Multi-language support
- [ ] CRM system integration
- [ ] Advanced reporting and forecasting
- [ ] Team collaboration features
- [ ] Custom branding for agents
- [ ] API rate limiting and quotas
- [ ] Webhook management UI

### Performance Improvements
- [ ] Response caching
- [ ] Database query optimization
- [ ] CDN integration for static assets
- [ ] Real-time updates with WebSockets

## 👥 Team

Built with ❤️ by the SmartServe AI team.

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Status**: Production Ready
