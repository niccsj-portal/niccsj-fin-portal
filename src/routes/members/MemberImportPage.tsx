import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { createMember } from '@/lib/members/api';
import { validateImportRows, type ImportPreview } from '@/lib/members/import';

/**
 * CSV member import (backlog story 2.6, PRD §4.2). Parse the file in the
 * browser with PapaParse, validate + preview every row, then insert the valid
 * ones. Expected headers: member_number, first_name, last_name, email, phone,
 * address, joined_date, role_in_household, baptism_status.
 */
export function MemberImportPage() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setImported(null);
    setImportError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setParseError('We could not read that file. Please check it is a valid CSV.');
          setPreview(null);
          return;
        }
        setPreview(validateImportRows(result.data));
      },
      error: () => {
        setParseError('We could not read that file. Please check it is a valid CSV.');
        setPreview(null);
      },
    });
  };

  const onImport = async () => {
    if (!client || !preview) return;
    const valid = preview.results.filter((r) => r.member);
    if (valid.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      let count = 0;
      for (const row of valid) {
        await createMember(client, row.member!);
        count += 1;
      }
      setImported(count);
    } catch {
      setImportError('Some rows could not be imported. Please review and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Import members</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">
        Upload a CSV with columns: member_number, first_name, last_name, email, phone, address,
        joined_date, role_in_household, baptism_status.
      </p>

      <div className="mt-4">
        <label htmlFor="csv-file" className="text-body-sm font-medium text-ink-900">
          CSV file
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="mt-1.5 block text-body-sm"
        />
        {fileName ? (
          <p className="mt-1 text-caption text-muted-foreground">Selected: {fileName}</p>
        ) : null}
      </div>

      {parseError ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {parseError}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-6">
          <p className="text-body-sm text-ink-900">
            {preview.validCount} valid, {preview.invalidCount} with errors (
            {preview.results.length} total).
          </p>

          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.results.map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber}</TableCell>
                    <TableCell>{r.raw.member_number ?? ''}</TableCell>
                    <TableCell>
                      {r.member ? `${r.member.first_name} ${r.member.last_name}` : '—'}
                    </TableCell>
                    <TableCell>
                      {r.errors.length === 0 ? (
                        <span className="text-success">Ready</span>
                      ) : (
                        <span className="text-destructive">{r.errors.join('; ')}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importError ? (
            <p role="alert" className="mt-4 text-body-sm text-destructive">
              {importError}
            </p>
          ) : null}

          {imported !== null ? (
            <p role="status" className="mt-4 text-body-sm text-success">
              Imported {imported} member{imported === 1 ? '' : 's'}.
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button
              onClick={onImport}
              disabled={importing || preview.validCount === 0 || imported !== null}
            >
              {importing
                ? 'Importing…'
                : `Import ${preview.validCount} member${preview.validCount === 1 ? '' : 's'}`}
            </Button>
            {imported !== null ? (
              <Button variant="outline" onClick={() => navigate('/members')}>
                Back to members
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/members">Cancel</Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
