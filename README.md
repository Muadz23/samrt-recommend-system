# 📱 Smart Smartphone Recommendation System

An intelligent web application that provides personalized smartphone recommendations based on user preferences, powered by real user reviews and advanced data analysis.

![System Architecture](smartphone-system-flowchart.svg)

## 🌟 Features

### 🎯 **Smart Recommendations**
- AI-powered phone suggestions based on user preferences
- Personalized compatibility scoring (0-100%)
- Budget-aware filtering and recommendations
- Use case optimization (gaming, photography, business, etc.)

### 📊 **Interactive Data Analysis**
- Real-time analytics dashboard with Plotly.js visualizations
- Aspect impact analysis showing which features matter most
- Sentiment distribution across all reviews
- Phone performance radar charts
- Price vs rating scatter plots

### 📤 **Data Upload System**
- CSV file upload with drag & drop interface
- Real-time data validation and preview
- Automatic dataset expansion
- Support for new phone models and reviews

### 🎨 **Modern UI/UX**
- Responsive design for all devices
- Beautiful gradient themes and animations
- Intuitive navigation between all features
- Real-time feedback and status updates

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smartphone-recommendation-system.git
   cd smartphone-recommendation-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
WEBSITE/
├── 📄 index.html                    # Beautiful homepage
├── 📄 smart-recommend.html          # Recommendation interface
├── 📄 data-analysis.html            # Analytics dashboard
├── 📄 upload-data.html              # Data upload page
├── 📄 server.js                     # Node.js backend server
├── 📄 package.json                  # Dependencies
├── 📄 start.bat                     # Windows startup script
├── 📂 js/
│   ├── 📄 smart-recommend.js        # Frontend JavaScript
│   └── 📂 dataset/
│       └── 📄 recom_dataset.csv     # Main dataset
├── 📂 uploads/                      # Temporary upload directory
└── 📄 README.md                     # This file
```

## 🔧 API Endpoints

### Core Endpoints
- `GET /` - Homepage
- `GET /api/health` - Server health check
- `GET /api/analysis` - Analytics data
- `POST /api/recommendations` - Get personalized recommendations
- `POST /api/upload-csv` - Upload new dataset

## 📊 Dataset Information

### Current Dataset
- **Phone Models**: Dynamic (expandable via upload)
- **Reviews Analyzed**: Dynamic count
- **Key Aspects**: 11+ specifications tracked
- **Sentiment Analysis**: Positive/Neutral/Negative classification

### CSV Format
```csv
profile_name,rating,review_topic,time_place,color,review_text,model_phone,aspect,sentiment,aspect_text,review_score
```

## 🛠 Technologies Used

### Frontend
- **HTML5** - Semantic markup and structure
- **CSS3** - Advanced styling, animations, gradients
- **JavaScript** - Interactive functionality and API calls
- **Plotly.js** - Interactive data visualizations

### Backend
- **Node.js** - Server runtime environment
- **Express.js** - Web application framework
- **Multer** - File upload handling
- **csv-parser** - CSV data processing

### Features
- **Responsive Design** - Mobile-first approach
- **Real-time Updates** - Dynamic content refresh
- **File Upload** - Drag & drop CSV processing
- **Data Visualization** - Multiple chart types

## 📈 System Flow

1. **User Entry** → Homepage with navigation options
2. **Recommendations** → Preference form → Algorithm processing → Results
3. **Analytics** → Data fetch → Chart generation → Insights display
4. **Upload** → File validation → Preview → Dataset update

## 🎨 Color Scheme

- **Primary**: Purple gradient (#667eea → #764ba2)
- **Success**: Green (#48bb78)
- **Warning**: Orange (#ed8936)
- **Error**: Red (#f56565)
- **Neutral**: Gray tones

## 🔒 Security Features

- File type validation (CSV only)
- File size limits (10MB max)
- Input sanitization
- Error handling and cleanup
- CORS configuration

## 🚀 Deployment

### Local Development
```bash
npm start
# Server runs on http://localhost:3000
```

### Production Deployment
1. Set environment variables
2. Configure production database
3. Enable HTTPS
4. Set up process manager (PM2)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Thanks to all contributors who provided smartphone reviews
- Plotly.js for excellent visualization capabilities
- Express.js community for robust web framework
- All users who help improve the recommendation algorithm

---

⭐ **Star this repository if you found it helpful!**
