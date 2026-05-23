import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Loader from '../components/Loader';
import Categories from './categories';
import Swal from 'sweetalert2';
import './hairdetail.css';

const assignTipIcon = (tip = '') => {
  const t = tip.toLowerCase();
  if (t.includes('shampoo') || t.includes('wash') || t.includes('scalp')) return '🚿';
  if (t.includes('condition') || t.includes('hydrat') || t.includes('moistur')) return '💧';
  if (t.includes('trim') || t.includes('cut') || t.includes('barber')) return '✂️';
  if (t.includes('heat') || t.includes('dry') || t.includes('blow')) return '🔥';
  if (t.includes('product') || t.includes('wax') || t.includes('pomade') || t.includes('gel')) return '🧴';
  if (t.includes('sleep') || t.includes('pillow') || t.includes('night')) return '🌙';
  if (t.includes('sun') || t.includes('uv') || t.includes('protect')) return '☀️';
  return '💡';
};

// ─── UTILITY API FETCHERS ──────────────────────────────────────────────────
const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';

const fetchYouTubeVideos = async (query) => {
  const params = new URLSearchParams({
    part: 'snippet', q: `${query} haircut tutorial`,
    type: 'video', maxResults: 9, videoEmbeddable: 'true', key: YT_KEY,
  });
  const res = await fetch(`${YT_SEARCH}?${params}`);
  if (!res.ok) throw new Error('YouTube fetch failed');
  const data = await res.json();
  return (data.items || []).map(item => ({
    id:         item.id.videoId,
    title:      item.snippet.title,
    channel:    item.snippet.channelTitle,
    thumbnail:  item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
  }));
};

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────
const VideoLightbox = ({ videoId, title, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="video-lightbox" onClick={onClose}>
      <div className="video-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="video-lightbox-close" onClick={onClose} aria-label="Close">
          <i className="ri-close-line" />
        </button>
        <div className="video-embed-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="video-lightbox-title">{title}</p>
      </div>
    </div>
  );
};

const VideoFeed = ({ haircutName }) => {
  const [activeVideo, setActiveVideo] = useState(null);

  const { data: videos = [], isLoading, isError } = useQuery({
    queryKey: ['yt-videos', haircutName],
    queryFn:  () => fetchYouTubeVideos(haircutName),
    staleTime: 1000 * 60 * 30, // 30 mins
    retry: false,
    enabled: !!YT_KEY && !!haircutName,
  });

  if (!YT_KEY) return null;

  return (
    <section className="video-section">
      <h3 className="section-title"><i className="ri-youtube-line" /> Watch & Learn</h3>
      <p className="section-subtitle">Real tutorials for the {haircutName} — tap any video to watch.</p>

      {isLoading && (
        <div className="video-feed">
          {[...Array(6)].map((_, i) => <div key={i} className="video-card-skeleton shimmer" />)}
        </div>
      )}

      {isError && (
        <p className="video-error">
          Could not load videos.{' '}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(haircutName + ' haircut tutorial')}`} target="_blank" rel="noopener noreferrer">
            Search on YouTube
          </a>
        </p>
      )}

      {!isLoading && !isError && (
        <div className="video-feed">
          {videos.map((v) => (
            <div key={v.id} className="video-card" onClick={() => setActiveVideo(v)}>
              <div className="video-thumb-box">
                <img src={v.thumbnail} alt={v.title} loading="lazy" />
                <div className="video-play-overlay"><i className="ri-play-circle-fill" /></div>
              </div>
              <div className="video-card-info">
                <p className="video-card-title">{v.title}</p>
                <p className="video-card-channel">{v.channel}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeVideo && <VideoLightbox videoId={activeVideo.id} title={activeVideo.title} onClose={() => setActiveVideo(null)} />}
    </section>
  );
};

const SpecsGrid = ({ hairLength, faceShape }) => (
  <div className="specs-grid">
    <div className="spec-item">
      <i className="ri-ruler-line" />
      <div>
        <span className="spec-label">Length</span>
        <span className="spec-value">{hairLength}</span>
      </div>
    </div>
    <div className="spec-item">
      <i className="ri-user-smile-line" />
      <div>
        <span className="spec-label">Best For</span>
        <span className="spec-value">
          {Array.isArray(faceShape) ? faceShape.join(', ') : faceShape}
        </span>
      </div>
    </div>
  </div>
);

const CommentSection = ({ comments, currentUser, commentText, setCommentText, onSubmit, isPending }) => (
  <section className="comments-section">
    <h3 className="section-title"><i className="ri-chat-3-line" /> Community Feed ({comments.length})</h3>
    <form className="comment-input-wrapper" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder={currentUser ? 'Write a comment...' : 'Login to join the talk'}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        disabled={!currentUser || isPending}
      />
      <button type="submit" disabled={!currentUser || !commentText.trim() || isPending}>
        <i className={isPending ? 'ri-loader-4-line spin' : 'ri-send-plane-2-fill'} />
      </button>
    </form>
    <div className="comment-list">
      {comments.length > 0 ? (
        comments.map((cmt) => (
          <div key={cmt._id?.$oid || cmt._id} className="comment-card">
            <img 
              src={cmt.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(cmt.userName || 'U')}&background=363334&color=fff&size=40`} 
              alt={cmt.userName} 
              loading="lazy" 
            />
            <div className="comment-info">
              <p className="comment-user">{cmt.userName || 'User'}</p>
              <p className="comment-text">{cmt.text}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="empty-comments">Be the first to comment!</p>
      )}
    </div>
  </section>
);

