# SwimCoach Scripts

This directory contains utility scripts for managing the SwimCoach application.

## promote-admin.ts

Promotes a user to admin role (or demotes admin back to coach).

### Usage

```bash
# Promote user to admin
tsx scripts/promote-admin.ts --email=coach@hartsc.com

# Demote admin back to coach
tsx scripts/promote-admin.ts --email=coach@hartsc.com --role=coach

# Show help
tsx scripts/promote-admin.ts --help
```

### What it does

1. Finds the user by email address
2. Verifies the user exists
3. Updates the user's role in a database transaction
4. Logs the result

### Important Notes

- User must be registered (have an account) before promotion
- User must **log out and log back in** for role change to take effect
- Only users with admin role can access the Invitations management page
- This script can both promote (to admin) and demote (to coach)

### Production Usage

When deploying to production with a fresh database:

1. Deploy the application
2. Create the first admin user:
   - Have the head coach register through an invitation
   - Run this script to promote them to admin
3. That admin can then invite other coaches via the Invitations page
4. Promote additional head coaches to admin as needed

### Error Handling

The script will exit with an error if:
- Email parameter is missing
- User not found
- Database connection fails

All operations are wrapped in a transaction for safety.
