import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  SIGNATURE_ACCEPT,
  getMySignaturePath,
  getSignatureSignedUrl,
  removeSignature,
  uploadSignature,
  validateSignatureFile,
} from '@/lib/signatures/storage';

/**
 * Financial Secretary signature management (story 8.2; PRD §4.10, graphics.md
 * §11). The FS uploads / replaces / removes their official signature PNG. The
 * image lives in the private `signatures` bucket (strict RLS, migration
 * 20260703170000); the user row stores only the path, and previews use short-
 * lived signed URLs. Every change is audit-logged by the DB trigger on
 * `public.users`. Without a signature on file, End-of-Year summaries are blocked.
 */
export function SignaturePage() {
  const { client, user } = useAuth();
  const userId = user?.id ?? null;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [path, setPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client || !userId) {
      setError('Signature management is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const current = await getMySignaturePath(client, userId);
      setPath(current);
      setPreviewUrl(current ? await getSignatureSignedUrl(client, current) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your signature.');
    } finally {
      setLoading(false);
    }
  }, [client, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (file: File | undefined) => {
    if (!file || !client || !userId) return;
    setError(null);
    setStatus(null);
    const invalid = validateSignatureFile(file);
    if (invalid) {
      setError(invalid.message);
      return;
    }
    setBusy(true);
    try {
      await uploadSignature(client, userId, file);
      setStatus('Signature saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the signature.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onRemove = async () => {
    if (!client || !userId || !path) return;
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      await removeSignature(client, userId, path);
      setStatus('Signature removed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the signature.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-h4 font-semibold text-ink-900">
          <PenLine className="size-5 text-brand-700" aria-hidden />
          Financial Secretary signature
        </h1>
        <p className="text-body-sm text-ink-500">
          Upload your official signature (transparent PNG). It is stored privately and appears on
          the End-of-Year Family Contribution Summary. Without a signature on file, summaries cannot
          be issued.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-body-sm text-danger">
          {error}
        </div>
      )}
      {status && (
        <div role="status" className="rounded-md border border-success/30 bg-success/5 p-3 text-body-sm text-success">
          {status}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-body-sm text-ink-500">Loading…</p>
          ) : previewUrl ? (
            <div className="inline-flex items-center rounded-md border border-line-200 bg-white p-4">
              <img src={previewUrl} alt="Your signature" className="max-h-24" />
            </div>
          ) : (
            <p className="text-body-sm text-ink-500">No signature on file yet.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept={SIGNATURE_ACCEPT}
              className="sr-only"
              id="signature-file"
              onChange={(e) => void onFile(e.target.files?.[0])}
              disabled={busy}
            />
            <Button asChild variant="default" disabled={busy}>
              <label htmlFor="signature-file" className="cursor-pointer">
                <Upload className="mr-2 size-4" aria-hidden />
                {path ? 'Replace signature' : 'Upload signature'}
              </label>
            </Button>
            {path && (
              <Button variant="outline" onClick={() => void onRemove()} disabled={busy}>
                <Trash2 className="mr-2 size-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          <p className="text-caption text-ink-500">PNG with a transparent background, up to 1 MB.</p>
        </CardContent>
      </Card>
    </div>
  );
}
