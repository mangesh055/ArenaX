import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { teamAPI } from '../../api';


export default function TournamentRegistrationForm({ tournament, onSuccess, onClose }) {
  const [currentStep, setCurrentStep] = useState(1); // 1=personal info, 2=team form, 3=confirm
  const [teamMode, setTeamMode] = useState(tournament.team_based ? 'complete' : 'leader');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [leaderData, setLeaderData] = useState({
    name: '', branch: '', division: '', roll_no: '', college_name: '', prn: '', mobile_no: ''
  });

  const [members, setMembers] = useState(
    tournament.team_based ? Array(tournament.min_team_size - 1).fill(null).map(() => ({
      email: '', name: '', branch: '', division: '', roll_no: '', college_name: '', prn: '', mobile_no: ''
    })) : []
  );

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
    'Other'
  ];
  const divisions = ['A', 'B', 'C', 'D', 'E'];

  const validateLeaderData = () => {
    const newErrors = {};
    if (!leaderData.name.trim()) newErrors.name = 'Name is required';
    if (!leaderData.branch.trim()) newErrors.branch = 'Branch is required';
    if (!leaderData.division.trim()) newErrors.division = 'Division is required';
    if (!leaderData.roll_no.trim()) newErrors.roll_no = 'Roll No is required';
    if (!leaderData.college_name.trim()) newErrors.college_name = 'College name is required';
    if (!leaderData.prn.trim()) newErrors.prn = 'PRN is required';
    if (!leaderData.mobile_no.trim()) newErrors.mobile_no = 'Mobile number is required';
    if (leaderData.mobile_no && !/^\d{10}$/.test(leaderData.mobile_no.replace(/\D/g, ''))) {
      newErrors.mobile_no = 'Mobile number should be 10 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateTeamName = () => {
    if (!tournament.team_based) return true;
    
    const newErrors = {};
    if (!teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMembers = () => {
    if (!tournament.team_based) return true;
    
    const newErrors = {};
    const filledMembers = members.filter(m => m.email.trim());
    
    if (filledMembers.length + 1 < tournament.min_team_size) {
      toast.error(`Minimum ${tournament.min_team_size} members required`);
      return false;
    }

    filledMembers.forEach((member, idx) => {
      if (!member.email.trim()) newErrors[`member_${idx}_email`] = 'Email required';
      if (!member.email.endsWith('@vit.edu')) newErrors[`member_${idx}_email`] = 'Must be @vit.edu email';
      if (!member.name.trim()) newErrors[`member_${idx}_name`] = 'Name required';
      if (!member.branch.trim()) newErrors[`member_${idx}_branch`] = 'Branch required';
      if (!member.roll_no.trim()) newErrors[`member_${idx}_roll_no`] = 'Roll No required';
      if (!member.mobile_no.trim()) newErrors[`member_${idx}_mobile_no`] = 'Mobile required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLeaderChange = (field, value) => {
    setLeaderData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleMemberChange = (idx, field, value) => {
    const newMembers = [...members];
    newMembers[idx] = { ...newMembers[idx], [field]: value };
    setMembers(newMembers);
    setErrors(prev => ({ ...prev, [`member_${idx}_${field}`]: '' }));
  };

  const addMember = () => {
    if (members.length < tournament.max_team_size - 1) {
      setMembers([...members, {
        email: '', name: '', branch: '', division: '', roll_no: '', college_name: '', prn: '', mobile_no: ''
      }]);
    } else {
      toast.error(`Maximum ${tournament.max_team_size} members allowed`);
    }
  };

  const removeMember = (idx) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!validateLeaderData()) return;
    if (!validateMembers()) return;

    setLoading(true);
    try {
      const payload = {
        tournament_id: tournament.id,
        leader_data: leaderData
      };

      // For team-based tournaments, include team_name and members
      if (tournament.team_based) {
        payload.team_name = teamName;
        payload.member_data = members.filter(m => m.email.trim());
      }

      const response = await teamAPI.register(payload);
      toast.success(tournament.team_based ? 'Team registered successfully!' : 'Registered successfully!');
      if (onSuccess) onSuccess(response.data.team);
      if (onClose) onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      console.error('Registration error:', error.response?.data || error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-600 rounded bg-gray-900 text-white text-sm focus:outline-none focus:border-orange-500";
  const labelClass = "block text-xs font-medium text-gray-300 mb-1";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* Step 1: Leader Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Your Information</h3>
          <p className="text-sm text-gray-400">
            {tournament.team_based 
              ? "Provide your details. You'll add team members in the next step." 
              : "Provide your complete information for registration."}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name *</label>
              <input
                type="text"
                value={leaderData.name}
                onChange={(e) => handleLeaderChange('name', e.target.value)}
                placeholder="Full Name"
                className={inputClass}
              />
              {errors.name && <div className={errorClass}>{errors.name}</div>}
            </div>

            <div>
              <label className={labelClass}>Mobile No *</label>
              <input
                type="tel"
                value={leaderData.mobile_no}
                onChange={(e) => handleLeaderChange('mobile_no', e.target.value)}
                placeholder="10-digit number"
                className={inputClass}
              />
              {errors.mobile_no && <div className={errorClass}>{errors.mobile_no}</div>}
            </div>

            <div>
              <label className={labelClass}>Branch *</label>
              <select
                value={leaderData.branch}
                onChange={(e) => handleLeaderChange('branch', e.target.value)}
                className={inputClass}
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.branch && <div className={errorClass}>{errors.branch}</div>}
            </div>

            <div>
              <label className={labelClass}>Division *</label>
              <select
                value={leaderData.division}
                onChange={(e) => handleLeaderChange('division', e.target.value)}
                className={inputClass}
              >
                <option value="">Select Division</option>
                {divisions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.division && <div className={errorClass}>{errors.division}</div>}
            </div>

            <div>
              <label className={labelClass}>Roll No *</label>
              <input
                type="text"
                value={leaderData.roll_no}
                onChange={(e) => handleLeaderChange('roll_no', e.target.value)}
                placeholder="Roll Number"
                className={inputClass}
              />
              {errors.roll_no && <div className={errorClass}>{errors.roll_no}</div>}
            </div>

            <div>
              <label className={labelClass}>PRN *</label>
              <input
                type="text"
                value={leaderData.prn}
                onChange={(e) => handleLeaderChange('prn', e.target.value)}
                placeholder="PRN"
                className={inputClass}
              />
              {errors.prn && <div className={errorClass}>{errors.prn}</div>}
            </div>

            <div className="col-span-2">
              <label className={labelClass}>College Name *</label>
              <input
                type="text"
                value={leaderData.college_name}
                onChange={(e) => handleLeaderChange('college_name', e.target.value)}
                placeholder="College/Institute Name"
                className={inputClass}
              />
              {errors.college_name && <div className={errorClass}>{errors.college_name}</div>}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (validateLeaderData()) {
                  setCurrentStep(tournament.team_based ? 2 : 3);
                }
              }}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition"
            >
              {tournament.team_based ? 'Next: Team Info' : 'Next: Review'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Team Information */}
      {currentStep === 2 && tournament.team_based && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Team Information</h3>
          
          <div>
            <label className={labelClass}>Team Name *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              className={inputClass}
            />
            {errors.teamName && <div className={errorClass}>{errors.teamName}</div>}
            <p className="text-xs text-gray-400 mt-1">Example: The Coders, Code Warriors, Tech Titans</p>
          </div>

          <div className="bg-gray-800 p-3 rounded text-sm">
            <p className="text-gray-300">Team size: <span className="text-orange-500 font-bold">{members.filter(m => m.email.trim()).length + 1}</span></p>
            <p className="text-gray-400 text-xs">Min: {tournament.min_team_size}, Max: {tournament.max_team_size}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">Team Members</h4>
              {members.length < tournament.max_team_size - 1 && (
                <button
                  onClick={addMember}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
                >
                  + Add Member
                </button>
              )}
            </div>

            {members.map((member, idx) => (
              <div key={idx} className="p-3 bg-gray-800 rounded space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-gray-300">Member {idx + 1}</span>
                  {members.length > tournament.min_team_size - 1 && (
                    <button
                      onClick={() => removeMember(idx)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                      placeholder="name@vit.edu"
                      className={inputClass}
                    />
                    {errors[`member_${idx}_email`] && <div className={errorClass}>{errors[`member_${idx}_email`]}</div>}
                  </div>

                  <div>
                    <label className={labelClass}>Name *</label>
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                      placeholder="Full Name"
                      className={inputClass}
                    />
                    {errors[`member_${idx}_name`] && <div className={errorClass}>{errors[`member_${idx}_name`]}</div>}
                  </div>

                  <div>
                    <label className={labelClass}>Branch *</label>
                    <select
                      value={member.branch}
                      onChange={(e) => handleMemberChange(idx, 'branch', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {errors[`member_${idx}_branch`] && <div className={errorClass}>{errors[`member_${idx}_branch`]}</div>}
                  </div>

                  <div>
                    <label className={labelClass}>Division</label>
                    <select
                      value={member.division}
                      onChange={(e) => handleMemberChange(idx, 'division', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Roll No *</label>
                    <input
                      type="text"
                      value={member.roll_no}
                      onChange={(e) => handleMemberChange(idx, 'roll_no', e.target.value)}
                      placeholder="Roll No"
                      className={inputClass}
                    />
                    {errors[`member_${idx}_roll_no`] && <div className={errorClass}>{errors[`member_${idx}_roll_no`]}</div>}
                  </div>

                  <div>
                    <label className={labelClass}>Mobile No *</label>
                    <input
                      type="tel"
                      value={member.mobile_no}
                      onChange={(e) => handleMemberChange(idx, 'mobile_no', e.target.value)}
                      placeholder="10-digit"
                      className={inputClass}
                    />
                    {errors[`member_${idx}_mobile_no`] && <div className={errorClass}>{errors[`member_${idx}_mobile_no`]}</div>}
                  </div>

                  <div className="col-span-2">
                    <label className={labelClass}>College Name</label>
                    <input
                      type="text"
                      value={member.college_name}
                      onChange={(e) => handleMemberChange(idx, 'college_name', e.target.value)}
                      placeholder="College Name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PRN</label>
                    <input
                      type="text"
                      value={member.prn}
                      onChange={(e) => handleMemberChange(idx, 'prn', e.target.value)}
                      placeholder="PRN"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (validateTeamName() && validateMembers()) {
                  setCurrentStep(3);
                }
              }}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Review Registration</h3>
          
          <div className="space-y-3 bg-gray-800 p-4 rounded">
            <div>
              <p className="text-xs text-gray-400">Tournament</p>
              <p className="text-white font-bold">{tournament.title}</p>
            </div>

            {tournament.team_based && (
              <div>
                <p className="text-xs text-gray-400">Team Name</p>
                <p className="text-white font-bold">{teamName}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400">Your Name</p>
              <p className="text-white">{leaderData.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400">Branch</p>
                <p className="text-white">{leaderData.branch}</p>
              </div>
              <div>
                <p className="text-gray-400">Division</p>
                <p className="text-white">{leaderData.division}</p>
              </div>
              <div>
                <p className="text-gray-400">Roll No</p>
                <p className="text-white">{leaderData.roll_no}</p>
              </div>
              <div>
                <p className="text-gray-400">Mobile</p>
                <p className="text-white">{leaderData.mobile_no}</p>
              </div>
              <div>
                <p className="text-gray-400">PRN</p>
                <p className="text-white">{leaderData.prn}</p>
              </div>
              <div>
                <p className="text-gray-400">College</p>
                <p className="text-white text-xs">{leaderData.college_name}</p>
              </div>
            </div>

            {tournament.team_based && members.filter(m => m.email.trim()).length > 0 && (
              <div>
                <p className="text-xs text-gray-400">Team Members ({members.filter(m => m.email.trim()).length})</p>
                <div className="space-y-2 mt-2">
                  {members.filter(m => m.email.trim()).map((m, i) => (
                    <div key={i} className="bg-gray-700 p-2 rounded text-xs">
                      <p className="text-white font-bold">{m.name}</p>
                      <p className="text-gray-300">{m.email} • {m.roll_no} • {m.branch}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 p-3 rounded text-sm text-yellow-200">
            <p className="font-bold">⚠️ Please verify all information is correct</p>
            <p className="text-xs mt-1">You cannot change this after submission</p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setCurrentStep(tournament.team_based ? 2 : 1)}
              className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white rounded transition font-bold"
            >
              {loading ? 'Registering...' : 'Submit Registration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
