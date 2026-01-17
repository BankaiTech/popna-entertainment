# Popna Entertainment - ISP Management Platform

A complete Internet Service Provider (ISP) Management Platform built with React 18+, TypeScript, and Vite. This system manages multiple ISP providers (GTPL, BSNL, Railwire, Krishiinet) with a public-facing website and a comprehensive admin dashboard.

## Features

### Public Front Website
- **Home Page**: Overview of all ISP providers
- **Provider Pages**: Dynamic price cards for each provider (GTPL, BSNL, Railwire, Krishiinet)
- **Price Cards**: Display plan details including:
  - Plan name and image
  - Base price and GST calculation
  - Final price (auto-calculated)
  - Installation amount
  - Description
  - Request Connection button

### Admin Dashboard
- **Dashboard Overview**:
  - Analytics cards showing total customers, customers per provider
  - New customers this month
  - Active/Inactive customer counts
  - Provider-wise breakdown (active & inactive)
  - Last 5 customers table

- **Manage Front Website**:
  - Create, edit, and delete price cards
  - Full CRUD operations for plans
  - Real-time updates to public website

- **Customer Management**:
  - Data grid layout (React-style, not HTML table)
  - Search functionality (name/mobile)
  - Status filter (Active/Inactive)
  - Connection type filter (All/GTPL/BSNL/Railwire/Krishiinet)
  - Add/Edit customer sheet modal with tabs:
    - **Information Tab**: Name, Email, Mobile, Connection Type, Package, Status
    - **Address Tab**: Address Line 1 & 2, City, State, Country

## Tech Stack

- **React 18+** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **JSON Server** - Mock API server
- **Tailwind CSS** - Styling (Metronic v9.3.5 classes)
- **Lucide React** - Icons

## Project Structure

```
popna-react/
├── src/
│   ├── api/              # API service layer
│   │   └── api.ts
│   ├── components/       # Reusable components
│   │   ├── ui/           # UI components (Button, Card, Input, Select)
│   │   └── CustomerSheet.tsx
│   ├── layouts/          # Layout components
│   │   ├── PublicLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── models/           # TypeScript interfaces
│   │   └── types.ts
│   ├── pages/            # Page components
│   │   ├── public/      # Public pages
│   │   │   ├── HomePage.tsx
│   │   │   └── ProviderPage.tsx
│   │   └── admin/        # Admin pages
│   │       ├── Dashboard.tsx
│   │       ├── ManagePlans.tsx
│   │       └── Customers.tsx
│   ├── store/            # Zustand store
│   │   └── useStore.ts
│   ├── styles/           # Global styles
│   │   └── index.css
│   ├── lib/              # Utility functions
│   │   └── utils.ts
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── db.json               # JSON Server database
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn

### Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start JSON Server** (in a separate terminal)
   ```bash
   npm run api
   ```
   This will start the mock API server on `http://localhost:3001`

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   This will start the Vite dev server on `http://localhost:3000`

4. **Access the Application**
   - Public Website: `http://localhost:3000`
   - Admin Dashboard: `http://localhost:3000/admin`

## Usage

### Public Website
1. Navigate to the home page to see all providers
2. Click on any provider (GTPL, BSNL, Railwire, Krishiinet) to view their plans
3. Each plan card shows pricing details with GST calculation
4. Click "Request Connection" to submit a connection request

### Admin Dashboard

#### Dashboard
- View analytics and statistics
- Monitor customer counts per provider
- See last 5 customers

#### Manage Front Website
- Click "Add Plan" to create a new price card
- Fill in plan details (Provider, Plan Name, Image URL, Price, GST Rate, Installation Amount, Description)
- Edit or delete existing plans
- Changes reflect immediately on the public website

#### Customers
- View all customers in a data grid
- Use search to find customers by name or mobile
- Filter by status (Active/Inactive) or connection type
- Click on a customer name or edit button to open the customer sheet
- Add new customers using the "Add Customer" button
- Customer sheet has two tabs:
  - **Information**: Personal and connection details
  - **Address**: Complete address information

## API Endpoints

The JSON Server provides the following endpoints:

- `GET /plans` - Get all plans
- `GET /plans?provider={provider}` - Get plans by provider
- `GET /plans/:id` - Get plan by ID
- `POST /plans` - Create new plan
- `PATCH /plans/:id` - Update plan
- `DELETE /plans/:id` - Delete plan

- `GET /customers` - Get all customers
- `GET /customers/:id` - Get customer by ID
- `POST /customers` - Create new customer
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

## Data Models

### Plan
```typescript
{
  id: number;
  provider: 'GTPL' | 'BSNL' | 'Railwire' | 'Krishiinet';
  planName: string;
  imageUrl: string;
  price: number;
  gstRate: number;
  installationAmount: number;
  description: string;
}
```

### Customer
```typescript
{
  id: number;
  name: string;
  email: string;
  mobile: string;
  connectionType: Provider;
  package: string;
  status: 'Active' | 'Inactive';
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
}
```

## Styling

The project uses Tailwind CSS with Metronic v9.3.5 design system classes. All styling is component-scoped using:
- Inline styles where needed
- Tailwind utility classes
- No external CSS files (except global index.css)

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Notes

- The mock API (JSON Server) must be running for the application to work
- All data is stored in `db.json` and persists between server restarts
- The application uses Zustand for state management
- All routes are protected by React Router
- The admin dashboard is accessible via `/admin` route

## License

This project is proprietary software for Popna Entertainment.
