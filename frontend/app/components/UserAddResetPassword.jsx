// app/components/UserAddResetPassword.jsx - FIXED: Shows current logged-in user's data
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Fingerprint, Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const UserAddResetPassword = () => {
  // ===== 🔥 FIX 1: Get current logged-in user from session =====
  const [currentUser, setCurrentUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('password');
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [fingerprintType, setFingerprintType] = useState('right_thumb');
  const [fingerprintStatus, setFingerprintStatus] = useState({ type: '', text: '' });
  const [enrolledFingerprints, setEnrolledFingerprints] = useState([]);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);
  const [faceAngle, setFaceAngle] = useState('front');
  const [faceStatus, setFaceStatus] = useState({ type: '', text: '' });
  const [enrolledFaces, setEnrolledFaces] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const fingerTypes = [
    { value: 'left_thumb', label: 'Left Thumb' },
    { value: 'left_index', label: 'Left Index' },
    { value: 'left_middle', label: 'Left Middle' },
    { value: 'left_ring', label: 'Left Ring' },
    { value: 'left_pinky', label: 'Left Pinky' },
    { value: 'right_thumb', label: 'Right Thumb' },
    { value: 'right_index', label: 'Right Index' },
    { value: 'right_middle', label: 'Right Middle' },
    { value: 'right_ring', label: 'Right Ring' },
    { value: 'right_pinky', label: 'Right Pinky' }
  ];

  const faceAngles = [
    { value: 'front', label: 'Front Face' },
    { value: 'left_profile', label: 'Left Profile' },
    { value: 'right_profile', label: 'Right Profile' },
    { value: 'slight_left', label: 'Slight Left' },
    { value: 'slight_right', label: 'Slight Right' }
  ];

  // ===== 🔥 FIX 2: Load current user from sessionStorage =====
  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const storedData = sessionStorage.getItem('userData');
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn || !storedData) {
          console.error('❌ User not logged in');
          setPasswordMessage({ 
            type: 'error', 
            text: 'Please login first to manage your password' 
          });
          setLoading(false);
          return;
        }
        
        const userData = JSON.parse(storedData);
        console.log('✅ Current User Data:', userData);
        
        if (!userData.user || !userData.user.id) {
          console.error('❌ Invalid user data structure');
          setPasswordMessage({ 
            type: 'error', 
            text: 'Invalid session data. Please login again.' 
          });
          setLoading(false);
          return;
        }
        
        setCurrentUser(userData.user);
        setUserId(userData.user.id);
        setLoading(false);
        
        console.log(`✅ Loaded User ID: ${userData.user.id}`);
        console.log(`✅ Email: ${userData.user.email}`);
        console.log(`✅ Name: ${userData.user.full_name}`);
        
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        setPasswordMessage({ 
          type: 'error', 
          text: 'Failed to load user data. Please login again.' 
        });
        setLoading(false);
      }
    };
    
    loadCurrentUser();
  }, []);

  // ===== Load biometrics when userId is available =====
  useEffect(() => {
    if (userId) {
      loadEnrolledBiometrics();
    }
  }, [userId]);

  useEffect(() => {
    const checkFingerprintSupport = async () => {
      if (window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === 'function') {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setFingerprintSupported(available);
        } catch (err) {
          console.error('Fingerprint check error:', err);
          setFingerprintSupported(false);
        }
      } else {
        setFingerprintSupported(false);
      }
    };
    checkFingerprintSupport();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadEnrolledBiometrics = async () => {
    if (!userId) return;
    
    try {
      const fpResponse = await fetch(`http://localhost:8000/api/biometric/fingerprint/user/${userId}`);
      if (fpResponse.ok) {
        const fpData = await fpResponse.json();
        setEnrolledFingerprints(fpData);
      }
      const faceResponse = await fetch(`http://localhost:8000/api/biometric/face/user/${userId}`);
      if (faceResponse.ok) {
        const faceData = await faceResponse.json();
        setEnrolledFaces(faceData);
      }
    } catch (error) {
      console.error('Error loading biometrics:', error);
    }
  };

  // ===== 🔥 FIX 3: Password change with proper user validation =====
  const handlePasswordChange = async () => {
    setPasswordMessage({ type: '', text: '' });
    
    if (!userId) {
      setPasswordMessage({ type: 'error', text: 'User not logged in. Please login again.' });
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters!' });
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('new_password', passwordData.newPassword);
      
      console.log(`🔐 Updating password for User ID: ${userId}`);
      
      const response = await fetch('http://localhost:8000/api/users/update-password', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Password updated:', data);
        
        setPasswordMessage({ 
          type: 'success', 
          text: `Password updated successfully for ${currentUser.email}!` 
        });
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json();
        console.error('❌ Password update failed:', error);
        setPasswordMessage({ type: 'error', text: error.detail || 'Failed to update password' });
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      setPasswordMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleFingerprintEnroll = async () => {
    if (!userId) {
      setFingerprintStatus({ type: 'error', text: 'User not logged in' });
      return;
    }
    
    setFingerprintStatus({ type: 'info', text: 'Touch your sensor when Windows prompts…' });

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options = {
        challenge,
        rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
        allowCredentials: [],
      };

      const assertion = await navigator.credentials.get({ publicKey: options });
      if (!assertion) throw new Error('No assertion');

      setFingerprintStatus({ type: 'info', text: 'Sensor touched! Finishing…' });

      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('finger_type', fingerprintType);
      formData.append('assertion_data', JSON.stringify({
        id: assertion.id,
        rawId: Array.from(new Uint8Array(assertion.rawId)),
        response: {
          authenticatorData: Array.from(new Uint8Array(assertion.response.authenticatorData)),
          clientDataJSON: Array.from(new Uint8Array(assertion.response.clientDataJSON)),
          signature: Array.from(new Uint8Array(assertion.response.signature)),
        },
        type: assertion.type,
      }));
      formData.append('ip_address', 'localhost');

      const res = await fetch('http://localhost:8000/api/biometric/fingerprint/verify-live', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFingerprintStatus({ type: 'success', text: `${fingerTypes.find(f => f.value === fingerprintType)?.label} live enrolled!` });
        loadEnrolledBiometrics();
      } else {
        setFingerprintStatus({ type: 'error', text: data.message });
      }
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError') setFingerprintStatus({ type: 'error', text: 'Sensor touch cancelled' });
      else setFingerprintStatus({ type: 'error', text: 'Live enrol failed' });
    }
  };

  const deleteFingerprint = async (fingerprintId) => {
    if (!confirm('Are you sure you want to delete this fingerprint?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/biometric/fingerprint/${fingerprintId}?user_id=${userId}`, { 
        method: 'DELETE' 
      });
      if (response.ok) {
        setFingerprintStatus({ type: 'success', text: 'Fingerprint deleted successfully!' });
        loadEnrolledBiometrics();
      } else {
        const error = await response.json();
        setFingerprintStatus({ type: 'error', text: error.detail || 'Failed to delete fingerprint' });
      }
    } catch (error) {
      setFingerprintStatus({ type: 'error', text: 'Network error' });
    }
  };

  const startCamera = () => {
    setFaceStatus({ type: 'info', text: 'Starting camera…' });
    setCapturedImage(null);
    setIsCameraActive(true);
  };

  useEffect(() => {
    if (!isCameraActive) return;

    let streamCopy = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false
        });
        streamCopy = stream;

        const video = videoRef.current;
        if (!video) throw new Error('Video element not found');

        video.srcObject = stream;

        await new Promise((res, rej) => {
          video.onloadedmetadata = () => res();
          video.onerror = rej;
        });

        await video.play();
        streamRef.current = stream;
        setFaceStatus({ type: 'success', text: 'Camera ready! Position your face and click Capture.' });
      } catch (err) {
        console.error('Camera error:', err);
        if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
        setIsCameraActive(false);

        if (err.name === 'NotAllowedError') {
          setFaceStatus({ type: 'error', text: 'Camera permission denied.' });
        } else if (err.name === 'NotFoundError') {
          setFaceStatus({ type: 'error', text: 'No camera found.' });
        } else {
          setFaceStatus({ type: 'error', text: `Failed to access camera: ${err.message}` });
        }
      }
    })();

    return () => {
      if (streamCopy) streamCopy.getTracks().forEach(t => t.stop());
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    setIsCameraActive(false);
    setCapturedImage(null);
    setFaceStatus({ type: '', text: '' });
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setFaceStatus({ type: 'error', text: 'Camera not ready. Please try again.' });
      return;
    }
    
    const video = videoRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setFaceStatus({ type: 'error', text: 'Video not ready. Please wait and try again.' });
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
    setFaceStatus({ type: 'success', text: 'Live photo captured! Click "Enroll Live Face" to save.' });
  };

  const enrollLiveFace = async () => {
    if (!capturedImage) {
      setFaceStatus({ type: 'error', text: 'Please capture a live photo first!' });
      return;
    }
    
    if (!userId) {
      setFaceStatus({ type: 'error', text: 'User not logged in' });
      return;
    }
    
    setFaceStatus({ type: 'info', text: 'Processing live face image...' });
    
    try {
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('face_angle', faceAngle);
      formData.append('video_frame', capturedImage);
      formData.append('ip_address', 'localhost');
      
      const response = await fetch('http://localhost:8000/api/biometric/face/enroll-live', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFaceStatus({ 
          type: 'success', 
          text: `${faceAngles.find(a => a.value === faceAngle)?.label} face enrolled successfully from live capture! Confidence: ${data.confidence_score}%` 
        });
        setCapturedImage(null);
        stopCamera();
        loadEnrolledBiometrics();
      } else {
        setFaceStatus({ type: 'error', text: data.message || 'Live enrollment failed' });
      }
    } catch (error) {
      console.error('Live face enrollment error:', error);
      setFaceStatus({ type: 'error', text: 'Live enrollment failed. Please try again.' });
    }
  };

  const deleteFace = async (faceId) => {
    if (!confirm('Are you sure you want to delete this face image?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/biometric/face/${faceId}?user_id=${userId}`, { 
        method: 'DELETE' 
      });
      if (response.ok) {
        setFaceStatus({ type: 'success', text: 'Face image deleted successfully!' });
        loadEnrolledBiometrics();
      } else {
        const error = await response.json();
        setFaceStatus({ type: 'error', text: error.detail || 'Failed to delete face' });
      }
    } catch (error) {
      setFaceStatus({ type: 'error', text: 'Network error' });
    }
  };

  const StatusMessage = ({ status }) => {
    if (!status.text) return null;
    const config = {
      success: { icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
      error: { icon: <XCircle className="w-4 h-4" />, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
      info: { icon: <AlertCircle className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' }
    };
    const style = config[status.type];
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${style.bg} ${style.text} ${style.border} text-sm mb-3`}>
        {style.icon}
        <span className="font-medium">{status.text}</span>
      </div>
    );
  };

  // ===== 🔥 Show loading state =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading user data...</p>
        </div>
      </div>
    );
  }

  // ===== 🔥 Show error if user not found =====
  if (!currentUser || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please login to manage your password and biometric settings.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Security Settings</h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/80">Logged in as:</div>
            <div className="text-sm font-semibold text-white">{currentUser.email}</div>
            <div className="text-xs text-white/70">User ID: {userId}</div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-6">
          <div className="flex gap-1">
            {[
              { id: 'password', label: 'Password', icon: Lock },
              { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
              { id: 'face', label: 'Face Recognition', icon: Camera }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'password' && (
            <div className="space-y-4">
              <StatusMessage status={passwordMessage} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter old password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handlePasswordChange}
                className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'fingerprint' && (
            <div className="space-y-4">
              <StatusMessage status={fingerprintStatus} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Finger <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fingerprintType}
                    onChange={(e) => setFingerprintType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fingerTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleFingerprintEnroll}
                    disabled={!fingerprintSupported}
                    className={`w-full px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                      fingerprintSupported
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    {fingerprintSupported ? 'Scan & Enroll Fingerprint' : 'Fingerprint Not Supported'}
                  </button>
                </div>
              </div>
              
              {enrolledFingerprints.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Enrolled Fingerprints ({enrolledFingerprints.length})</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Finger Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Enrolled On</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {enrolledFingerprints.map((fp) => (
                          <tr key={fp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {fingerTypes.find(t => t.value === fp.finger_type)?.label}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(fp.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                fp.is_verified 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {fp.is_verified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => deleteFingerprint(fp.id)}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors border border-red-200"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'face' && (
            <div className="space-y-4">
              <StatusMessage status={faceStatus} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Face Angle <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={faceAngle}
                      onChange={(e) => setFaceAngle(e.target.value)}
                      disabled={isCameraActive}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      {faceAngles.map(angle => (
                        <option key={angle.value} value={angle.value}>{angle.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-3">
                    {!isCameraActive ? (
                      <button
                        onClick={startCamera}
                        className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Start Camera
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={capturePhoto}
                          disabled={!!capturedImage}
                          className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            capturedImage
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg'
                          }`}
                        >
                          Capture Photo
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium border border-red-200"
                        >
                          Stop Camera
                        </button>
                      </>
                    )}
                    {capturedImage && (
                      <>
                        <button
                          onClick={enrollLiveFace}
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                        >
                          ✓ Enroll Live Face
                        </button>
                        <button
                          onClick={() => {
                            setCapturedImage(null);
                            setFaceStatus({ type: '', text: '' });
                          }}
                          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                        >
                          Retake Photo
                        </button>
                      </>
                    )}
                  </div>
                  {enrolledFaces.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Enrolled Faces ({enrolledFaces.length})</h4>
                      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Angle</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Confidence</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {enrolledFaces.map((face) => (
                              <tr key={face.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">
                                  {faceAngles.find(a => a.value === face.face_angle)?.label}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {face.confidence_score}%
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => deleteFace(face.id)}
                                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 transition-colors border border-red-200"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative shadow-xl">
                    {isCameraActive && !capturedImage ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          LIVE
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                          Position your face in the center
                        </div>
                      </>
                    ) : capturedImage ? (
                      <>
                        <img
                          src={capturedImage}
                          alt="Captured face"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          CAPTURED
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                        <Camera className="w-16 h-16 opacity-30" />
                        <span className="text-sm">Camera preview will appear here</span>
                        <span className="text-xs text-gray-600">Click "Start Camera" to begin</span>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <p className="font-medium mb-1">💡 Tips for best results:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Ensure good lighting on your face</li>
                      <li>Look directly at the camera for front view</li>
                      <li>Remove glasses or accessories that may obstruct your face</li>
                      <li>Enroll multiple angles for better recognition</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            🔒 Secure your account with multiple authentication methods • All biometric data is encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAddResetPassword;