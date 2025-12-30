# SmartStock - Inventory & Employee Management System

SmartStock is a modern, comprehensive Inventory and Employee Management System (EMS) designed for multi-branch businesses. Built with React, TypeScript, Tailwind CSS, and Firebase, it provides a robust platform for tracking products, sales, employees, and business performance in real-time.

## 🚀 Features

### 🔑 Authentication & Role-Based Access
- **Secure Login/Registration**: Powered by Firebase Authentication.
- **Role-Based Access Control (RBAC)**: Distinct features for `admin` and `staff` roles.
  - **Admins**: Full control over all branches, employees, and products.
  - **Staff**: Restricted access to their assigned branch and specific operations.
- **Offline Support**: PWA capabilities for working without an internet connection.

### 📊 Interactive Dashboard
- **Real-time Statistics**: Overview of total products, sales, and low stock alerts.
- **Visual Analytics**: Charts and graphs for sales trends and stock distribution.
- **Activity Feed**: Recent actions by users across the system.

### 📦 Product Management ("Store")
- **Centralized Inventory**: Add, update, and track products with details like category, model, and cost price.
- **Branch-Specific View**: Admins can view stock across all branches; staff see only their branch's stock.
- **Lifecycle Tracking**: Track products through statuses: `Store` -> `Sold` -> `Restored` -> `Deleted`.
- **Advanced Filtering**: Filter by category, price range, quantity, and branch.

### 💰 Sales & Transactions
- **Point of Sale**: Streamlined process for selling products.
- **Sales History**: Detailed logs of sold items with profit/loss calculation.
- **Restoration**: Ability to restore sold items (returns) with reason tracking.
- **Financial Reports**: Automatic calculation of gross profit, net profit, and total loss.

### 🏢 Branch & Employee Management
- **Multi-Branch Support**: Create and manage multiple business locations.
- **Employee Directory**: Onboard staff, assign them to branches, and manage their profiles.
- **Performance Tracking**: Monitor sales performance by branch or individual employee.

### 📑 Reporting & Exports
- **Detailed Reports**: Generate reports for inventory, sales, and employee activity.
- **Export Options**: Download data in Excel or PDF formats for offline analysis.
- **Blockchain Ledger**: Immutable record of critical transactions for auditability.

## 🛠️ Technology Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **Backend / Database**: [Firebase](https://firebase.google.com/) (Auth + Firestore)
- **State Management**: React Context API
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚙️ Setup & Installation

Follow these steps to get the project running locally within minutes.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/smartstock.git
cd smartstock
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally
Start the development server:

```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### 5. Build for Production
To create a production-ready build:

```bash
npm run build
```

## 📂 Project Structure

```
src/
├── components/       # Reusable UI components (Layouts, Charts, UI kit)
├── contexts/         # Global state (Auth, Theme)
├── firebase/         # Firebase configuration and initialization
├── functions/        # Business logic and Firestore operations (store, sold, etc.)
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
├── pages/            # Application pages (Dashboard, Products, Settings)
├── types/            # TypeScript interfaces (interface.ts)
└── App.tsx           # Main application entry point
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**SmartStock** — Empowering businesses with smart inventory solutions.