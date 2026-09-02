# Enhanced Tournament Registration System

## Overview
This implementation adds a comprehensive registration system similar to Unstop, where students can provide detailed information during tournament registration.

## New Features

### 1. Enhanced User Profile Fields
Added the following fields to the user model:
- **Name** - Full name
- **Branch** - Academic branch/stream
- **Division** - Class division  
- **Roll No** - Student roll number
- **College Name** - Institute/College name
- **PRN** - Permanent Registration Number
- **Mobile No** - Contact number

### 2. Registration Forms

#### Profile Registration Form (`EnhancedRegistrationForm.jsx`)
- Located in `frontend/src/components/common/`
- Collects all detailed student information
- Integrated into the Profile page for users to update their info
- Validates:
  - Mobile number (10 digits)
  - All required fields
- Updates user profile via `/api/auth/sync` endpoint

#### Tournament Registration Form (`TournamentRegistrationForm.jsx`)
- Located in `frontend/src/components/tournament/`
- Multi-step form (3 steps):
  1. **Step 1**: Leader's personal information
  2. **Step 2**: Team members information (for team-based tournaments)
  3. **Step 3**: Review and confirmation
- Features:
  - Dynamic member addition/removal
  - Form validation at each step
  - Progress indication
  - Summary review before submission

### 3. Registration Types

#### Solo Tournament Registration
- Collects leader's information only
- Fields: Name, Branch, Division, Roll No, College Name, PRN, Mobile No
- Direct confirmation

#### Team Tournament Registration
- Collects leader's information
- Collects each team member's information:
  - Email (required, must be @vit.edu)
  - Name
  - Branch
  - Division (optional)
  - Roll No
  - College Name (optional)
  - PRN (optional)
  - Mobile No
- Team size validation (min-max)
- Invitation emails sent to all members

## Backend Changes

### Database Schema Updates
Added columns to:
- **users table**: branch, division, roll_no, college_name, prn, mobile_no
- **team_members table**: name, branch, division, roll_no, college_name, prn, mobile_no

Run migration: `mysql -u root arenax < database/migration_v2.sql`

### API Endpoints

#### 1. Profile Update
- **Endpoint**: `POST /api/auth/sync`
- **Payload**:
  ```json
  {
    "name": "John Doe",
    "branch": "Computer Science",
    "division": "A",
    "roll_no": "19BCS001",
    "college_name": "VIT",
    "prn": "12345678",
    "mobile_no": "9876543210",
    "year_of_study": 3,
    "department": "Computer Science"
  }
  ```

#### 2. Team Registration
- **Endpoint**: `POST /api/teams`
- **Payload for Team-based Tournament**:
  ```json
  {
    "tournament_id": 1,
    "team_name": "Team Alpha",
    "leader_data": {
      "name": "John Doe",
      "branch": "Computer Science",
      "division": "A",
      "roll_no": "19BCS001",
      "college_name": "VIT",
      "prn": "12345678",
      "mobile_no": "9876543210"
    },
    "member_data": [
      {
        "email": "member1@vit.edu",
        "name": "Jane Smith",
        "branch": "Electronics",
        "division": "B",
        "roll_no": "19BCE005",
        "college_name": "VIT",
        "prn": "87654321",
        "mobile_no": "8765432109"
      },
      {
        "email": "member2@vit.edu",
        "name": "Bob Johnson",
        "branch": "Mechanical",
        "division": "C",
        "roll_no": "19BM010",
        "college_name": "VIT",
        "prn": "11111111",
        "mobile_no": "7654321098"
      }
    ]
  }
  ```

- **Payload for Solo Tournament**:
  ```json
  {
    "tournament_id": 2,
    "team_name": "Solo Entry",
    "leader_data": {
      "name": "John Doe",
      "branch": "Computer Science",
      "division": "A",
      "roll_no": "19BCS001",
      "college_name": "VIT",
      "prn": "12345678",
      "mobile_no": "9876543210"
    },
    "member_data": []
  }
  ```

## Frontend Components

### 1. EnhancedRegistrationForm.jsx
**Location**: `frontend/src/components/common/`

