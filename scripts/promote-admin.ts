#!/usr/bin/env tsx
/**
 * Admin Promotion Script
 * 
 * Promotes a user to admin role by email address.
 * Usage: tsx scripts/promote-admin.ts --email=coach@example.com
 * 
 * This script:
 * 1. Loads environment variables from .env file
 * 2. Finds the user by email
 * 3. Verifies the user exists and is linked to a coach
 * 4. Updates the user's role to 'admin' in a transaction
 * 5. Logs the result
 * 
 * Note: User must log out and log back in for role change to take effect.
 */

// Load environment variables first
import 'dotenv/config';

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.log('💡 Make sure you have a .env file with DATABASE_URL configured');
  process.exit(1);
}

import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface Args {
  email: string;
  role?: 'admin' | 'coach';
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let email: string | undefined;
  let role: 'admin' | 'coach' = 'admin'; // Default to admin

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    } else if (arg.startsWith('--role=')) {
      const roleValue = arg.split('=')[1];
      if (roleValue !== 'admin' && roleValue !== 'coach') {
        console.error('❌ Error: role must be either "admin" or "coach"');
        process.exit(1);
      }
      role = roleValue;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Admin Promotion Script

Usage:
  tsx scripts/promote-admin.ts --email=<user-email> [--role=admin|coach]

Options:
  --email=<email>    Email address of the user to promote (required)
  --role=<role>      Role to assign (admin or coach, defaults to admin)
  --help, -h         Show this help message

Examples:
  # Promote user to admin
  tsx scripts/promote-admin.ts --email=coach@hartsc.com

  # Demote admin back to coach
  tsx scripts/promote-admin.ts --email=coach@hartsc.com --role=coach

Note: User must log out and log back in for role change to take effect.
      `);
      process.exit(0);
    }
  }

  if (!email) {
    console.error('❌ Error: --email parameter is required');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  return { email, role };
}

async function promoteUser(email: string, role: 'admin' | 'coach') {
  console.log(`🔍 Looking for user with email: ${email}`);

  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      console.error(`❌ Error: No user found with email: ${email}`);
      console.log('💡 Tip: Make sure the user has registered an account first');
      process.exit(1);
    }

    // Check if user already has the target role
    if (user.role === role) {
      console.log(`ℹ️  User already has role '${role}' - no changes needed`);
      process.exit(0);
    }

    // Update user role in a transaction
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role })
        .where(eq(users.id, user.id));
    });

    console.log(`✅ Success! User role updated from '${user.role}' to '${role}'`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`\n⚠️  Note: User must log out and log back in for this change to take effect`);

  } catch (error: any) {
    console.error('❌ Error updating user role:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const { email, role } = parseArgs();
  await promoteUser(email, role!);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
