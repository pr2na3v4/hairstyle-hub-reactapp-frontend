import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { updateProfile, signOut } from 'firebase/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // NEW
import { Card } from '../components/cards';
import './profile.css';
import Loader from '../components/Loader';
import Swal from 'sweetalert2';

const Profile = ({ currentUser }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // --- 1. Queries ---
  
  // Likes Query
  const { data: likes = [], isLoading: likesLoading } = useQuery({
    queryKey: ['userLikes', currentUser?.uid],
    queryFn: async () => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/users/me/likes`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      return res.json();
    },
    enabled: !!currentUser, // Only run if user is logged in
  });

  // Comments Query
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['userComments', currentUser?.uid],
    queryFn: async () => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/users/me/comments`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      return res.json();
    },
    enabled: !!currentUser,
  });

  // --- 2. Mutations ---

  // Delete Comment Mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId) => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');
      return commentId;
    },
    onSuccess: () => {
      // Refresh the comments list automatically
      queryClient.invalidateQueries({ queryKey: ['userComments', currentUser?.uid] });
      Swal.fire('Deleted!', 'Your comment has been deleted.', 'success');
    }
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, file }) => {
      let photoURL = currentUser.photoURL;
      
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const cloudData = await cloudRes.json();
        photoURL = cloudData.secure_url;
      }

      // Sync with Firebase
      await updateProfile(auth.currentUser, { displayName: name, photoURL });

      // Sync with Backend
      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName: name, photoURL })
      });
    },
    onSuccess: () => {
      Swal.fire('Success!', 'Profile Updated Successfully', 'success')
        .then(() => window.location.reload());
    }
  });

  // --- Handlers ---

  useEffect(() => {
    if (currentUser) setNewName(currentUser.displayName || "");
  }, [currentUser]);

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

  const handleDelete = (commentId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4757',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(commentId);
    });
  };

  const handleSave = () => {
    updateProfileMutation.mutate({ name: newName, file: selectedFile });
  };

  // --- Rendering ---

  if (!currentUser) return <div className="loader-msg">Please login to view profile.</div>;
  if (likesLoading || commentsLoading) return <Loader />;

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

      {/* Favorites Section */}
      <div className="user-section">
        <h3>{currentUser.displayName}'s Favourite Hairstyles</h3>
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

      {/* Comments Section */}
      <div className="user-section">
        <h3>Your Comments</h3>
        <div className="comments-list">
          {comments.length > 0 ? comments.map(c => (
            <div key={c._id?.$oid || c._id} className="profile-comment-item">
              <p><strong>On: {c.haircutName}</strong></p>
              <p>{c.text}</p>
              <button 
                onClick={() => handleDelete(c._id?.$oid || c._id)} 
                className="delete-btn"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          )) : <p className="empty-msg">No comments made yet.</p>}
        </div>
      </div>

      {/* Modal */}
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
              <button 
                onClick={handleSave} 
                className="save-btn" 
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;