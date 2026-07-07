---
name: update-projects
description: Update active Aethyx client project progress in the dashboard — run at session end or when asked to log progress
---

# /update-projects

## Purpose
Post a progress update for the active client project to the Aethyx dashboard. Runs at session end or on demand.

## Step 1 — Identify the project

Check for a `.aethyx` file in the current working directory:
```bash
cat .aethyx 2>/dev/null || echo "NOT_FOUND"
```

- If found: use the `project_plan_id` and `client_name` from it.
- If not found: ask "Which client project should I log progress for?" and wait for the answer. If the session wasn't about client work, skip.

## Step 2 — Review what was done

Gather signals from this session:
- `git log --oneline -20` — recent commits
- Conversation context — what features were built, bugs fixed, decisions made
- Any phase names mentioned during the session

## Step 3 — Update phases

For each phase that had progress, update its `completion_percent` in `client_project_phases`:

Use the Supabase MCP tool `execute_sql` on project `jsdjcizqwwmtuhfnkvqq`:
```sql
UPDATE client_project_phases
SET completion_percent = <new_pct>, 
    status = CASE 
      WHEN <new_pct> = 100 THEN 'complete'
      WHEN <new_pct> > 0 THEN 'in_progress'
      ELSE 'pending'
    END,
    updated_at = now()
WHERE id = '<phase_id>';
```

## Step 4 — Recalculate overall completion

```sql
UPDATE client_project_plans
SET completion_percent = (
  SELECT COALESCE(ROUND(AVG(completion_percent)), 0)
  FROM client_project_phases
  WHERE plan_id = '<plan_id>'
),
updated_at = now()
WHERE id = '<plan_id>';
```

## Step 5 — Post an update entry

Write a concise plain-English summary of what was accomplished. Set `is_client_visible = true` only if the update describes meaningful progress the client would care about (not internal refactors, debugging, or config changes).

```sql
INSERT INTO client_project_updates (plan_id, content, author, is_client_visible)
VALUES (
  '<plan_id>',
  '<summary of what was done this session>',
  'Kristin',
  <true|false>
);
```

## Step 6 — Check schedule status

```sql
SELECT completion_percent, start_date, target_date FROM client_project_plans WHERE id = '<plan_id>';
```

Compute:
- `total_days = target_date - start_date`
- `elapsed_days = today - start_date`
- `expected_pct = LEAST(100, ROUND(elapsed_days / total_days * 100))`
- `delta = completion_percent - expected_pct`

If `delta <= -10`, append to the update: "⚠️ Currently behind schedule — expected ~X% complete by today."
If `delta >= 5`, append: "✅ Ahead of schedule."

## Step 7 — Report back

Tell the user:
- Which project was updated
- New overall completion %
- Schedule status
- Whether the update is client-visible
