'use client'

import { useEffect, useState } from 'react'

export default function OrgSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<{
    connected: boolean
    workspace_name?: string
    user_count?: number
    parent_page_id?: string | null
  } | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [parentPageUrl, setParentPageUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/org/notion/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    if (!apiKey) {
      setError('Please enter your Notion API key')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/org/notion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, parent_page_id: parentPageUrl || undefined }),
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(data.message)
        setConfig({ connected: true, workspace_name: data.workspace_name })
        setApiKey('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to connect Notion')
      }
    } catch (err) {
      setError('Failed to connect Notion')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Notion?')) return

    try {
      const res = await fetch('/api/org/notion/disconnect', {
        method: 'DELETE',
      })

      if (res.ok) {
        setSuccess('Notion disconnected successfully')
        setConfig(null)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to disconnect Notion')
      }
    } catch (err) {
      setError('Failed to disconnect Notion')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your workspace integrations and preferences.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Notion Integration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Notion workspace to auto-provision employee pages and revoke access on offboarding.
            When a new employee is added, we&apos;ll create a personal page under your chosen parent page.
            When they leave, we&apos;ll flag them as offboarded in your workspace.
          </p>
        </div>

        {config?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="font-medium">{config.workspace_name || 'Connected'}</p>
                  <p className="text-sm text-muted-foreground">
                    {config.user_count ? `${config.user_count} users in workspace` : 'Connected'}
                    {config.parent_page_id && (
                      <> · Parent page configured</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-destructive hover:underline"
              >
                Disconnect
              </button>
            </div>

            {success && (
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm text-primary">
                {success}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium mb-1">
                Notion API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ntn_..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create an internal integration in Notion at{' '}
                <a
                  href="https://www.notion.so/my-integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  notion.so/my-integrations
                </a>
                . The integration needs <strong>Read user information</strong>,{' '}
                <strong>Update user information</strong>, and <strong>Insert content</strong> permissions.
              </p>
            </div>

            <div>
              <label htmlFor="parent-page" className="block text-sm font-medium mb-1">
                Parent Page URL (optional)
              </label>
              <input
                id="parent-page"
                type="text"
                value={parentPageUrl}
                onChange={(e) => setParentPageUrl(e.target.value)}
                placeholder="https://www.notion.so/Employees-1a2b3c4d..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a page in Notion (e.g. &ldquo;Employees&rdquo;), share it with your integration, and paste the URL here.
                New employee pages will be created as sub-pages.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !apiKey}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-semibold h-10 px-4 rounded-md transition-colors"
            >
              {saving ? 'Connecting...' : 'Connect Notion'}
            </button>
          </form>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}