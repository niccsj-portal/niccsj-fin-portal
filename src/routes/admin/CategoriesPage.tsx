import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth/AuthContext';
import { createCategory, listCategories, setCategoryActive } from '@/lib/admin/api';
import type { CategoryRow } from '@/lib/admin/types';

const FIELD =
  'h-10 rounded-md border border-input bg-background px-3 text-body-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Heuristic: does this category look like the legacy $20 household dues? */
function isLegacyDues(name: string): boolean {
  return /household\s+dues|legacy/i.test(name);
}

/**
 * Category management (Sprint 9 story 9.5; PRD §4.3, §4.11). Admin can activate
 * or deactivate (phase out) contribution/expense categories. Deactivating the
 * legacy $20 household dues removes it from the recorder form while keeping its
 * history intact (soft, never destructive). Writes are RLS-gated to recorders.
 */
export function CategoriesPage() {
  const { client } = useAuth();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('income');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!client) {
      setError('Category management is unavailable: the app is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCategories(await listCategories(client));
    } catch {
      setError('We could not load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (category: CategoryRow) => {
    if (!client) return;
    setBusyId(category.id);
    setError(null);
    try {
      await setCategoryActive(client, category.id, !category.is_active);
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c)),
      );
    } catch {
      setError('We could not update that category. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createCategory(client, { name, type: newType });
      setCategories((prev) => [...prev, created]);
      setNewName('');
    } catch {
      setError('We could not create that category. It may already exist.');
    } finally {
      setCreating(false);
    }
  };

  const { income, expense } = useMemo(() => {
    return {
      income: categories.filter((c) => c.type === 'income'),
      expense: categories.filter((c) => c.type === 'expense'),
    };
  }, [categories]);

  const renderTable = (rows: CategoryRow[], heading: string) => (
    <section className="mt-6" aria-label={heading}>
      <h2 className="font-serif text-h2 font-semibold text-brand-900">{heading}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-body-sm text-muted-foreground">No categories.</p>
      ) : (
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  {c.name}
                  {isLegacyDues(c.name) ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-caption font-medium text-amber-800">
                      Legacy — phasing out
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>{c.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => void onToggle(c)}
                  >
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );

  return (
    <div>
      <div className="rule-gold mb-4 w-16" aria-hidden="true" />
      <h1 className="font-serif text-h1 font-semibold text-brand-900">Categories</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-700">
        Activate or phase out contribution and expense categories. Deactivating keeps all history
        and simply hides the category from new entries.
      </p>

      <form onSubmit={onCreate} aria-label="Create category" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-category-name" className="text-caption font-medium text-ink-700">
            New category name
          </label>
          <Input
            id="new-category-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Youth Ministry"
            className="w-64"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-category-type" className="text-caption font-medium text-ink-700">
            Type
          </label>
          <select
            id="new-category-type"
            className={FIELD}
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'income' | 'expense')}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <Button type="submit" disabled={creating || !newName.trim()}>
          {creating ? 'Adding…' : 'Add category'}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="mt-4 text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-body-sm text-muted-foreground">Loading categories…</p>
      ) : (
        <>
          {renderTable(income, 'Income categories')}
          {renderTable(expense, 'Expense categories')}
        </>
      )}
    </div>
  );
}
