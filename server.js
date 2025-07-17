const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const multer = require('multer');


const app = express();
const PORT = process.env.PORT || 4000;

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Data storage handled by SmartphoneDataAnalyzer class

// CSV Data Loader
class SmartphoneDataAnalyzer {
    constructor() {
        this.reviews = [];
        this.phones = new Map();
        this.aspects = new Map();
        this.recommendations = [];

    }

    async loadCSVData() {
        return new Promise((resolve, reject) => {
            const results = [];
            
            // Load recom_dataset.csv
            fs.createReadStream(path.join(__dirname, 'js/dataset/recom_dataset.csv'))
                .pipe(csv())
                .on('data', (data) => {
                    if (data.model_phone && data.aspect && data.sentiment) {
                        // Clean up model_phone name (remove .csv extension if present)
                        let cleanModelPhone = data.model_phone.replace(/\.csv$/, '').trim();

                        results.push({
                            profile_name: data.profile_name || '',
                            rating: parseFloat(data.rating) || 0,
                            review_topic: data.review_topic || '',
                            time_place: data.time_place || '',
                            color: data.color || '',
                            review_text: data.review_text || '',
                            model_phone: cleanModelPhone,
                            aspect: data.aspect || '',
                            sentiment: data.sentiment || '',
                            aspect_text: data.aspect_text || '',
                            review_score: parseFloat(data.review_score) || 0
                        });
                    }
                })
                .on('end', async () => {
                    this.reviews = results;
                    await this.processData();
                    resolve(results);
                })
                .on('error', reject);
        });
    }

    async processData() {
        console.log(`Processing ${this.reviews.length} reviews...`);

        // First, collect unique phone models
        const uniquePhones = [...new Set(this.reviews.map(review => review.model_phone))];

        // Initialize phones with price estimation
        for (const model_phone of uniquePhones) {
            if (!this.phones.has(model_phone)) {
                const priceRange = await this.estimatePrice(model_phone);
                this.phones.set(model_phone, {
                    name: model_phone,
                    totalReviews: 0,
                    avgRating: 0,
                    totalRating: 0,
                    aspects: new Map(),
                    sentiments: { positive: 0, negative: 0, neutral: 0 },
                    features: this.extractFeatures(model_phone),
                    priceRange: priceRange,
                    brand: this.extractBrand(model_phone),
                    priceValue: 'unknown' // Will be calculated after processing all reviews
                });
            }
        }

        // Process each review
        this.reviews.forEach(review => {
            const { model_phone, aspect, sentiment, rating } = review;
            
            const phoneData = this.phones.get(model_phone);
            phoneData.totalReviews++;
            phoneData.totalRating += rating;
            phoneData.avgRating = phoneData.totalRating / phoneData.totalReviews;
            phoneData.sentiments[sentiment]++;
            
            // Aspect-level analysis for this phone
            if (!phoneData.aspects.has(aspect)) {
                phoneData.aspects.set(aspect, {
                    total: 0,
                    positive: 0,
                    negative: 0,
                    neutral: 0,
                    avgRating: 0,
                    totalRating: 0,
                    impact: 0
                });
            }
            
            const aspectData = phoneData.aspects.get(aspect);
            aspectData.total++;
            aspectData[sentiment]++;
            aspectData.totalRating += rating;
            aspectData.avgRating = aspectData.totalRating / aspectData.total;
            
            // Global aspect analysis
            if (!this.aspects.has(aspect)) {
                this.aspects.set(aspect, {
                    name: aspect,
                    total: 0,
                    positive: 0,
                    negative: 0,
                    neutral: 0,
                    phones: new Set(),
                    avgRating: 0,
                    totalRating: 0,
                    impact: 0
                });
            }
            
            const globalAspect = this.aspects.get(aspect);
            globalAspect.total++;
            globalAspect[sentiment]++;
            globalAspect.totalRating += rating;
            globalAspect.avgRating = globalAspect.totalRating / globalAspect.total;
            globalAspect.phones.add(model_phone);
        });
        
        // Calculate impact scores
        this.calculateImpactScores();

        // Calculate price sentiment for each phone
        this.phones.forEach((phone, phoneName) => {
            phone.priceValue = this.analyzePriceSentiment(phoneName);
        });

        console.log(`Processed ${this.phones.size} phones and ${this.aspects.size} aspects`);
    }

