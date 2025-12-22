<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
</head>
<body>
  <h1><i class="fas fa-rocket"></i> Pixelmart EMS (Client)</h1>
  <p>A role-based <strong>Inventory & Employee Management System (EMS)</strong> built with <strong>React, TypeScript, Tailwind, and Firebase</strong>. Supports access levels (<code>admin</code>, <code>staff</code>) with dashboards, product tracking, branch management, and reports. Designed for businesses in <strong>Kigali, Rwanda</strong> with support for multiple branches.</p>

  <hr>

  <h2><i class="fas fa-bookmark"></i> Features</h2>
  <h3>🔑 Authentication & Roles</h3>
  <ul>
    <li>Firebase Authentication (email/password)</li>
    <li>Role-based access control (<code>admin</code> vs <code>staff</code>)</li>
    <li>Protected routes & auto-redirect</li>
  </ul>
  <h3>📊 Dashboard</h3>
  <ul>
    <li>Product statistics (store, sold, restored, deleted)</li>
    <li>Low/out of stock alerts</li>
    <li>Daily, weekly, monthly reports</li>
  </ul>
  <h3>🏢 Branch Management</h3>
  <ul>
    <li>Manage multiple branches (district, sector, cell, village)</li>
    <li>Assign employees to branches</li>
  </ul>
  <h3>👨‍💼 Employee Management</h3>
  <ul>
    <li>Add, update, deactivate staff</li>
    <li>Restrict staff to assigned branch</li>
  </ul>
  <h3>📦 Product Management</h3>
  <ul>
    <li>Store, sell, restore, delete products</li>
    <li>Track cost/selling prices & profit/loss</li>
    <li>Supplier management</li>
  </ul>
  <h3>📑 Reports</h3>
  <ul>
    <li>Profit/loss tracking</li>
    <li>Stock valuation</li>
    <li>Product movement trends</li>
  </ul>
  <h3>🎨 UI & Styling</h3>
  <ul>
    <li>Tailwind CSS</li>
    <li>Responsive layouts</li>
    <li>Dark mode (via ThemeContext)</li>
  </ul>

  <hr>

  <h2><i class="fas fa-tools"></i> Tech Stack</h2>
  <ul>
    <li><strong>Frontend:</strong> React + TypeScript + Vite</li>
    <li><strong>Styling:</strong> Tailwind CSS</li>
    <li><strong>Auth & DB:</strong> Firebase (Auth + Firestore)</li>
    <li><strong>Routing:</strong> React Router DOM</li>
    <li><strong>State Management:</strong> Context API</li>
  </ul>

  <hr>

  <h2><i class="fas fa-folder"></i> Project Structure</h2>
  <pre><code>
src/
├── components/       # Reusable components (SEOHelmet, ProtectedRoute, layout, ui)
├── contexts/         # Auth, Theme, Search contexts
├── firebase/         # Firebase config
├── hooks/            # Custom hooks (toast, mobile)
├── pages/            # Dashboard, Products, Employees, Reports, etc.
├── types/            # TypeScript interfaces
├── App.tsx           # Main app with routes
├── main.tsx          # Entry point
├── public/           # Static assets (og images, favicon, screenshots)
  </code></pre>

  <hr>

  <h2><i class="fas fa-cog"></i> Setup & Installation</h2>
  <ol>
    <li><strong>Clone the repo</strong>
      <pre><code>
git clone https://github.com/theodevrwanda/pixelmartrwClient.git
cd pixelmartrwClient
      </code></pre>
    </li>
    <li><strong>Install dependencies</strong>
      <pre><code>
npm install
      </code></pre>
    </li>
    <li><strong>Configure Firebase</strong>
      <ul>
        <li>Create a Firebase project</li>
        <li>Enable <strong>Authentication (Email/Password)</strong></li>
        <li>Enable <strong>Cloud Firestore</strong></li>
        <li>Add <code>.env</code> in the project root:</li>
      </ul>
      <pre><code>
VITE_API_URL=your_backend_url
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
      </code></pre>
    </li>
    <li><strong>Run locally</strong>
      <pre><code>
npm run dev
      </code></pre>
    </li>
    <li><strong>Build for production</strong>
      <pre><code>
npm run build
      </code></pre>
    </li>
  </ol>

  <hr>

  <h2><i class="fas fa-lock"></i> Example Firestore Security Rules</h2>
  <pre><code>
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Employees
    match /employees/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Products
    match /products/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/employees/$(request.auth.uid)).data.role == "admin";
    }
  }
}
  </code></pre>

  <hr>

  <h2><i class="fas fa-paint-brush"></i> UI Style Guide</h2>
  <ul>
    <li><strong>Cards & Panels:</strong> <code>bg-white dark:bg-gray-800 rounded-2xl shadow p-4</code></li>
    <li><strong>Buttons:</strong>
      <ul>
        <li>Primary: <code>bg-blue-600 text-white rounded-xl px-4 py-2 hover:bg-blue-700</code></li>
        <li>Secondary: <code>border border-gray-300 rounded-xl px-4 py-2</code></li>
      </ul>
    </li>
    <li><strong>Typography:</strong>
      <ul>
        <li>Headings: <code>text-xl font-semibold</code></li>
        <li>Subtext: <code>text-sm text-gray-500</code></li>
      </ul>
    </li>
    <li><strong>Layout:</strong> Responsive grid with <code>grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4</code></li>
  </ul>

  <hr>

  <h2><i class="fas fa-user"></i> Author</h2>
  <p><strong>Theogene Iradukunda (Theo Dev Rwanda)</strong></p>
  <ul class="contact-info">
    <li><i class="fas fa-envelope"></i><a href="mailto:theodevrwanda@gmail.com">theodevrwanda@gmail.com</a></li>
    <li><i class="fas fa-phone"></i><a href="tel:+250792734752">+250 792 734 752</a></li>
    <li><i class="fas fa-globe"></i><a href="https://theodevrw.netlify.app">Portfolio</a></li>
    <li><i class="fab fa-github"></i><a href="https://github.com/theodevrwanda">GitHub</a></li>
    <li><i class="fab fa-linkedin"></i><a href="https://www.linkedin.com/in/theogene-iradukunda-88b07a381/">LinkedIn</a></li>
  </ul>

  <div class="buy-me-coffee">
    <p><i class="fas fa-coffee"></i> Enjoying this project? Support my work!</p>
    <a href="https://buymeacoffee.com/theodevrwanda" target="_blank">Buy Me a Coffee</a>
  </div>

  <hr>

  <h2><i class="fas fa-file-contract"></i> License</h2>
  <p>MIT License &copy; 2025 <a href="https://theodev.rw">Theogene Iradukunda</a></p>
</body>
</html>