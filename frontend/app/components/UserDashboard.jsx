//app/components/UserDashboard.jsx
import { fetchUserData } from '../utils/userAuth';
import { useState, useEffect } from 'react';
import { User, Building, Mail, CheckCircle, RefreshCw } from 'lucide-react';

export default function UserDashboard({ currentUserId }) {
  const [profile, setProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUserId) {
      loadUserData();
    }
  }, [currentUserId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading data for User ID:', currentUserId);

      // 🔥 Backend automatically checks token and returns correct user's data
      const profileData = await fetchUserData('http://localhost:8000/api/profile/me');
      const companiesData = await fetchUserData('http://localhost:8000/api/profile/my-companies');
      
      // 🔥 Verify we got correct user's data
      if (profileData.id !== currentUserId) {
        throw new Error('Received wrong user data!');
      }

      console.log('✅ Data loaded successfully for:', profileData.full_name);
      
      setProfile(profileData);
      setCompanies(companiesData.companies || []);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error loading user data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
          <p className="text-sm text-gray-400 mt-2">User ID: {currentUserId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-medium">Error: {error}</p>
          <button 
            onClick={loadUserData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-blue-800">
          <strong>✅ Viewing Data For:</strong> User ID {currentUserId} - {profile?.full_name}
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.full_name}!</h1>
            <p className="text-gray-600">User ID: {currentUserId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="w-5 h-5 text-blue-500" />
            <span>{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-5 h-5 text-green-500" />
            <span>{profile?.phone}</span>
          </div>
        </div>
      </div>

      {/* Companies Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Your Companies</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {companies.length}
          </span>
        </div>

        {companies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No companies assigned</p>
        ) : (
          <ul className="space-y-3">
            {companies.map(company => (
              <li 
                key={company.id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{company.company_name}</p>
                    <p className="text-sm text-gray-500">ID: {company.id}</p>
                  </div>
                </div>
                {company.is_primary && (
                  <span className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Primary
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}