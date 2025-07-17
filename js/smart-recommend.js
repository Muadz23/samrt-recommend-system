// Smart Recommendation System Client
class SmartRecommendationClient {
    constructor() {
        this.baseURL = 'http://localhost:4000/api';
        this.isServerConnected = false;
        this.analysisData = null;
    }

    async init() {
        await this.checkServerConnection();
        if (this.isServerConnected) {
            await this.loadAnalysisData();
            this.setupEventListeners();
            this.showMainContent();
        }
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            if (response.ok) {
                this.isServerConnected = true;
                this.updateStatus('✅ Connected to smart recommendation server', 'success');
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.isServerConnected = false;
            this.updateStatus('❌ Server not available. Please start the Node.js server first.', 'error');
            this.showServerInstructions();
        }
    }

    async loadAnalysisData() {
        try {
            this.updateStatus('📊 Loading analysis data...', 'loading');
            
            const response = await fetch(`${this.baseURL}/analysis`);
            if (!response.ok) {
                throw new Error('Failed to load analysis data');
            }
            
            this.analysisData = await response.json();
            this.updateAnalysisStats();
            this.updateStatus('✅ Analysis data loaded successfully', 'success');
            
        } catch (error) {
            console.error('Error loading analysis data:', error);
            this.updateStatus('⚠️ Using fallback data', 'warning');
        }
    }

    updateStatus(message, type) {
        const statusBar = document.getElementById('statusBar');
        statusBar.innerHTML = message;
        statusBar.className = `status-bar ${type}`;
    }

    updateAnalysisStats() {
        if (this.analysisData) {
            document.getElementById('totalReviews').textContent = this.analysisData.totalReviews;
            document.getElementById('totalPhones').textContent = this.analysisData.totalPhones;
            document.getElementById('totalAspects').textContent = this.analysisData.totalAspects;
            document.getElementById('analysisStats').style.display = 'grid';
        }
    }

    showMainContent() {
        document.getElementById('mainContent').style.display = 'grid';
    }

    showServerInstructions() {
        const statusBar = document.getElementById('statusBar');
        statusBar.innerHTML = `
            <div style="text-align: left;">
                <h3>🚀 To start the smart recommendation server:</h3>
                <ol style="margin: 1rem 0; padding-left: 2rem;">
                    <li>Open terminal in the project directory</li>
                    <li>Run: <code style="background: rgba(0,0,0,0.2); padding: 0.2rem 0.5rem; border-radius: 4px;">npm install</code></li>
                    <li>Run: <code style="background: rgba(0,0,0,0.2); padding: 0.2rem 0.5rem; border-radius: 4px;">npm start</code></li>
                    <li>Refresh this page</li>
                </ol>
            </div>
        `;
    }

