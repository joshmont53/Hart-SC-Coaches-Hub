#!/usr/bin/env tsx
/**
 * Create Admin User Script
 * 
 * Creates a new admin user with email and password.
 * Usage: tsx scripts/create-admin.ts --email=admin@example.com --password=SecurePassword123!
 * 
 * This script:
 * 1. Loads environment variables
 * 2. Creates a new user with the specified email and password
 * 3. Sets the user role to 'admin'
 * 4. Sets account status to 'active' and email as verified
 * 5. Logs the result
 * 
 * This is designed for creating the first admin user in production.
 */

// Load environment variables first
import 'dotenv/config';

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.log('💡 Make sure you have DATABASE_URL configured');
  process.exit(1);
}

import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface Args {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let email: string | undefined;
  let password: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      password = arg.split('=')[1];
    } else if (arg.startsWith('--firstName=')) {
      firstName = arg.split('=')[1];
    } else if (arg.startsWith('--lastName=')) {
      lastName = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Create Admin User Script

Usage:
  tsx scripts/create-admin.ts --email=<email> --password=<password> [--firstName=<name>] [--lastName=<name>]

Options:
  --email=<email>          Email address for the admin user (required)
  --password=<password>    Password for the admin user (required)
  --firstName=<name>       First name (optional, defaults to "Admin")
  --lastName=<name>        Last name (optional, defaults to "User")
  --help, -h               Show this help message

Examples:
  # Create admin user with minimal info
  tsx scripts/create-admin.ts --email=admin@example.com --password=SecurePassword123!

  # Create admin user with full name
  tsx scripts/create-admin.ts --email=admin@example.com --password=SecurePassword123! --firstName=John --lastName=Admin

Note: The password must be at least 12 characters and contain uppercase, lowercase, numbers, and special characters.
      `);
      process.exit(0);
    }
  }

  if (!email) {
    console.error('❌ Error: --email parameter is required');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  if (!password) {
    console.error('❌ Error: --password parameter is required');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  return { email, password, firstName, lastName };
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  // Validate password strength
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }

  // Password complexity check
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    };
  }

  return { valid: true };
}

async function createAdminUser(args: Args) {
  const { email, password, firstName = 'Admin', lastName = 'User' } = args;

  console.log(`🔍 Creating admin user with email: ${email}`);

  try {
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ Error: ${passwordValidation.message}`);
      process.exit(1);
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      console.error(`❌ Error: User with email ${email} already exists`);
      console.log(`💡 Tip: Use the promote-admin.ts script to make this user an admin`);
      process.exit(1);
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    console.log('👤 Creating user in database...');
    const userId = randomUUID();
    
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    console.log(`\n✅ Success! Admin user created`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`🔑 Role: admin`);
    console.log(`✓ Account Status: active`);
    console.log(`✓ Email Verified: true`);
    console.log(`\n🎉 You can now log in with this account!`);

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = parseArgs();
  await createAdminUser(args);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