    calculateImpactScores() {
        // Calculate aspect impact scores
        this.aspects.forEach(aspect => {
            const positiveRatio = aspect.positive / aspect.total;
            const volumeWeight = Math.min(aspect.total / 50, 1);
            const phoneSpread = aspect.phones.size / this.phones.size;
            
            aspect.impact = Math.round(
                (positiveRatio * 0.4 + volumeWeight * 0.3 + phoneSpread * 0.3) * 100
            );
        });
        
        // Calculate phone aspect impacts
        this.phones.forEach(phone => {
            phone.aspects.forEach(aspect => {
                const positiveRatio = aspect.positive / aspect.total;
                const ratingScore = aspect.avgRating / 5;
                aspect.impact = Math.round((positiveRatio * 0.6 + ratingScore * 0.4) * 100);
            });
        });
    }

    extractBrand(modelName) {
        const model = modelName.toLowerCase();
        if (model.includes('iphone')) return 'Apple';
        if (model.includes('samsung') || model.includes('s24') || model.includes('a14')) return 'Samsung';
        if (model.includes('redmi') || model.includes('xiaomi')) return 'Xiaomi';
        if (model.includes('nothing')) return 'Nothing';
        if (model.includes('poco')) return 'Xiaomi';
        if (model.includes('pixel')) return 'Google';
        if (model.includes('oneplus')) return 'OnePlus';
        return 'Unknown';
    }

    async estimatePrice(modelName, gsmarenaData = null) {
        // First, try to get price from GSMArena CSV dataset
        const gsmarenaPrice = this.getGSMArenaPrice(modelName);
        if (gsmarenaPrice) {
            console.log(`💰 Using GSMArena CSV price for ${modelName}: RM${gsmarenaPrice}`);
            return gsmarenaPrice;
        }

        // Try to get price from GSMArena API data (if provided)
        if (gsmarenaData && gsmarenaData.pricing && gsmarenaData.pricing.current) {
            console.log(`💰 Using GSMArena API price for ${modelName}: RM${gsmarenaData.pricing.current}`);
            return gsmarenaData.pricing.current;
        }

        // Fallback to hardcoded estimates
        const model = modelName.toLowerCase();

        // Dynamic price estimation based on brand and model patterns
        const brand = this.extractBrand(modelName);
        let estimatedPrice = 2345; // Default fallback (499 USD × 4.7)

        // Known exact models first (prices in MYR) - fallback if CSV not available
        const exactPrices = {
            'iphone 13': 1875,        // 399 USD × 4.7
            'iphone 15 pro': 4695,   // 999 USD × 4.7
            'samsung s24': 3755,     // 799 USD × 4.7
            'samsung a14 5g': 1405,  // 299 USD × 4.7
            'redmi note 13 pro': 1405, // 299 USD × 4.7
            'nothing 2a': 1640,     // 349 USD × 4.7
            'poco m6 pro': 935,     // 199 USD × 4.7
            'oneplus 12': 3755      // 799 USD × 4.7
        };

        if (exactPrices[model]) {
            console.log(`💰 Using exact price for ${modelName}: RM${exactPrices[model]}`);
            return exactPrices[model];
        }

        // Brand-based estimation for new models (prices in MYR)
        if (brand === 'Apple') {
            if (model.includes('pro max')) estimatedPrice = 5635; // 1199 USD × 4.7
            else if (model.includes('pro')) estimatedPrice = 4695; // 999 USD × 4.7
            else if (model.includes('15') || model.includes('14')) estimatedPrice = 3755; // 799 USD × 4.7
            else if (model.includes('13') || model.includes('12')) estimatedPrice = 2815; // 599 USD × 4.7
            else estimatedPrice = 3285; // 699 USD × 4.7
        } else if (brand === 'Samsung') {
            if (model.includes('ultra')) estimatedPrice = 5635; // 1199 USD × 4.7
            else if (model.includes('s24') || model.includes('s23')) estimatedPrice = 3755; // 799 USD × 4.7
            else if (model.includes('note')) estimatedPrice = 4225; // 899 USD × 4.7
            else if (model.includes('a5') || model.includes('a7')) estimatedPrice = 1875; // 399 USD × 4.7
            else estimatedPrice = 2815; // 599 USD × 4.7
        } else if (brand === 'Xiaomi') {
            if (model.includes('pro')) estimatedPrice = 1405; // 299 USD × 4.7
            else if (model.includes('redmi')) estimatedPrice = 935; // 199 USD × 4.7
            else if (model.includes('mi') && model.includes('14')) estimatedPrice = 4225; // 899 USD × 4.7
            else estimatedPrice = 1640; // 349 USD × 4.7
        } else if (brand === 'Nothing') {
            if (model.includes('2a')) estimatedPrice = 1640; // 349 USD × 4.7
            else if (model.includes('2')) estimatedPrice = 2815; // 599 USD × 4.7
            else estimatedPrice = 2110; // 449 USD × 4.7
        } else if (brand === 'Poco') {
            if (model.includes('pro')) estimatedPrice = 935; // 199 USD × 4.7
            else if (model.includes('f6')) estimatedPrice = 1405; // 299 USD × 4.7
            else estimatedPrice = 700; // 149 USD × 4.7
        }

        console.log(`💰 Using estimated price for ${modelName} (${brand}): RM${estimatedPrice}`);
        return estimatedPrice;
    }

