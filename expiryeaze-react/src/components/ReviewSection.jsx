import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Edit, Trash2, Plus } from 'lucide-react';
import axios from 'axios';
import { config } from '../lib/config';
import ReviewModal from './ReviewModal';
import { useAuth } from '../contexts/AuthContext';

const ReviewSection = ({ vendorId, vendorName }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  
  // Bulletproof default state so it never crashes
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    numReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const API_URL = config.API_URL;

  useEffect(() => {
    if (vendorId) {
      fetchReviews();
      if (user) {
        fetchMyReview();
      }
    }
  }, [vendorId, user]);

  const fetchReviews = async (page = 1) => {
    try {
      const response = await axios.get(
        `${API_URL}/reviews/vendor/${vendorId}?page=${page}&limit=5`
      );
      
      if (response.data.success) {
        const { reviews, ratingStats, pagination } = response.data.data;
        if (page === 1) {
          setReviews(reviews || []);
        } else {
          setReviews(prev => [...prev, ...(reviews || [])]);
        }
        
        // Safely update stats to prevent crashes if backend data is missing
        if (ratingStats) {
           setRatingStats({
             averageRating: ratingStats.averageRating || 0,
             numReviews: ratingStats.numReviews || 0,
             ratingDistribution: ratingStats.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
           });
        }
        
        setHasMore(pagination?.hasNext || false);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/reviews/vendor/${vendorId}/my-review`,
        {
          headers: { Authorization: `Bearer ${token}` },
          // Backend returns 404 when this user has no review yet — not an app error
          validateStatus: (status) => status === 200 || status === 404,
        }
      );
      if (response.status === 404) {
        setMyReview(null);
        return;
      }
      if (response.data?.success) {
        setMyReview(response.data.data);
      }
    } catch {
      setMyReview(null);
    }
  };

  const handleReviewSubmit = (newReview) => {
    if (myReview) {
      setReviews(prev => prev.map(review => review._id === newReview._id ? newReview : review));
      setMyReview(newReview);
    } else {
      setReviews(prev => [newReview, ...prev]);
      setMyReview(newReview);
      setRatingStats(prev => ({ ...prev, numReviews: prev.numReviews + 1 }));
    }
    fetchReviews();
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(prev => prev.filter(review => review._id !== reviewId));
      setMyReview(null);
      setRatingStats(prev => ({ ...prev, numReviews: Math.max(0, prev.numReviews - 1) }));
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleMarkHelpful = async (reviewId, helpful) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/reviews/${reviewId}/helpful`,
        { helpful },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(prev => 
        prev.map(review => {
          if (review._id === reviewId) {
            const existingHelpful = review.helpful?.find(h => h.user === user.id);
            if (existingHelpful) {
              existingHelpful.helpful = helpful;
            } else {
              review.helpful = review.helpful || [];
              review.helpful.push({ user: user.id, helpful });
            }
          }
          return review;
        })
      );
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const loadMoreReviews = () => fetchReviews(currentPage + 1);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // Safe fallback values for UI display
  const safeAverage = ratingStats?.averageRating || 0;
  const safeTotal = ratingStats?.numReviews || 0;
  const safeDistribution = ratingStats?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (loading) {
    return (
      <div className="container px-3 px-md-4 py-4">
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-3 px-md-4 my-4 my-md-5">
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        {/* --- HEADER & STATS --- */}
        <div className="p-4 p-lg-5 bg-light border-bottom d-flex flex-column flex-md-row align-items-center justify-content-between gap-4">
        
        {/* Left Side: Averages */}
        <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-4 w-100 min-w-0">
          <div className="text-center flex-shrink-0">
            <h2 className="display-4 fw-bold text-dark mb-0">{safeAverage.toFixed(1)}</h2>
            <div className="d-flex justify-content-center my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  fill={star <= Math.round(safeAverage) ? "#ffc107" : "none"}
                  color={star <= Math.round(safeAverage) ? "#ffc107" : "#dee2e6"}
                />
              ))}
            </div>
            <p className="small text-muted fw-semibold mb-0">Based on {safeTotal} reviews</p>
          </div>

          <div className="d-none d-md-block border-end h-100 mx-2" style={{ minHeight: '80px' }}></div>

          {/* Right Side: Rating Bars */}
          <div className="flex-grow-1 min-w-0 w-100" style={{ minWidth: 0 }}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = safeDistribution[rating] || 0;
              const percentage = safeTotal > 0 ? (count / safeTotal) * 100 : 0;
              
              return (
                <div key={rating} className="d-flex align-items-center gap-2 mb-1" style={{ fontSize: '13px' }}>
                  <span className="fw-semibold text-secondary" style={{ width: '12px' }}>{rating}</span>
                  <Star size={10} fill="#6c757d" color="#6c757d" />
                  <div className="progress flex-grow-1" style={{ height: '6px' }}>
                    <div 
                      className="progress-bar bg-warning" 
                      role="progressbar" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-muted text-end" style={{ width: '24px' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 mt-md-0 w-100 w-md-auto">
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="btn btn-success btn-lg d-flex align-items-center justify-content-center gap-2 w-100 rounded-3"
          >
            {myReview ? <Edit size={18} /> : <Plus size={18} />}
            {myReview ? 'Edit Your Review' : 'Write a Review'}
          </button>
        </div>
        </div>

        {/* --- REVIEWS LIST --- */}
        {reviews.length > 0 && (
        <div className="p-4 p-lg-5">
          <div className="d-flex flex-column gap-4">
            {reviews.map((review) => (
              <div key={review._id} className="border-bottom pb-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  
                  {/* User Profile Info */}
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-success text-white d-flex align-items-center justify-content-center rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }}>
                      <span className="fw-bold fs-5">
                        {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">{review.user?.name || 'Anonymous'}</h6>
                      <small className="text-muted">{formatDate(review.createdAt)}</small>
                    </div>
                  </div>
                  
                  {/* Edit/Delete Actions for Owner */}
                  {user && review.user?._id === user.id && (
                    <div className="d-flex gap-2 bg-light rounded p-1">
                      <button
                        type="button"
                        onClick={() => { setMyReview(review); setShowReviewModal(true); }}
                        className="btn btn-sm btn-outline-success"
                        title="Edit review"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review._id)}
                        className="btn btn-sm btn-outline-danger"
                        title="Delete review"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Stars */}
                <div className="d-flex align-items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      fill={star <= review.rating ? "#ffc107" : "none"}
                      color={star <= review.rating ? "#ffc107" : "#dee2e6"}
                    />
                  ))}
                </div>

                {/* Review Content */}
                <h5 className="fw-bold text-dark mb-2 text-break">{review.title}</h5>
                <p className="text-secondary mb-3 text-break">{review.comment}</p>

                {/* Attached Images */}
                {review.images && review.images.length > 0 && (
                  <div className="d-flex gap-3 mb-3 overflow-auto">
                    {review.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Review attachment ${index + 1}`}
                        className="rounded border shadow-sm"
                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                      />
                    ))}
                  </div>
                )}

                {/* Helpful Button */}
                {user && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const isHelpful = review.helpful?.find(h => h.user === user.id)?.helpful;
                        handleMarkHelpful(review._id, !isHelpful);
                      }}
                      className={`btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 fw-semibold ${
                        review.helpful?.find(h => h.user === user.id)?.helpful
                          ? 'btn-success'
                          : 'btn-outline-success'
                      }`}
                    >
                      <ThumbsUp size={14} fill={review.helpful?.find(h => h.user === user.id)?.helpful ? "currentColor" : "none"} />
                      Helpful ({review.helpful?.filter(h => h.helpful).length || 0})
                    </button>
                  </div>
                )}
              </div>
            ))}

            {hasMore && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={loadMoreReviews}
                  className="btn btn-outline-success px-5 py-2 fw-bold rounded-3"
                >
                  Load More Reviews
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          if(!myReview) setMyReview(null);
        }}
        vendorId={vendorId}
        vendorName={vendorName}
        onReviewSubmit={handleReviewSubmit}
        existingReview={myReview}
      />
    </div>
  );
};

export default ReviewSection;