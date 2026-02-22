import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase-config';
import { updateProfile, signOut } from 'firebase/auth';
import { Card } from '../components/cards';
import './profile.css';
import Loader from '../components/Loader';
import Swal from 'sweetalert2';

const Profile = ({ currentUser }) => {
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false); // 👈 Delayed loader sathi

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // --- Delayed Loader Logic ---
  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => setShowLoader(true), 800);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const [likesRes, commRes] = await Promise.all([
        fetch(`${API_BASE}/users/me/likes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/users/me/comments`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const likesData = await likesRes.json();
      const commData = await commRes.json();

      setLikes(Array.isArray(likesData) ? likesData : []);
      setComments(Array.isArray(commData) ? commData : []);
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, API_BASE]);

  useEffect(() => {
    if (currentUser) {
      setNewName(currentUser.displayName || "");
      loadUserData();
    }
  }, [currentUser, loadUserData]);

  const toggleZoom = (status) => {
    setIsZoomed(status);
    document.body.style.overflow = status ? 'hidden' : 'auto';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadToCloudinary = async () => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    return data.secure_url;
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      let photoURL = currentUser.photoURL;
      if (selectedFile) {
        photoURL = await uploadToCloudinary();
      }

      await updateProfile(auth.currentUser, { displayName: newName, photoURL });

      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName: newName, photoURL })
      });

      Swal.fire({
        title: 'Success!',
        text: 'Profile Updated Successfully',
        icon: 'success',
        confirmButtonColor: '#000000',
      }).then(() => {
        window.location.reload();
      });
    } catch (err) {
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4757',
      cancelButtonColor: '#000',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch(`${API_BASE}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setComments(comments.filter(c => (c._id?.$oid || c._id) !== commentId));
            Swal.fire('Deleted!', 'Your comment has been deleted.', 'success');
          }
        } catch (err) {
          Swal.fire('Error', 'Delete failed', 'error');
        }
      }
    });
  };

  // --- Rendering Logic ---
  if (!currentUser) return <div className="loader-msg">Please login to view profile.</div>;
  if (showLoader) return <Loader />;
  if (loading && !showLoader) return null;

  return (
    <div className="profile-container">
      {isZoomed && (
        <div className="image-lightbox active" onClick={() => toggleZoom(false)}>
          <button className="close-lightbox"><i className="ri-close-line"></i></button>
          <img src={currentUser.photoURL} alt="Zoomed" className="enlarged-img" />
        </div>
      )}

      <div className="profile-card">
        <img 
          src={currentUser.photoURL || "https://www.w3schools.com/howto/img_avatar.png"} 
          alt="Avatar" 
          className="profile-avatar"
          onClick={() => toggleZoom(true)}
        />
        <h2>{currentUser.displayName}</h2>
        <p>{currentUser.email}</p>
        <div className="profile-btns">
          <button onClick={() => setIsModalOpen(true)} className="edit-btn">Edit Profile</button>
          <button onClick={() => signOut(auth)} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="user-section">
        <h3> {currentUser.displayName}'s favourite Hairstyles</h3>
        {likes.length > 0 ? (
          <div className="cards-grid">
            {likes.map(item => {
              const style = item.haircutId || item;
              return (
                <Card 
                  key={style._id?.$oid || style._id}
                  id={style._id?.$oid || style._id}
                  name={style.name}
                  imageUrl={style.imageUrl}
                />
              );
            })}
          </div>
        ) : <p className="empty-msg">No liked styles yet.</p>}
      </div>

      <div className="user-section">
        <h3>Your Comments</h3>
        <div className="comments-list">
          {comments.length > 0 ? comments.map(c => (
            <div key={c._id?.$oid || c._id} className="profile-comment-item">
              <p><strong>On: {c.haircutName}</strong></p>
              <p>{c.text}</p>
              <button onClick={() => deleteComment(c._id?.$oid || c._id)} className="delete-btn">Delete</button>
            </div>
          )) : <p className="empty-msg">No comments made yet.</p>}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Profile</h3>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Display Name"
            />
            <div className="file-upload-wrapper">
              <input type="file" id="profile-upload" onChange={handleFileChange} accept="image/*" hidden />
              <label htmlFor="profile-upload" className="custom-file-upload">
                <i className="ri-image-edit-line"></i> 
                {selectedFile ? "Change Photo" : "Upload New Photo"}
              </label>
            </div>
            {previewUrl && <img src={previewUrl} alt="Preview" className="preview-img" />}
            <div className="modal-actions">
              <button onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button onClick={saveProfile} className="save-btn" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;