    getGSMArenaPrice(phoneName) {
        try {
            const specsPath = path.join(__dirname, 'js/dataset/gsmarena_phone_specs.csv');

            if (!fs.existsSync(specsPath)) {
                return null;
            }

            const csvData = fs.readFileSync(specsPath, 'utf8');
            const lines = csvData.split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = this.parseCSVLine(lines[i]);
                    if (values.length >= headers.length) {
                        const spec = {};
                        headers.forEach((header, index) => {
                            spec[header] = values[index] || '';
                        });

                        // Check if this is the phone we're looking for
                        if (spec.original_name.toLowerCase() === phoneName.toLowerCase()) {
                            const price = parseFloat(spec.price_myr);
                            return price > 0 ? price : null;
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error reading GSMArena price:', error.message);
            return null;
        }
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current); // Add last value
        return values;
    }



    // Alternative: Extract price sentiment from reviews
    analyzePriceSentiment(modelName) {
        const priceReviews = this.reviews.filter(review =>
            review.model_phone === modelName &&
            review.aspect === 'price'
        );

        if (priceReviews.length === 0) return 'unknown';

        const positiveCount = priceReviews.filter(r => r.sentiment === 'positive').length;
        const totalCount = priceReviews.length;
        const positiveRatio = positiveCount / totalCount;

        // Classify price perception
        if (positiveRatio >= 0.7) return 'excellent-value';
        if (positiveRatio >= 0.5) return 'good-value';
        if (positiveRatio >= 0.3) return 'fair-value';
        return 'poor-value';
    }

    extractFeatures(modelName) {
        const features = [];
        const model = modelName.toLowerCase();
        
        if (model.includes('pro')) features.push('Pro Features');
        if (model.includes('ultra')) features.push('Ultra Performance');
        if (model.includes('note')) features.push('Large Screen');
        if (model.includes('13') || model.includes('24')) features.push('Latest Generation');
        if (model.includes('5g')) features.push('5G Ready');
        
        return features;
    }

    generateRecommendations(userPreferences) {
        const { budget, primaryUse, brand, features } = userPreferences;
        
        let candidates = Array.from(this.phones.values());
        
        // Filter by budget
        if (budget && budget !== 'no-preference') {
            const budgetRanges = {
                'budget': [0, 1500],      // Under RM1,500: Poco M6 Pro, Samsung A14 5G, Redmi Note 13 Pro
                'mid-range': [1500, 2000], // RM1,500 - RM2,000: Nothing 2a, iPhone 13
                'premium': [2000, 4000],  // RM2,000 - RM4,000: Samsung S24, OnePlus 12
                'flagship': [4000, 50000] // RM4,000+: iPhone 15 Pro and above
            };

            console.log(`💰 Budget filter: ${budget} (${budgetRanges[budget] ? budgetRanges[budget].join('-') : 'unknown'})`);

            if (budgetRanges[budget]) {
                const [min, max] = budgetRanges[budget];
                const beforeFilter = candidates.length;
                candidates = candidates.filter(phone => {
                    const inRange = phone.priceRange >= min && phone.priceRange <= max;
                    console.log(`  📱 ${phone.name}: RM${phone.priceRange} ${inRange ? '✅' : '❌'}`);
                    return inRange;
                });
                console.log(`💰 Budget filter result: ${beforeFilter} → ${candidates.length} phones`);
            }
        } else if (budget === 'no-preference') {
            console.log(`💰 Budget filter: No price preference - showing all phones`);
        }
        
        // Filter by brand
        if (brand && brand !== 'no-preference') {
            candidates = candidates.filter(phone => 
                phone.brand.toLowerCase() === brand.toLowerCase()
            );
        }
        
        // Score candidates based on preferences
        const scoredCandidates = candidates.map(phone => {
            let score = 0;
            console.log(`\n🔍 Scoring phone: ${phone.name}`);

            // Base score from average rating
            const ratingScore = (phone.avgRating / 5) * 30;
            score += ratingScore;
            console.log(`  📊 Rating score: ${ratingScore.toFixed(1)} (${phone.avgRating}/5)`);

            // Debug: Show available aspects
            console.log(`  📋 Available aspects: ${Array.from(phone.aspects.keys()).join(', ')}`);
            console.log(`  🏷️ Phone features: ${phone.features ? phone.features.join(', ') : 'None'}`);
            
            // Sentiment score
            const totalSentiments = phone.sentiments.positive + phone.sentiments.negative + phone.sentiments.neutral;
            if (totalSentiments > 0) {
                score += (phone.sentiments.positive / totalSentiments) * 25;
            }
            
            // Primary use scoring - using actual aspect names from CSV
            if (primaryUse) {
                const useAspectMap = {
                    'photography': ['camera', 'photo', 'picture'],
                    'gaming': ['performance', 'speed', 'processor'],
                    'business': ['battery', 'life', 'power'],
                    'social': ['screen', 'display', 'size'],
                    'basic': ['price', 'value', 'cost']
                };

                const relevantAspects = useAspectMap[primaryUse] || [];
                let maxAspectScore = 0;

                // Find the best matching aspect for this use case
                for (const aspectName of relevantAspects) {
                    for (const [phoneAspect, aspectData] of phone.aspects) {
                        if (phoneAspect.toLowerCase().includes(aspectName.toLowerCase())) {
                            const aspectScore = (aspectData.impact / 100) * 25;
                            maxAspectScore = Math.max(maxAspectScore, aspectScore);
                        }
                    }
                }

                score += maxAspectScore;
            }
            
            // Feature matching - check both phone features and aspects
            if (features && features.length > 0) {
                let matchingFeatures = 0;

                for (const feature of features) {
                    let featureMatched = false;

                    // Check phone features
                    if (phone.features && phone.features.some(phoneFeature =>
                        phoneFeature.toLowerCase().includes(feature.toLowerCase())
                    )) {
                        featureMatched = true;
                    }

                    // Check aspects for feature keywords
                    if (!featureMatched) {
                        for (const [aspectName, aspectData] of phone.aspects) {
                            if (aspectName.toLowerCase().includes(feature.toLowerCase()) &&
                                aspectData.impact > 50) { // Only count high-impact aspects
                                featureMatched = true;
                                break;
                            }
                        }
                    }

                    if (featureMatched) {
                        matchingFeatures++;
                    }
                }

                score += (matchingFeatures / features.length) * 20;
            }
            
            console.log(`  🎯 Final score: ${score.toFixed(1)}`);

            return {
                ...phone,
                matchScore: Math.round(score)
            };
        });
        
        // Sort by score and return top recommendations
        const recommendations = scoredCandidates
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 6);

        // Convert Maps to plain objects for JSON serialization
        return recommendations.map(phone => ({
            ...phone,
            aspects: Object.fromEntries(phone.aspects),
            phones: phone.phones ? Array.from(phone.phones) : undefined
        }));
    }

