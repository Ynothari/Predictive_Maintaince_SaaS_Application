# Predictive Maintenance Dashboard

A professional React + TypeScript SaaS application for AI-powered predictive maintenance analysis.

## 🚀 Features

- **JWT Authentication** - Secure login system
- **Drag & Drop File Upload** - Easy CSV/Excel file upload
- **Real-time Analysis** - Instant failure predictions
- **Interactive Visualizations** - Beautiful charts and graphs
- **Detailed Reports** - Comprehensive failure analysis
- **Responsive Design** - Works on all devices
- **Professional UI** - Modern, clean interface

## 📋 Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8001`

## 🛠️ Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## 🔐 Login Credentials

**Username:** `admin`  
**Password:** `predictive2024`

## 📊 How to Use

1. **Login** - Use the credentials above to sign in
2. **Upload Data** - Drag and drop your CSV file or click to browse
3. **Analyze** - Click "Analyze Data" to get predictions
4. **Review Results** - View interactive charts and detailed predictions
5. **Download Report** - Export results as CSV

## 📁 Required CSV Format

Your CSV file must include these columns:

- `Air temperature [K]`
- `Process temperature [K]`
- `Rotational speed [rpm]`
- `Torque [Nm]`
- `Tool wear [min]`

## 🎨 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **React Router** - Navigation
- **Axios** - API calls
- **React Dropzone** - File upload
- **Lucide React** - Icons

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Header.tsx
│   │   ├── FileUpload.tsx
│   │   ├── AnalysisResults.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🔧 Configuration

### API Endpoint

The frontend is configured to proxy API requests to `http://localhost:8001`. 

To change this, edit `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://your-api-url:port',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

### Authentication

The current implementation uses a mock JWT system for demonstration. 

For production, update `src/contexts/AuthContext.tsx` to call your actual authentication API.

## 📊 Features Breakdown

### Authentication System
- JWT-based authentication
- Protected routes
- Automatic token validation
- Secure logout

### File Upload
- Drag and drop interface
- File type validation
- Progress indication
- Error handling

### Analysis Dashboard
- Key metrics cards
- Risk distribution pie chart
- Failure reasons bar chart
- Detailed predictions table
- CSV export functionality

### Visualizations
- **Risk Distribution** - Pie chart showing High/Medium/Low risk
- **Failure Reasons** - Bar chart of top failure types
- **Predictions Table** - Detailed row-by-row analysis

## 🎯 Performance Metrics Displayed

- Total records analyzed
- Predicted failures count
- High risk items
- Healthy items
- Failure rate percentage
- Risk level distribution
- Top failure reasons
- Individual predictions with:
  - Failure probability
  - Risk level
  - Failure reason
  - Maintenance recommendation

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Deploy with Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 Security Considerations

### Current Setup (Demo)
- Mock JWT authentication
- No backend validation
- Hardcoded credentials

### For Production
1. Implement real JWT authentication with backend
2. Add token refresh mechanism
3. Implement proper password hashing
4. Add rate limiting
5. Enable HTTPS
6. Add CSRF protection
7. Implement proper session management

## 🐛 Troubleshooting

### API Connection Issues

**Problem:** Cannot connect to backend API

**Solution:**
1. Ensure backend is running on `http://localhost:8001`
2. Check CORS settings in backend
3. Verify proxy configuration in `vite.config.ts`

### File Upload Fails

**Problem:** File upload returns error

**Solution:**
1. Check file format (must be CSV)
2. Verify required columns are present
3. Ensure backend API is accessible
4. Check file size (backend may have limits)

### Build Errors

**Problem:** Build fails with TypeScript errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type check
npm run build
```

## 📝 Development Tips

### Hot Reload
Vite provides instant hot module replacement. Changes appear immediately without full page reload.

### TypeScript
All components are fully typed. Use TypeScript's IntelliSense for better development experience.

### Tailwind CSS
Use Tailwind utility classes for styling. Custom classes are defined in `index.css`.

### Component Development
Components are modular and reusable. Follow the existing patterns for consistency.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🙏 Acknowledgments

- Built with React and TypeScript
- Styled with Tailwind CSS
- Charts powered by Recharts
- Icons from Lucide React

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-11  
**Status:** Production Ready ✅
