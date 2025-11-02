#!/bin/bash

echo "📦 Installing and Building Admin App..."
echo ""

# Install and build admin app
echo "1️⃣ Installing admin-app dependencies..."
cd admin-app
npm install
echo "   Building admin-app..."
npm run build
cd ..

echo ""
echo "✅ Admin app installed and built successfully!"
echo ""
echo "🚀 Ready to deploy! Start the app with PM2:"
echo "  cd admin-app && pm2 start npm --name 'tokshop-admin-panel' -- run dev"
