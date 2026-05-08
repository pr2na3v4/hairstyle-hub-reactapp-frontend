import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Loader from '../components/Loader'; 
import Categories from './categories';
import Swal from 'sweetalert2';
import './hairdetail.css';

const HairDetail = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // --- 1. Queries ---
  
  // Fetch Haircuts (Cached)
  const { data: haircuts = [], isLoading: hairLoading } = useQuery({
    queryKey: ['haircuts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/haircuts`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  const haircut = haircuts.find(x => (x._id?.$oid || x._id) === id);

  // Fetch Comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/comments/${id}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
  });

  // Fetch Like Status
  const { data: likeStatus = { likesCount: 0, hasLiked: false } } = useQuery({
    queryKey: ['likeStatus', id, currentUser?.uid],
    queryFn: async () => {
      let headers = {};
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/haircuts/${id}/like-status`, { headers });
      return res.json();
    },
    enabled: !!id,
  });

  // --- 2. Mutations (Optimized) ---

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/haircuts/${id}/like`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      if (!res.ok) throw new Error('Like failed');
      return res.json();
    },
    // OPTIMISTIC UPDATE: Update UI BEFORE the server responds
    onMutate: async () => {
      // Stop any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['likeStatus', id, currentUser?.uid] });

      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData(['likeStatus', id, currentUser?.uid]);

      // Optimistically update to the new value
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], (old) => ({
        ...old,
        hasLiked: !old?.hasLiked,
        likesCount: old?.hasLiked ? (old.likesCount - 1) : (old.likesCount + 1)
      }));

      return { previousStatus };
    },
    // If the server call succeeds
    onSuccess: (data) => {
      // Sync the cache with actual server data (in case count is different)
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], data);

      // Trigger the SweetAlert
      const isNowLiked = data.liked || data.hasLiked;
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        // Ensure it sits on top of everything
        didOpen: (toast) => {
          toast.style.zIndex = '10000';
        }
      });

      Toast.fire({
        icon: 'success',
        title: isNowLiked ? 'Saved to Favorites! ❤️' : 'Removed from Favorites'
      });
    },
    // If the server fails, roll back to the old state
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], context.previousStatus);
      Swal.fire('Error', 'Could not sync with server. Try again.', 'error');
    },
    // Always refetch after error or success to make sure we are in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likeStatus', id, currentUser?.uid] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (text) => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ haircutId: id, text, haircutName: haircut.name })
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    }
  });

  // --- Handlers ---

  const handleLike = (e) => {
    e.stopPropagation(); 
    if (!currentUser) {
      return Swal.fire({
        title: 'Login Required',
        text: 'Save your favorite styles!',
        icon: 'info',
        confirmButtonText: 'Login Now',
        showCancelButton: true,
      }).then((res) => { if (res.isConfirmed) navigate('/login'); });
    }
    likeMutation.mutate();
  };

  const postComment = (e) => {
    if (e) e.preventDefault(); // Prevent accidental form triggers
    if (!commentText.trim() || !currentUser) return;
    commentMutation.mutate(commentText);
  };

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (hairLoading || commentsLoading) return <Loader />;
  if (!haircut) return <div className="error-msg">Style not found.</div>;

  return (
    <>
    <div className="hair-detail-wrapper animate-fade-in">
      <Helmet>
        <title>{`${haircut.name} | Style Finder`}</title>
      </Helmet>

      {isZoomed && (
        <div className="image-lightbox active" onClick={() => setIsZoomed(false)}>
          <img src={haircut.imageUrl} alt="Zoomed" className="enlarged-img" />
        </div>
      )}

      <div className="detail-header" onClick={() => setIsZoomed(true)}>
        <button className="back-btn" onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
          <i className="ri-arrow-left-s-line"></i>
        </button>
        <img src={haircut.imageUrl} alt={haircut.name} className="hero-img" loading="eager" />
        <div className="floating-actions">
          <button 
            className={`action-fab like ${likeStatus.hasLiked ? 'active' : ''}`} 
            onClick={handleLike}
            disabled={likeMutation.isPending}
          >
            <i className={likeStatus.hasLiked ? "ri-heart-fill" : "ri-heart-line"}></i>
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="title-section">
          <h1>{haircut.name}</h1>
          <span className="like-badge">{likeStatus.likesCount} styles like this</span>
        </div>

        <div className="specs-grid">
           <div className="spec-item">
              <i className="ri-ruler-line"></i>
              <div>
                <span className="spec-label">Length</span>
                <span className="spec-value">{haircut.hairLength}</span>
              </div>
           </div>
           <div className="spec-item">
              <i className="ri-user-smile-line"></i>
              <div>
                <span className="spec-label">Best For</span>
                <span className="spec-value">{Array.isArray(haircut.faceShape) ? haircut.faceShape.join(", ") : haircut.faceShape}</span>
              </div>
           </div>
        </div>

        <div className="tags-container">
          {haircut.tags?.map(tag => <span key={tag} className="detail-tag">#{tag}</span>)}
        </div>

        <hr className="divider" />

        <section className="comments-section">
          <h3 className="section-title">Community Feed ({comments.length})</h3>
          <form className="comment-input-wrapper" onSubmit={postComment}>
            <input 
              type="text" 
              placeholder={currentUser ? "Write a comment..." : "Login to join the talk"}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!currentUser || commentMutation.isPending}
            />
            <button type="submit" disabled={!currentUser || !commentText.trim() || commentMutation.isPending}>
              <i className={commentMutation.isPending ? "ri-loader-4-line spin" : "ri-send-plane-2-fill"}></i>
            </button>
          </form>

          <div className="comment-list">
             {comments.length > 0 ? comments.map(cmt => (
               <div key={cmt._id?.$oid || cmt._id} className="comment-card">
                 <img src={cmt.userPhoto || 'https://www.w3schools.com/howto/img_avatar.png'} alt="user" loading="lazy" />
                 <div className="comment-info">
                   <p className="comment-user">{cmt.userName || "User"}</p>
                   <p className="comment-text">{cmt.text}</p>
                 </div>
               </div>
             )) : <p className="empty-comments">Be the first to comment!</p>}
          </div>
        </section>
      </div>
     </div>
      <div className="related-styles">
        <h2 className="related-title">More for {Array.isArray(haircut.faceShape) ? haircut.faceShape[0] : haircut.faceShape} Faces</h2>
        <Categories showAll={false} faceShapeFilter={haircut.faceShape} currentUser={currentUser} />
      </div>
   </>
  );
};

export default HairDetail;