import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api';

export default function StudentDashboard() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.listStudents();
        setStudents(response.data || []);
      } catch (error) {
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Fetch analytics when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setAnalytics(null);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getStudentAnalytics(selectedStudent.id);
        setAnalytics(response.data);
      } catch (error) {
        toast.error('Failed to load student analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedStudent]);

  const filteredStudents = students.filter(
    s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.roll_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Student Search & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
            <h3 className="font-700 text-white mb-4 flex items-center gap-2">
              👥 Students ({filteredStudents.length})
            </h3>
            <input
              type="text"
              placeholder="Search name, email, roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-arena-border text-white text-sm placeholder-slate-500 focus:outline-none focus:border-arena-orange"
            />
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading && !analytics ? (
                <div className="text-center py-8 text-slate-500">Loading students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No students found</div>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      selectedStudent?.id === student.id
                        ? 'bg-arena-orange/20 border border-arena-orange text-white'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="font-600 text-sm">{student.name}</div>
                    <div className="text-xs text-slate-500 truncate">{student.email}</div>
                    {student.roll_no && <div className="text-xs text-slate-600">{student.roll_no}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Analytics Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedStudent && analytics ? (
              <motion.div
                key={selectedStudent.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Student Profile Header */}
                <div className="rounded-xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-display font-800 text-white">{analytics.student.name}</h2>
                      <p className="text-sm text-slate-400 mt-1">{analytics.student.email}</p>
                    </div>
                    <div className={`text-4xl font-display font-800 ${
                      analytics.statistics.reputation_score >= 80 ? 'text-green-400' :
                      analytics.statistics.reputation_score >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {analytics.statistics.reputation_score}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-2xl font-display font-800 text-arena-cyan">
                        {analytics.statistics.total_tournaments_participated}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Tournaments</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-2xl font-display font-800 text-arena-orange">
                        {analytics.statistics.top_3_finishes}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Top 3 Finishes</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className="text-2xl font-display font-800 text-arena-purple">
                        {analytics.student.branch || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Branch</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <div className={`text-lg font-700 ${
                        analytics.statistics.is_banned ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {analytics.statistics.is_banned ? '🚫' : '✅'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{analytics.statistics.is_banned ? 'Banned' : 'Active'}</div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-arena-border">
                  {['profile', 'tournaments', 'activities'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-sm font-600 transition-all border-b-2 -mb-px ${
                        activeTab === tab
                          ? 'border-arena-orange text-arena-orange'
                          : 'border-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab === 'profile' && '📋 Profile'}
                      {tab === 'tournaments' && '🏆 Tournaments'}
                      {tab === 'activities' && '📊 Activities'}
                    </button>
                  ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}
                  >
                    <h3 className="font-700 text-white mb-4">📝 Student Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Roll No', value: analytics.student.roll_no || 'N/A' },
                        { label: 'PRN', value: analytics.student.prn || 'N/A' },
                        { label: 'Branch', value: analytics.student.branch || 'N/A' },
                        { label: 'Division', value: analytics.student.division || 'N/A' },
                        { label: 'Department', value: analytics.student.department || 'N/A' },
                        { label: 'Year', value: analytics.student.year_of_study ? `${analytics.student.year_of_study}` : 'N/A' },
                        { label: 'Mobile No', value: analytics.student.mobile_no || 'N/A' },
                        { label: 'College', value: analytics.student.college_name || 'N/A' },
                      ].map((item, i) => (
                        <div key={i}>
                          <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                          <p className="text-sm text-slate-300 font-500">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Tournaments Tab */}
                {activeTab === 'tournaments' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <h3 className="font-700 text-white">🏆 Tournament Participation</h3>
                    {analytics.tournaments_participated.length === 0 ? (
                      <div className="rounded-xl border border-arena-border p-6 text-center text-slate-400" style={{ background: '#0f0f1e' }}>
                        No tournament participations yet
                      </div>
                    ) : (
                      analytics.tournaments_participated.map((tournament, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="rounded-xl border border-arena-border p-4" style={{ background: '#0f0f1e' }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-700 text-white">{tournament.tournament_title}</h4>
                              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-arena-cyan/10 text-arena-cyan font-600">
                                  {tournament.tournament_category}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${
                                  tournament.team_status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                                  tournament.team_status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                  'bg-red-500/10 text-red-400'
                                }`}>
                                  {tournament.team_status}
                                </span>
                                {tournament.is_leader && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-arena-orange/10 text-arena-orange font-600">
                                    👨‍💼 Leader
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-500">Team</p>
                                  <p className="text-slate-300">{tournament.team_name}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Venue</p>
                                  <p className="text-slate-300">{tournament.venue || 'Online'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {tournament.rank ? (
                                <div>
                                  <div className={`text-3xl font-display font-800 mb-1 ${
                                    tournament.rank === 1 ? 'text-yellow-400' :
                                    tournament.rank === 2 ? 'text-slate-300' :
                                    tournament.rank === 3 ? 'text-orange-400' :
                                    'text-slate-500'
                                  }`}>
                                    #{tournament.rank}
                                  </div>
                                  <div className="text-xs text-slate-500">Rank</div>
                                  {tournament.score !== null && (
                                    <div className="text-sm font-600 text-arena-cyan mt-2">{tournament.score} pts</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-slate-500 text-sm">Not Ranked</div>
                              )}
                            </div>
                          </div>
                          {tournament.prize_pool && (
                            <div className="mt-3 pt-3 border-t border-white/10 text-xs">
                              <span className="text-slate-500">Prize Pool:</span>
                              <span className="text-arena-orange font-700 ml-2">{tournament.prize_pool}</span>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}

                {/* Activities Tab */}
                {activeTab === 'activities' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}
                  >
                    <h3 className="font-700 text-white mb-4">📊 Student Activities</h3>
                    {analytics.activities.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No activities yet</div>
                    ) : (
                      <div className="space-y-3">
                        {analytics.activities.map((activity, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex gap-4 pb-3 border-b border-white/5 last:border-0"
                          >
                            <div className="text-2xl flex-shrink-0">
                              {activity.type === 'team_registration' && '📝'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-600">
                                Registered for <span className="text-arena-orange">{activity.tournament_title}</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Team: {activity.team_name} • Status: {activity.status}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">
                                {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded font-600 flex-shrink-0 ${
                              activity.status === 'confirmed' ? 'bg-green-500/10 text-green-400' :
                              activity.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {activity.status}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="rounded-xl border border-arena-border p-12 text-center" style={{ background: '#0f0f1e' }}>
                <p className="text-slate-400">Select a student to view their performance dashboard</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
