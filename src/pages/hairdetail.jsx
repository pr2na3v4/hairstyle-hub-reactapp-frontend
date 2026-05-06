import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // NEW
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

  // Fetch/Reuse Haircut Data
  const { data: haircuts = [], isLoading: hairLoading } = useQuery({
    queryKey: ['haircuts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/haircuts`);
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
  });

  // Find current haircut from cache
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
        const token = await currentUser.getIdToken(true);
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/haircuts/${id}/like-status`, { headers });
      return res.json();
    },
    enabled: !!id,
  });

  // --- 2. Mutations ---

  // Toggle Like Mutation
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
      return res.json();
    },
    onSuccess: (data) => {
      // Update the cache directly
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], data);
      if (data.liked) {
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
            .fire({ icon: 'success', title: 'Saved! ❤️' });
      }
    }
  });

  // Post Comment Mutation
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
        text: 'Please login to save your favorite styles!',
        icon: 'info',
        confirmButtonText: 'Login Now',
        confirmButtonColor: '#ff4757',
        showCancelButton: true,
      }).then((res) => { if (res.isConfirmed) navigate('/login'); });
    }
    likeMutation.mutate();
  };

  const postComment = () => {
    if (!commentText.trim() || !currentUser) return;
    commentMutation.mutate(commentText);
  };

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // --- Rendering ---
  
  if (hairLoading || commentsLoading) return <Loader />;
  if (!haircut) return <div className="error-msg">Style not found.</div>;

  return (
    <>
      <div className="hair-detail-wrapper">
        <Helmet>
          <title>{`${haircut.name} | HairstyleHub`}</title>
          <meta name="description" content={`Explore the best ${haircut.name} for ${haircut.faceShape} face shape.`} />
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
          <img src={haircut.imageUrl} alt={haircut.name} className="hero-img" />
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
            <span className="like-badge">{likeStatus.likesCount} likes</span>
          </div>

          <div className="specs-grid">
             <div className="spec-item"><span className="spec-label">Length</span><span className="spec-value">{haircut.hairLength}</span></div>
             <div className="spec-item"><span className="spec-label">Face Shape</span><span className="spec-value">{Array.isArray(haircut.faceShape) ? haircut.faceShape.join(", ") : haircut.faceShape}</span></div>
          </div>

          <div className="tags-container">
            {haircut.tags?.map(tag => <span key={tag} className="detail-tag">#{tag}</span>)}
          </div>

          <hr className="divider" />

          <section className="comments-section">
            <h3>Community ({comments.length})</h3>
            <div className="comment-input-wrapper">
              <input 
                type="text" 
                placeholder={currentUser ? "Add a comment..." : "Login to comment"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!currentUser || commentMutation.isPending}
              />
              <button onClick={postComment} disabled={!currentUser || !commentText.trim() || commentMutation.isPending}>
                <i className={commentMutation.isPending ? "ri-loader-4-line spin" : "ri-send-plane-2-fill"}></i>
              </button>
            </div>

            <div className="comment-list">
               {comments.map(cmt => (
                 <div key={cmt._id?.$oid || cmt._id} className="comment-card">
                   <img src={cmt.userPhoto || 'https://www.w3schools.com/howto/img_avatar.png'} alt="user" />
                   <div className="comment-info">
                     <p className="comment-user">{cmt.userName || "User"}</p>
                     <p className="comment-text">{cmt.text}</p>
                   </div>
                 </div>
               ))}
            </div>
          </section>
        </div>
      </div>
      
      <div className="related-styles">
        <h2>Related Styles</h2>
        {/* Pass the actual face shape value/array to the related component */}
        <Categories showAll={false} faceShapeFilter={haircut.faceShape} currentUser={currentUser} />
      </div>
    </>
  );
};

export default HairDetail;