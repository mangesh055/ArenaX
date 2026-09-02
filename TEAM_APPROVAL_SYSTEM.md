# Team Approval & Management System

## Overview
The team approval system allows **tournament organizers** to review, approve, or reject team registrations for tournaments they created.

## User Roles & Permissions

### Tournament Organizers (Create Tournaments)
- View all pending teams for **their own tournaments only**
- Approve teams to confirm registration
- Reject teams with reason
- See complete team member details
- **🔒 Strict Permission:** Only organizers who created a tournament can approve/reject teams for that tournament
- Cannot manage other organizers' tournaments

### Faculty (Admin)
- Manage tournament approvals, organizer requests, and reports
- Cannot directly approve teams
- Can only view tournament and system statistics

### Students (Team Leaders)
- Register teams for tournaments (auto-pending for verification)
- Receive notifications when approved/rejected
- Cannot approve teams

## Team Registration Flow

### For Team-Based Tournaments
```
1. Student registers team → Status: PENDING
2. Invitations sent to team members
3. Members accept invitations → Status updates based on confirmations
4. Organizer reviews in admin panel
5. Organizer approves → Status: CONFIRMED
   OR rejects → Status: DISQUALIFIED
```

### For Individual Tournaments
```
1. Student registers individually
2. Status: CONFIRMED (immediate, no approval needed)
3. No team management required
```

## API Endpoints

### Get Pending Teams (Organizer Only - Must Be Tournament Creator)
```
GET /api/teams/tournament/<tournament_id>/pending
Headers: Authorization: Bearer <token>

⚠️ Requires: User must be the organizer who created the tournament
Returns 403 Forbidden if:
  - User is not an organizer
  - User did not create this tournament


Response:
{
  "pending_count": 2,
  "teams": [
    {
      "id": 1,
      "tournament_id": 5,
      "team_name": "Code Warriors",
      "status": "pending",
      "leader_id": "user123",
      "leader": {
        "name": "John Doe",
        "email": "john@vit.edu",
        "branch": "CSE",
        "college_name": "VIT Vellore",
        "mobile_no": "9876543210"
      },
      "members": [
        {
          "name": "Jane Smith",
          "email": "jane@vit.edu",
          "roll_no": "20BCS001",
          "branch": "CSE",
          "status": "accepted"
        },
        {
          "name": "Bob Johnson",
          "email": "bob@vit.edu",
          "roll_no": "20BCS002",
          "branch": "IT",
          "status": "invited"
        }
      ],
      "total_members": 3,
      "confirmed_members": 2,
      "registered_at": "2026-04-04T12:00:00"
    }
  ]
}
```

### Approve Team
```
POST /api/teams/<team_id>/approve
Headers: Authorization: Bearer <token>

⚠️ Requires: User must be the organizer who created the tournament
Returns 403 Forbidden if:
  - User is not an organizer
  - User did not create the tournament this team is registering for

Response:
{
  "message": "Team approved successfully",
  "team": {
    "id": 1,
    "status": "confirmed",
    "team_name": "Code Warriors"
  }
}

Side Effects:
- Team status changed to "confirmed"
- Team leader notified: "Your team has been approved!"
- Tournament capacity check performed
```

### Reject Team
```
POST /api/teams/<team_id>/reject
Headers: Authorization: Bearer <token>
Body: {
  "reason": "Team member did not meet eligibility criteria"
}

⚠️ Requires: User must be the organizer who created the tournament
Returns 403 Forbidden if:
  - User is not an organizer
  - User did not create the tournament this team is registering for
}

Response:
{
  "message": "Team rejected",
  "team": {
    "id": 1,
    "status": "disqualified",
    "team_name": "Code Warriors"
  }
}

Side Effects:
- Team status changed to "disqualified"
- Team leader notified with rejection reason
```

## Frontend - Team Approval Panel

### Location
Admin Dashboard → Teams Tab

### Features
1. **Tournament Selector**
   - Dropdown to choose which tournament to review
   - Shows tournament status

2. **Pending Teams List**
   - Displays all pending teams for selected tournament
   - Shows team name, leader, and registration date
   - Counter shows number of pending teams

3. **Team Details Card**
   - Team name and leader information
   - Member count (confirmed/total)
   - Full member list with:
     - Name
     - Email
     - Roll No
     - Branch
     - Status (accepted/invited)
   - Leader details:
     - Email
     - Mobile number
     - Branch
     - College name

4. **Action Buttons**
   - **Approve**: One-click approval, immediately confirms team
   - **Reject**: Opens text area for rejection reason, then confirms

5. **Notifications**
   - Success toast on approval/rejection
   - Team leaders receive in-app notifications

## Team Status Values

| Status | Meaning |
|--------|---------|
| **pending** | Awaiting organizer approval; inversions sent to members |
| **confirmed** | Team approved and validated |
| **dropped** | Team voluntarily withdrew |
| **disqualified** | Team rejected by organizer |

## Verification Deadline
- Each pending team registration has a verification deadline (default: 72 hours)
- Members must accept invitations before deadline
- After deadline, unacccepted invitations expire

## Notifications

### To Team Leader
When team is approved:
```
Title: Team Approved
Message: Your team "Code Warriors" has been approved by the organizer!
Type: Success
```

When team is rejected:
```
Title: Team Rejected  
Message: Your team "Code Warriors" registration was rejected. Reason: <reason>
Type: Error
```

## Business Logic

### Auto-Confirmation Rules
- Individual tournaments: Teams auto-confirmed (no approval needed)
- Team tournaments with no members: Auto-confirmed
- Team tournaments with members: Status = PENDING (requires approval)

### Capacity Checks
- Cannot approve if tournament is full (max_participants reached)
- Only "confirmed" teams count towards capacity

### Member Verification
- Team must have at least min_team_size members
- Members must be from @vit.edu domain
- Can't be exactly same email as leader

## Best Practices

1. **Review Teams Promptly**
   - Approve/reject teams as soon as possible
   - Check member details for eligibility

2. **Clear Rejection Reasons**
   - Provide specific reasons when rejecting
   - Help leaders understand what went wrong

3. **Preview Member Details**
   - Verify member information matches criteria
   - Check branch and division for eligibility

4. **Monitor Verification Deadlines**
   - Teams pending beyond deadline should be reviewed
   - Consider auto-rejecting if members don't respond

## Future Enhancements

- [ ] Bulk actions (approve/reject multiple teams)
- [ ] CSV export of pending/confirmed teams  
- [ ] Member eligibility checker
- [ ] Automated approval rules
- [ ] Appeal process for rejected teams
- [ ] Team verification checklist
- [ ] Payment collection before approval
- [ ] Document upload requirement before approval
