import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const API_URL = 'http://localhost:5000/api';

const branches = [
  'Computer Science',
  'Computer Engineering',
  'Information Technology',
  'Electronics and Telecommunication Engineering',
  'Mechanical Engineering',
  'Instrumentation Engineering',
  'Engineering, Science & Humanities',
  'Artificial Intelligence & Data Science',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Engineering (Software Engineering)',
  'Computer Science and Engineering (AI & ML)',
  'Computer Science and Engineering (Data Science)',
  'Computer Science & Engineering (IoT and Cyber Security Including Blockchain Technology)',
  'Computer Sciences & Engineering (AI)',
  'Electrical Engineering',
  'Biotechnology',
];

const games = [
  'Cricket',
  'Football',
  'Volleyball',
  'Badminton',
  'Table Tennis',
  'Chess',
  'Carrom',
  'Kabaddi',
  'Athletics',
  'Other',
];

const toTimeInputValue = (date = new Date()) => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const mergeTodayWithTimeForApi = (timeValue) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
};

const SportRoomEntryForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    prn: '',
    game: '',
    branch: '',
    mobile_no: '',
    in_time: toTimeInputValue(),
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.prn.trim()) {
      toast.error('PRN is required');
      return;
    }
    if (!formData.game) {
      toast.error('Game is required');
      return;
    }
    if (!formData.branch) {
      toast.error('Branch is required');
      return;
    }
    if (!formData.mobile_no.trim()) {
      toast.error('Mobile number is required');
      return;
    }
    if (!/^\d{10}$/.test(formData.mobile_no.replace(/\s/g, ''))) {
      toast.error('Mobile number must be 10 digits');
      return;
    }
    if (!formData.in_time) {
      toast.error('Check-in time is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        prn: formData.prn.trim(),
        game: formData.game,
        branch: formData.branch,
        mobile_no: formData.mobile_no.trim(),
        in_time: mergeTodayWithTimeForApi(formData.in_time),
      };

      const response = await fetch(`${API_URL}/sport/entries`, {
        method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('clerk-token') || localStorage.getItem('mock-token')}`
         },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create entry');
      }

      const data = await response.json();
      toast.success('Entry created successfully');
      
      // Reset form
      setFormData({
        name: '',
        prn: '',
        game: '',
        branch: '',
        mobile_no: '',
        in_time: toTimeInputValue(),
      });

      if (onSuccess) {
        onSuccess(data.entry);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Sport Room Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              placeholder="Enter student name"
            />
          </div>

          {/* PRN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PRN *
            </label>
            <input
              type="text"
              name="prn"
              value={formData.prn}
              onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              placeholder="Enter PRN"
            />
          </div>

          {/* Game */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Game *
            </label>
            <select
              name="game"
              value={formData.game}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Select Game</option>
              {games.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch *
            </label>
            <select
              name="branch"
              value={formData.branch}
              onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              name="mobile_no"
              value={formData.mobile_no}
              onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              placeholder="10-digit number"
              maxLength="10"
            />
          </div>

          {/* Check-in Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in Time *
            </label>
            <input
              type="time"
              name="in_time"
              value={formData.in_time}
              onChange={handleChange}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Date is set automatically to today.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition"
          >
            {loading ? 'Creating...' : 'Record Entry'}
          </button>
          <button
            type="reset"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition"
            onClick={() => setFormData({
              name: '',
              prn: '',
              game: '',
              branch: '',
              mobile_no: '',
              in_time: toTimeInputValue(),
            })}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default SportRoomEntryForm;