    getPhoneAnalysis() {
        // Convert aspects to the format expected by frontend
        const aspectsFormatted = Array.from(this.aspects.values()).map(aspect => ({
            name: aspect.name,
            totalMentions: aspect.total,
            impact: aspect.impact,
            sentiments: {
                positive: aspect.positive,
                negative: aspect.negative,
                neutral: aspect.neutral
            }
        }));

        // Convert phones to the format expected by frontend
        const phonesFormatted = Array.from(this.phones.values()).map(phone => ({
            name: phone.name,
            brand: phone.brand,
            avgRating: phone.avgRating,
            totalReviews: phone.totalReviews,
            priceRange: phone.priceRange,
            aspects: Object.fromEntries(phone.aspects)
        }));

        return {
            totalPhones: this.phones.size,
            totalReviews: this.reviews.length,
            totalAspects: this.aspects.size,
            phones: phonesFormatted,
            aspects: aspectsFormatted.sort((a, b) => b.impact - a.impact),
            topAspects: aspectsFormatted
                .sort((a, b) => b.impact - a.impact)
                .slice(0, 10)
        };
    }
}

// Initialize data analyzer
const analyzer = new SmartphoneDataAnalyzer();

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    res.json({
        phoneCount: analyzer.phones.size,
        reviewCount: analyzer.reviews.length,
        aspectCount: analyzer.aspects.size
    });
});

