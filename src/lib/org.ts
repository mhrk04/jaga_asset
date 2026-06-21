import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

export type OrgRole = 'owner' | 'manager' | 'member'

/**
 * Returns a 403 response if the user's email is not yet verified.
 * Call after confirming the user is authenticated in API routes.
 */
export function requireVerifiedEmail(user: User): NextResponse | null {
  if (user.user_metadata?.email_verified === false) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }
  return null
}

export interface OrgMembership {
  org_id: string
  role: OrgRole
}

/**
 * Resolves the org_id for a given user email.
 * Checks org_members first, then employees, then org owner.
 */
export async function resolveOrgId(email: string): Promise<string | null> {
  const membership = await getOrgMembership(email)
  if (membership) return membership.org_id

  // Legacy: check employees table
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('org_id')
    .eq('email', email)
    .maybeSingle()

  if (emp?.org_id) return emp.org_id

  // Legacy: check org owner_email
  const { data: org } = await supabaseAdmin
    .from('organisations')
    .select('id')
    .eq('owner_email', email)
    .maybeSingle()

  return org?.id ?? null
}

/**
 * Gets the user's org membership including their role.
 */
export async function getOrgMembership(email: string): Promise<OrgMembership | null> {
  const { data } = await supabaseAdmin
    .from('org_members')
    .select('org_id, role')
    .eq('email', email)
    .maybeSingle()

  return data as OrgMembership | null
}

/**
 * Whether the given role can perform write/delete operations.
 */
export function canModify(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager'
}

/**
 * Checks if the user has write access and returns a 403 response if not.
 * Call after resolving org_id in mutation routes.
 */
export async function requireWriteAccess(
  email: string
): Promise<{ membership: OrgMembership | null; errorResponse: NextResponse | null }> {
  const membership = await getOrgMembership(email)
  if (!membership || !canModify(membership.role)) {
    return {
      membership,
      errorResponse: NextResponse.json(
        { error: 'Only org owners and managers can perform this action' },
        { status: 403 }
      ),
    }
  }
  return { membership, errorResponse: null }
}
