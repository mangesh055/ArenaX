import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import SportRoomEntryForm from '../components/sport/SportRoomEntryForm';

const API_URL = 'http://localhost:5000/api';
const SPORT_TIMER_MINUTES = 45;

const parseApiDateTime = (value) => {
  if (!value) return NaN;
  const normalized = typeof value === 'string' && !value.endsWith('Z')
    ? value.replace(' ', 'T')
    : value;
  const ms = new Date(normalized).getTime();
  return ms;
};

const formatLocalDateTimeForApi = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
};

const getTimerStartMs = (entry) => {
  const inTimeMs = parseApiDateTime(entry.in_time);
  if (Number.isFinite(inTimeMs)) return inTimeMs;

  const createdAtMs = parseApiDateTime(entry.created_at);
  if (Number.isFinite(createdAtMs)) return createdAtMs;

  return Date.now();
};

const getExpectedCheckoutTimeMs = (entry) => {
  return getTimerStartMs(entry) + SPORT_TIMER_MINUTES * 60 * 1000;
};

const getRemainingMs = (entry, nowMs) => {
  return getExpectedCheckoutTimeMs(entry) - nowMs;
};

const formatCountdown = (remainingMs) => {
  if (remainingMs <= 0) return '00:00';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const SportRoomManagementPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total_entries: 0, entries_today: 0, active_entries: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchPRN, setSearchPRN] = useState('');
  const [searchName, setSearchName] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const notifiedExpiredRef = useRef(new Set());
  const perPage = 10;

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('clerk-token') || localStorage.getItem('mock-token')}`,
  });

  const fetchEntries = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum,
        per_page: perPage,
        ...(searchPRN && { prn: searchPRN }),
        ...(searchName && { name: searchName }),
      });

      const response = await fetch(`${API_URL}/sport/entries?${params}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      setEntries(data.entries);
      setTotalPages(data.pages);
      setPage(pageNum);
    } catch (error) {
      toast.error('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/sport/stats`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchEntries(1);
    fetchStats();
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const notifyTimeEnded = (entry) => {
    const message = `45 minutes completed for ${entry.name} (${entry.prn}). Please checkout manually.`;

    if (!notifiedExpiredRef.current.has(entry.id)) {
      notifiedExpiredRef.current.add(entry.id);
      toast.error(message);
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Sport Room Timer Ended', { body: message });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('Sport Room Timer Ended', { body: message });
            } else {
              window.alert(message);
            }
          });
        } else {
          window.alert(message);
        }
      } else {
        window.alert(message);
      }
    }
  };

  useEffect(() => {
    const expiredEntries = entries.filter(
      (entry) => {
        const timerStartMs = getTimerStartMs(entry);
        if (!Number.isFinite(timerStartMs)) return false;

        return (
          !entry.out_time
          && getRemainingMs(entry, nowMs) <= 0
          && !notifiedExpiredRef.current.has(entry.id)
        );
      }
    );

    if (expiredEntries.length === 0) return;

    expiredEntries.forEach((entry) => {
      notifyTimeEnded(entry);
    });
  }, [entries, nowMs]);

  const handleSearch = () => {
    setPage(1);
    fetchEntries(1);
  };

  const handleClearSearch = () => {
    setSearchPRN('');
    setSearchName('');
    setPage(1);
    fetchEntries(1);
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`${API_URL}/sport/entries/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete entry');
      toast.success('Entry deleted');
      fetchEntries(page);
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const handleEntryCreated = () => {
    fetchEntries(1);
    fetchStats();
  };

  const handleCheckout = async (entry) => {
    const now = new Date();
    try {
      const response = await fetch(`${API_URL}/sport/entries/${entry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ out_time: formatLocalDateTimeForApi(now) }),
      });

      if (!response.ok) throw new Error('Failed to update entry');
      const updated = await response.json();
      toast.success(`Checked out. Duration: ${updated.entry.duration_minutes} minutes`);
      fetchEntries(page);
      fetchStats();
    } catch (error) {
      toast.error('Failed to checkout entry');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sport Room Management</h1>
          <p className="text-gray-600">Manage student entries for the sport room</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Total Entries</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.total_entries}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Entries Today</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.entries_today}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Currently Active</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">{stats.active_entries}</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Form - Left Side */}
          <div className="lg:col-span-1">
            <SportRoomEntryForm onSuccess={handleEntryCreated} />
          </div>

          {/* Entries List - Right Side */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Search Bar */}
              <div className="mb-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Search Entries</h3>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search by name..."
                    className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={searchPRN}
                    onChange={(e) => setSearchPRN(e.target.value)}
                    placeholder="Search by PRN..."
                    className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition"
                  >
                    Search
                  </button>
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-md transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">PRN</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Game</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Branch</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Check-in</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Timer</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Check-out</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Duration</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                          Loading entries...
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                          No entries found
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.prn}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.game || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.branch}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(parseApiDateTime(entry.in_time)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {!entry.out_time ? (
                              <span className={getRemainingMs(entry, nowMs) <= 60 * 1000 ? 'text-red-600 font-semibold' : ''}>
                                {formatCountdown(getRemainingMs(entry, nowMs))}
                              </span>
                            ) : (
                              'Completed'
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {entry.out_time ? new Date(parseApiDateTime(entry.out_time)).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {entry.duration_minutes !== null && entry.duration_minutes !== undefined ? `${entry.duration_minutes} min` : '—'}
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            {!entry.out_time && (
                              <button
                                onClick={() => handleCheckout(entry)}
                                className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded transition"
                              >
                                Checkout
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <button
                    onClick={() => fetchEntries(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => fetchEntries(p)}
                        className={`px-3 py-1 rounded-md ${
                          page === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchEntries(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportRoomManagementPage;