    setupEventListeners() {
        const form = document.getElementById('preferencesForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.getRecommendations();
        });
    }

    async getRecommendations() {
        const form = document.getElementById('preferencesForm');
        const formData = new FormData(form);
        
        const preferences = {
            budget: formData.get('budget'),
            primaryUse: formData.get('primaryUse'),
            brand: formData.get('brand'),
            features: formData.getAll('features')
        };

        // Debug: Log preferences
        console.log('📋 Sending preferences:', preferences);

        // Validate required fields
        if (!preferences.budget || !preferences.primaryUse) {
            this.showError('Please fill in all required fields');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`${this.baseURL}/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferences)
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations');
            }

            const data = await response.json();
            console.log('🎯 Received recommendations:', data);
            this.displayRecommendations(data.recommendations);

        } catch (error) {
            console.error('Error getting recommendations:', error);
            this.showError('Failed to get recommendations. Please try again.');
        }
    }

    showLoading() {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Analyzing your preferences and generating smart recommendations...</p>
            </div>
        `;
    }

    displayRecommendations(recommendations) {
        const resultsContent = document.getElementById('resultsContent');
        
        if (!recommendations || recommendations.length === 0) {
            resultsContent.innerHTML = `
                <div class="error">
                    <h3>No recommendations found</h3>
                    <p>Try adjusting your preferences and search again.</p>
                </div>
            `;
            return;
        }

        resultsContent.innerHTML = `
            <div class="recommendations-grid">
                ${recommendations.map(phone => this.createPhoneCard(phone)).join('')}
            </div>
        `;

        // Add click event listeners to phone cards
        const phoneCards = resultsContent.querySelectorAll('.phone-card');
        phoneCards.forEach(card => {
            card.addEventListener('click', () => {
                const phoneName = card.getAttribute('data-phone-name');
                this.showPhoneDetails(phoneName);
            });
        });
    }

    createPhoneCard(phone) {
        // Get top aspects for this phone
        let topAspects = [];
        let aspectTags = '';

        try {
            if (phone.aspects && typeof phone.aspects === 'object') {
                // Handle Map object from server
                if (phone.aspects instanceof Map) {
                    topAspects = Array.from(phone.aspects.entries())
                        .map(([name, data]) => ({ name, ...data }))
                        .sort((a, b) => b.impact - a.impact)
                        .slice(0, 3);
                } else {
                    // Handle plain object
                    topAspects = Object.entries(phone.aspects)
                        .map(([name, data]) => ({ name, ...data }))
                        .sort((a, b) => b.impact - a.impact)
                        .slice(0, 3);
                }

                aspectTags = topAspects.map(aspect =>
                    `<span class="aspect-tag">${aspect.name} (${aspect.impact || 0}%)</span>`
                ).join('');
            }
        } catch (error) {
            console.error('Error processing aspects:', error);
            aspectTags = '<span class="aspect-tag">No aspect data</span>';
        }

        return `
            <div class="phone-card" data-phone-name="${phone.name}">
                <div class="phone-header">
                    <div>
                        <div class="phone-name">${phone.name}</div>
                        <div class="phone-brand">${phone.brand}</div>
                    </div>
                    <div class="match-score">${phone.matchScore}% Match</div>
                </div>
                
                <div class="phone-metrics">
                    <div class="metric">
                        <span class="metric-value">${phone.avgRating.toFixed(1)}</span>
                        <span class="metric-label">Avg Rating</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${phone.totalReviews}</span>
                        <span class="metric-label">Reviews</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">RM${phone.priceRange}</span>
                        <span class="metric-label">Price</span>
                    </div>
                </div>

                <div class="phone-aspects">
                    ${aspectTags}
                </div>

                <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    <strong>Sentiment:</strong> 
                    <span style="color: #48bb78;">${phone.sentiments.positive} positive</span> | 
                    <span style="color: #f56565;">${phone.sentiments.negative} negative</span> | 
                    <span style="color: #ed8936;">${phone.sentiments.neutral} neutral</span>
                </div>
            </div>
        `;
    }

    showError(message) {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <div class="error">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async showPhoneDetails(phoneName) {
        try {
            console.log('📱 Fetching details for:', phoneName);

            // Get phone specifications from CSV data
            const response = await fetch(`/api/phone-specs/${encodeURIComponent(phoneName)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch phone details');
            }

            const data = await response.json();
            console.log('📊 Phone details:', data);

            this.displayPhoneModal(data);

        } catch (error) {
            console.error('Error fetching phone details:', error);
            alert('Failed to load phone details. Please try again.');
        }
    }

    displayPhoneModal(phoneData) {
        const modal = document.getElementById('phoneModal');
        const modalPhoneName = document.getElementById('modalPhoneName');
        const modalPhoneBrand = document.getElementById('modalPhoneBrand');
        const modalBody = document.getElementById('modalBody');

        // Set modal title
        modalPhoneName.textContent = phoneData.gsmarena_name || phoneData.original_name;
        modalPhoneBrand.textContent = phoneData.brand;

        // Create detailed phone information
        modalBody.innerHTML = `
            <div class="price-highlight">
                💰 RM${phoneData.price_myr}
            </div>

            <div class="phone-details-grid">
                <div class="phone-image-section">
                    <img src="${phoneData.main_image}" alt="${phoneData.gsmarena_name}" class="phone-detail-image"
                         onerror="this.src='https://via.placeholder.com/250x400/667eea/white?text=No+Image'">
                    <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
                        <strong>Available Colors:</strong><br>
                        ${phoneData.colors || 'Not specified'}
                    </p>
                </div>

                <div class="phone-specs-section">
                    <div class="spec-group">
                        <h3>📱 Display</h3>
                        <div class="spec-item">
                            <span class="spec-label">Size:</span>
                            <span class="spec-value">${phoneData.display_size || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Resolution:</span>
                            <span class="spec-value">${phoneData.display_resolution || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Type:</span>
                            <span class="spec-value">${phoneData.display_type || 'N/A'}</span>
                        </div>
                    </div>

                    <div class="spec-group">
                        <h3>⚡ Performance</h3>
                        <div class="spec-item">
                            <span class="spec-label">OS:</span>
                            <span class="spec-value">${phoneData.os || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Chipset:</span>
                            <span class="spec-value">${phoneData.chipset || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">CPU:</span>
                            <span class="spec-value">${phoneData.cpu || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">GPU:</span>
                            <span class="spec-value">${phoneData.gpu || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">RAM:</span>
                            <span class="spec-value">${phoneData.ram || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Storage:</span>
                            <span class="spec-value">${phoneData.storage || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="spec-group">
                <h3>📸 Camera</h3>
                <div class="spec-item">
                    <span class="spec-label">Main Camera:</span>
                    <span class="spec-value">${phoneData.main_camera || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Camera Features:</span>
                    <span class="spec-value">${phoneData.camera_features || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Video Recording:</span>
                    <span class="spec-value">${phoneData.camera_video || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Selfie Camera:</span>
                    <span class="spec-value">${phoneData.selfie_camera || 'N/A'}</span>
                </div>
            </div>

            <div class="spec-group">
                <h3>🔋 Battery & Build</h3>
                <div class="spec-item">
                    <span class="spec-label">Battery:</span>
                    <span class="spec-value">${phoneData.battery || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Charging:</span>
                    <span class="spec-value">${phoneData.charging || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Dimensions:</span>
                    <span class="spec-value">${phoneData.dimensions || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Weight:</span>
                    <span class="spec-value">${phoneData.weight || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Build:</span>
                    <span class="spec-value">${phoneData.build || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">SIM:</span>
                    <span class="spec-value">${phoneData.sim || 'N/A'}</span>
                </div>
            </div>

            <div class="spec-group">
                <h3>📅 Launch Information</h3>
                <div class="spec-item">
                    <span class="spec-label">Launch Date:</span>
                    <span class="spec-value">${phoneData.launch_date || 'N/A'}</span>
                </div>
                <div class="spec-item">
                    <span class="spec-label">Status:</span>
                    <span class="spec-value">${phoneData.status || 'N/A'}</span>
                </div>
            </div>
        `;

        // Show modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        const modal = document.getElementById('phoneModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Initialize the smart recommendation client
document.addEventListener('DOMContentLoaded', async () => {
    const client = new SmartRecommendationClient();
    await client.init();

    // Modal event listeners
    const modal = document.getElementById('phoneModal');
    const closeBtn = document.getElementById('closeModal');

    // Close modal when clicking the X button
    closeBtn.addEventListener('click', function() {
        client.closeModal();
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            client.closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            client.closeModal();
        }
    });
});
