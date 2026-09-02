import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { authAPI } from '../../api';

export default function EnhancedRegistrationForm({ onSuccess, compact = false }) {
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    division: '',
    roll_no: '',
    college_name: '',
    prn: '',
    mobile_no: '',
    year_of_study: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
  const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Electrical', 'Civil'];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.branch.trim()) newErrors.branch = 'Branch is required';
    if (!formData.division.trim()) newErrors.division = 'Division is required';
    if (!formData.roll_no.trim()) newErrors.roll_no = 'Roll No is required';
    if (!formData.college_name.trim()) newErrors.college_name = 'College name is required';
    if (!formData.prn.trim()) newErrors.prn = 'PRN is required';
    if (!formData.mobile_no.trim()) newErrors.mobile_no = 'Mobile number is required';
    if (formData.mobile_no && !/^\d{10}$/.test(formData.mobile_no.replace(/\D/g, ''))) {
      newErrors.mobile_no = 'Mobile number should be 10 digits';
    }
    if (compact && !formData.department.trim()) newErrors.department = 'Department is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        branch: formData.branch,
        division: formData.division,
        roll_no: formData.roll_no,
        college_name: formData.college_name,
        prn: formData.prn,
        mobile_no: formData.mobile_no
      };

      if (formData.year_of_study) payload.year_of_study = parseInt(formData.year_of_study);
      if (formData.department) payload.department = formData.department;

      const response = await authAPI.syncUser(payload);
      toast.success('Profile updated successfully!');
      if (onSuccess) onSuccess(response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-600 rounded bg-gray-900 text-white focus:outline-none focus:border-orange-500";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <form onSubmit={handleSubmit} className={`${!compact ? 'space-y-4 max-w-2xl' : 'space-y-3'}`}>
      <div className={!compact ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
        {/* Name */}
        <div>
          <label className={labelClass}>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
            className={inputClass}
          />
          {errors.name && <div className={errorClass}>{errors.name}</div>}
        </div>

        {/* Mobile No */}
        <div>
          <label className={labelClass}>Mobile No *</label>
          <input
            type="tel"
            name="mobile_no"
            value={formData.mobile_no}
            onChange={handleChange}
            placeholder="10-digit number"
            className={inputClass}
          />
          {errors.mobile_no && <div className={errorClass}>{errors.mobile_no}</div>}
        </div>

        {/* Branch */}
        <div>
          <label className={labelClass}>Branch *</label>
          <select
            name="branch"
            value={formData.branch}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select Branch</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {errors.branch && <div className={errorClass}>{errors.branch}</div>}
        </div>

        {/* Division */}
        <div>
          <label className={labelClass}>Division *</label>
          <select
            name="division"
            value={formData.division}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select Division</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.division && <div className={errorClass}>{errors.division}</div>}
        </div>

        {/* Roll No */}
        <div>
          <label className={labelClass}>Roll No *</label>
          <input
            type="text"
            name="roll_no"
            value={formData.roll_no}
            onChange={handleChange}
            placeholder="Roll Number"
            className={inputClass}
          />
          {errors.roll_no && <div className={errorClass}>{errors.roll_no}</div>}
        </div>

        {/* PRN */}
        <div>
          <label className={labelClass}>PRN *</label>
          <input
            type="text"
            name="prn"
            value={formData.prn}
            onChange={handleChange}
            placeholder="Permanent Registration Number"
            className={inputClass}
          />
          {errors.prn && <div className={errorClass}>{errors.prn}</div>}
        </div>

        {/* College Name */}
        <div>
          <label className={labelClass}>College Name *</label>
          <input
            type="text"
            name="college_name"
            value={formData.college_name}
            onChange={handleChange}
            placeholder="College/Institute Name"
            className={inputClass}
          />
          {errors.college_name && <div className={errorClass}>{errors.college_name}</div>}
        </div>

        {/* Year of Study */}
        <div>
          <label className={labelClass}>Year of Study</label>
          <select
            name="year_of_study"
            value={formData.year_of_study}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select Year</option>
            {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>

        {/* Department */}
        {(compact || true) && (
          <div>
            <label className={labelClass}>Department {compact ? '*' : ''}</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={inputClass}
              required={compact}
            >
              <option value="">Select Department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <div className={errorClass}>{errors.department}</div>}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  );
}
