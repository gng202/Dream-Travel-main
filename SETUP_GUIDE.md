# Dream Travel - User + Admin System Setup Guide

## Overview

This guide explains how to complete the Dream Travel User + Admin system upgrade with Firestore and Firebase.

## What's Been Implemented

### ✅ Frontend Changes
1. **Enhanced Authentication (js/auth.js)**
   - Added Firestore SDK loading
   - User profiles now stored in Firestore
   - Ban status checking during login
   - Admin role detection for navbar display
   - User status badge display

2. **Admin Dashboard (admin.html)**
   - Responsive admin panel with sidebar
   - Dashboard overview with statistics
   - User management table with search & filters
   - Pagination for user lists
   - Admin-only access control

3. **Admin Service (js/admin.js)**
   - User listing with pagination
   - Ban/Unban functionality
   - Hide/Unhide functionality
   - Delete user functionality
   - Admin activity logging
   - Real-time statistics

## Firestore Collections Created

### users/{uid}
```
{
    uid: string (document ID)
    email: string
    displayName: string
    photoURL: string | null
    role: "user" | "admin"
    status: "active" | "banned" | "hidden"
    createdAt: timestamp
    lastLogin: timestamp
    bannedAt: timestamp | null
    bannedBy: string (admin uid) | null
    hiddenAt: timestamp | null
    hiddenBy: string (admin uid) | null
}
```

### adminLogs/{logId}
```
{
    action: string (BAN_USER, UNBAN_USER, HIDE_USER, UNHIDE_USER, DELETE_USER, PROMOTE_TO_ADMIN)
    adminUid: string
    adminEmail: string
    targetUserId: string
    targetUserEmail: string
    timestamp: timestamp
    details: object
}
```

## Step-by-Step Setup

### Phase 1: Firebase Firestore Setup (Frontend Ready)

✅ Already Done:
- Firestore SDK added to auth.js
- User collection structure defined
- Admin logs collection ready

### Phase 2: Deploy Firestore Security Rules

1. Go to **Firebase Console** → Your Project → **Firestore Database** → **Rules**
2. Copy content from `firestore.rules` file (this repo)
3. Replace existing rules
4. Click **Publish**

**What these rules do:**
- Users can only read/write their own data
- Users cannot change their role to admin
- Users cannot change their status
- Admin operations protected (logged via Cloud Functions)

### Phase 3: Optional - Cloud Functions Setup (Recommended for Production)

#### For Local Testing (Skip if not needed):

Cloud Functions provide server-side authorization for admin operations, preventing users from manipulating their role/status. This is recommended for production.

**Setup instructions:**

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize functions in your project:
   ```bash
   firebase init functions
   ```

3. Copy content from `functions_index.js` to `functions/index.js`

4. Install dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

5. Deploy:
   ```bash
   firebase deploy --only functions
   ```

6. Update admin.js to use callable functions:
   ```javascript
   // Replace direct Firestore updates with:
   firebase.functions().httpsCallable('banUser')({
       targetUserId: userId
   }).then(result => {
       console.log('Success:', result.data);
   }).catch(error => {
       console.error('Error:', error.message);
   });
   ```

### Phase 4: Create Initial Admin User

You need at least one admin user. Two options:

