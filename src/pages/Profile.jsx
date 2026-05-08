import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { updateProfile, signOut } from 'firebase/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { data: likes = [], isLoading: likesLoading } = useQuery({
    queryKey: ['userLikes', currentUser?.uid],
    queryFn: async () => {
      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/users/me/likes`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      return res.json();
    },
    enabled: !!currentUser,
  });

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
      queryClient.invalidateQueries({ queryKey: ['userComments', currentUser?.uid] });
      Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  });

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

      await updateProfile(auth.currentUser, { displayName: name, photoURL });

      const token = await currentUser.getIdToken();
      await fetch(`${API_BASE}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName: name, photoURL })
      });
      
      return { name, photoURL };
    },
    onSuccess: () => {
      setIsModalOpen(false);
      Swal.fire('Success!', 'Profile Updated', 'success');
      // Instead of reload(), the App state usually updates via Firebase listener
      // If using a custom UserContext, you would trigger an update here.
    }
  });

  // --- Handlers ---

  useEffect(() => {
    if (currentUser) setNewName(currentUser.displayName || "");
  }, [currentUser]);

  // Memory Cleanup: Revoke preview URL when component unmounts or file changes
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    if (!newName.trim()) return Swal.fire('Error', 'Name cannot be empty', 'error');
    updateProfileMutation.mutate({ name: newName, file: selectedFile });
  };

  if (!currentUser) return <div className="loader-msg">Please login to view profile.</div>;
  if (likesLoading || commentsLoading) return <Loader />;

  return (
    <div className="profile-container animate-fade-in">
      {/* Lightbox */}
      {isZoomed && (
        <div className="image-lightbox active" onClick={() => setIsZoomed(false)}>
          <img src={currentUser.photoURL || "https://www.w3schools.com/howto/img_avatar.png"} alt="Zoomed" className="enlarged-img" />
        </div>
      )}

      <div className="profile-card">
        <div className="avatar-wrapper">
          <img 
            src={currentUser.photoURL || "https://www.w3schools.com/howto/img_avatar.png"} 
            alt="Avatar" 
            className="profile-avatar"
            onClick={() => setIsZoomed(true)}
            loading="lazy"
          />
        </div>
        <h2>{currentUser.displayName}</h2>
        <p className="email-text">{currentUser.email}</p>
        <div className="profile-btns">
          <button onClick={() => setIsModalOpen(true)} className="edit-btn">Edit Profile</button>
          <button onClick={() => signOut(auth)} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* Favorites Section */}
      <div className="user-section">
        <h3>Your Saved Styles</h3>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                {selectedFile ? "File Selected" : "Upload New Photo"}
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