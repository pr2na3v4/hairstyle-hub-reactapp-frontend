import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader'; 
import Swal from 'sweetalert2';
import './hairdetail.css';

const HairDetail = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [haircut, setHaircut] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false); 
  const [isZoomed, setIsZoomed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  // Loader Delay Logic: Only show loader if loading takes more than 800ms
  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setShowLoader(true);
      }, 800); 
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  // 1. Basic Data Load (Haircut & Comments)
  const loadInitialData = useCallback(async () => {
    if (!id || id === "undefined") return;
    setLoading(true);
    try {
      const [hairRes, commentRes] = await Promise.all([
        fetch(`${API_BASE}/haircuts`),
        fetch(`${API_BASE}/comments/${id}`)
      ]);

      const allData = await hairRes.json();
      const current = allData.find(x => (x._id?.$oid || x._id) === id);
      
      if (current) {
        setHaircut(current);
        const commentData = await commentRes.json();
        setComments(Array.isArray(commentData) ? commentData : []);
      }
    } catch (err) {
      console.error("Initial Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, API_BASE]);

  // 2. Like Status Fetcher (Refresh nantar state tikvnyasathi)
  const fetchLikeStatus = useCallback(async () => {
    if (!id || id === "undefined") return;

    try {
      let headers = {};
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/haircuts/${id}/like-status`, { headers });
      const data = await res.json();

      setLikesCount(data.likesCount || 0);
      setHasLiked(!!data.hasLiked);
      console.log("Verified Like Status:", data.hasLiked);
      
    } catch (err) {
      console.error("Like Status Error:", err);
    }
  }, [id, currentUser, API_BASE]);

  // Effect: Page load var data ghene
  useEffect(() => {
    window.scrollTo(0, 0);
    loadInitialData();
  }, [loadInitialData]);

  // Effect: User detect jhalya-var like status update karne
  useEffect(() => {
    fetchLikeStatus();
  }, [fetchLikeStatus, currentUser]);

  // 3. Like Toggle Handler
  const handleLike = async (e) => {
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
    
    const prevLiked = hasLiked;
    setHasLiked(!hasLiked);
    setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/haircuts/${id}/like`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      });
      const data = await res.json();
      
      setHasLiked(data.liked);
      setLikesCount(data.likesCount);

      if (data.liked) {
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
            .fire({ icon: 'success', title: 'Saved! ❤️' });
      }
    } catch (err) {
      setHasLiked(prevLiked);
    }
  };

  // 4. Comment Handler
  const postComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ haircutId: id, text: commentText, haircutName: haircut.name })
      });
      if (res.ok) {
        const newCmt = await res.json();
        setComments(prev => [newCmt, ...prev]);
        setCommentText("");
      }
    } catch (err) {
      console.error("Comment Error:", err);
    }
  };

  // --- REFACTORED LOADING RENDER ---
  if (showLoader) return <Loader />; 
  if (loading && !showLoader) return null; // Prevents "Style not found" flicker during the 800ms wait
  if (!haircut) return <div className="error-msg">Style not found.</div>;

  return (
    <div className="hair-detail-wrapper">
     {/* 🚀 Dynamic Title Logic Start */}
      <Helmet>
        <title>{`${haircut.name} | HairstyleHub`}</title>
        <meta name="description" content={`Explore the best ${haircut.name} for ${haircut.faceShape} face shape.`} />
      </Helmet>
      {/* Dynamic Title Logic End */}

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
          <button className={`action-fab like ${hasLiked ? 'active' : ''}`} onClick={handleLike}>
            <i className={hasLiked ? "ri-heart-fill" : "ri-heart-line"}></i>
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="title-section">
          <h1>{haircut.name}</h1>
          <span className="like-badge">{likesCount} likes</span>
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
              disabled={!currentUser}
            />
            <button onClick={postComment} disabled={!currentUser || !commentText.trim()}>
              <i className="ri-send-plane-2-fill"></i>
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
  );
};

export default HairDetail;