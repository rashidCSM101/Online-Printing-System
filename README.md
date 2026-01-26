# Online Printing System

A modern, full-stack MERN application for online document printing services with home delivery. Features a beautiful UI with dark/light mode, smooth scrolling, and mobile-responsive design.

## 🎨 Features

- **Landing Page**: Modern and attractive landing page with smooth scrolling
- **Authentication**: User registration and login with JWT
- **User Dashboard**: Upload documents and place printing orders
- **Order History**: Track all your printing orders
- **Dark/Light Mode**: Theme toggle with custom color palette
- **Mobile Responsive**: Fully responsive design for all devices
- **Smooth Animations**: Beautiful animations using Framer Motion

## 🎨 Color Palette

- Primary: `#0F2854` (Dark Blue)
- Secondary: `#1C4D8D` (Medium Blue)
- Accent: `#4988C4` (Light Blue)
- Light: `#BDE8F5` (Very Light Blue)

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- React Router DOM
- Axios
- Framer Motion
- React Icons

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Bcrypt for password hashing

## 📁 Project Structure

```
Online-Printing-System/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── orderController.js
│   ├── models/
│   │   ├── User.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── orderRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── Navbar.css
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── pages/
    │   │   ├── Landing.jsx
    │   │   ├── Landing.css
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Auth.css
    │   │   ├── Dashboard.jsx
    │   │   ├── Dashboard.css
    │   │   ├── OrderHistory.jsx
    │   │   └── OrderHistory.css
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file and configure:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/online-printing
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📱 Features Overview

### For Users
- **Register/Login**: Create account or login to existing account
- **Upload Documents**: Upload PDF, Word, or image files (max 10MB)
- **Printing Options**: 
  - Choose print type (Black & White or Color)
  - Select paper size (A4, A3, Letter)
  - Choose print sides (Single or Double)
  - Specify number of copies
- **Delivery**: Add delivery address for home delivery
- **Order Tracking**: View order history and track order status

### Pricing
- Black & White Single Side: Rs. 5 per page
- Black & White Double Side: Rs. 8 per page
- Color Single Side: Rs. 15 per page
- Color Double Side: Rs. 25 per page

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (Protected)

### Orders
- `POST /api/orders` - Create new order (Protected)
- `GET /api/orders/my-orders` - Get user's orders (Protected)
- `GET /api/orders/:id` - Get order by ID (Protected)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected routes
- Input validation
- CORS enabled

## 📝 TODO (Future Enhancements)

- [ ] Add file upload to cloud storage (AWS S3/Cloudinary)
- [ ] Payment gateway integration
- [ ] Admin panel for order management
- [ ] Email notifications
- [ ] Real-time order tracking
- [ ] Multiple file upload
- [ ] Order cancellation feature
- [ ] User profile management

## 👨‍💻 Development

This project is currently at 30% completion as requested, focusing on:
- ✅ Landing page
- ✅ User authentication (Login/Signup)
- ✅ User dashboard
- ✅ Order placement
- ✅ Order history
- ✅ Dark/Light mode
- ✅ Mobile responsive design
- ✅ Smooth scrolling and animations

Admin panel and advanced features will be added in future updates.

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For any queries or support, please contact the development team.

---

Made with ❤️ using MERN Stack
