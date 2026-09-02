import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export default function TeamApprovalPanel() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState({});
  const [accessError, setAccessError] = useState(null);

  const fetchTournamentTeams = async (tournamentId) => {
    const token = localStorage.getItem('mock-token');
    const response = await axios.get(`${API_BASE}/teams/tournament/${tournamentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTeams(response.data || []);
  };

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const token = localStorage.getItem('mock-token');
        const response = await axios.get(`${API_BASE}/organizer/my-tournaments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setTournaments(response.data || []);
        setAccessError(null);
      } catch (error) {
        if (error.response?.status === 403) {
          setAccessError('You must be an organizer or faculty member to manage teams');
          setTournaments([]);
        } else {
          toast.error('Failed to load your tournaments');
          setTournaments([]);
        }
      }
    };
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!selectedTournament) {
      setAccessError(null);
      return;
    }

    const fetchTeams = async () => {
      setLoading(true);
      setAccessError(null);
      try {
        await fetchTournamentTeams(selectedTournament);
      } catch (error) {
        if (error.response?.status === 403) {
          setAccessError('You can only manage teams for tournaments you created.');
          setTeams([]);
        } else {
          toast.error(error.response?.data?.error || 'Failed to load teams');
          setTeams([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTournament]);

  const handleApprove = async (teamId) => {
    try {
      const token = localStorage.getItem('mock-token');
      await axios.post(
        `${API_BASE}/teams/${teamId}/approve`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      toast.success('Team approved! Updating participant count...');
      await fetchTournamentTeams(selectedTournament);
      window.dispatchEvent(new CustomEvent('tournament-participants-updated', {
        detail: { tournamentId: selectedTournament }
      }));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve team');
    }
  };

  const handleReject = async (teamId) => {
    const reason = rejectReason[teamId] || 'Team does not meet requirements';
    try {
      const token = localStorage.getItem('mock-token');
      await axios.post(
        `${API_BASE}/teams/${teamId}/reject`,
        { reason },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      toast.success('Team rejected');
      await fetchTournamentTeams(selectedTournament);
      setRejectReason(prev => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject team');
    }
  };

  const pendingTeams = teams.filter(team => team.status === 'pending');
  const confirmedTeams = teams.filter(team => team.status === 'confirmed');
  const rejectedTeams = teams.filter(team => team.status === 'disqualified');

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Your Tournaments
        </label>
        <select
          value={selectedTournament || ''}
          onChange={(e) => {
            setSelectedTournament(parseInt(e.target.value) || null);
            setTeams([]);
            setRejectReason({});
          }}
          className="w-full px-4 py-2 border border-gray-600 rounded bg-gray-900 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">-- Select a tournament to manage teams --</option>
          {tournaments.length === 0 ? (
            <option disabled>No tournaments created yet</option>
          ) : (
            tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.status})
              </option>
            ))
          )}
        </select>
        {tournaments.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">You haven't created any tournaments yet</p>
        )}
      </div>

      {selectedTournament && (
        <div>
          {accessError && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-300 font-semibold">🔒 {accessError}</p>
            </div>
          )}

          <h3 className="text-lg font-bold text-white mb-4">
            Teams
            {teams.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white px-3 py-1 rounded text-sm">
                {teams.length}
              </span>
            )}
          </h3>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : accessError ? (
            <div className="text-center text-gray-400 py-8">Cannot access teams for this tournament</div>
          ) : teams.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No teams found</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-yellow-400 mb-3">
                  Pending Teams ({pendingTeams.length})
                </h4>
                {pendingTeams.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending teams</p>
                ) : (
                  <div className="space-y-4">
                    {pendingTeams.map((team, idx) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-bold">{team.team_name}</h4>
                            <p className="text-gray-400 text-sm">Leader: {team.leader?.name || 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-xs">Registered</p>
                            <p className="text-white text-sm">
                              {new Date(team.registered_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-900 rounded p-3 mb-3 text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-400">Members: </span>
                              <span className="text-white font-semibold">
                                {team.confirmed_members}/{team.total_members}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status: </span>
                              <span className="text-yellow-400 font-semibold">{team.status}</span>
                            </div>
                          </div>

                          {team.members && team.members.length > 0 && (
                            <div className="mt-3">
                              <p className="text-gray-400 mb-2">Team Members:</p>
                              <div className="space-y-1">
                                {team.members.map((member, i) => (
                                  <div key={i} className="text-xs text-gray-300 ml-3">
                                    • {member.name} ({member.email})
                                    <span className="text-gray-500 ml-2">{member.roll_no}</span>
                                    <span className="text-gray-500 ml-1">{member.branch}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {team.leader && (
                            <div className="mt-3">
                              <p className="text-gray-400 mb-2">Leader Details:</p>
                              <div className="text-xs text-gray-300 ml-3 space-y-1">
                                <div>📧 {team.leader.email}</div>
                                <div>📱 {team.leader.mobile_no || 'N/A'}</div>
                                <div>🎓 {team.leader.branch || 'N/A'}</div>
                                <div>📍 {team.leader.college_name || 'N/A'}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(team.id)}
                              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-semibold transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                if (!Object.prototype.hasOwnProperty.call(rejectReason, team.id)) {
                                  setRejectReason(prev => ({ ...prev, [team.id]: '' }));
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-semibold transition"
                            >
                              ✗ Reject
                            </button>
                          </div>

                          {Object.prototype.hasOwnProperty.call(rejectReason, team.id) && (
                            <div className="bg-red-900 bg-opacity-30 p-3 rounded border border-red-700">
                              <textarea
                                value={rejectReason[team.id] || ''}
                                onChange={(e) => setRejectReason(prev => ({ ...prev, [team.id]: e.target.value }))}
                                placeholder="Reason for rejection..."
                                className="w-full px-2 py-2 bg-red-900 bg-opacity-30 border border-red-600 rounded text-white text-sm mb-2 focus:outline-none"
                                rows="2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReject(team.id)}
                                  className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectReason(prev => {
                                      const copy = { ...prev };
                                      delete copy[team.id];
                                      return copy;
                                    });
                                  }}
                                  className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-3">
                  Confirmed Teams ({confirmedTeams.length})
                </h4>
                {confirmedTeams.length === 0 ? (
                  <p className="text-sm text-gray-500">No confirmed teams yet</p>
                ) : (
                  <div className="space-y-4">
                    {confirmedTeams.map(team => (
                      <div key={team.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-white font-bold">{team.team_name}</h4>
                            <p className="text-gray-400 text-sm">Leader: {team.leader?.name || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {team.confirmed_members}/{team.total_members} members
                            </p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-green-500/20 text-green-400">
                            confirmed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-3">
                  Rejected Teams ({rejectedTeams.length})
                </h4>
                {rejectedTeams.length === 0 ? (
                  <p className="text-sm text-gray-500">No rejected teams</p>
                ) : (
                  <div className="space-y-4">
                    {rejectedTeams.map(team => (
                      <div key={team.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-white font-bold">{team.team_name}</h4>
                            <p className="text-gray-400 text-sm">Leader: {team.leader?.name || 'Unknown'}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {team.confirmed_members}/{team.total_members} members
                            </p>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-red-500/20 text-red-400">
                            rejected
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