// ─── MAIN HAIR DETAIL COMPONENT ─────────────────────────────────────────────
const HairDetail = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: haircuts = [], isLoading: hairLoading } = useQuery({
    queryKey: ['haircuts'],
    queryFn: async () => { const res = await fetch(`${API_BASE}/haircuts`); return res.json(); },
    staleTime: 1000 * 60 * 60,
  });

  const haircut = haircuts.find(x => (x._id?.$oid || x._id) === id);

  // FIX: Configured route destination parameter target matching backend action configuration map
  const { data: smartTips = [], isLoading: tipsLoading } = useQuery({
    queryKey: ['smartTips', id],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (haircut.hairLength) p.append('hairLength', haircut.hairLength);
      if (haircut.style)      p.append('style',      haircut.style);
      if (haircut.haircutType) p.append('haircutType', haircut.haircutType);
      
      const normalizeArray = (val) => Array.isArray(val) ? val : val ? [val] : [];
      normalizeArray(haircut.hairType).forEach(v => p.append('hairType', v));
      normalizeArray(haircut.faceShape).forEach(v => p.append('faceShape', v));
      (haircut.tags || []).forEach(v => p.append('tags', v));

      const res = await fetch(`${API_BASE}/tips/gettips?${p.toString()}`);
      if (!res.ok) throw new Error('Tips fetch failed');
      const json = await res.json();
      return json.tips || [];
    },
    enabled: !!haircut,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/comments/${id}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
  });

  const { data: likeStatus = { likesCount: 0, hasLiked: false } } = useQuery({
    queryKey: ['likeStatus', id, currentUser?.uid],
    queryFn: async () => {
      const headers = {};
      if (currentUser) { 
        const token = await currentUser.getIdToken(); 
        headers['Authorization'] = `Bearer ${token}`; 
      }
      const res = await fetch(`${API_BASE}/haircuts/${id}/like-status`, { headers });
      return res.json();
    },
    enabled: !!id,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/haircuts/${id}/like`, {
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Like failed');
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likeStatus', id, currentUser?.uid] });
      const previousStatus = queryClient.getQueryData(['likeStatus', id, currentUser?.uid]);
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], (old) => ({
        ...old, 
        hasLiked: !old?.hasLiked,
        likesCount: old?.hasLiked ? (old.likesCount - 1) : (old.likesCount + 1),
      }));
      return { previousStatus };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], data);
      Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true })
        .fire({ icon: 'success', title: (data.liked || data.hasLiked) ? 'Saved to Favorites!' : 'Removed from Favorites' });
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['likeStatus', id, currentUser?.uid], context.previousStatus);
      Swal.fire('Error', 'Could not sync with server. Try again.', 'error');
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['likeStatus', id, currentUser?.uid] }); },
  });

  const commentMutation = useMutation({
    mutationFn: async (text) => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ haircutId: id, text, haircutName: haircut.name }),
      });
      return res.json();
    },
    onSuccess: () => { 
      setCommentText(''); 
      queryClient.invalidateQueries({ queryKey: ['comments', id] }); 
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLike = (e) => {
    e.stopPropagation();
    if (!currentUser) {
      return Swal.fire({ title: 'Login Required', text: 'Save your favourite styles!', icon: 'info', confirmButtonText: 'Login Now', showCancelButton: true })
        .then((res) => { if (res.isConfirmed) navigate('/login'); });
    }
    likeMutation.mutate();
  };

  const handlePostComment = (e) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    commentMutation.mutate(commentText);
  };

  if (hairLoading || commentsLoading) return <Loader />;
  if (!haircut) return <div className="error-msg">Style not found.</div>;

  const primaryFaceShape = Array.isArray(haircut.faceShape) ? haircut.faceShape[0] : haircut.faceShape;

  return (
    <>
      <div className="hair-detail-wrapper animate-fade-in">
        <Helmet><title>{`${haircut.name} | HairstyleHub`}</title></Helmet>

        {isZoomed && (
          <div className="image-lightbox active" onClick={() => setIsZoomed(false)}>
            <img src={haircut.imageUrl} alt="Zoomed" className="enlarged-img" />
          </div>
        )}

        {/* Hero Banner Component */}
        <div className="detail-header" onClick={() => setIsZoomed(true)}>
          <button className="back-btn" onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
            <i className="ri-arrow-left-s-line" />
          </button>
          <img src={haircut.imageUrl} alt={haircut.name} className="hero-img" loading="eager" />
          <div className="floating-actions">
            <button className={`action-fab like ${likeStatus.hasLiked ? 'active' : ''}`} onClick={handleLike} disabled={likeMutation.isPending}>
              <i className={likeStatus.hasLiked ? 'ri-heart-fill' : 'ri-heart-line'} />
            </button>
          </div>
        </div>

        <div className="detail-content">
          <div className="title-section">
            <h1>{haircut.name}</h1>
            <span className="like-badge">{likeStatus.likesCount} likes</span>
          </div>

          <SpecsGrid hairLength={haircut.hairLength} faceShape={haircut.faceShape} />

          <div className="tags-container">
            {haircut.tags?.map(tag => <span key={tag} className="detail-tag">#{tag}</span>)}
          </div>

          <hr className="divider" />

          {/* Tips Section Layout */}
          <section className="tips-section">
            <h3 className="section-title"><i className="ri-lightbulb-line" /> Care & Maintenance</h3>
            {tipsLoading ? (
              <ul className="tips-list">
                {[...Array(5)].map((_, i) => <li key={i} className="tip-item shimmer" style={{ minHeight: 54, borderLeft: 'none' }} />)}
              </ul>
            ) : (
              <ul className="tips-list">
                {smartTips.map((tip, i) => (
                  <li key={i} className="tip-item animate-fade-in">
                    <span className="tip-icon">{assignTipIcon(tip)}</span>
                    <p className="tip-text">{tip}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="divider" />

          <CommentSection 
            comments={comments}
            currentUser={currentUser}
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmit={handlePostComment}
            isPending={commentMutation.isPending}
          />

          <hr className="divider" />
          <VideoFeed haircutName={haircut.name} />
        </div>
      </div>

      <div className="related-styles">
        <h2 className="related-title">More for {primaryFaceShape} Faces</h2>
        <Categories showAll={false} faceShapeFilter={haircut.faceShape} currentUser={currentUser} />
      </div>
    </>
  );
};

export default HairDetail;