**Option A: Using Firebase Console (Easiest)**
1. Go to Firebase Console → Authentication → Users
2. Create a new user manually
3. Go to Firestore → users collection
4. Find the user document (UID = user's UID)
5. Edit the document and set `role: "admin"`

**Option B: Using Firebase Admin SDK (Command Line)**
```bash
firebase functions:shell
> admin = require('firebase-admin')
> admin.auth().setCustomUserClaims('USER_UID_HERE', {admin: true})
> admin.firestore().collection('users').doc('USER_UID_HERE').update({role: 'admin'})
> exit()
```

### Phase 5: Test the System

#### Test Regular User Registration & Login
1. Open website in new browser/incognito
2. Click Register
3. Fill form and submit
4. Check Firestore → users collection for new user document with `role: "user"`, `status: "active"`
5. Login with new user
6. Verify user profile shows in navbar
7. Verify "My Favorites" appears but no Admin Dashboard link

#### Test Admin Access
1. Create or use admin user (from Phase 4)
2. Login as admin
3. Verify navbar shows "Admin Dashboard" link
4. Click Admin Dashboard
5. Verify you can access admin panel
6. Try logging in with non-admin user and accessing admin.html directly
7. Verify access denied message appears

#### Test User Management
1. As admin, go to Admin Dashboard
2. Check Dashboard overview stats
3. Search for users by email
4. Filter by role and status
5. Test each action:
   - **View**: Click eye icon, verify modal shows user details
   - **Ban**: Click ban icon, confirm, verify status changes to "banned"
   - **Unban**: On banned user, click checkmark, verify status changes to "active"
   - **Hide**: Click eye-slash, confirm, verify status changes to "hidden"
   - **Unhide**: On hidden user, click eye, verify status changes to "active"
   - **Delete**: Click trash icon, confirm, verify user removed from list

#### Test Ban Enforcement
1. Ban a test user account
2. Try logging in as that banned user
3. Verify login is rejected with message "Your account has been banned"
4. Verify you're logged out and redirected to login page

#### Test Admin Activity Logging
1. Perform admin actions (ban, delete, etc.)
2. Check Firestore → adminLogs collection
3. Verify new logs appear with correct action, adminUid, adminEmail, targetUserId, targetUserEmail, timestamp

#### Test Existing Features (Preserve)
- [ ] Destinations page loads and works
- [ ] Packages page works
- [ ] Hotels page works
- [ ] Gallery works
- [ ] AI Planner works
- [ ] AI Chat works
- [ ] Favorites (My Favorites link works and saves)
- [ ] Dark mode toggle works
- [ ] Language toggle works
- [ ] Currency toggle works

## File Structure

```
Dream Travel/
├── admin.html                 ← NEW: Admin dashboard
├── js/
│   ├── auth.js               ← MODIFIED: Added Firestore + ban check
│   ├── admin.js              ← NEW: Admin logic
│   └── ...existing files...
├── firestore.rules           ← NEW: Security rules documentation
├── functions_index.js        ← NEW: Cloud Functions template
└── ...existing files...
```

## Key Features

### User System
- ✅ Register with Firestore profile creation
- ✅ Login with ban status checking
- ✅ User profile in navbar with initials
- ✅ Status badge showing ban/hidden status
- ✅ Admin link in navbar for admins
- ✅ Logout functionality

### Admin System
- ✅ Admin-only dashboard access
- ✅ User statistics overview
- ✅ User listing with search, filtering, pagination
- ✅ Ban/Unban users
- ✅ Hide/Unhide users (soft delete)
- ✅ Delete users (hard delete)
- ✅ Admin activity logging
- ✅ Admin cannot ban/delete themselves
- ✅ Confirmation modals for dangerous actions
- ✅ Toast notifications for actions
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Dark mode support

### Security
- ✅ Frontend role checking for UI changes
- ✅ Firestore Security Rules for data access control
- ✅ Ban enforcement on login
- ✅ Activity logging for audit trail
- ✅ Admin functions ready for Cloud Functions deployment

## Important Security Notes

### Current State (Frontend-Protected)
The system currently uses Firestore Security Rules to prevent users from:
- Reading/writing other users' data
- Changing their own role
- Changing their own status
- Deleting their own account

### For Production (Recommended)
1. **Deploy Cloud Functions** (from Phase 3) for admin operations
   - This ensures admin operations are verified server-side
   - Prevents any client-side manipulation

2. **Use Firebase Custom Claims**
   ```javascript
   // Admin SDK only
   admin.auth().setCustomUserClaims(uid, {admin: true})
   ```

3. **Never expose service account keys** in frontend code

4. **Never allow admin role changes** from frontend

## Troubleshooting

### Admin Dashboard shows "Access Denied"
- Check Firestore → users collection → your user document
- Verify `role: "admin"` is set
- Clear browser cache and refresh
- Check browser console for errors

### User can't login after being banned
- Check Firestore → users collection → user document
- Verify `status: "banned"` is set
- This is expected behavior - ban is working

### Admin actions don't appear in Firestore
- Check admin.js console for errors
- Verify Firestore connection is working
- Check Firestore → adminLogs collection
- Verify user's admin status

### Firestore writes failing
- Go to Firebase Console → Firestore → Rules
- Check if rules are published
- Review error message in browser console
- Verify Firestore Database is created (not in test mode)

## Next Steps

1. **Test all features** following Phase 5 above
2. **Deploy Cloud Functions** when ready for production
3. **Set up Firebase Custom Claims** for enhanced security
4. **Review Security Rules** and adjust as needed
5. **Add two-factor authentication** for admin accounts (optional)
6. **Set up email notifications** for admin actions (future enhancement)
7. **Add admin audit dashboard** with activity charts (future enhancement)

## Support

For issues with:
- **Firebase**: https://firebase.google.com/docs
- **Cloud Functions**: https://firebase.google.com/docs/functions
- **Firestore**: https://firebase.google.com/docs/firestore
- **Security Rules**: https://firebase.google.com/docs/rules

## Files Modified/Created

### Modified Files
- `js/auth.js` - Added Firestore, ban checking, admin navbar display

### New Files
- `admin.html` - Admin dashboard UI
- `js/admin.js` - Admin business logic
- `firestore.rules` - Security rules documentation
- `functions_index.js` - Cloud Functions template
- `SETUP_GUIDE.md` - This file

## Deployment Checklist

- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] First admin user created
- [ ] User registration tested
- [ ] User login tested
- [ ] Admin login tested
- [ ] Admin dashboard access verified
- [ ] User management functions tested
- [ ] Ban enforcement tested
- [ ] Activity logging verified
- [ ] Existing features tested
- [ ] Dark mode tested
- [ ] Mobile responsiveness tested
- [ ] Cloud Functions deployed (optional but recommended)

## Success Criteria

✅ System is ready when:
1. Users can register and create Firestore profiles
2. Users can login and see their profile in navbar
3. Banned users cannot login
4. Admins can access admin dashboard
5. Non-admins are denied access to admin dashboard
6. Admin can ban/unban users
7. Admin can hide/unhide users
8. Admin can delete users
9. Admin actions are logged in adminLogs collection
10. All existing Dream Travel features still work
