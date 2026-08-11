/* Firebase Cloud Functions for Dream Travel Admin Operations
   =============================================================
   
   These functions provide server-side authorization for admin operations.
   This prevents users from manipulating their role/status client-side.
   
   DEPLOYMENT:
   1. Install Firebase CLI: npm install -g firebase-tools
   2. Initialize: firebase init functions
   3. Copy this file to: functions/index.js
   4. Deploy: firebase deploy --only functions
   
   The admin operations will be callable from the frontend via these functions.
*/

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ===== HELPER FUNCTIONS =====

// Check if user is admin (using custom claims)
async function verifyAdminUser(uid) {
    try {
        const userRecord = await auth.getUser(uid);
        return userRecord.customClaims && userRecord.customClaims.admin === true;
    } catch (error) {
        console.error('Error verifying admin:', error);
        return false;
    }
}

// Log admin action to Firestore
async function logAdminAction(adminUid, adminEmail, action, targetUserId, targetUserEmail) {
    try {
        await db.collection('adminLogs').add({
            action: action,
            adminUid: adminUid,
            adminEmail: adminEmail,
            targetUserId: targetUserId,
            targetUserEmail: targetUserEmail,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            details: {
                // Add additional details as needed
            }
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}

// ===== CALLABLE FUNCTIONS =====

// Ban a user
exports.banUser = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify admin status
    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can ban users');
    }

    // Prevent admin from banning themselves
    if (data.targetUserId === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'You cannot ban yourself');
    }

    try {
        // Get target user data
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const targetUserData = targetUserDoc.data();

        // Update Firestore
        await db.collection('users').doc(data.targetUserId).update({
            status: 'banned',
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: context.auth.uid
        });

        // Log action
        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'BAN_USER',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User ${targetUserData.email} has been banned` };
    } catch (error) {
        console.error('Error banning user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to ban user');
    }
});

// Unban a user
exports.unbanUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can unban users');
    }

    try {
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const targetUserData = targetUserDoc.data();

        await db.collection('users').doc(data.targetUserId).update({
            status: 'active',
            bannedAt: null,
            bannedBy: null
        });

        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'UNBAN_USER',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User ${targetUserData.email} has been unbanned` };
    } catch (error) {
        console.error('Error unbanning user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to unban user');
    }
});

// Hide a user
exports.hideUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can hide users');
    }

    try {
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const targetUserData = targetUserDoc.data();

        await db.collection('users').doc(data.targetUserId).update({
            status: 'hidden',
            hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
            hiddenBy: context.auth.uid
        });

        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'HIDE_USER',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User ${targetUserData.email} has been hidden` };
    } catch (error) {
        console.error('Error hiding user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to hide user');
    }
});

// Unhide a user
exports.unhideUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can unhide users');
    }

    try {
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const targetUserData = targetUserDoc.data();

        await db.collection('users').doc(data.targetUserId).update({
            status: 'active',
            hiddenAt: null,
            hiddenBy: null
        });

        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'UNHIDE_USER',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User ${targetUserData.email} has been unhidden` };
    } catch (error) {
        console.error('Error unhiding user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to unhide user');
    }
});

// Delete a user (from both Auth and Firestore)
exports.deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }

    // Prevent admin from deleting themselves
    if (data.targetUserId === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'You cannot delete your own account');
    }

    try {
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        if (!targetUserDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const targetUserData = targetUserDoc.data();

        // Delete from Firebase Auth
        await auth.deleteUser(data.targetUserId);

        // Delete from Firestore
        await db.collection('users').doc(data.targetUserId).delete();

        // Log action
        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'DELETE_USER',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User ${targetUserData.email} has been deleted` };
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to delete user');
    }
});

// Get admin statistics
exports.getAdminStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can view statistics');
    }

    try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => doc.data());

        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const bannedUsers = users.filter(u => u.status === 'banned').length;
        const hiddenUsers = users.filter(u => u.status === 'hidden').length;
        const admins = users.filter(u => u.role === 'admin').length;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newUsers = users.filter(u => {
            const created = u.createdAt && u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
            return created >= sevenDaysAgo;
        }).length;

        return {
            totalUsers,
            activeUsers,
            bannedUsers,
            hiddenUsers,
            admins,
            newUsers
        };
    } catch (error) {
        console.error('Error getting admin stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get statistics');
    }
});

// ===== ONBOARD FUNCTION: Set custom claims for new admin =====

exports.promoteUserToAdmin = functions.https.onCall(async (data, context) => {
    // Only allow from authenticated admin context
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = await verifyAdminUser(context.auth.uid);
    if (!isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can promote users');
    }

    try {
        // Set custom claim
        await auth.setCustomUserClaims(data.targetUserId, { admin: true });

        // Update Firestore
        await db.collection('users').doc(data.targetUserId).update({
            role: 'admin'
        });

        // Log action
        const targetUserDoc = await db.collection('users').doc(data.targetUserId).get();
        const targetUserData = targetUserDoc.data();

        await logAdminAction(
            context.auth.uid,
            context.auth.token.email,
            'PROMOTE_TO_ADMIN',
            data.targetUserId,
            targetUserData.email
        );

        return { success: true, message: `User has been promoted to admin` };
    } catch (error) {
        console.error('Error promoting user:', error);
        throw new functions.https.HttpsError('internal', 'Failed to promote user');
    }
});

/* ===== DEPLOYMENT STEPS =====

1. Create a functions directory in your project (if not already created)
2. Copy this file to functions/index.js
3. Create functions/package.json:

{
  "name": "dream-travel-functions",
  "version": "1.0.0",
  "description": "Cloud Functions for Dream Travel",
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "engines": {
    "node": "18"
  }
}

4. Run: cd functions && npm install
5. Deploy: firebase deploy --only functions

===== TESTING IN FRONTEND =====

// Example: Call ban user function from admin.js
firebase.functions().httpsCallable('banUser')({
    targetUserId: userId
}).then(result => {
    console.log('Ban successful:', result.data);
}).catch(error => {
    console.error('Error:', error.message);
});

*/
