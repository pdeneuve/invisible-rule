// Utility: save mastery progress to backend and localStorage

export async function saveProgress(chapter: string, data: unknown): Promise<void> {
  // Always save to localStorage first (instant, offline-safe)
  try {
    localStorage.setItem(`mastery_${chapter}`, JSON.stringify(data));
  } catch {}

  // Then save to backend if we have an email
  const email = localStorage.getItem('mastery_user_email');
  if (!email) return;

  try {
    await fetch('/api/mastery/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, chapter, data }),
    });
  } catch (err) {
    // Silent fail - localStorage is the backup
    console.warn('Mastery backend save failed, data is in localStorage:', err);
  }
}

export async function loadProgress(email: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`/api/mastery/load?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    if (json.exists && json.data) {
      // Sync all chapters back to localStorage
      Object.entries(json.data).forEach(([key, val]) => {
        if (key.startsWith('ch') || key === 'weekly_sessions') {
          localStorage.setItem(`mastery_${key}`, JSON.stringify(val));
        }
      });
      return json.data;
    }
  } catch (err) {
    console.warn('Mastery backend load failed:', err);
  }
  return null;
}
