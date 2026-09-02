import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tournamentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function EditTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'coding',
    max_participants: 50,
    min_team_size: 1,
    max_team_size: 5,
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '17:00',
    registration_deadline: '',
    registration_time: '23:59',
    rules: '',
    prize_pool: '',
    venue: '',
    banner_url: '',
  });
  const [tournament, setTournament] = useState(null);

  useEffect(() => {
    tournamentAPI.get(id)
      .then(r => {
        const t = r.data;
        setTournament(t);
        
        // Verify user is organizer
        if (t.organizer_id !== user?.id && user?.role !== 'faculty') {
          toast.error('You can only edit your own tournaments');
          navigate('/my-tournaments');
          return;
        }

        // Verify tournament can be edited - only cancelled or completed cannot be edited by organizers
        if (t.status === 'cancelled') {
          toast.error('Cancelled tournaments cannot be edited');
          navigate('/tournaments/' + id);
          return;
        }
        if (t.status === 'completed' && user?.role !== 'faculty') {
          toast.error('Completed tournaments can only be edited by faculty');
          navigate('/tournaments/' + id);
          return;
        }

        setFormData({
          title: t.title,
          description: t.description,
          category: t.category,
          max_participants: t.max_participants,
          min_team_size: t.min_team_size,
          max_team_size: t.max_team_size,
          start_date: t.start_date?.split('T')[0] || '',
          start_time: t.start_date?.split('T')[1]?.slice(0, 5) || '09:00',
          end_date: t.end_date?.split('T')[0] || '',
          end_time: t.end_date?.split('T')[1]?.slice(0, 5) || '17:00',
          registration_deadline: t.registration_deadline?.split('T')[0] || '',
          registration_time: t.registration_deadline?.split('T')[1]?.slice(0, 5) || '23:59',
          rules: t.rules || '',
          prize_pool: t.prize_pool || '',
          venue: t.venue || '',
          banner_url: t.banner_url || '',
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load tournament');
        navigate('/my-tournaments');
      });
  }, [id, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Tournament title is required');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Tournament description is required');
      return;
    }
    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }
    if (!formData.end_date) {
      toast.error('End date is required');
      return;
    }
    if (!formData.registration_deadline) {
      toast.error('Registration deadline is required');
      return;
    }

    // Combine date and time
    const registrationDateTime = new Date(`${formData.registration_deadline}T${formData.registration_time}`);
    const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
    const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

    // Validation: Registration deadline MUST be before start date
    if (registrationDateTime >= startDateTime) {
      toast.error('❌ Registration deadline must be BEFORE tournament start date');
      return;
    }
    
    // Validation: Start date must be before end date
    if (startDateTime >= endDateTime) {
      toast.error('Start date must be before end date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        max_participants: parseInt(formData.max_participants),
        min_team_size: parseInt(formData.min_team_size),
        max_team_size: parseInt(formData.max_team_size),
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        registration_deadline: registrationDateTime.toISOString(),
        rules: formData.rules,
        prize_pool: formData.prize_pool,
        venue: formData.venue,
        banner_url: formData.banner_url,
      };

      await tournamentAPI.update(id, payload);
      toast.success('Tournament updated successfully!');
      navigate('/my-tournaments');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update tournament');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) return null;

  const categories = ['gaming', 'coding', 'sports', 'cultural', 'other'];

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="font-display font-800 text-3xl text-white mb-2">Edit Tournament</h1>
          <p className="text-slate-400">Update tournament details, dates, and requirements</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-600 text-white mb-2">Tournament Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Agri AI Hackathon 2026"
              maxLength={255}
              className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-600 text-white mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell participants what your tournament is about..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">{formData.description.length}/1000</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-600 text-white mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-white text-slate-900">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Important Dates */}
          <div className="space-y-4 p-4 rounded-xl bg-arena-card border border-arena-border">
            <h3 className="text-sm font-600 text-white">📅 Important Dates & Times *</h3>
            
            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Registration Deadline (must be BEFORE tournament start)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
                <input
                  type="time"
                  name="registration_time"
                  value={formData.registration_time}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Tournament Start Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2\">Tournament End Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
              </div>
            </div>
          </div>

          {/* Participants & Team Settings */}
          <div className="space-y-4 p-4 rounded-xl bg-arena-card border border-arena-border">
            <h3 className="text-sm font-600 text-white">👥 Participants & Teams</h3>
            
            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Max Participants *</label>
              <input
                type="number"
                name="max_participants"
                value={formData.max_participants}
                onChange={handleChange}
                min={1}
                max={1000}
                className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-600 text-slate-300 mb-2">Min Team Size</label>
                <input
                  type="number"
                  name="min_team_size"
                  value={formData.min_team_size}
                  onChange={handleChange}
                  min={1}
                  max={50}
                  className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
              </div>
              <div>
                <label className="block text-xs font-600 text-slate-300 mb-2">Max Team Size</label>
                <input
                  type="number"
                  name="max_team_size"
                  value={formData.max_team_size}
                  onChange={handleChange}
                  min={1}
                  max={50}
                  className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 p-4 rounded-xl bg-arena-card border border-arena-border">
            <h3 className="text-sm font-600 text-white">ℹ️ Additional Details</h3>
            
            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Venue</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g., VIT Campus - Main Auditorium"
                maxLength={255}
                className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Prize Pool</label>
              <input
                type="text"
                name="prize_pool"
                value={formData.prize_pool}
                onChange={handleChange}
                placeholder="e.g., ₹50,000 total prize pool"
                maxLength={255}
                className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Rules & Guidelines</label>
              <textarea
                name="rules"
                value={formData.rules}
                onChange={handleChange}
                placeholder="Enter tournament rules, terms, and guidelines..."
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">{formData.rules.length}/2000</p>
            </div>

            <div>
              <label className="block text-xs font-600 text-slate-300 mb-2">Banner URL</label>
              <input
                type="url"
                name="banner_url"
                value={formData.banner_url}
                onChange={handleChange}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2.5 rounded-lg border border-arena-border bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-arena-orange focus:ring-1 focus:ring-arena-orange"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/my-tournaments')}
              className="flex-1 px-6 py-3 rounded-xl border border-arena-border text-white font-600 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center pt-2">
            Note: Cancelled and completed tournaments cannot be edited. Contact faculty for assistance.
          </p>
        </form>
      </div>
    </div>
  );
}
