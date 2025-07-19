import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

// TypeScript interfaces
interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  price_tier: string;
  thumbnail_image: string;
  description: string;
  amenities: string[];
  created_at: string;
}

interface ApiError {
  detail: string;
}

// Price tier colors
const getPriceTierColor = (tier: string): string => {
  switch (tier.toLowerCase()) {
    case 'luxury':
      return 'from-yellow-400 to-yellow-600';
    case 'ultra-luxury':
      return 'from-yellow-300 to-amber-500';
    case 'presidential':
      return 'from-amber-200 to-yellow-500';
    default:
      return 'from-yellow-400 to-yellow-600';
  }
};

// Star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center space-x-1" role="img" aria-label={`Rating: ${rating} out of 5 stars`}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= Math.floor(rating);
        const isHalf = starValue === Math.ceil(rating) && rating % 1 !== 0;
        
        return (
          <div key={index} className="relative">
            {isHalf ? (
              <div className="relative">
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <svg
                  className="w-5 h-5 text-yellow-400 absolute top-0 left-0 overflow-hidden"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                  aria-hidden="true"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            ) : (
              <svg
                className={`w-5 h-5 ${isFilled ? 'text-yellow-400' : 'text-gray-600'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
        );
      })}
      <span className="ml-2 text-sm text-yellow-300 font-medium">{rating.toFixed(1)}</span>
    </div>
  );
};

// Hotel card component
const HotelCard: React.FC<{ hotel: Hotel }> = ({ hotel }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <article 
      className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 group border border-gray-800 hover:border-yellow-500/30"
      role="article"
      aria-labelledby={`hotel-${hotel.id}-name`}
    >
      {/* Image Container */}
      <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
        {!imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img
              src={hotel.thumbnail_image}
              alt={`Luxury view of ${hotel.name} in ${hotel.location}`}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-400 text-sm">Hotel Image</p>
            </div>
          </div>
        )}
        
        {/* Price tier badge */}
        <div className="absolute top-4 left-4 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full">
          <span className={`bg-gradient-to-r ${getPriceTierColor(hotel.price_tier)} bg-clip-text text-transparent font-bold text-sm sm:text-base`}>
            {hotel.price_tier}
          </span>
        </div>

        {/* Rating overlay */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-300 font-semibold text-sm">{hotel.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8">
        {/* Hotel name */}
        <h2 
          id={`hotel-${hotel.id}-name`}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors duration-300"
        >
          {hotel.name}
        </h2>

        {/* Location */}
        <div className="flex items-center mb-4 text-gray-300">
          <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm sm:text-base lg:text-lg font-medium">{hotel.location}</span>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <StarRating rating={hotel.rating} />
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm sm:text-base lg:text-lg leading-relaxed mb-6 line-clamp-3">
          {hotel.description}
        </p>

        {/* Amenities */}
        <div className="space-y-3">
          <h3 className="text-yellow-300 font-semibold text-sm sm:text-base uppercase tracking-wide">
            Luxury Amenities
          </h3>
          <div className="flex flex-wrap gap-2">
            {hotel.amenities.slice(0, 4).map((amenity, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-200 text-xs sm:text-sm rounded-full border border-yellow-500/30 backdrop-blur-sm hover:bg-yellow-500/30 transition-colors duration-300"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 4 && (
              <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs sm:text-sm rounded-full border border-gray-700">
                +{hotel.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          <button 
            className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold text-sm sm:text-base lg:text-lg rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg hover:shadow-yellow-500/25"
            aria-label={`View details for ${hotel.name}`}
          >
            Experience Luxury
          </button>
        </div>
      </div>
    </article>
  );
};

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading hotels">
    <div className="relative">
      {/* Outer ring */}
      <div className="w-20 h-20 border-4 border-gray-700 border-t-yellow-500 rounded-full animate-spin"></div>
      {/* Inner ring */}
      <div className="absolute top-2 left-2 w-16 h-16 border-4 border-gray-800 border-t-amber-400 rounded-full animate-spin animation-delay-150"></div>
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
    </div>
    <span className="sr-only">Loading luxury hotels...</span>
  </div>
);

// Error component
const ErrorMessage: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="text-center py-12" role="alert">
    <div className="mb-6">
      <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.083 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Hotels</h2>
      <p className="text-gray-400 mb-6">{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Main component
const LuxuryHotels: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}/api`;

  const fetchHotels = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get<Hotel[]>(`${API_URL}/hotels`, {
        timeout: 10000,
      });
      
      setHotels(response.data);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Failed to load luxury hotels. Please try again.';
      setError(errorMessage);
      console.error('Error fetching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-gray-900 via-black to-gray-900 py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 opacity-50">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Luxury
            </span>{' '}
            Hotels
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Discover the world's most exclusive destinations where elegance meets exceptional service
          </p>
          <div className="mt-8 flex items-center justify-center space-x-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse animation-delay-300"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse animation-delay-600"></div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage error={error} onRetry={fetchHotels} />
        ) : (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12"
            role="region"
            aria-label="Luxury hotels collection"
          >
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hotels.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-20 h-20 text-gray-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">No Hotels Available</h2>
            <p className="text-gray-400">Check back soon for new luxury destinations.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm sm:text-base">
            Curated collection of the world's finest luxury accommodations
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LuxuryHotels;