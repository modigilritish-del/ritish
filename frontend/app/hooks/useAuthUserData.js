// app/hooks/useAuthUserData.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSession, clearSession } from '../utils/userAuth';

export default function useAuthUserData(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const session = getUserSession();
    if (!session?.user?.id || !session?.access_token) {
      clearSession();
      router.replace('/');
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) throw new Error('Unauthorized or server error');

        const json = await res.json();

        // 🔥 Agar backend ne galat user ka data bheja toh reject
        if (json.user_id && json.user_id !== session.user.id) {
          throw new Error('Data mismatch – wrong user');
        }

        setData(json);
      } catch (err) {
        console.error('❌ useAuthUserData error:', err);
        clearSession();
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, router]);

  return { data, loading, error };
}
