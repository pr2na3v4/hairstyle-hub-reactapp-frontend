import React from 'react';
import { auth, provider } from '../firebase-config'; // Ensure this path is correct
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './login.css';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // This opens the Google Login Popup
      const result = await signInWithPopup(auth, provider);
      console.log("User logged in:", result.user);
      
      // Redirect to home or profile after success
      navigate('/profile'); 
    } catch (error) {
      console.error("Login Error:", error.message);
      alert("Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <i className="ri-user-smile-line login-icon"></i>
        <h1>Welcome Back</h1>
        <p>Login to save your favorite hairstyles and join the community.</p>
        
        <button className="google-auth-btn" onClick={handleLogin}>
          <i className="ri-google-fill"></i>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default Login;