**Props**:
- `onSuccess` (function): Callback when profile updated
- `compact` (boolean): Whether to use compact layout (default: false)

**Usage**:
```jsx
import EnhancedRegistrationForm from '../components/common/EnhancedRegistrationForm';

<EnhancedRegistrationForm 
  onSuccess={(user) => console.log('Updated:', user)}
  compact={false}
/>
```

### 2. TournamentRegistrationForm.jsx
**Location**: `frontend/src/components/tournament/`

**Props**:
- `tournament` (object): Tournament details
- `onSuccess` (function): Callback when registered
- `onClose` (function): Callback to close modal

**Usage**:
```jsx
import TournamentRegistrationForm from '../components/tournament/TournamentRegistrationForm';

<TournamentRegistrationForm 
  tournament={tournament} 
  onSuccess={(team) => console.log('Registered:', team)}
  onClose={() => setShowModal(false)}
/>
```

## User Flow

### Step 1: User Profile Setup
1. User logs in
2. Goes to Profile page
3. Clicks "Edit" button
4. Fills enhanced registration form
5. Saves profile

### Step 2: Tournament Registration
1. Browse tournaments `/tournaments`
2. Click "Register →" on a tournament
3. Multi-step registration form opens:
   - **Step 1**: Enter your information
   - **Step 2**: (If team-based) Add team members
   - **Step 3**: Review and confirm
4. Submit registration
5. Team members receive email invitations
6. Members log in and accept/decline invitations

## Validation Rules

### Profile Form
- **Name**: Required
- **Branch**: Required (dropdown)
- **Division**: Required (A-E)
- **Roll No**: Required
- **College Name**: Required
- **PRN**: Required
- **Mobile No**: Required, must be 10 digits
- **Year of Study**: Optional (1-5)
- **Department**: Required (for profile update)

### Tournament Registration
- **Leader Info**: All fields required
- **Team Name**: Required for team tournaments
- **Team Size**: Min-Max validation based on tournament settings
- **Member Emails**: Must be @vit.edu, unique per team
- **Member Info**: All fields except division, college_name, prn are required

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Profile page shows edit button
- [ ] Edit profile form displays all fields
- [ ] Profile update saves and reflects in user data
- [ ] Tournament registration modal opens
- [ ] Solo tournament shows only leader info step
- [ ] Team tournament shows all 3 steps
- [ ] Add/remove team members works
- [ ] Form validation works (errors display correctly)
- [ ] Review step shows all information
- [ ] Registration submits successfully
- [ ] Team created in database with all details
- [ ] Team members table populated with detailed info
- [ ] Leader info saved to team_members record
- [ ] Invitation emails sent (check backend logs)
- [ ] Members can accept/decline invitations

## File Changes Summary

### Backend
- `database/schema.sql` - Updated schema
- `database/migration_v2.sql` - New migration script
- `backend/models.py` - Updated User and TeamMember models
- `backend/blueprints/auth_routes.py` - Updated /auth/sync endpoint
- `backend/blueprints/team_routes.py` - Updated register_team endpoint

### Frontend
- `frontend/src/components/common/EnhancedRegistrationForm.jsx` - NEW
- `frontend/src/components/tournament/TournamentRegistrationForm.jsx` - NEW
- `frontend/src/pages/ProfilePage.jsx` - Updated to use new form
- `frontend/src/pages/TournamentDetailPage.jsx` - Updated to use new form

## Next Steps

1. Run database migration
2. Restart backend server
3. Clear browser cache/localStorage
4. Test complete registration flow
5. Verify team member data is stored correctly
6. Test invitation email flow (if email configured)
7. Monitor logs for any errors

## Troubleshooting

### Form not showing
- Clear browser cache
- Check console for errors
- Verify components are imported correctly

### API errors
- Check backend logs: `python app.py`
- Verify database migration ran
- Check token is valid

### Member data not saving
- Verify backend is running latest code
- Check network tab for request payload
- Ensure team_members table has new columns

## Future Enhancements

- Document upload (ID, college certificate)
- Team logo upload
- Payment integration
- Auto-sync from college database
- Bulk team registration
- CSV import/export