app.get('/api/analysis', (req, res) => {
    try {
        const analysis = analyzer.getPhoneAnalysis();
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get phone specifications from CSV
app.get('/api/phone-specs/:name', (req, res) => {
    try {
        const phoneName = req.params.name.toLowerCase();
        console.log(`📱 Getting specs for: ${phoneName}`);

        // Load phone specs from CSV file
        const specsPath = path.join(__dirname, 'js/dataset/gsmarena_phone_specs.csv');

        if (!fs.existsSync(specsPath)) {
            return res.status(404).json({ error: 'Phone specifications not found' });
        }

        const csvData = fs.readFileSync(specsPath, 'utf8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = analyzer.parseCSVLine(lines[i]);
                if (values.length >= headers.length) {
                    const spec = {};
                    headers.forEach((header, index) => {
                        spec[header] = values[index] || '';
                    });

                    // Check if this is the phone we're looking for
                    if (spec.original_name.toLowerCase() === phoneName) {
                        console.log(`✅ Found specs for: ${spec.original_name}`);
                        return res.json(spec);
                    }
                }
            }
        }

        res.status(404).json({ error: 'Phone not found in specifications' });
    } catch (error) {
        console.error('Error getting phone specs:', error);
        res.status(500).json({ error: 'Failed to get phone specifications' });
    }
});







// CSV Upload endpoint
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const originalRecordCount = analyzer.reviews.length;

        // Read and validate the uploaded CSV
        const newRecords = [];
        const requiredHeaders = [
            'profile_name', 'rating', 'review_topic', 'time_place', 'color',
            'review_text', 'model_phone', 'aspect', 'sentiment', 'aspect_text', 'review_score'
        ];

        await new Promise((resolve, reject) => {
            let isFirstRow = true;
            let headers = [];

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    if (isFirstRow) {
                        headers = Object.keys(data);

                        // Validate headers
                        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                        if (missingHeaders.length > 0) {
                            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
                            return;
                        }
                        isFirstRow = false;
                    }

                    // Validate and format the record
                    if (data.model_phone && data.aspect && data.sentiment) {
                        // Clean up model_phone name (remove .csv extension if present)
                        let cleanModelPhone = data.model_phone.replace(/\.csv$/, '').trim();

                        newRecords.push({
                            profile_name: data.profile_name || '',
                            rating: parseFloat(data.rating) || 0,
                            review_topic: data.review_topic || '',
                            time_place: data.time_place || '',
                            color: data.color || '',
                            review_text: data.review_text || '',
                            model_phone: cleanModelPhone,
                            aspect: data.aspect || '',
                            sentiment: data.sentiment || '',
                            aspect_text: data.aspect_text || '',
                            review_score: parseFloat(data.review_score) || 0
                        });
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', reject);
        });

        if (newRecords.length === 0) {
            // Clean up uploaded file
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'No valid records found in the CSV file' });
        }

        // Append new records to the existing dataset
        const datasetPath = path.join(__dirname, 'js/dataset/recom_dataset.csv');
        const csvHeader = requiredHeaders.join(',') + '\n';

        // Check if file exists, if not create with header
        if (!fs.existsSync(datasetPath)) {
            fs.writeFileSync(datasetPath, csvHeader);
        }

        // Append new records
        const csvRows = newRecords.map(record =>
            requiredHeaders.map(header => {
                const value = record[header];
                // Escape commas and quotes in CSV values
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        ).join('\n') + '\n';

        fs.appendFileSync(datasetPath, csvRows);

        // Reload the analyzer with new data
        await analyzer.loadCSVData();

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'CSV data uploaded successfully',
            newRecords: newRecords.length,
            totalRecords: analyzer.reviews.length,
            previousTotal: originalRecordCount
        });

    } catch (error) {
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error('CSV upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/recommendations', (req, res) => {
    try {
        const preferences = req.body;
        console.log('📋 Received preferences:', preferences);

        // Debug: Show available phones and their brands
        const availablePhones = Array.from(analyzer.phones.values());
        console.log('📱 Available phones:', availablePhones.map(p => `${p.name} (${p.brand})`));

        const recommendations = analyzer.generateRecommendations(preferences);
        console.log('🎯 Generated recommendations:', recommendations.length);

        res.json({ recommendations });
    } catch (error) {
        console.error('❌ Recommendation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Removed enhanced recommendations - keeping only basic CSV-based recommendations

// Removed debug and analysis endpoints - keeping only recommendation system

// Removed GSMArena integration endpoints - keeping only basic recommendation system

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/smart-recommend.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'smart-recommend.html'));
});

app.get('/data-analysis.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'data-analysis.html'));
});

app.get('/upload-data.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload-data.html'));
});

app.get('/gsmarena-test.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'gsmarena-test.html'));
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Smart Recommendation Server running on http://localhost:${PORT}`);
    console.log('📊 Loading CSV data...');

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory');
    }

    try {
        await analyzer.loadCSVData();
        console.log('✅ CSV data loaded successfully!');
        console.log(`📱 Analyzed ${analyzer.phones.size} phones from ${analyzer.reviews.length} reviews`);
    } catch (error) {
        console.error('❌ Error loading CSV data:', error.message);
    }
});

module.exports = app;
