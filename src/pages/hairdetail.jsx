import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './hairdetail.css';

const HairDetail = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [haircut, setHaircut] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false); // Zoom Logic state

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAllData();
  }, [id, currentUser]);

  const loadAllData = async () => {
    if (!id || id === "undefined") return;
    setLoading(true);
    try {
      // 1. Fetch Main Haircut
      const res = await fetch(`${API_BASE}/haircuts`);
      const allData = await res.json();
      const current = allData.find(x => (x._id.$oid || x._id) === id);
      
      if (current) {
        setHaircut(current);
      }

      // 2. Fetch Comments
      const commentRes = await fetch(`${API_BASE}/comments/${id}`);
      const commentData = await commentRes.json();
      setComments(commentData);

      // 3. Fetch Like Status
      let headers = {};
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      const likeRes = await fetch(`${API_BASE}/haircuts/${id}/like-status`, { headers });
      const likeData = await likeRes.json();
      setHasLiked(likeData.hasLiked);
      setLikesCount(likeData.likesCount);

    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation(); // Prevents triggering the image zoom when clicking the heart
    if (!currentUser) return alert("Please login to like!");
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
    } catch (err) {
      console.error(err);
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ haircutId: id, text: commentText })
      });
      if (res.ok) {
        const newCmt = await res.json();
        setComments([newCmt, ...comments]);
        setCommentText("");
      }
    } catch (err) {
      alert("Error posting comment");
    }
  };

  const toggleZoom = () => setIsZoomed(!isZoomed);

  // Guards
  if (!id || id === "undefined") return <div className="error">Invalid Haircut ID.</div>;
  if (loading || !haircut) return <div className="loader">Loading Haircut...</div>;

  return (
    <div className="hair-detail-wrapper">
      {/* 1. Lightbox Overlay (Shows only when zoomed) */}
      {isZoomed && (
        <div className="image-lightbox" onClick={toggleZoom}>
          <button className="close-lightbox"><i className="ri-close-line"></i></button>
          <img src={haircut.imageUrl} alt="Enlarged view" className="enlarged-img" />
        </div>
      )}

      {/* 2. Hero Image Section */}
      <div className="detail-header" onClick={toggleZoom} style={{ cursor: 'zoom-in' }}>
        <button className="back-btn" onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
          <i className="ri-arrow-left-s-line"></i>
        </button>
        
        <img src={haircut.imageUrl} alt={haircut.name} className="hero-img" />
        <div className="zoom-hint">Tap to enlarge</div>

        <div className="floating-actions">
          <button className={`action-fab like ${hasLiked ? 'active' : ''}`} onClick={handleLike}>
            <i className={hasLiked ? "ri-heart-fill" : "ri-heart-line"}></i>
          </button>
        </div>
      </div>

      {/* 3. Content Section */}
      <div className="detail-content">
        <div className="title-section">
          <h1>{haircut.name}</h1>
          <span className="like-badge">{likesCount} likes</span>
        </div>

        <div className="specs-grid">
          <div className="spec-item">
            <span className="spec-label">Length</span>
            <span className="spec-value">{haircut.hairLength}</span>
          </div>
          <div className="spec-item">
            <span className="spec-label">Face Shape</span>
            <span className="spec-value">
                {Array.isArray(haircut.faceShape) ? haircut.faceShape.join(", ") : haircut.faceShape}
            </span>
          </div>
        </div>

        <div className="tags-container">
          {haircut.tags?.map(tag => <span key={tag} className="detail-tag">#{tag}</span>)}
        </div>

        <hr className="divider" />

        {/* 4. Comments Section */}
        <section className="comments-section">
          <h3>Community ({comments.length})</h3>
          <div className="comment-input-wrapper">
            <input 
              type="text" 
              placeholder={currentUser ? "Write a comment..." : "Login to join the chat"}
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
              <div key={cmt._id} className="comment-card">
                <img src={cmt.userPhoto || '/placeholder-user.png'} alt="user" />
                <div className="comment-info">
                  <p className="comment-user">{cmt.userName}</p>
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