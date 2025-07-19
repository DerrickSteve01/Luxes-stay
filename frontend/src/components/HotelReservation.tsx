import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios, { AxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';

// TypeScript interfaces
interface ReservationFormData {
  hotel_id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  room_type: string;
  special_requests: string;
}

interface ReservationResponse {
  id: string;
  hotel_name: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  room_type: string;
  special_requests: string;
  total_nights: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  price_tier: string;
  thumbnail_image: string;
  description: string;
}

interface ApiError {
  detail: string;
}

// Validation schema
const reservationSchema = yup.object({
  hotel_id: yup
    .string()
    .required('Please select a hotel'),
  check_in_date: yup
    .string()
    .required('Check-in date is required')
    .test('future-date', 'Check-in date must be today or in the future', function(value) {
      if (!value) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkIn = new Date(value);
      return checkIn >= today;
    }),
  check_out_date: yup
    .string()
    .required('Check-out date is required')
    .test('after-checkin', 'Check-out must be after check-in date', function(value) {
      const { check_in_date } = this.parent;
      if (!value || !check_in_date) return false;
      return new Date(value) > new Date(check_in_date);
    }),
  guests: yup
    .number()
    .required('Number of guests is required')
    .min(1, 'At least 1 guest is required')
    .max(8, 'Maximum 8 guests allowed')
    .integer('Number of guests must be a whole number'),
  room_type: yup
    .string()
    .required('Please select a room type'),
  special_requests: yup
    .string()
    .max(500, 'Special requests must be less than 500 characters'),
});

// Room type options
const roomTypes = [
  { value: 'standard', label: 'Standard Room', price: '1x base price' },
  { value: 'deluxe', label: 'Deluxe Room', price: '1.3x base price' },
  { value: 'suite', label: 'Executive Suite', price: '1.8x base price' },
  { value: 'presidential', label: 'Presidential Suite', price: '2.5x base price' },
];

// Hotel options (should match backend)
const availableHotels = [
  { id: 'ritz-carlton-ny', name: 'The Ritz-Carlton New York', location: 'New York, NY' },
  { id: 'four-seasons-paris', name: 'Four Seasons Hotel George V', location: 'Paris, France' },
  { id: 'burj-al-arab', name: 'Burj Al Arab', location: 'Dubai, UAE' },
  { id: 'aman-tokyo', name: 'Aman Tokyo', location: 'Tokyo, Japan' },
  { id: 'plaza-athenee', name: 'Hotel Plaza Athénée', location: 'Paris, France' },
  { id: 'st-regis-bora', name: 'The St. Regis Bora Bora', location: 'Bora Bora, French Polynesia' },
  { id: 'savoy-london', name: 'The Savoy London', location: 'London, UK' },
  { id: 'oneonly-cape', name: 'One&Only Cape Town', location: 'Cape Town, South Africa' },
];

// Success confirmation component
const BookingConfirmation: React.FC<{ reservation: ReservationResponse; onNewBooking: () => void }> = ({ 
  reservation, 
  onNewBooking 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h1>
            <p className="text-green-100">Your luxury reservation has been successfully created</p>
          </div>
        </div>

        {/* Reservation Details */}
        <div className="p-8">
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reservation Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Hotel</h3>
                <p className="text-gray-900">{reservation.hotel_name}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Confirmation Number</h3>
                <p className="text-gray-900 font-mono">{reservation.id.slice(0, 8).toUpperCase()}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Check-in Date</h3>
                <p className="text-gray-900">
                  {new Date(reservation.check_in_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Check-out Date</h3>
                <p className="text-gray-900">
                  {new Date(reservation.check_out_date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Guests</h3>
                <p className="text-gray-900">{reservation.guests} {reservation.guests === 1 ? 'guest' : 'guests'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Room Type</h3>
                <p className="text-gray-900 capitalize">{reservation.room_type.replace('_', ' ')}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Total Nights</h3>
                <p className="text-gray-900">{reservation.total_nights} {reservation.total_nights === 1 ? 'night' : 'nights'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Total Price</h3>
                <p className="text-2xl font-bold text-green-600">${reservation.total_price.toLocaleString()}</p>
              </div>
            </div>
            
            {reservation.special_requests && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-700 mb-2">Special Requests</h3>
                <p className="text-gray-900 bg-white p-4 rounded-lg border">{reservation.special_requests}</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onNewBooking}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Make Another Booking
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Print Confirmation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main reservation component
const HotelReservation: React.FC = () => {
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [serverError, setServerError] = useState<string>('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API_URL = `${BACKEND_URL}/api`;

  // Get hotel from URL params
  const preselectedHotelId = searchParams.get('hotel');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<ReservationFormData>({
    resolver: yupResolver(reservationSchema),
    defaultValues: {
      hotel_id: preselectedHotelId || '',
      check_in_date: '',
      check_out_date: '',
      guests: 2,
      room_type: '',
      special_requests: '',
    },
  });

  // Watch dates for dynamic updates
  const watchedCheckIn = watch('check_in_date');
  const watchedCheckOut = watch('check_out_date');
  const watchedGuests = watch('guests');

  // Calculate nights
  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights(watchedCheckIn, watchedCheckOut);

  // Set minimum dates
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Update minimum check-out date when check-in changes
  useEffect(() => {
    if (watchedCheckIn) {
      const nextDay = new Date(watchedCheckIn);
      nextDay.setDate(nextDay.getDate() + 1);
      const minCheckOut = nextDay.toISOString().split('T')[0];
      
      if (watchedCheckOut && watchedCheckOut <= watchedCheckIn) {
        setValue('check_out_date', minCheckOut);
      }
    }
  }, [watchedCheckIn, watchedCheckOut, setValue]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const onSubmit: SubmitHandler<ReservationFormData> = async (data) => {
    try {
      setServerError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      // Convert dates to ISO format for backend
      const requestData = {
        ...data,
        check_in_date: new Date(data.check_in_date + 'T15:00:00').toISOString(),
        check_out_date: new Date(data.check_out_date + 'T11:00:00').toISOString(),
        guests: Number(data.guests),
      };
      
      const response = await axios.post<ReservationResponse>(
        `${API_URL}/reservations`,
        requestData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      
      setReservation(response.data);
      reset();
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Failed to create reservation. Please try again.';
      setServerError(errorMessage);
      console.error('Reservation error:', error);
    }
  };

  const handleNewBooking = () => {
    setReservation(null);
    setServerError('');
    reset();
  };

  // Show confirmation if reservation is successful
  if (reservation) {
    return <BookingConfirmation reservation={reservation} onNewBooking={handleNewBooking} />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/hotels')}
                className="text-white hover:text-purple-300 transition-colors"
                aria-label="Back to hotels"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">Make a Reservation</h1>
            </div>
            <div className="text-white text-sm">
              Welcome, {user.first_name}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 sm:p-12">
            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Book Your Luxury Stay</h2>
              <p className="text-gray-600">Complete the form below to reserve your perfect accommodation</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
              {/* Hotel Selection */}
              <div>
                <label htmlFor="hotel_id" className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Hotel <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('hotel_id')}
                  id="hotel_id"
                  className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    errors.hotel_id
                      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                  }`}
                  aria-invalid={errors.hotel_id ? 'true' : 'false'}
                  aria-describedby={errors.hotel_id ? 'hotel-error' : undefined}
                >
                  <option value="">Choose your luxury hotel...</option>
                  {availableHotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name} - {hotel.location}
                    </option>
                  ))}
                </select>
                {errors.hotel_id && (
                  <p id="hotel-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.hotel_id.message}
                  </p>
                )}
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Check-in Date */}
                <div>
                  <label htmlFor="check_in_date" className="block text-sm font-semibold text-gray-700 mb-3">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('check_in_date')}
                    type="date"
                    id="check_in_date"
                    min={today}
                    className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.check_in_date
                        ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                    }`}
                    aria-invalid={errors.check_in_date ? 'true' : 'false'}
                    aria-describedby={errors.check_in_date ? 'checkin-error' : undefined}
                  />
                  {errors.check_in_date && (
                    <p id="checkin-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.check_in_date.message}
                    </p>
                  )}
                </div>

                {/* Check-out Date */}
                <div>
                  <label htmlFor="check_out_date" className="block text-sm font-semibold text-gray-700 mb-3">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('check_out_date')}
                    type="date"
                    id="check_out_date"
                    min={watchedCheckIn ? new Date(new Date(watchedCheckIn).getTime() + 86400000).toISOString().split('T')[0] : tomorrow}
                    className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.check_out_date
                        ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                    }`}
                    aria-invalid={errors.check_out_date ? 'true' : 'false'}
                    aria-describedby={errors.check_out_date ? 'checkout-error' : undefined}
                  />
                  {errors.check_out_date && (
                    <p id="checkout-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.check_out_date.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Nights Display */}
              {nights > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-purple-800 font-semibold">
                      {nights} {nights === 1 ? 'night' : 'nights'} stay
                    </span>
                  </div>
                </div>
              )}

              {/* Guests and Room Type Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Number of Guests */}
                <div>
                  <label htmlFor="guests" className="block text-sm font-semibold text-gray-700 mb-3">
                    Number of Guests <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="guests"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="guests"
                        className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          errors.guests
                            ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                        }`}
                        aria-invalid={errors.guests ? 'true' : 'false'}
                        aria-describedby={errors.guests ? 'guests-error' : undefined}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'guest' : 'guests'}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.guests && (
                    <p id="guests-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.guests.message}
                    </p>
                  )}
                </div>

                {/* Room Type */}
                <div>
                  <label htmlFor="room_type" className="block text-sm font-semibold text-gray-700 mb-3">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('room_type')}
                    id="room_type"
                    className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      errors.room_type
                        ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                    }`}
                    aria-invalid={errors.room_type ? 'true' : 'false'}
                    aria-describedby={errors.room_type ? 'room-error' : undefined}
                  >
                    <option value="">Select room type...</option>
                    {roomTypes.map((room) => (
                      <option key={room.value} value={room.value}>
                        {room.label} ({room.price})
                      </option>
                    ))}
                  </select>
                  {errors.room_type && (
                    <p id="room-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.room_type.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label htmlFor="special_requests" className="block text-sm font-semibold text-gray-700 mb-3">
                  Special Requests <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  {...register('special_requests')}
                  id="special_requests"
                  rows={4}
                  placeholder="Any special arrangements, dietary requirements, or preferences..."
                  className={`w-full px-4 py-4 border rounded-xl transition-all duration-200 text-base focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none ${
                    errors.special_requests
                      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 bg-gray-50 focus:ring-purple-500 focus:border-purple-500 hover:border-gray-400'
                  }`}
                  aria-invalid={errors.special_requests ? 'true' : 'false'}
                  aria-describedby={errors.special_requests ? 'requests-error' : undefined}
                />
                {errors.special_requests && (
                  <p id="requests-error" className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.special_requests.message}
                  </p>
                )}
              </div>

              {/* Server Error Summary */}
              {serverError && (
                <div 
                  className="bg-red-50 border border-red-200 rounded-xl p-4"
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Reservation Error</h3>
                      <p className="mt-1 text-sm text-red-700">{serverError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-8 rounded-xl font-bold text-white text-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 active:scale-95'
                }`}
                aria-describedby={isSubmitting ? 'submitting-status' : undefined}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <svg 
                      className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span id="submitting-status">Processing Reservation...</span>
                  </div>
                ) : (
                  'Complete Reservation'
                )}
              </button>

              {/* Form Footer */}
              <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-xl p-4">
                <p className="flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your reservation is secure and protected
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HotelReservation;